from __future__ import annotations

import asyncio
import random
import re
import time
from collections import deque
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional, Set

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


LEI_PATTERN = re.compile(r"^[A-Z0-9]{20}$", re.I)


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


class TTLCache:
    def __init__(self, ttl_seconds: int = 300, max_size: int = 2048) -> None:
        self._ttl = ttl_seconds
        self._max = max_size
        self._store: Dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any:
        item = self._store.get(key)
        if not item:
            return None
        expires_at, value = item
        if time.time() > expires_at:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        if len(self._store) >= self._max:
            # best-effort simple eviction: remove one arbitrary item
            self._store.pop(next(iter(self._store)), None)
        self._store[key] = (time.time() + self._ttl, value)


CACHE_VERSION = "2"
lei_cache = TTLCache(ttl_seconds=600)


app = FastAPI(title="GLEIF Proxy API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _status_to_display(status: Optional[str]) -> Optional[str]:
    if not status:
        return None
    s = status.upper()
    mapping = {
        "ACTIVE": "Active",
        "LAPSED": "Lapsed",
        "RETIRED": "Retired",
        "MERGED": "Merged",
    }
    return mapping.get(s, s[:1] + s[1:].lower())


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
                # Evict old timestamps
                while self._calls and (now - self._calls[0]) > self._period:
                    self._calls.popleft()
                if len(self._calls) < self._max_calls:
                    self._calls.append(now)
                    return
                wait_for = self._period - (now - self._calls[0])
            # sleep outside the lock, add small jitter
            await asyncio.sleep(max(0.01, wait_for) + random.uniform(0, 0.05))


# Keep a little headroom under the documented 60 req/min limit
GLEIF_RATE_LIMITER = AsyncRateLimiter(max_calls=58, period_seconds=60.0)


async def _gleif_get(
    client: httpx.AsyncClient,
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    timeout: float | httpx.Timeout | None = 30.0,
    max_retries: int = 5,
) -> httpx.Response:
    base_backoff = 0.5
    for attempt in range(max_retries + 1):
        await GLEIF_RATE_LIMITER.acquire()
        try:
            r = await client.get(url, params=params, timeout=timeout)
        except httpx.HTTPError:
            # network/timeout -> backoff and retry
            if attempt >= max_retries:
                raise
            await asyncio.sleep(min(8.0, base_backoff * (2 ** attempt)) + random.uniform(0, 0.1))
            continue

        # 404: return directly; callers handle
        if r.status_code == 404:
            return r

        if r.status_code in (429, 500, 502, 503, 504):
            if attempt >= max_retries:
                r.raise_for_status()
            retry_after = r.headers.get("retry-after")
            sleep_seconds: float
            if retry_after is not None:
                try:
                    # seconds form
                    sleep_seconds = float(retry_after)
                except ValueError:
                    # HTTP-date form
                    try:
                        when = parsedate_to_datetime(retry_after)
                        sleep_seconds = max(0.5, (when - parsedate_to_datetime(r.headers.get("date", ""))).total_seconds())
                    except (ValueError, TypeError, OverflowError):
                        sleep_seconds = min(8.0, base_backoff * (2 ** attempt))
            else:
                sleep_seconds = min(8.0, base_backoff * (2 ** attempt))
            await asyncio.sleep(sleep_seconds + random.uniform(0, 0.1))
            continue

        # other 4xx/5xx errors should raise
        r.raise_for_status()
        return r

    # Should not reach here
    raise HTTPException(status_code=502, detail="GLEIF upstream not available")


async def _fetch_lei(client: httpx.AsyncClient, lei: str) -> Optional[Row]:
    cache_key = f"{CACHE_VERSION}:lei:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return cached
    r = await _gleif_get(client, f"https://api.gleif.org/api/v1/lei-records/{lei}", timeout=20)
    if r.status_code == 404:
        return None
    data = r.json().get("data")
    if not data:
        return None
    row = _map_row(data)
    lei_cache.set(cache_key, row)
    return row


async def _fetch_lei_raw(client: httpx.AsyncClient, lei: str) -> Optional[dict]:
    cache_key = f"{CACHE_VERSION}:lei_raw:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return cached
    r = await _gleif_get(client, f"https://api.gleif.org/api/v1/lei-records/{lei}", timeout=20)
    if r.status_code == 404:
        return None
    data = r.json().get("data")
    if not data:
        return None
    lei_cache.set(cache_key, data)
    return data


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


async def _fetch_ultimate_parent(client: httpx.AsyncClient, lei: str) -> Optional[str]:
    r = await _gleif_get(client, f"https://api.gleif.org/api/v1/lei-records/{lei}/ultimate-parent", timeout=20)
    if r.status_code == 404:
        return None
    data = r.json().get("data")
    if not data:
        return None
    return data.get("id") or (data.get("attributes") or {}).get("lei")


async def _fetch_direct_children(client: httpx.AsyncClient, lei: str) -> List[str]:
    url = f"https://api.gleif.org/api/v1/lei-records/{lei}/direct-children?page[size]=200"
    leis: List[str] = []
    for _ in range(10):  # safety cap
        r = await _gleif_get(client, url, timeout=30)
        if r.status_code == 404:
            break
        payload = r.json()
        items = payload.get("data") or []
        for item in items:
            cand = (item.get("attributes") or {}).get("lei") or item.get("id")
            if cand:
                leis.append(str(cand))
        links = payload.get("links") or {}
        next_url = links.get("next")
        if not next_url or next_url == url:
            break
        url = next_url
    return leis

async def _fetch_direct_children_rows(client: httpx.AsyncClient, lei: str) -> List[Row]:
    cache_key = f"{CACHE_VERSION}:children_rows:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return list(cached)
    url = f"https://api.gleif.org/api/v1/lei-records/{lei}/direct-children?page[size]=200"
    rows: List[Row] = []
    for _ in range(10):  # safety cap
        r = await _gleif_get(client, url, timeout=30)
        if r.status_code == 404:
            break
        payload = r.json()
        items = payload.get("data") or []
        for item in items:
            # Be strict about expected keys; skip malformed items without broad except
            attrs = item.get("attributes") if isinstance(item, dict) else None
            if not isinstance(attrs, dict):
                continue
            try:
                row = _map_row(item)
            except (KeyError, TypeError, ValueError):
                continue
            rows.append(row)
        links = payload.get("links") or {}
        next_url = links.get("next")
        if not next_url or next_url == url:
            break
        url = next_url
    lei_cache.set(cache_key, rows)
    return rows
async def _compute_hierarchy_shape(client: httpx.AsyncClient, root_lei: str, max_nodes: int = 20000) -> HierarchyShape:
    cache_key = f"{CACHE_VERSION}:shape:v2:{root_lei}:{max_nodes}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return cached

    # Get direct children of root once for accuracy
    root_children = await _fetch_direct_children(client, root_lei)

    # BFS over relationship graph using only LEI IDs to estimate max depth and visited count
    visited: set[str] = set([root_lei])
    frontier: List[str] = list(root_children)
    depth = 0
    semaphore = asyncio.Semaphore(4)

    async def fetch_ids(lei: str) -> List[str]:
        async with semaphore:
            try:
                return await _fetch_direct_children(client, lei)
            except (httpx.HTTPError, ValueError):
                return []

    while frontier and len(visited) < max_nodes:
        depth += 1
        next_level: List[str] = []
        results = await asyncio.gather(*[fetch_ids(x) for x in frontier], return_exceptions=False)
        for ids in results:
            for cid in ids:
                if cid not in visited:
                    visited.add(cid)
                    next_level.append(cid)
                    if len(visited) >= max_nodes:
                        break
            if len(visited) >= max_nodes:
                break
        frontier = next_level

    # Use authoritative ultimate-children count
    ultimate_cnt = await _fetch_ultimate_children_count(client, root_lei)
    shape = HierarchyShape(
        maxDepth=depth,
        directChildrenCount=len(root_children),
        descendantsCount=max(0, len(visited) - 1),
        ultimateChildrenCount=int(ultimate_cnt),
        visitedCount=len(visited),
    )
    lei_cache.set(cache_key, shape)
    return shape



async def _build_hierarchy(client: httpx.AsyncClient, root_lei: str) -> Optional[HierarchyNode]:
    visited: Set[str] = set()

    async def build(lei: str) -> Optional[HierarchyNode]:
        if lei in visited:
            return None
        visited.add(lei)
        row = await _fetch_lei(client, lei)
        if not row:
            return None
        child_leis = await _fetch_direct_children(client, lei)
        children_nodes_raw = await asyncio.gather(*[build(c) for c in child_leis])
        children_nodes = [c for c in children_nodes_raw if c]
        return HierarchyNode(entity=row, children=children_nodes)

    return await build(root_lei)


async def _fetch_ultimate_children_count(client: httpx.AsyncClient, lei: str) -> int:
    cache_key = f"{CACHE_VERSION}:ultimate_children_count:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return int(cached)
    url = f"https://api.gleif.org/api/v1/lei-records/{lei}/ultimate-children?page[size]=200"
    total = 0
    for _ in range(50):  # safety cap
        r = await _gleif_get(client, url, timeout=30)
        if r.status_code == 404:
            break
        payload = r.json()
        items = payload.get("data") or []
        total += len(items)
        links = payload.get("links") or {}
        next_url = links.get("next")
        if not next_url or next_url == url:
            break
        url = next_url
    lei_cache.set(cache_key, total)
    return total

async def _fetch_direct_children_count(client: httpx.AsyncClient, lei: str) -> int:
    cache_key = f"{CACHE_VERSION}:direct_children_count:{lei}"
    cached = lei_cache.get(cache_key)
    if cached is not None:
        return int(cached)
    url = f"https://api.gleif.org/api/v1/lei-records/{lei}/direct-children?page[size]=200"
    total = 0
    for _ in range(50):  # safety cap
        r = await _gleif_get(client, url, timeout=30)
        if r.status_code == 404:
            break
        payload = r.json()
        items = payload.get("data") or []
        total += len(items)
        links = payload.get("links") or {}
        next_url = links.get("next")
        if not next_url or next_url == url:
            break
        url = next_url
    lei_cache.set(cache_key, total)
    return total

@app.get("/api/lei/{lei}", response_model=Optional[Row])
async def get_lei(lei: str):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    async with httpx.AsyncClient() as client:
        row = await _fetch_lei(client, lei)
        return row


@app.get("/api/search", response_model=List[Row])
async def search(q: str):
    q = q.strip()
    if not q:
        return []
    async with httpx.AsyncClient() as client:
        if LEI_PATTERN.match(q):
            row = await _fetch_lei(client, q)
            return [row] if row else []
        # name path
        r = await _gleif_get(
            client,
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

        # limit fan-out
        leis = leis[:25]
        rows = await asyncio.gather(*[_fetch_lei(client, l) for l in leis])
        return [r for r in rows if r]


@app.get("/api/lei/{lei}/details", response_model=Optional[LeiDetails])
async def lei_details(lei: str):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    async with httpx.AsyncClient() as client:
        data = await _fetch_lei_raw(client, lei)
        if not data:
            return None
        return _map_details(data)


@app.get("/api/lei/{lei}/hierarchy", response_model=Optional[HierarchyNode])
async def lei_hierarchy(lei: str):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    async with httpx.AsyncClient() as client:
        # find ultimate parent (if 404, the entity itself is ultimate parent)
        ultimate = await _fetch_ultimate_parent(client, lei)
        root_lei = ultimate or lei
        tree = await _build_hierarchy(client, root_lei)
        return tree

@app.get("/api/lei/{lei}/ultimate-parent/row", response_model=Optional[Row])
async def lei_ultimate_parent_row(lei: str):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    async with httpx.AsyncClient() as client:
        ultimate = await _fetch_ultimate_parent(client, lei)
        root_lei = ultimate or lei
        row = await _fetch_lei(client, root_lei)
        return row

@app.get("/api/lei/{lei}/children", response_model=List[Row])
async def lei_direct_children(lei: str):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    async with httpx.AsyncClient() as client:
        # Fast-path: use attributes from direct-children pages to avoid per-child record calls
        rows = await _fetch_direct_children_rows(client, lei)
        return rows

@app.get("/api/lei/{lei}/direct-children/leis", response_model=List[str])
async def lei_direct_children_leis(lei: str):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    async with httpx.AsyncClient() as client:
        child_leis = await _fetch_direct_children(client, lei)
        return child_leis

@app.get("/api/lei/{lei}/hierarchy/shape", response_model=HierarchyShape)
async def lei_hierarchy_shape(lei: str):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    async with httpx.AsyncClient() as client:
        ultimate = await _fetch_ultimate_parent(client, lei)
        root_lei = ultimate or lei
        shape = await _compute_hierarchy_shape(client, root_lei)
        return shape

@app.get("/api/lei/{lei}/ultimate-children/count", response_model=int)
async def lei_ultimate_children_count(lei: str):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    async with httpx.AsyncClient() as client:
        count = await _fetch_ultimate_children_count(client, lei)
        return count

@app.get("/api/lei/{lei}/direct-children/count", response_model=int)
async def lei_direct_children_count(lei: str):
    if not LEI_PATTERN.match(lei):
        raise HTTPException(status_code=400, detail="Invalid LEI format")
    async with httpx.AsyncClient() as client:
        count = await _fetch_direct_children_count(client, lei)
        return count

