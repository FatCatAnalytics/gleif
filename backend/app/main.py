from __future__ import annotations

import asyncio
import logging
import random
import re
import time
import os
from collections import OrderedDict, deque
from contextlib import asynccontextmanager
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional, Set, Callable, Awaitable

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logger = logging.getLogger("gleif")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

LEI_PATTERN = re.compile(r"^[A-Z0-9]{20}$", re.I)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class Row(BaseModel):
    lei: str
    legalName: Optional[str] = None
    status: Optional[str] = None
    jurisdiction: Optional[str] = None
    countryCode: Optional[str] = None
    lastUpdate: Optional[str] = None
    managingLOU: Optional[str] = None
    registrationAuthorityName: Optional[str] = None
    registrationAuthorityEntityID: Optional[str] = None
    address: Optional[str] = None
    spglobal: Optional[List[str]] = None


class Address(BaseModel):
    language: Optional[str] = None
    addressLines: List[str] = []
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    postalCode: Optional[str] = None


class RegistrationAuthority(BaseModel):
    registrationAuthorityID: Optional[str] = None
    registrationAuthorityEntityID: Optional[str] = None


class LeiDetails(BaseModel):
    lei: str
    legalName: str
    legalAddress: Address
    headquartersAddress: Address
    registrationAuthority: RegistrationAuthority
    legalJurisdiction: Optional[str] = None
    entityCategory: Optional[str] = None
    entitySubCategory: Optional[str] = None
    entityStatus: Optional[str] = None
    entityCreationDate: Optional[str] = None
    lastUpdateDate: Optional[str] = None
    nextRenewalDate: Optional[str] = None
    managingLOU: Optional[str] = None
    validationSources: Optional[str] = None
    entityExpirationDate: Optional[str] = None


class HierarchyNode(BaseModel):
    entity: Row
    children: List["HierarchyNode"] = []


class HierarchyShape(BaseModel):
    maxDepth: int
    directChildrenCount: int
    descendantsCount: int  # all levels excluding root
    ultimateChildrenCount: int
    visitedCount: int

# ---------------------------------------------------------------------------
# TTL + LRU Cache  (thread-safe for single-process async use)
# ---------------------------------------------------------------------------

class TTLCache:
    """In-memory cache with per-key TTL and LRU eviction."""

    def __init__(self, ttl_seconds: int = 300, max_size: int = 2048) -> None:
        self._ttl = ttl_seconds
        self._max = max_size
        self._store: OrderedDict[str, tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> Any:
        item = self._store.get(key)
        if item is None:
            return None
        expires_at, value = item
        if time.time() > expires_at:
            self._store.pop(key, None)
            return None
        # Move to end (most-recently used)
        self._store.move_to_end(key)
        return value

    def set(self, key: str, value: Any) -> None:
        # Update existing key or insert new
        if key in self._store:
            self._store.move_to_end(key)
        elif len(self._store) >= self._max:
            # Evict least-recently used (front of OrderedDict)
            self._store.popitem(last=False)
        self._store[key] = (time.time() + self._ttl, value)


CACHE_VERSION = "3"
lei_cache = TTLCache(ttl_seconds=600, max_size=4096)

# ---------------------------------------------------------------------------
# Shared httpx client (connection-pooled) via lifespan
# ---------------------------------------------------------------------------

_http_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    """Return the shared httpx.AsyncClient (created at startup)."""
    assert _http_client is not None, "httpx client not initialised – app not started?"
    return _http_client


@asynccontextmanager
async def _lifespan(app: FastAPI):
    global _http_client
    limits = httpx.Limits(max_connections=40, max_keepalive_connections=20)
    _http_client = httpx.AsyncClient(
        limits=limits,
        timeout=httpx.Timeout(30.0, connect=10.0),
        http2=False,
    )
    logger.info("Shared httpx.AsyncClient created (pool max=40)")
    yield
    await _http_client.aclose()
    _http_client = None
    logger.info("Shared httpx.AsyncClient closed")


app = FastAPI(title="GLEIF Proxy API", version="0.2.0", lifespan=_lifespan)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

_default_allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_env_origins = os.getenv("ALLOWED_ORIGINS")

if _env_origins:
    _allowed_origins = [o.strip() for o in _env_origins.split(",") if o.strip()]
else:
    _allowed_origins = _default_allowed_origins

allow_origin_regex = None
if os.getenv("ALLOW_ALL_VERCEL", "").lower() == "true":
    allow_origin_regex = r"https://.*\.vercel\.app"

logger.info("CORS origins: %s | regex: %s", _allowed_origins, allow_origin_regex)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Health / debug endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}


