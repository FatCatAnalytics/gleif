import { useEffect, useRef, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Search, Upload, Download, Target, Trash2 } from "lucide-react"

  interface MatchResult {
    inputEntity: string
    matches: Array<{
      lei: string
      legalName: string
      jurisdiction: string
      status: string
      confidence: number
      matchType: string
    }>
    selectedMatchIndex?: number
    ultimateParent?: {
      lei: string
      legalName: string
    }
    relatedEntities?: string[]
  }

function normalizeEntityName(raw: string): string {
  const value = String(raw || "").toLowerCase()
  const cleaned = value
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s\.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const suffixes = [
    "inc", "inc.", "corp", "corp.", "corporation", "co", "co.", "company", "ltd", "ltd.",
    "limited", "llc", "plc", "gmbh", "ag", "s.a.", "s.a", "sa", "srl", "bv", "oy", "ab",
  ]
  const tokens = cleaned.split(" ")
  const filtered = tokens.filter((t) => !suffixes.includes(t))
  return filtered.join(" ").trim()
}

function tokenize(value: string): string[] {
  return normalizeEntityName(value).split(" ").filter(Boolean)
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1
  const setA = new Set(a)
  const setB = new Set(b)
  let intersection = 0
  for (const t of setA) if (setB.has(t)) intersection += 1
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

function levenshteinSimilarity(a: string, b: string): number {
  const s = normalizeEntityName(a)
  const t = normalizeEntityName(b)
  const n = s.length
  const m = t.length
  if (n === 0 && m === 0) return 1
  if (n === 0 || m === 0) return 0
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[i][0] = i
  for (let j = 0; j <= m; j++) dp[0][j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }
  const distance = dp[n][m]
  const maxLen = Math.max(n, m)
  return maxLen === 0 ? 1 : 1 - distance / maxLen
}

function computeMatchConfidence(query: string, candidate: string): { score: number; kind: string } {
  const normQ = normalizeEntityName(query)
  const normC = normalizeEntityName(candidate)
  if (!normQ || !normC) return { score: 0, kind: "None" }
  if (normQ === normC) return { score: 100, kind: "Exact" }

  const tokensQ = tokenize(normQ)
  const tokensC = tokenize(normC)
  const tokenSim = jaccardSimilarity(tokensQ, tokensC) // 0..1
  const editSim = levenshteinSimilarity(normQ, normC)   // 0..1

  let score = 0
  // Weighted blend emphasizes overall string similarity and token overlap
  score += 60 * editSim
  score += 35 * tokenSim

  // Prefix/contains bonuses
  if (normC.startsWith(normQ)) score += 5
  else if (normC.includes(normQ)) score += 3

  // Strong token coverage bonus
  const covered = tokensQ.filter((t) => tokensC.includes(t)).length
  if (tokensQ.length > 0 && covered === tokensQ.length) score += 2

  // Cap to [0,100]
  score = Math.max(0, Math.min(100, Math.round(score)))

  const kind = score >= 95 ? "Exact" : score >= 85 ? "Strong" : score >= 70 ? "Partial" : "Weak"
  return { score, kind }
}

export function EntityMatchPage() {
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000"
  const [singleEntity, setSingleEntity] = useState("")
  const [bulkEntities, setBulkEntities] = useState("")
  const [matchingResults, setMatchingResults] = useState<MatchResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("single")
  const abortControllersRef = useRef<Set<AbortController>>(new Set())

  const abortAll = () => {
    for (const ac of abortControllersRef.current) {
      try { ac.abort() } catch {}
    }
    abortControllersRef.current.clear()
  }

  const fetchAbort = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const ac = new AbortController()
    abortControllersRef.current.add(ac)
    try {
      const res = await fetch(input as any, { ...(init || {}), signal: ac.signal })
      return res
    } finally {
      abortControllersRef.current.delete(ac)
    }
  }

  useEffect(() => {
    return () => {
      abortAll()
    }
  }, [])
  
  // Define calculateConfidence here using existing normalization functions
  const calculateConfidence = (query: string, targetName: string): number => {
    const normalizedQuery = normalizeEntityName(query)
    const normalizedTarget = normalizeEntityName(targetName)
    
    // Exact match
    if (normalizedQuery === normalizedTarget) return 100
    
    // Tokenize and check similarity
    const queryTokens = tokenize(query)
    const targetTokens = tokenize(targetName)
    
    // Jaccard similarity
    const jaccard = jaccardSimilarity(queryTokens, targetTokens)
    
    // Levenshtein similarity
    const lev = levenshteinSimilarity(normalizedQuery, normalizedTarget)
    
    // Combined score (weighted average)
    const confidence = Math.round((jaccard * 0.5 + lev * 0.5) * 100)
    
    return Math.min(100, Math.max(0, confidence))
  }

  // Real matching function using LEI API
  const performMatching = async (entities: string[]): Promise<MatchResult[]> => {
    setIsProcessing(true)
    setProcessingProgress(0)
    
    const results: MatchResult[] = []
    
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i].trim()
      if (!entity) continue
      
      setProcessingProgress(((i + 0.5) / entities.length) * 100)
      
      try {
        // Search using the LEI API
        const searchRes = await fetchAbort(`${API_BASE}/api/search?q=${encodeURIComponent(entity)}`)
        let finalMatches: any[] = []
        
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          console.log(`Search data for ${entity}:`, searchData)
          
          if (Array.isArray(searchData) && searchData.length > 0) {
            const matches: any[] = []
            
            // Calculate confidence scores for each result
            for (const row of searchData) {
              if (row.lei && row.legalName) {
                const confidence = calculateConfidence(entity, row.legalName)
                matches.push({
                  lei: row.lei,
                  legalName: row.legalName,
                  jurisdiction: row.jurisdiction || 'N/A',
                  status: row.entityStatus || 'Active',
                  confidence,
                  matchType: confidence === 100 ? 'Exact' : confidence >= 80 ? 'Strong' : confidence >= 60 ? 'Partial' : 'Weak'
                })
              }
            }
            
            // Sort by confidence and take top 3
            matches.sort((a, b) => b.confidence - a.confidence)
            const top3Matches = matches.slice(0, 3)
            
            // Add children count bonus
            finalMatches = await Promise.all(
              top3Matches.map(async (match) => {
                try {
                  const childrenRes = await fetchAbort(`${API_BASE}/api/lei/${encodeURIComponent(match.lei)}/direct-children/count`)
                  if (childrenRes.ok) {
                    const count = await childrenRes.json()
                    const childrenBonus = Math.min(10, count / 2) // Max 10 bonus
                    return { ...match, confidence: Math.min(100, match.confidence + childrenBonus) }
                  }
                } catch (e) {
                  console.warn(`Failed to fetch children count for ${match.lei}:`, e)
                }
                return match
              })
            )
            
            finalMatches.sort((a, b) => b.confidence - a.confidence)
          }
        }
        
        // Always add a result entry, even if no matches found
        // Auto-select first match if available
        const resultEntry: MatchResult = {
          inputEntity: entity,
          matches: finalMatches,
          selectedMatchIndex: finalMatches.length > 0 ? 0 : undefined
        }
        
        // If we have a match selected, fetch its ultimate parent immediately
        if (finalMatches.length > 0) {
          try {
            const selectedMatch = finalMatches[0]
            const ultimateParentRes = await fetchAbort(`${API_BASE}/api/lei/${encodeURIComponent(selectedMatch.lei)}/ultimate-parent/row`)
            if (ultimateParentRes.ok) {
              const parentData = await ultimateParentRes.json()
              resultEntry.ultimateParent = {
                lei: parentData.lei,
                legalName: parentData.legalName
              }
            } else {
              // No ultimate parent found, entity is its own ultimate parent
              resultEntry.ultimateParent = {
                lei: selectedMatch.lei,
                legalName: selectedMatch.legalName
              }
            }
          } catch (error) {
            console.error('Error fetching ultimate parent:', error)
            // Default to self as ultimate parent on error
            resultEntry.ultimateParent = {
              lei: finalMatches[0].lei,
              legalName: finalMatches[0].legalName
            }
          }
        }
        
        results.push(resultEntry)
      } catch (error) {
        console.error(`Error searching for ${entity}:`, error)
        results.push({
          inputEntity: entity,
          matches: []
        })
      }
      
      setProcessingProgress(((i + 1) / entities.length) * 100)
    }
    
    // Find related entities based on shared ultimate parents
    const finalResults = findRelatedEntities(results)
    
    setIsProcessing(false)
    return finalResults
  }



  const handleSingleSearch = async () => {
    const query = singleEntity.trim()
    if (!query) return
    try {
      setIsProcessing(true)
      // Use backend search like LEISearchPage
      const res = await fetchAbort(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rows = (await res.json()) as Array<{ lei: string; legalName?: string; jurisdiction?: string; status?: string }>

      // Fetch direct-children counts to boost likely parent entities
      const countsEntries = await Promise.all(
        rows.map(async (r) => {
          try {
            const cRes = await fetchAbort(`${API_BASE}/api/lei/${encodeURIComponent(r.lei)}/direct-children/count`)
            if (!cRes.ok) return [r.lei, 0] as const
            const n = await cRes.json()
            return [r.lei, Number(n) || 0] as const
          } catch {
            return [r.lei, 0] as const
          }
        })
      )
      const childrenCounts: Record<string, number> = {}
      for (const [lei, n] of countsEntries) childrenCounts[lei] = n
      const maxChildren = Math.max(1, ...Object.values(childrenCounts))

      const matches = rows.map((r) => {
        const name = r.legalName || r.lei
        const { score, kind } = computeMatchConfidence(query, name)
        // Children bonus up to +10 scaled by relative fan-out
        const childCount = childrenCounts[r.lei] || 0
        const childrenBonus = childCount > 0 ? Math.min(10, Math.round((childCount / maxChildren) * 10)) : 0
        const boosted = Math.min(100, score + childrenBonus)
        return {
          lei: r.lei,
          legalName: name,
          jurisdiction: r.jurisdiction || "",
          status: r.status || "",
          confidence: boosted,
          matchType: kind,
        }
      }).sort((a, b) => b.confidence - a.confidence)
      const result: MatchResult = { inputEntity: query, matches }
      setMatchingResults([result])
      setActiveTab("results")
    } catch (e) {
      setMatchingResults([{ inputEntity: query, matches: [] }])
      setActiveTab("results")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkSearch = async () => {
    const entities = bulkEntities.split(/[,\n]/).map(e => e.trim()).filter(e => e)
    if (entities.length === 0) return
    console.log('Searching for entities:', entities)
    const results = await performMatching(entities)
    console.log('Search results:', results)
    setMatchingResults(results)
    setActiveTab('results') // Switch to results tab after search
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const entities = text.split(/[,\n]/).map(e => e.trim()).filter(e => e)
    const results = await performMatching(entities)
    setMatchingResults(results)
    setActiveTab('results') // Switch to results tab after search
  }

  const findRelatedEntities = (results: MatchResult[]) => {
    // Group entities by ultimate parent LEI
    const parentGroups: { [parentLei: string]: number[] } = {}
    
    results.forEach((result, index) => {
      if (result.ultimateParent && result.selectedMatchIndex !== undefined) {
        const parentLei = result.ultimateParent.lei
        if (!parentGroups[parentLei]) {
          parentGroups[parentLei] = []
        }
        parentGroups[parentLei].push(index)
      }
    })
    
    // Update each result with its related entities
    const updatedResults = results.map((result, index) => {
      if (result.ultimateParent && result.selectedMatchIndex !== undefined) {
        const parentLei = result.ultimateParent.lei
        const relatedIndexes = parentGroups[parentLei] || []
        
        // Get related entities (excluding self) using the selected match legal names
        const relatedEntities = relatedIndexes
          .filter(idx => idx !== index)
          .map(idx => {
            const relatedResult = results[idx]
            if (relatedResult.selectedMatchIndex !== undefined) {
              const selectedMatch = relatedResult.matches[relatedResult.selectedMatchIndex]
              return selectedMatch.legalName
            }
            return relatedResult.inputEntity // fallback to input name if no selection
          })
        
        return {
          ...result,
          relatedEntities: relatedEntities.length > 0 ? relatedEntities : undefined
        }
      }
      return result
    })
    
    return updatedResults
  }

  const handleMatchSelection = async (resultIndex: number, matchIndex: number) => {
    const updatedResults = [...matchingResults]
    const result = updatedResults[resultIndex]
    const selectedMatch = result.matches[matchIndex]
    
    // Set selected match index
    result.selectedMatchIndex = matchIndex
    
    // Fetch ultimate parent
    try {
      const ultimateParentRes = await fetchAbort(`${API_BASE}/api/lei/${encodeURIComponent(selectedMatch.lei)}/ultimate-parent/row`)
      if (ultimateParentRes.ok) {
        const parentData = await ultimateParentRes.json()
        result.ultimateParent = {
          lei: parentData.lei,
          legalName: parentData.legalName
        }
      } else {
        // No ultimate parent found, entity is its own ultimate parent
        result.ultimateParent = {
          lei: selectedMatch.lei,
          legalName: selectedMatch.legalName
        }
      }
    } catch (error) {
      console.error('Error fetching ultimate parent:', error)
      // Default to self as ultimate parent on error
      result.ultimateParent = {
        lei: selectedMatch.lei,
        legalName: selectedMatch.legalName
      }
    }
    
    // Find related entities based on shared ultimate parents
    const finalResults = findRelatedEntities(updatedResults)
    setMatchingResults(finalResults)
  }

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 90) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    if (confidence >= 70) return "bg-amber-500/10 text-amber-600 border-amber-500/20"
    return "bg-rose-500/10 text-rose-600 border-rose-500/20"
  }



  const exportResults = () => {
    const csvContent = [
      "Input Entity,Selected Match LEI,Selected Match Name,Ultimate Parent LEI,Ultimate Parent Name",
      ...matchingResults.map(result => {
        if (result.selectedMatchIndex !== undefined && result.matches[result.selectedMatchIndex]) {
          const selectedMatch = result.matches[result.selectedMatchIndex]
          return `"${result.inputEntity}","${selectedMatch.lei}","${selectedMatch.legalName}","${result.ultimateParent?.lei || ''}","${result.ultimateParent?.legalName || ''}"`
        }
        return `"${result.inputEntity}","No match selected","","",""`
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lei_match_results.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute -top-4 right-1/3 h-32 w-32 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Target className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-widest">Entity Matching</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight gold-accent-line" style={{ fontFamily: 'var(--font-display)' }}>
            FatCat Entity Matcher
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Find matching LEI records for your entities using single search, bulk input, or CSV upload. Precision matching powered by intelligent algorithms.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/30 p-1 rounded-xl">
          <TabsTrigger value="single" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Single Entity
          </TabsTrigger>
          <TabsTrigger value="bulk" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Bulk Input
          </TabsTrigger>
          <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            CSV Upload
          </TabsTrigger>
          <TabsTrigger value="results" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Results
            {matchingResults.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">{matchingResults.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          <Card className="card-hover-lift overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
            <CardHeader className="relative pb-2">
              <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                Single Entity Search
              </CardTitle>
              <CardDescription>Search for LEI matches for a single entity name</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter entity name (e.g., Apple Inc., Microsoft Corporation)"
                    className="pl-10 h-11 rounded-lg border-border/50 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={singleEntity}
                    onChange={(e) => setSingleEntity(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSingleSearch() }}
                  />
                </div>
                <Button
                  onClick={handleSingleSearch}
                  disabled={isProcessing}
                  className="h-11 px-6 rounded-lg bg-primary hover:bg-primary/90 shadow-sm"
                >
                  {isProcessing ? (
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  ) : (
                    <Target className="h-4 w-4 mr-2" />
                  )}
                  Find Matches
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                <p className="text-sm font-medium mb-2">Tips for better matching:</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">+</span>
                    Use the full legal entity name when possible
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">+</span>
                    Include common suffixes like "Inc.", "Corp.", "Ltd."
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">+</span>
                    Try variations if no exact match is found
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card className="card-hover-lift">
            <CardHeader className="pb-2">
              <CardTitle style={{ fontFamily: 'var(--font-display)' }}>Bulk Entity Search</CardTitle>
              <CardDescription>Search for multiple entities at once using comma-separated or line-separated input</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Names</label>
                <Textarea
                  placeholder="Enter entity names separated by commas or new lines:&#10;Apple Inc., Microsoft Corporation&#10;Amazon.com, Inc.&#10;Tesla, Inc."
                  className="min-h-36 rounded-lg border-border/50 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  value={bulkEntities}
                  onChange={(e) => setBulkEntities(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-sm font-semibold">{bulkEntities.split(/[,\n]/).filter(e => e.trim()).length}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">entities to process</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setBulkEntities("")} className="rounded-lg border-border/50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button onClick={handleBulkSearch} disabled={isProcessing} className="rounded-lg bg-primary hover:bg-primary/90">
                    {isProcessing ? (
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    ) : (
                      <Target className="h-4 w-4 mr-2" />
                    )}
                    Find Matches
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Processing entities...</span>
                    <span className="text-primary font-semibold">{Math.round(processingProgress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card className="card-hover-lift">
            <CardHeader className="pb-2">
              <CardTitle style={{ fontFamily: 'var(--font-display)' }}>CSV Upload</CardTitle>
              <CardDescription>Upload a CSV file containing entity names for batch processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="group border-2 border-dashed border-border/50 hover:border-primary/40 rounded-xl p-8 text-center transition-colors cursor-pointer bg-gradient-to-br from-muted/20 to-transparent">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Drop a CSV file here, or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                  disabled={isProcessing}
                />
                <label htmlFor="csv-upload">
                  <Button variant="outline" size="sm" className="rounded-lg border-border/50 cursor-pointer" asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-3">
                <p className="text-sm font-medium">Supported formats:</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">+</span>
                    CSV files with entity names in the first column
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">+</span>
                    Text files with one entity per line
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">+</span>
                    Comma-separated values in a single line
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground/70 pt-2 border-t border-border/30">
                  <strong>File requirements:</strong> Maximum 1,000 entities per upload
                </p>
              </div>

              {isProcessing && (
                <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Processing uploaded entities...</span>
                    <span className="text-primary font-semibold">{Math.round(processingProgress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {matchingResults.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Matching Results</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Found matches for {matchingResults.length} input entities
                  </p>
                </div>
                <Button variant="outline" onClick={exportResults} className="rounded-lg border-border/50">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              </div>

              <Card className="card-hover-lift">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10">Entity Searched</TableHead>
                          <TableHead>Match 1</TableHead>
                          <TableHead>Match 2</TableHead>
                          <TableHead>Match 3</TableHead>
                          <TableHead>Selected Match</TableHead>
                          <TableHead>Ultimate Parent</TableHead>
                          <TableHead>Related To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matchingResults.map((result, resultIndex) => {
                          const selectedMatch = result.selectedMatchIndex !== undefined ? result.matches[result.selectedMatchIndex] : null
                          
                          return (
                            <TableRow key={resultIndex}>
                              <TableCell className="sticky left-0 bg-background z-10 font-medium">
                                {result.inputEntity}
                              </TableCell>
                              
                              {/* Match 1, 2, 3 columns */}
                              {[0, 1, 2].map((matchIndex) => {
                                const match = result.matches[matchIndex]
                                const isSelected = result.selectedMatchIndex === matchIndex
                                
                                if (!match) {
                                  return (
                                    <TableCell key={matchIndex} className="text-center text-muted-foreground">
                                      No match
                                    </TableCell>
                                  )
                                }
                                
                                return (
                                  <TableCell key={matchIndex} className={isSelected ? "bg-primary/5" : ""}>
                                    <button
                                      onClick={() => handleMatchSelection(resultIndex, matchIndex)}
                                      className={`text-left w-full p-3 rounded-lg transition-all ${
                                        isSelected
                                          ? 'ring-1 ring-primary/30 bg-primary/5'
                                          : 'hover:bg-muted/50'
                                      }`}
                                    >
                                      <div className="space-y-1.5">
                                        <div className="font-medium text-sm">{match.legalName}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">
                                          {match.lei}
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                          <Badge variant="outline" className={`text-[10px] ${getConfidenceBg(match.confidence)}`}>
                                            {match.matchType} {match.confidence}%
                                          </Badge>
                                          {isSelected && (
                                            <Badge className="text-[10px] bg-primary text-primary-foreground">
                                              Selected
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  </TableCell>
                                )
                              })}
                              
                              {/* Selected Match column */}
                              <TableCell>
                                {selectedMatch ? (
                                  <div className="space-y-1.5 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
                                    <div className="font-medium text-sm">{selectedMatch.legalName}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                      {selectedMatch.lei}
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] ${getConfidenceBg(selectedMatch.confidence)}`}>
                                      {selectedMatch.matchType} {selectedMatch.confidence}%
                                    </Badge>
                                  </div>
                                ) : (
                                  <div className="text-center text-muted-foreground text-xs py-4">
                                    No match selected
                                  </div>
                                )}
                              </TableCell>

                              {/* Ultimate Parent column */}
                              <TableCell>
                                {result.ultimateParent ? (
                                  <div className="space-y-1.5 p-3 rounded-lg bg-muted/30">
                                    <div className="font-medium text-sm">{result.ultimateParent.legalName}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                      {result.ultimateParent.lei}
                                    </div>
                                    {result.ultimateParent.lei === selectedMatch?.lei && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        Self (Root)
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center text-muted-foreground text-xs py-4">
                                    {selectedMatch ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                                        Loading...
                                      </div>
                                    ) : 'No match selected'}
                                  </div>
                                )}
                              </TableCell>

                              {/* Related To column */}
                              <TableCell>
                                {result.relatedEntities && result.relatedEntities.length > 0 ? (
                                  <div className="space-y-1.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                    <div className="text-sm font-medium text-primary">
                                      {result.relatedEntities.join(", ")}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      Shares same ultimate parent
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center text-muted-foreground text-xs py-4">
                                    No related entities
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="card-hover-lift">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 mx-auto mb-5 flex items-center justify-center">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>No Results Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Use the search tabs above to find entity matches and discover corporate relationships.
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setActiveTab('single')} className="rounded-lg border-border/50">
                    Single Search
                  </Button>
                  <Button onClick={() => setActiveTab('bulk')} className="rounded-lg bg-primary hover:bg-primary/90">
                    Start Bulk Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}