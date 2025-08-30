import { useEffect, useMemo, useRef, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Search, ChevronRight, ChevronDown, Building2, Users, Percent, Calendar, Info, CheckCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
// Lightweight map using remote TopoJSON and d3-geo for centroids
import { geoEquirectangular, geoPath } from "d3-geo"
import { feature } from "topojson-client"
import worldCountries from "world-countries"

type Row = {
  lei: string
  legalName?: string
  status?: string
  jurisdiction?: string
  countryCode?: string
  lastUpdate?: string
  spglobal?: string[]
}

interface HierarchyNode {
  entity: Row
  children?: HierarchyNode[]
}
interface LazyNode {
  entity: Row
  hasFetched?: boolean
  children?: LazyNode[]
}

export function HierarchyPage() {
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000"
  const [searchLEI, setSearchLEI] = useState("5493001KJTIIGC8Y1R12")
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [tree, setTree] = useState<LazyNode | null>(null)
  const [countryFeatures, setCountryFeatures] = useState<any[] | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const [etaSec, setEtaSec] = useState<number | null>(null)
  const [childCounts, setChildCounts] = useState<Record<string, number>>({})
  const deepRunIdRef = useRef(0)
  const [deepStatus, setDeepStatus] = useState<{ loaded: number; total: number | null; inProgress: boolean }>({ loaded: 0, total: null, inProgress: false })

  useEffect(() => {
    const loadWorld = async () => {
      try {
        const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const topo = await res.json()
        const geo = feature(topo, topo.objects.countries) as any
        setCountryFeatures(geo.features || [])
      } catch (e) {
        console.warn("Failed to load world map; continuing without country outlines", e)
        setCountryFeatures([])
      }
    }
    loadWorld()
  }, [])

  // Initialize on mount: prefer session handoff; otherwise load default
  useEffect(() => {
    const lei = sessionStorage.getItem('hierarchyLEI')
    if (lei) {
      sessionStorage.removeItem('hierarchyLEI')
      setSearchLEI(lei)
      void loadHierarchy(lei)
    } else if (!tree && searchLEI) {
      void loadHierarchy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Allow live updates if already on the hierarchy page
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const nextLei = event?.detail?.lei as string | undefined
      if (nextLei && typeof nextLei === 'string') {
        setSearchLEI(nextLei)
        void loadHierarchy(nextLei)
      }
    }
    window.addEventListener('hierarchy:set-lei', handler as EventListener)
    return () => window.removeEventListener('hierarchy:set-lei', handler as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleNode = (lei: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(lei)) {
      newExpanded.delete(lei)
    } else {
      newExpanded.add(lei)
    }
    setExpandedNodes(newExpanded)
  }

  const fetchChildren = async (lei: string): Promise<LazyNode[]> => {
    const res = await fetch(`${API_BASE}/api/lei/${encodeURIComponent(lei)}/children`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const rows = (await res.json()) as Row[]
    return rows.map((r) => ({ entity: r, hasFetched: false, children: [] }))
  }

  const renderHierarchyNode = (node: LazyNode, depth: number): React.ReactNode => {
    const hasChildren = !!(node.children && node.children.length > 0)
    const nodeId = node.entity.lei
    const knownCount = childCounts[nodeId]
    const showArrow = typeof knownCount === 'number' ? knownCount > 0 : (node.hasFetched ? hasChildren : false)
    const isExpanded = expandedNodes.has(nodeId)
    
    return (
      <div key={nodeId} className="space-y-2">
        <div 
          className={`flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 ${
            depth === 0 ? 'bg-primary/5 border-primary/20' : ''
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {showArrow ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                // On expand, lazy-fetch children if not fetched yet
                const willExpand = !expandedNodes.has(nodeId)
                if (willExpand && !node.hasFetched) {
                  try {
                    const kids = await fetchChildren(node.entity.lei)
                    node.children = kids
                    node.hasFetched = true
                    setTree(tree ? { ...tree } : tree)
                  } catch (e) {
                    console.error('Failed to fetch children', e)
                  }
                }
                toggleNode(nodeId)
              }}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}
          
          <Building2 className="h-4 w-4 text-muted-foreground" />
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{node.entity.legalName || node.entity.lei}</span>
              {depth === 0 && <Badge variant="outline">Ultimate Parent</Badge>}
              {depth > 0 && <Badge variant="secondary">Subsidiary</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">
              {node.entity.lei}
              {node.entity.status ? ` • ${node.entity.status}` : ""}
              {node.entity.jurisdiction ? ` • ${node.entity.jurisdiction}` : ""}
              {Array.isArray(node.entity.spglobal) && node.entity.spglobal.length > 0 ? ` • S&P: ${node.entity.spglobal.join(", ")}` : ""}
              {node.entity.lastUpdate ? ` • Updated: ${node.entity.lastUpdate}` : ""}
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {node.children!.map(child => renderHierarchyNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const loadHierarchy = async (overrideLei?: string) => {
    const q = ((overrideLei ?? searchLEI) || "").trim()
    if (!q) return
    setIsLoading(true)
    setProgress({ current: 0, total: 0 })
    try {
      // Load only ultimate parent row for lazy root
      const res = await fetch(`${API_BASE}/api/lei/${encodeURIComponent(q)}/ultimate-parent/row`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rootRow = (await res.json()) as Row | null
      const rootNode: LazyNode | null = rootRow ? { entity: rootRow, hasFetched: false, children: [] } : null
      setTree(rootNode)
      const next = new Set<string>()
      if (rootRow?.lei) next.add(rootRow.lei)
      setExpandedNodes(next)

      // If possible, set an expected total upfront so the UI doesn't stay in "Preparing..."
      let expectedTotal: number | null = null
      if (rootRow?.lei) {
        try {
          const cntRes = await fetch(`${API_BASE}/api/lei/${encodeURIComponent(rootRow.lei)}/direct-children/count`)
          if (cntRes.ok) {
            const cnt = await cntRes.json()
            const total = Number(cnt) || 0
            expectedTotal = total
            setProgress({ current: 0, total })
          }
        } catch {}
      }

      // Fetch first-level (direct) children in one request and attach immediately
      if (rootRow) {
        const rowsRes = await fetch(`${API_BASE}/api/lei/${encodeURIComponent(rootRow.lei)}/children`)
        if (rowsRes.ok) {
          const rows = (await rowsRes.json()) as Row[]
          setTree({
            entity: rootRow,
            hasFetched: true,
            children: rows.map((r) => ({ entity: r, hasFetched: false, children: [] })),
          })
          setProgress({ current: rows.length, total: expectedTotal ?? rows.length })
          setEtaSec(0)
        }
      }
    } catch (e) {
      console.error("Failed to load hierarchy", e)
      setTree(null)
    } finally {
      setIsLoading(false)
    }
  }



  // Determine which nodes are visible (rendered) based on expansion state
  const visibleNodeIds = useMemo(() => {
    const ids: string[] = []
    const walk = (node: LazyNode | null | undefined): void => {
      if (!node) return
      const id = node.entity?.lei
      if (!id) return
      ids.push(id)
      if (expandedNodes.has(id)) {
        for (const c of node.children || []) walk(c)
      }
    }
    walk(tree)
    return ids
  }, [tree, expandedNodes])

  // Fetch direct-children counts for visible nodes to decide arrow visibility
  useEffect(() => {
    const unfetched = visibleNodeIds.filter((id) => !(id in childCounts))
    if (unfetched.length === 0) return
    let cancelled = false
    const limit = 6
    const run = async () => {
      for (let i = 0; i < unfetched.length; i += limit) {
        const slice = unfetched.slice(i, i + limit)
        const results = await Promise.all(
          slice.map(async (id) => {
            try {
              const res = await fetch(`${API_BASE}/api/lei/${encodeURIComponent(id)}/direct-children/count`)
              if (!res.ok) return [id, 0] as const
              const n = await res.json()
              return [id, Number(n) || 0] as const
            } catch {
              return [id, 0] as const
            }
          })
        )
        if (!cancelled) {
          setChildCounts((prev) => {
            const next = { ...prev }
            for (const [id, n] of results) next[id] = n
            return next
          })
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [visibleNodeIds, API_BASE, childCounts])

  useEffect(() => {
    if (!tree) return
    if (!tree.hasFetched || !(tree.children && tree.children.length > 0)) return
    deepRunIdRef.current += 1
    const runId = deepRunIdRef.current
    setDeepStatus((s) => ({ loaded: (tree.children?.length || 0), total: s.total, inProgress: true }))
    let cancelled = false

    const bfs = async () => {
      const queue: LazyNode[] = [...(tree.children || [])]
      while (queue.length > 0 && !cancelled && deepRunIdRef.current === runId) {
        const node = queue.shift() as LazyNode
        if (!node.hasFetched) {
          try {
            const kids = await fetchChildren(node.entity.lei)
            node.children = kids
            node.hasFetched = true
            for (const k of kids) queue.push(k)
            setTree((prev) => (prev ? { ...prev } : prev))
            setDeepStatus((s) => ({ ...s, loaded: s.loaded + kids.length }))
          } catch {}
        }
        await new Promise((r) => setTimeout(r, 0))
      }
      if (!cancelled && deepRunIdRef.current === runId) {
        setDeepStatus((s) => ({ ...s, inProgress: false }))
      }
    }

    bfs()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree?.entity?.lei, tree?.hasFetched, (tree?.children || []).length])

  // Fetch authoritative shape (max depth, direct and ultimate children) from backend for accuracy
  const [shape, setShape] = useState<{ maxDepth: number; directChildrenCount: number; descendantsCount: number; ultimateChildrenCount: number; visitedCount: number } | null>(null)
  useEffect(() => {
    const loadShape = async () => {
      const lei = tree?.entity?.lei
      if (!lei) return
      try {
        const res = await fetch(`${API_BASE}/api/lei/${encodeURIComponent(lei)}/hierarchy/shape`)
        if (!res.ok) return
        const json = await res.json()
        setShape(json)
      } catch {}
    }
    loadShape()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree?.entity?.lei])

  useEffect(() => {
    if (shape && typeof shape.descendantsCount === 'number') {
      setDeepStatus((s) => ({ ...s, total: shape.descendantsCount }))
    }
  }, [shape])

  

  const normalizeCountry = (candidate: string | undefined | null): string | null => {
    if (!candidate) return null
    let value = String(candidate).trim()
    if (!value) return null
    // drop suffixes like US-DE
    if (value.includes("-")) value = value.split("-")[0]
    const code = value.toUpperCase()
    const aliases: Record<string, string> = { UK: "GB", EL: "GR" }
    if (aliases[code]) return aliases[code]
    // direct ISO2
    if (/^[A-Z]{2}$/.test(code)) return code
    // ISO3 → ISO2, or name → ISO2 using world-countries
    try {
      const all = worldCountries as any[]
      const lower = value.toLowerCase()
      for (const c of all) {
        if (String(c.cca3 || "").toUpperCase() === code) return String(c.cca2 || "").toUpperCase() || null
        const names = [c.name?.common, c.name?.official, ...(c.altSpellings || []), c.cioc]
        for (const n of names) {
          if (!n) continue
          if (String(n).toLowerCase() === lower) return String(c.cca2 || "").toUpperCase() || null
        }
      }
    } catch {}
    return null
  }

  const getCountryName = (iso2: string): string => {
    try {
      const rec = (worldCountries as any[]).find((c: any) => String(c.cca2 || "").toUpperCase() === iso2)
      return rec?.name?.common || iso2
    } catch {
      return iso2
    }
  }

  const countryStats = useMemo(() => {
    if (!tree) return [] as { code: string; name: string; count: number }[]
    const counts = new Map<string, number>()
    const walk = (node: LazyNode) => {
      const code = normalizeCountry(node.entity.countryCode || node.entity.jurisdiction)
      if (code) counts.set(code, (counts.get(code) || 0) + 1)
      for (const child of node.children || []) walk(child)
    }
    walk(tree)
    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, name: getCountryName(code), count }))
      .sort((a, b) => b.count - a.count)
  }, [tree])

  // Analysis metrics derived from the currently loaded tree
  const analysis = useMemo(() => {
    if (!tree) return null as null | any

    const totalNodesAndStats = () => {
      let total = 0
      let maxDepth = 0
      const depthCounts = new Map<number, number>()
      const breadth: number[] = []
      const countryCount = new Map<string, number>()
      const statusCount = new Map<string, number>()
      const stalenessDays: number[] = []
      let missingCountry = 0
      let missingName = 0
      let missingUpdate = 0

      const daysBetween = (d: string) => {
        const dt = new Date(d)
        if (isNaN(dt.getTime())) return null
        const ms = Date.now() - dt.getTime()
        return Math.floor(ms / (1000 * 60 * 60 * 24))
      }

      const walk = (node: LazyNode, depth: number) => {
        total += 1
        if (depth > maxDepth) maxDepth = depth
        depthCounts.set(depth, (depthCounts.get(depth) || 0) + 1)

        const kids = node.children?.length || 0
        breadth.push(kids)

        const country = normalizeCountry(node.entity.countryCode || node.entity.jurisdiction)
        if (country) countryCount.set(country, (countryCount.get(country) || 0) + 1)
        else missingCountry += 1

        const status = (node.entity.status || '').toString()
        if (status) statusCount.set(status, (statusCount.get(status) || 0) + 1)

        const name = node.entity.legalName || ''
        if (!name) missingName += 1

        const lu = node.entity.lastUpdate
        if (lu) {
          const d = daysBetween(lu)
          if (d !== null) stalenessDays.push(d)
        } else {
          missingUpdate += 1
        }

        for (const c of node.children || []) walk(c, depth + 1)
      }

      walk(tree, 0)

      const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
      const percentile = (arr: number[], p: number) => {
        if (!arr.length) return 0
        const a = [...arr].sort((x, y) => x - y)
        const idx = Math.min(a.length - 1, Math.max(0, Math.floor((p / 100) * a.length)))
        return a[idx]
      }
      const median = (arr: number[]) => percentile(arr, 50)

      const countries = Array.from(countryCount.entries()).map(([code, count]) => ({ code, name: getCountryName(code), count }))
      countries.sort((a, b) => b.count - a.count)
      const numCountries = countries.length
      const topCountryShare = total ? (countries[0]?.count || 0) / total : 0
      const hhi = total ? Math.round(countries.reduce((sum, c) => sum + Math.pow((100 * c.count) / total, 2), 0)) : 0

      const avgChildren = avg(breadth)
      const p75Children = percentile(breadth, 75)
      const maxFanOut = Math.max(0, ...breadth)
      const medianStaleness = stalenessDays.length ? median(stalenessDays) : null

      const active = (statusCount.get('Active') || 0)
      const nonActive = total - active
      const nonActivePct = total ? (100 * nonActive) / total : 0

      const missingCountryPct = total ? (100 * missingCountry) / total : 0
      const missingNamePct = total ? (100 * missingName) / total : 0
      const missingUpdatePct = total ? (100 * missingUpdate) / total : 0

      const complexityScore = Math.min(100, Math.round(15 * Math.log1p(maxDepth) + 20 * Math.log1p(avgChildren) + 10 * Math.log1p(total / 25)))

      const level = (val: number, [lo, hi]: [number, number]) => (val > hi ? 'High' : val > lo ? 'Medium' : 'Low')

      const concentrationRisk = (() => {
        if (hhi > 2500 || topCountryShare > 0.6) return 'High'
        if (hhi > 1800 || topCountryShare > 0.4) return 'Medium'
        return 'Low'
      })()
      const depthRisk = level(maxDepth, [2, 4])
      const opacityRisk = level(Math.max(missingCountryPct, missingUpdatePct, missingNamePct), [5, 20])
      const stalenessRisk = level(medianStaleness ?? 0, [180, 365])
      const statusRisk = level(nonActivePct, [5, 20])
      const fanoutRisk = level(maxFanOut, [20, 100])

      return {
        total,
        maxDepth,
        depthCounts: Array.from(depthCounts.entries()).sort((a, b) => a[0] - b[0]),
        numCountries,
        countries,
        hhi,
        topCountryShare: Math.round(topCountryShare * 100),
        avgChildren: Number(avgChildren.toFixed(2)),
        p75Children,
        medianStaleness,
        missingCountryPct: Math.round(missingCountryPct),
        missingNamePct: Math.round(missingNamePct),
        missingUpdatePct: Math.round(missingUpdatePct),
        nonActivePct: Math.round(nonActivePct),
        maxFanOut,
        complexityScore,
        risks: { concentrationRisk, depthRisk, opacityRisk, stalenessRisk, statusRisk, fanoutRisk },
      }
    }

    return totalNodesAndStats()
  }, [tree])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Corporate Hierarchy</h1>
        <p className="text-muted-foreground">
          Visualize ownership structures and relationships between legal entities.
        </p>
      </div>

      <Tabs defaultValue="hierarchy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hierarchy">Hierarchy View</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="network">Network Graph</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Entity</CardTitle>
              <CardDescription>Enter an LEI code to explore its corporate hierarchy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter LEI code..."
                    className="pl-8 font-mono"
                    value={searchLEI}
                    onChange={(e) => setSearchLEI(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') loadHierarchy()
                    }}
                  />
                </div>
                <Button onClick={() => loadHierarchy()} disabled={isLoading} data-hierarchy-search-button>
                  {isLoading ? 'Loading...' : 'Load Hierarchy'}
                </Button>
              </div>
              {tree?.entity && (
                <Alert>
                  <AlertTitle>Ultimate parent</AlertTitle>
                  <AlertDescription>
                    {tree.entity.legalName || tree.entity.lei} ({tree.entity.lei})
                  </AlertDescription>
                </Alert>
              )}
              {(isLoading || progress.total > 0) && (
                <div className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const c = Math.min(progress.current, progress.total)
                    const t = progress.total
                    const pct = t > 0 ? Math.round((c / t) * 100) : 0
                    const secs = etaSec ?? null
                    const fmt = (s: number) => {
                      const sec = Math.max(0, Math.round(s))
                      const m = Math.floor(sec / 60)
                      const r = sec % 60
                      return `${m}:${String(r).padStart(2, '0')}`
                    }
                    const etaText = secs !== null && secs > 0 ? ` • ≈ ${fmt(secs)} remaining` : secs === 0 ? ' • Done' : ''
                    return t > 0 ? `Loading direct children (${c} / ${t}, ${pct}%)${etaText}` : 'Preparing...'
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Corporate Structure</CardTitle>
                  <CardDescription>
                    {tree?.entity?.legalName ? `Ownership hierarchy for ${tree.entity.legalName}` : 'Enter an LEI and load hierarchy'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setExpandedNodes(new Set())}>
                    Collapse All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const allNodes = new Set<string>()
                    const addNodes = (node: LazyNode | null | undefined) => {
                      if (!node) return
                      if (node.entity?.lei) allNodes.add(node.entity.lei)
                      if (node.children) node.children.forEach(addNodes)
                    }
                    addNodes(tree)
                    setExpandedNodes(allNodes)
                  }}>
                    Expand All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tree ? renderHierarchyNode(tree, 0) : (
                  <div className="text-sm text-muted-foreground">No data loaded</div>
                )}
              </div>
              {(progress.total > 0) && (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    {(() => {
                      const c = Math.min(progress.current, progress.total)
                      const t = progress.total
                      const pct = t > 0 ? Math.round((c / t) * 100) : 0
                      const secs = etaSec ?? null
                      const fmt = (s: number) => {
                        const sec = Math.max(0, Math.round(s))
                        const m = Math.floor(sec / 60)
                        const r = sec % 60
                        return `${m}:${String(r).padStart(2, '0')}`
                      }
                      const etaText = secs !== null && secs > 0 ? ` • ≈ ${fmt(secs)} remaining` : secs === 0 ? ' • Done' : ''
                      return `Loading direct children (${c} / ${t}, ${pct}%)${etaText}`
                    })()}
                  </div>
                  <div className="h-2 bg-muted rounded">
                    <div className="h-2 bg-primary rounded" style={{ width: `${Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%` }} />
                  </div>
                  {progress.total > 0 && progress.current >= progress.total && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span>Direct children fully loaded</span>
                    </div>
                  )}
                  {deepStatus.inProgress && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>
                        Loading descendants in background
                        {typeof deepStatus.total === 'number' ? ` (${Math.min(deepStatus.loaded, deepStatus.total)} / ${deepStatus.total})` : ` (${deepStatus.loaded})`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Direct Relationships</CardTitle>
                <CardDescription>Immediate parent and subsidiary relationships</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  if (!tree) return (<div className="text-sm text-muted-foreground">No data loaded</div>)
                  const targetLei = (searchLEI || "").trim().toUpperCase()
                  const dfs = (node: LazyNode, parent: LazyNode | null): { node: LazyNode | null, parent: LazyNode | null } => {
                    if (node.entity.lei.toUpperCase() === targetLei) return { node, parent }
                    for (const child of node.children || []) {
                      const found = dfs(child, node)
                      if (found.node) return found
                    }
                    return { node: null, parent: null }
                  }
                  const { node: focused, parent } = dfs(tree, null)
                  const items: Array<{ type: string, name: string, lei: string, relationship: string }> = []
                  if (focused) {
                    const isUltimate = !parent
                    const parentEntity = isUltimate ? focused.entity : parent!.entity
                    items.push({ type: "Parent", name: parentEntity.legalName || parentEntity.lei, lei: parentEntity.lei, relationship: isUltimate ? "Ultimate Parent" : "Direct parent" })
                    for (const child of focused.children || []) {
                      const e = child.entity
                      items.push({ type: "Subsidiary", name: e.legalName || e.lei, lei: e.lei, relationship: "Direct subsidiary" })
                    }
                  }
                  if (items.length === 0) return (<div className="text-sm text-muted-foreground">No direct relationships found</div>)
                  return items.map((rel, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{rel.name}</div>
                        <div className="text-sm text-muted-foreground">{rel.lei}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{rel.type}</Badge>
                      <div className="text-xs text-muted-foreground mt-1">{rel.relationship}</div>
                    </div>
                  </div>
                  ))
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Relationship Summary</CardTitle>
                <CardDescription>Overview of corporate structure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  // Compute stats from the loaded tree
                  const stats = (() => {
                    if (!tree) {
                      return { total: 0, subs: 0, maxDepth: 0, juris: [] as { jurisdiction: string; count: number; percentage: number }[] }
                    }
                    let total = 0
                    let maxDepth = 0
                    const counts = new Map<string, number>()
                    const walk = (node: HierarchyNode, depth: number) => {
                      total += 1
                      if (depth > maxDepth) maxDepth = depth
                      const j = node.entity.jurisdiction || "Unknown"
                      counts.set(j, (counts.get(j) || 0) + 1)
                      for (const child of node.children || []) walk(child, depth + 1)
                    }
                    walk(tree, 0)
                    const subs = Math.max(total - 1, 0)
                    const jurisArray = Array.from(counts.entries()).map(([jurisdiction, count]) => ({ jurisdiction, count }))
                    jurisArray.sort((a, b) => b.count - a.count)
                    const juris = jurisArray.map((item) => ({ ...item, percentage: total > 0 ? Math.round((item.count / total) * 100) : 0 }))
                    return { total, subs, maxDepth, juris }
                  })()

                  return (
                    <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded">
                    <Building2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Entities</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <div className="text-2xl font-bold">{stats.subs}</div>
                    <div className="text-sm text-muted-foreground">Subsidiaries</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Percent className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <div className="text-2xl font-bold">N/A</div>
                    <div className="text-sm text-muted-foreground">Avg Ownership</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <div className="text-2xl font-bold">{stats.maxDepth}</div>
                    <div className="text-sm text-muted-foreground">Max Depth</div>
                  </div>
                </div>

                      <div className="space-y-2 mt-2">
                  <h4>Jurisdictions</h4>
                        {stats.juris.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No jurisdiction data</div>
                        ) : (
                          stats.juris.map((jurisdiction, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{jurisdiction.jurisdiction}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{jurisdiction.count}</span>
                        <div className="w-16 h-2 bg-muted rounded-full">
                                  <div className="h-2 bg-primary rounded-full" style={{ width: `${jurisdiction.percentage}%` }} />
                        </div>
                      </div>
                    </div>
                          ))
                        )}
                </div>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Visualization</CardTitle>
              <CardDescription>Global map of the ownership hierarchy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[520px] border rounded-lg overflow-hidden">
                <svg viewBox="0 0 800 420" className="w-full h-full bg-white">
                  {(() => {
                      // Build features from either fetched world-atlas or world-countries
                      const allFeatures: any[] = (countryFeatures && countryFeatures.length > 0)
                        ? countryFeatures
                        : (worldCountries as any[]).map((c: any) => ({
                            type: "Feature",
                            geometry: c.geometry,
                            properties: { cca2: c.cca2 },
                          }))

                      // Projection and path generator fit to viewBox
                      const projection = geoEquirectangular().fitSize([800, 420], {
                        type: "FeatureCollection",
                        features: allFeatures as any,
                      } as any)
                      const pathGen = geoPath(projection as any)

                      // Position lookup by ISO A2 using world-countries lat/lng (more reliable than polygon centroid)
                      const posByIso: Record<string, [number, number]> = {}
                      const isValidPoint = (p: any): p is [number, number] => Array.isArray(p) && isFinite(p[0]) && isFinite(p[1])
                      for (const c of (worldCountries as any[])) {
                        const iso = String(c.cca2 || "").toUpperCase()
                        if (!iso) continue
                        const latlng = c.latlng as [number, number] | undefined
                        if (!latlng || latlng.length !== 2) continue
                        const lat = Number(latlng[0])
                        const lon = Number(latlng[1])
                        const p = (projection as any)([lon, lat]) as [number, number]
                        if (isValidPoint(p)) posByIso[iso] = p
                      }

                      // Flatten nodes and edges
                      const flatNodes: Array<{ lei: string; name: string; country: string | null }> = []
                      const edges: Array<{ from: string; to: string }> = []
                      const walk = (node: LazyNode) => {
                        const country = normalizeCountry(node.entity.countryCode || node.entity.jurisdiction)
                        flatNodes.push({ lei: node.entity.lei, name: node.entity.legalName || node.entity.lei, country })
                        for (const child of node.children || []) {
                          edges.push({ from: node.entity.lei, to: child.entity.lei })
                          walk(child)
                        }
                      }
                      if (tree) {
                        walk(tree)
                      }

                      const positionByLei: Record<string, [number, number] | null> = {}
                      for (const n of flatNodes) {
                        const code = n.country ? n.country.toUpperCase() : null
                        const p = code ? posByIso[code] : undefined
                        positionByLei[n.lei] = (p && isValidPoint(p)) ? p : null
                      }

                      const countryPaths = allFeatures.map((f: any, i: number) => (
                        <path key={`c-${i}`} d={String(pathGen(f))} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={0.6} />
                      ))

                      // Draw edges and nodes if we have a tree
                      let edgeLines: (React.ReactElement | null)[] = []
                      let nodeCircles: (React.ReactElement | null)[] = []
                      if (tree && flatNodes.length > 0) {
                        edgeLines = edges.map((e, idx): React.ReactElement | null => {
                          const a = positionByLei[e.from]
                          const b = positionByLei[e.to]
                          if (!a || !b) return null
                          return <line key={`e-${idx}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#2563eb" strokeOpacity={0.5} strokeWidth={1} />
                        })
                        const rootLei = tree.entity.lei
                        nodeCircles = flatNodes.map((n): React.ReactElement | null => {
                          const pos = positionByLei[n.lei]
                          if (!pos) return null
                          const isRoot = n.lei === rootLei
                          return <circle key={`n-${n.lei}`} cx={pos[0]} cy={pos[1]} r={isRoot ? 5 : 3.5} fill={isRoot ? "#ef4444" : "#10b981"} stroke="#ffffff" strokeWidth={0.9} />
                        })
                      }

                      return <>{countryPaths}{edgeLines}{nodeCircles}</>
                    })()}
                </svg>
              </div>
              {countryStats.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Countries detected</div>
                  <div className="flex flex-wrap gap-2">
                    {countryStats.map(({ code, name, count }) => (
                      <span key={code} className="text-xs px-2 py-1 border rounded bg-muted">
                        {name} ({code}) • {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Structure Analysis</CardTitle>
                <CardDescription>Computed metrics from the currently loaded hierarchy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded">
                    <Building2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">{
                      typeof shape?.ultimateChildrenCount === 'number'
                        ? (shape.ultimateChildrenCount + 1)
                        : (typeof shape?.descendantsCount === 'number'
                          ? (shape.descendantsCount + 1)
                          : (analysis?.total ?? 0))
                    }</div>
                    <div className="text-sm text-muted-foreground">Total Entities</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">{
                      typeof shape?.ultimateChildrenCount === 'number'
                        ? shape.ultimateChildrenCount
                        : (typeof shape?.descendantsCount === 'number'
                          ? shape.descendantsCount
                          : (analysis ? Math.max((analysis.total - 1), 0) : 0))
                    }</div>
                    <div className="text-sm text-muted-foreground">Subsidiaries</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Percent className="h-5 w-5 text-muted-foreground" />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>15·ln(1+depth) + 20·ln(1+avg children) + 10·ln(1+total/25), capped at 100</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-2xl font-bold">{analysis?.complexityScore ?? 0}</div>
                    <div className="text-sm text-muted-foreground">Complexity Score</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">{shape?.maxDepth ?? (analysis?.maxDepth ?? 0)}</div>
                    <div className="text-sm text-muted-foreground">Max Depth</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium mb-2 flex items-center gap-1">
                      Geographic Spread
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>HHI = sum(country share% squared). Higher means more concentration.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">Countries: {analysis?.numCountries ?? 0} • HHI: {analysis?.hhi ?? 0} • Top country: {analysis?.topCountryShare ?? 0}%</div>
                    <div className="space-y-1 max-h-40 overflow-auto pr-1">
                      {analysis?.countries?.slice(0, 8).map((c: any) => (
                        <div key={c.code} className="flex items-center justify-between">
                          <span className="text-sm">{c.name} ({c.code})</span>
                          <span className="text-sm font-medium">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium mb-2 flex items-center gap-1">
                      Depth & Breadth
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>Depth = longest path from parent. Breadth = children per node (avg/p75).</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">Avg children: {analysis?.avgChildren ?? 0} • p75: {analysis?.p75Children ?? 0} • Max fan-out: {analysis?.maxFanOut ?? 0}</div>
                    <div className="space-y-1">
                      {analysis?.depthCounts?.map(([d, c]: any) => (
                        <div key={d} className="flex items-center gap-2">
                          <span className="w-8 text-xs">{d}</span>
                          <div className="flex-1 h-2 bg-muted rounded">
                            <div className="h-2 bg-primary rounded" style={{ width: `${Math.min(100, (c / (analysis.total || 1)) * 100)}%` }} />
                          </div>
                          <span className="w-8 text-right text-xs">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Indicators</CardTitle>
                <CardDescription>Heuristics to guide review; tune in backend as needed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis ? (
                  <>
                    {[
                      { label: 'Concentration (Geography)', level: analysis.risks.concentrationRisk, hint: 'Based on HHI and top country share' },
                      { label: 'Depth', level: analysis.risks.depthRisk, hint: 'High if max depth ≥5' },
                      { label: 'Opacity (Data Completeness)', level: analysis.risks.opacityRisk, hint: 'Missing country/name/update rates' },
                      { label: 'Staleness', level: analysis.risks.stalenessRisk, hint: 'Median days since last update' },
                      { label: 'Status Mix', level: analysis.risks.statusRisk, hint: 'Share of non-Active entities' },
                      { label: 'Fan-out (Span of Control)', level: analysis.risks.fanoutRisk, hint: 'Max direct children of any node' },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{r.label}</span>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>{r.hint}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Badge variant="outline" className={r.level === 'High' ? 'text-red-600' : r.level === 'Medium' ? 'text-yellow-600' : 'text-green-600'}>{r.level}</Badge>
                        </div>
                  </div>
                ))}
                    <div className="text-xs text-muted-foreground pt-1">Based on loaded nodes; results refine as more of the tree loads.</div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No data loaded</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}