if os.getenv("DEBUG", "").lower() in ("1", "true"):
    @app.get("/debug/cors")
    async def debug_cors():
        """Debug endpoint – only available when DEBUG=1."""
        return {
            "configured_origins": _allowed_origins,
            "allow_origin_regex": allow_origin_regex,
            "env_ALLOWED_ORIGINS": os.getenv("ALLOWED_ORIGINS"),
            "env_ALLOW_ALL_VERCEL": os.getenv("ALLOW_ALL_VERCEL"),
        }


# ---------------------------------------------------------------------------
# Mapping helpers
# ---------------------------------------------------------------------------

_STATUS_MAP = {
    "ACTIVE": "Active",
    "LAPSED": "Lapsed",
    "RETIRED": "Retired",
    "MERGED": "Merged",
}


def _status_to_display(status: Optional[str]) -> Optional[str]:
    if not status:
        return None
    s = status.upper()
    return _STATUS_MAP.get(s, s[:1] + s[1:].lower())


def _map_row(data: Dict[str, Any]) -> Row:
    attrs = data.get("attributes", {})
    entity = attrs.get("entity", {})
    registration = attrs.get("registration", {})
    lei_code = attrs.get("lei") or data.get("id")
    legal_name = (entity.get("legalName") or {}).get("name") or entity.get("legalName")
    status = _status_to_display(entity.get("status") or registration.get("registrationStatus"))
    jurisdiction = entity.get("jurisdiction")
    last_update_raw = registration.get("lastUpdateDate") or attrs.get("lastUpdateDate")
    # Normalize to YYYY-MM-DD without broad exception handling
    last_update = str(last_update_raw)[:10] if last_update_raw is not None else None
    managing_lou = attrs.get("managingLou") or attrs.get("managingLOU")
    spglobal_ids = attrs.get("spglobal") if isinstance(attrs.get("spglobal"), list) else None
    reg_auth = entity.get("registrationAuthority") or {}
    reg_auth_name = reg_auth.get("name") or reg_auth.get("registrationAuthorityID")
    reg_auth_entity_id = reg_auth.get("registrationAuthorityEntityID")

    legal_addr = entity.get("legalAddress") or {}
    address_lines = legal_addr.get("addressLines") or []
    locality = ", ".join(filter(None, [legal_addr.get("city"), legal_addr.get("region"), legal_addr.get("postalCode")]))
    address_parts = [*address_lines, locality, legal_addr.get("country")]
    address = ", ".join([p for p in address_parts if p and str(p).strip()])
    hq_addr = entity.get("headquartersAddress") or {}
    country_code_raw = legal_addr.get("country") or hq_addr.get("country") or entity.get("jurisdiction")
    country_code = (str(country_code_raw).upper() if isinstance(country_code_raw, str) and country_code_raw.strip() else None)

    return Row(
        lei=str(lei_code),
        legalName=(str(legal_name) if legal_name else None),
        status=status,
        jurisdiction=(str(jurisdiction) if jurisdiction else None),
        countryCode=country_code,
        lastUpdate=last_update,
        managingLOU=(str(managing_lou) if managing_lou else None),
        registrationAuthorityName=(str(reg_auth_name) if reg_auth_name else None),
        registrationAuthorityEntityID=(str(reg_auth_entity_id) if reg_auth_entity_id else None),
        address=(str(address) if address else None),
        spglobal=[str(x) for x in spglobal_ids] if spglobal_ids else None,
    )


class AsyncRateLimiter:
    def __init__(self, max_calls: int, period_seconds: float) -> None:
        self._max_calls = max_calls
        self._period = period_seconds
        self._calls: deque[float] = deque()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        while True:
            async with self._lock:
                now = time.monotonic()
                while self._calls and (now - self._calls[0]) > self._period:
                    self._calls.popleft()
                if len(self._calls) < self._max_calls:
                    self._calls.append(now)
                    return
                wait_for = self._period - (now - self._calls[0])
            await asyncio.sleep(max(0.01, wait_for) + random.uniform(0, 0.05))


# Keep headroom under the GLEIF 60 req/min limit
GLEIF_RATE_LIMITER = AsyncRateLimiter(max_calls=55, period_seconds=60.0)

# Concurrency semaphore – avoid overwhelming the upstream with parallel requests
_GLEIF_SEMAPHORE = asyncio.Semaphore(12)


async def _gleif_get(
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    timeout: float | httpx.Timeout | None = 30.0,
    max_retries: int = 5,
) -> httpx.Response:
    """Rate-limited GET against the GLEIF API with retry + backoff."""
    client = _get_client()
    base_backoff = 0.5
    for attempt in range(max_retries + 1):
        await GLEIF_RATE_LIMITER.acquire()
        async with _GLEIF_SEMAPHORE:
            try:
                r = await client.get(url, params=params, timeout=timeout)
            except httpx.HTTPError:
                if attempt >= max_retries:
                    raise
                await asyncio.sleep(min(8.0, base_backoff * (2 ** attempt)) + random.uniform(0, 0.1))
                continue

        if r.status_code == 404:
            return r

        if r.status_code in (429, 500, 502, 503, 504):
            if attempt >= max_retries:
                r.raise_for_status()
            retry_after = r.headers.get("retry-after")
            sleep_seconds: float
            if retry_after is not None:
                try:
                    sleep_seconds = float(retry_after)
                except ValueError:
                    try:
                        when = parsedate_to_datetime(retry_after)
                        sleep_seconds = max(0.5, (when - parsedate_to_datetime(r.headers.get("date", ""))).total_seconds())
                    except (ValueError, TypeError, OverflowError):
                        sleep_seconds = min(8.0, base_backoff * (2 ** attempt))
            else:
                sleep_seconds = min(8.0, base_backoff * (2 ** attempt))
            await asyncio.sleep(sleep_seconds + random.uniform(0, 0.1))
            continue

        r.raise_for_status()
        return r

    raise HTTPException(status_code=502, detail="GLEIF upstream not available")

async def _maybe_cancel(cancel_check: Optional[Callable[[], Awaitable[bool]]]) -> None:
    if cancel_check is None:
        return
    if await cancel_check():
        raise HTTPException(status_code=499, detail="Client closed request")

def _make_cancel_check(request: Request) -> Callable[[], Awaitable[bool]]:
    async def _check() -> bool:
        return await request.is_disconnected()
    return _check


# ---------------------------------------------------------------------------
# Data-fetching helpers  (all use shared _get_client())
# ---------------------------------------------------------------------------

async def _fetch_lei_raw(lei: str) -> Optional[dict]:
    """Fetch raw GLEIF record (cached). Single source of truth for per-LEI data."""
    cache_key = f"{CACHE_VERSION}:lei_raw:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return cached
    r = await _gleif_get(f"https://api.gleif.org/api/v1/lei-records/{lei}", timeout=20)
    if r.status_code == 404:
        return None
    data = r.json().get("data")
    if not data:
        return None
    lei_cache.set(cache_key, data)
    return data


async def _fetch_lei(lei: str) -> Optional[Row]:
    """Fetch mapped Row for an LEI. Re-uses the raw cache to avoid duplicate requests."""
    cache_key = f"{CACHE_VERSION}:lei_row:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return cached
    data = await _fetch_lei_raw(lei)
    if not data:
        return None
    row = _map_row(data)
    lei_cache.set(cache_key, row)
    return row


def _map_details(data: dict) -> LeiDetails:
    attrs = data.get("attributes", {})
    entity = attrs.get("entity", {})
    registration = attrs.get("registration", {})
    return LeiDetails(
        lei=attrs.get("lei") or data.get("id"),
        legalName=(entity.get("legalName") or {}).get("name") or entity.get("legalName") or "",
        legalAddress=Address(**(entity.get("legalAddress") or {})),
        headquartersAddress=Address(**(entity.get("headquartersAddress") or {})),
        registrationAuthority=RegistrationAuthority(**(entity.get("registrationAuthority") or {})),
        legalJurisdiction=entity.get("jurisdiction"),
        entityCategory=entity.get("category"),
        entitySubCategory=entity.get("subCategory"),
        entityStatus=entity.get("status") or registration.get("registrationStatus"),
        entityCreationDate=entity.get("creationDate"),
        lastUpdateDate=registration.get("lastUpdateDate") or attrs.get("lastUpdateDate"),
        nextRenewalDate=registration.get("nextRenewalDate"),
        managingLOU=attrs.get("managingLou") or attrs.get("managingLOU"),
        validationSources=attrs.get("validationSources"),
        entityExpirationDate=entity.get("expirationDate"),
    )


async def _fetch_ultimate_parent(lei: str) -> Optional[str]:
    cache_key = f"{CACHE_VERSION}:ult_parent:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return cached
    r = await _gleif_get(f"https://api.gleif.org/api/v1/lei-records/{lei}/ultimate-parent", timeout=20)
    if r.status_code == 404:
        return None
    data = r.json().get("data")
    if not data:
        return None
    parent_lei = data.get("id") or (data.get("attributes") or {}).get("lei")
    if parent_lei:
        lei_cache.set(cache_key, parent_lei)
    return parent_lei


async def _fetch_direct_children(
    lei: str,
    cancel_check: Optional[Callable[[], Awaitable[bool]]] = None,
) -> List[str]:
    cache_key = f"{CACHE_VERSION}:children_ids:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return list(cached)
    url = f"https://api.gleif.org/api/v1/lei-records/{lei}/direct-children?page[size]=200"
    leis: List[str] = []
    for _ in range(10):
        await _maybe_cancel(cancel_check)
        r = await _gleif_get(url, timeout=30)
        if r.status_code == 404:
            break
        payload = r.json()
        for item in payload.get("data") or []:
            cand = (item.get("attributes") or {}).get("lei") or item.get("id")
            if cand:
                leis.append(str(cand))
        next_url = (payload.get("links") or {}).get("next")
        if not next_url or next_url == url:
            break
        url = next_url
    lei_cache.set(cache_key, leis)
    return leis

async def _fetch_direct_children_rows(
    lei: str,
    cancel_check: Optional[Callable[[], Awaitable[bool]]] = None,
) -> List[Row]:
    cache_key = f"{CACHE_VERSION}:children_rows:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return list(cached)
    url = f"https://api.gleif.org/api/v1/lei-records/{lei}/direct-children?page[size]=200"
    rows: List[Row] = []
    for _ in range(10):
        await _maybe_cancel(cancel_check)
        r = await _gleif_get(url, timeout=30)
        if r.status_code == 404:
            break
        payload = r.json()
        for item in payload.get("data") or []:
            attrs = item.get("attributes") if isinstance(item, dict) else None
            if not isinstance(attrs, dict):
                continue
            try:
                rows.append(_map_row(item))
            except (KeyError, TypeError, ValueError):
                continue
        next_url = (payload.get("links") or {}).get("next")
        if not next_url or next_url == url:
            break
        url = next_url
    lei_cache.set(cache_key, rows)
    return rows
async def _compute_hierarchy_shape(
    root_lei: str,
    max_nodes: int = 20000,
    cancel_check: Optional[Callable[[], Awaitable[bool]]] = None,
) -> HierarchyShape:
    cache_key = f"{CACHE_VERSION}:shape:v3:{root_lei}:{max_nodes}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return cached

    root_children = await _fetch_direct_children(root_lei, cancel_check)

    visited: set[str] = {root_lei}
    frontier: List[str] = list(root_children)
    depth = 0
    bfs_semaphore = asyncio.Semaphore(10)

    async def fetch_ids(lei: str) -> List[str]:
        async with bfs_semaphore:
            try:
                await _maybe_cancel(cancel_check)
                return await _fetch_direct_children(lei, cancel_check)
            except (httpx.HTTPError, ValueError):
                return []

    while frontier and len(visited) < max_nodes:
        await _maybe_cancel(cancel_check)
        depth += 1
        next_level: List[str] = []
        # Process frontier in chunks to avoid thundering-herd
        CHUNK = 40
        for i in range(0, len(frontier), CHUNK):
            chunk = frontier[i : i + CHUNK]
            results = await asyncio.gather(*[fetch_ids(x) for x in chunk])
            for ids in results:
                for cid in ids:
                    if cid not in visited:
                        visited.add(cid)
                        next_level.append(cid)
                        if len(visited) >= max_nodes:
                            break
                if len(visited) >= max_nodes:
                    break
            if len(visited) >= max_nodes:
                break
        frontier = next_level

    ultimate_cnt = await _fetch_ultimate_children_count(root_lei, cancel_check)
    shape = HierarchyShape(
        maxDepth=depth,
        directChildrenCount=len(root_children),
        descendantsCount=max(0, len(visited) - 1),
        ultimateChildrenCount=int(ultimate_cnt),
        visitedCount=len(visited),
    )
    lei_cache.set(cache_key, shape)
    return shape



async def _build_hierarchy(
    root_lei: str,
    cancel_check: Optional[Callable[[], Awaitable[bool]]] = None,
) -> Optional[HierarchyNode]:
    visited: Set[str] = set()

    async def build(lei: str) -> Optional[HierarchyNode]:
        await _maybe_cancel(cancel_check)
        if lei in visited:
            return None
        visited.add(lei)
        row = await _fetch_lei(lei)
        if not row:
            return None
        child_leis = await _fetch_direct_children(lei, cancel_check)
        children_nodes_raw = await asyncio.gather(*[build(c) for c in child_leis])
        children_nodes = [c for c in children_nodes_raw if c]
        return HierarchyNode(entity=row, children=children_nodes)

    return await build(root_lei)


class FlatNode(BaseModel):
    parentLei: Optional[str] = None
    entity: Row


async def _build_hierarchy_flat(
    root_lei: str,
    max_nodes: int = 5000,
    cancel_check: Optional[Callable[[], Awaitable[bool]]] = None,
) -> List[FlatNode]:
    """BFS the hierarchy and return a flat list of (parentLei, Row).
    
    Much faster than the tree endpoint because:
    - Uses _fetch_direct_children_rows (one paginated call returns rows for
      all children) instead of individual per-LEI fetches.
    - Processes each BFS level in parallel batches via a semaphore.
    """
    cache_key = f"{CACHE_VERSION}:flat:{root_lei}:{max_nodes}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return cached

    root_row = await _fetch_lei(root_lei)
    if not root_row:
        return []

    result: List[FlatNode] = [FlatNode(parentLei=None, entity=root_row)]
    visited: set[str] = {root_lei}
    # frontier = list of (parent_lei, child_lei) to process
    frontier: List[str] = [root_lei]
    sem = asyncio.Semaphore(10)

    async def fetch_children_of(parent_lei: str) -> List[FlatNode]:
        async with sem:
            await _maybe_cancel(cancel_check)
            try:
                rows = await _fetch_direct_children_rows(parent_lei, cancel_check)
            except (httpx.HTTPError, ValueError):
                return []
            return [FlatNode(parentLei=parent_lei, entity=r) for r in rows]

    while frontier and len(result) < max_nodes:
        await _maybe_cancel(cancel_check)
        # Fetch all children for the entire current level in parallel
        CHUNK = 30
        next_frontier: List[str] = []
        for i in range(0, len(frontier), CHUNK):
            chunk = frontier[i : i + CHUNK]
            batch = await asyncio.gather(*[fetch_children_of(lei) for lei in chunk])
            for nodes in batch:
                for fn in nodes:
                    if fn.entity.lei not in visited:
                        visited.add(fn.entity.lei)
                        result.append(fn)
                        next_frontier.append(fn.entity.lei)
                        if len(result) >= max_nodes:
                            break
                if len(result) >= max_nodes:
                    break
            if len(result) >= max_nodes:
                break
        frontier = next_frontier

    lei_cache.set(cache_key, result)
    return result


async def _fetch_ultimate_children_count(
    lei: str,
    cancel_check: Optional[Callable[[], Awaitable[bool]]] = None,
) -> int:
    """Get total ultimate-children count.
    
    Try the GLEIF meta.paging.totalRecords first (single request).
    Fall back to paginating if the field is missing.
    """
    cache_key = f"{CACHE_VERSION}:ultimate_children_count:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return int(cached)
    url = f"https://api.gleif.org/api/v1/lei-records/{lei}/ultimate-children"
    await _maybe_cancel(cancel_check)
    r = await _gleif_get(url, params={"page[size]": "1"}, timeout=30)
    if r.status_code == 404:
        lei_cache.set(cache_key, 0)
        return 0
    payload = r.json()
    # Fast path: use totalRecords from API metadata
    total_records = (payload.get("meta") or {}).get("paging", {}).get("totalRecords")
    if total_records is not None:
        total = int(total_records)
        lei_cache.set(cache_key, total)
        return total
    # Slow fallback: paginate
    total = len(payload.get("data") or [])
    next_url = (payload.get("links") or {}).get("next")
    page = 0
    while next_url and next_url != url and page < 50:
        page += 1
        await _maybe_cancel(cancel_check)
        url = next_url
        r = await _gleif_get(url, timeout=30)
        if r.status_code == 404:
            break
        payload = r.json()
        total += len(payload.get("data") or [])
        next_url = (payload.get("links") or {}).get("next")
    lei_cache.set(cache_key, total)
    return total

async def _fetch_direct_children_count(
    lei: str,
    cancel_check: Optional[Callable[[], Awaitable[bool]]] = None,
) -> int:
    """Get total direct-children count (prefers meta.paging.totalRecords)."""
    cache_key = f"{CACHE_VERSION}:direct_children_count:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return int(cached)
    url = f"https://api.gleif.org/api/v1/lei-records/{lei}/direct-children"
    await _maybe_cancel(cancel_check)
    r = await _gleif_get(url, params={"page[size]": "1"}, timeout=30)
    if r.status_code == 404:
        lei_cache.set(cache_key, 0)
        return 0
    payload = r.json()
    total_records = (payload.get("meta") or {}).get("paging", {}).get("totalRecords")
    if total_records is not None:
        total = int(total_records)
        lei_cache.set(cache_key, total)
        return total
    # Slow fallback
    total = len(payload.get("data") or [])
    next_url = (payload.get("links") or {}).get("next")
    page = 0
    while next_url and next_url != url and page < 50:
        page += 1
        await _maybe_cancel(cancel_check)
        url = next_url
        r = await _gleif_get(url, timeout=30)
        if r.status_code == 404:
            break
        payload = r.json()
        total += len(payload.get("data") or [])
        next_url = (payload.get("links") or {}).get("next")
    lei_cache.set(cache_key, total)
    return total

@app.get("/api/lei/{lei}", response_model=Optional[Row])
async def get_lei(lei: str, response: Response):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    response.headers["Cache-Control"] = "public, max-age=300"
    row = await _fetch_lei(lei)
    return row


@app.get("/api/search", response_model=List[Row])
async def search(q: str, response: Response):
    q = q.strip()
    if not q:
        return []
    response.headers["Cache-Control"] = "public, max-age=120"
    if LEI_PATTERN.match(q):
        row = await _fetch_lei(q)
        return [row] if row else []
    # name / autocomplete path
    r = await _gleif_get(
        "https://api.gleif.org/api/v1/autocompletions",
        params={"field": "fulltext", "q": q},
        timeout=20,
    )
    data = r.json().get("data") or []
    leis: List[str] = []
    for item in data:
        rel = (item.get("relationships") or {}).get("lei-records") or {}
        cand = (rel.get("data") or {}).get("id")
        if not cand:
            txt = (
                (item.get("attributes") or {}).get("lei")
                or (item.get("attributes") or {}).get("value")
                or (item.get("attributes") or {}).get("label")
                or ""
            )
            m = re.search(r"[A-Z0-9]{20}", str(txt).upper())
            cand = m.group(0) if m else None
        if cand and cand not in leis:
            leis.append(cand)

    leis = leis[:25]
    rows = await asyncio.gather(*[_fetch_lei(l) for l in leis])
    return [r for r in rows if r]


@app.get("/api/lei/{lei}/details", response_model=Optional[LeiDetails])
async def lei_details(lei: str, response: Response):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    response.headers["Cache-Control"] = "public, max-age=300"
    data = await _fetch_lei_raw(lei)
    if not data:
        return None
    return _map_details(data)


@app.get("/api/lei/{lei}/hierarchy", response_model=Optional[HierarchyNode])
async def lei_hierarchy(lei: str, request: Request, response: Response):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    response.headers["Cache-Control"] = "public, max-age=600"
    ultimate = await _fetch_ultimate_parent(lei)
    root_lei = ultimate or lei
    cancel_check = _make_cancel_check(request)
    tree = await _build_hierarchy(root_lei, cancel_check)
    return tree

@app.get("/api/lei/{lei}/hierarchy/flat", response_model=List[FlatNode])
async def lei_hierarchy_flat(lei: str, request: Request, response: Response):
    """Return entire hierarchy as a flat list – much faster than the tree endpoint.
    
    Each item has { parentLei, entity } so the frontend can reconstruct the tree.
    """
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    response.headers["Cache-Control"] = "public, max-age=600"
    ultimate = await _fetch_ultimate_parent(lei)
    root_lei = ultimate or lei
    cancel_check = _make_cancel_check(request)
    nodes = await _build_hierarchy_flat(root_lei, cancel_check=cancel_check)
    return nodes

@app.get("/api/lei/{lei}/ultimate-parent/row", response_model=Optional[Row])
async def lei_ultimate_parent_row(lei: str, response: Response):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    response.headers["Cache-Control"] = "public, max-age=300"
    ultimate = await _fetch_ultimate_parent(lei)
    root_lei = ultimate or lei
    row = await _fetch_lei(root_lei)
    return row

@app.get("/api/lei/{lei}/children", response_model=List[Row])
async def lei_direct_children(lei: str, request: Request, response: Response):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    response.headers["Cache-Control"] = "public, max-age=300"
    cancel_check = _make_cancel_check(request)
    rows = await _fetch_direct_children_rows(lei, cancel_check)
    return rows

@app.get("/api/lei/{lei}/direct-children/leis", response_model=List[str])
async def lei_direct_children_leis(lei: str, request: Request, response: Response):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    response.headers["Cache-Control"] = "public, max-age=300"
    cancel_check = _make_cancel_check(request)
    child_leis = await _fetch_direct_children(lei, cancel_check)
    return child_leis

@app.get("/api/lei/{lei}/hierarchy/shape", response_model=HierarchyShape)
async def lei_hierarchy_shape(lei: str, request: Request, response: Response):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    response.headers["Cache-Control"] = "public, max-age=600"
    ultimate = await _fetch_ultimate_parent(lei)
    root_lei = ultimate or lei
    cancel_check = _make_cancel_check(request)
    shape = await _compute_hierarchy_shape(root_lei, cancel_check=cancel_check)
    return shape

@app.get("/api/lei/{lei}/ultimate-children/count", response_model=int)
async def lei_ultimate_children_count(lei: str, request: Request, response: Response):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    response.headers["Cache-Control"] = "public, max-age=300"
    cancel_check = _make_cancel_check(request)
    count = await _fetch_ultimate_children_count(lei, cancel_check)
    return count

@app.get("/api/lei/{lei}/direct-children/count", response_model=int)
async def lei_direct_children_count(lei: str, request: Request, response: Response):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    response.headers["Cache-Control"] = "public, max-age=300"
    cancel_check = _make_cancel_check(request)
    count = await _fetch_direct_children_count(lei, cancel_check)
    return count

