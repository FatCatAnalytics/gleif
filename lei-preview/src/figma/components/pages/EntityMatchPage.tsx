import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Progress } from "../ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Search, Upload, Download, Target, CheckCircle, AlertCircle, XCircle, FileText, Trash2 } from "lucide-react"

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
}

export function EntityMatchPage() {
  const [singleEntity, setSingleEntity] = useState("")
  const [bulkEntities, setBulkEntities] = useState("")
  const [matchingResults, setMatchingResults] = useState<MatchResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)

  // Mock matching function - in real implementation this would call the LEI API
  const performMatching = async (entities: string[]): Promise<MatchResult[]> => {
    setIsProcessing(true)
    setProcessingProgress(0)
    
    const results: MatchResult[] = []
    
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i].trim()
      if (!entity) continue
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500))
      setProcessingProgress(((i + 1) / entities.length) * 100)
      
      // Mock matching logic
      const mockMatches = generateMockMatches(entity)
      results.push({
        inputEntity: entity,
        matches: mockMatches
      })
    }
    
    setIsProcessing(false)
    return results
  }

  const generateMockMatches = (entity: string) => {
    const mockDatabase = [
      { lei: "5493001KJTIIGC8Y1R12", legalName: "Apple Inc.", jurisdiction: "US-DE", status: "Active" },
      { lei: "HWUPKR0MPOU8FGXBT394", legalName: "Microsoft Corporation", jurisdiction: "US-WA", status: "Active" },
      { lei: "213800MBFP4A78EHRX08", legalName: "Alphabet Inc.", jurisdiction: "US-DE", status: "Active" },
      { lei: "ZRXASR1D6DC9D35SZC58", legalName: "Amazon.com, Inc.", jurisdiction: "US-DE", status: "Active" },
      { lei: "RJQG2KE8X67M2C5K8Q67", legalName: "Tesla, Inc.", jurisdiction: "US-DE", status: "Active" },
      { lei: "MQXJ7KE8X67M2C5K8Q69", legalName: "Meta Platforms, Inc.", jurisdiction: "US-DE", status: "Active" },
      { lei: "NRXJ8KE8X67M2C5K8Q70", legalName: "Netflix, Inc.", jurisdiction: "US-DE", status: "Active" },
    ]

    const matches = []
    const entityLower = entity.toLowerCase()

    for (const record of mockDatabase) {
      const nameLower = record.legalName.toLowerCase()
      let confidence = 0
      let matchType = ""

      // Exact match
      if (nameLower === entityLower) {
        confidence = 100
        matchType = "Exact"
      }
      // Contains match
      else if (nameLower.includes(entityLower) || entityLower.includes(nameLower)) {
        confidence = Math.random() * 30 + 70 // 70-100%
        matchType = "Contains"
      }
      // Fuzzy match (simple word matching)
      else if (entityLower.split(' ').some(word => nameLower.includes(word) && word.length > 2)) {
        confidence = Math.random() * 40 + 40 // 40-80%
        matchType = "Fuzzy"
      }

      if (confidence > 0) {
        matches.push({
          ...record,
          confidence: Math.round(confidence),
          matchType
        })
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
  }

  const handleSingleSearch = async () => {
    if (!singleEntity.trim()) return
    const results = await performMatching([singleEntity])
    setMatchingResults(results)
  }

  const handleBulkSearch = async () => {
    const entities = bulkEntities.split(/[,\n]/).map(e => e.trim()).filter(e => e)
    if (entities.length === 0) return
    const results = await performMatching(entities)
    setMatchingResults(results)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const entities = text.split(/[,\n]/).map(e => e.trim()).filter(e => e)
    const results = await performMatching(entities)
    setMatchingResults(results)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600"
    if (confidence >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (confidence >= 70) return <AlertCircle className="h-4 w-4 text-yellow-600" />
    return <XCircle className="h-4 w-4 text-red-600" />
  }

  const exportResults = () => {
    const csvContent = [
      "Input Entity,LEI Code,Legal Name,Jurisdiction,Status,Confidence,Match Type",
      ...matchingResults.flatMap(result =>
        result.matches.map(match =>
          `"${result.inputEntity}","${match.lei}","${match.legalName}","${match.jurisdiction}","${match.status}",${match.confidence},"${match.matchType}"`
        )
      )
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
    <div className="p-6 space-y-6">
      <div>
        <h1>Entity Matching Tool</h1>
        <p className="text-muted-foreground">
          Find matching LEI records for your entities using single search, bulk input, or CSV upload.
        </p>
      </div>

      <Tabs defaultValue="single" className="space-y-4">
        <TabsList>
          <TabsTrigger value="single">Single Entity</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Input</TabsTrigger>
          <TabsTrigger value="upload">CSV Upload</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Single Entity Search</CardTitle>
              <CardDescription>Search for LEI matches for a single entity name</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter entity name (e.g., Apple Inc., Microsoft Corporation)"
                    className="pl-8"
                    value={singleEntity}
                    onChange={(e) => setSingleEntity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSingleSearch()}
                  />
                </div>
                <Button onClick={handleSingleSearch} disabled={isProcessing}>
                  <Target className="h-4 w-4 mr-2" />
                  Find Matches
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Tips for better matching:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Use the full legal entity name when possible</li>
                  <li>Include common suffixes like "Inc.", "Corp.", "Ltd."</li>
                  <li>Try variations if no exact match is found</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Entity Search</CardTitle>
              <CardDescription>Search for multiple entities at once using comma-separated or line-separated input</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Names</label>
                <Textarea 
                  placeholder="Enter entity names separated by commas or new lines:&#10;Apple Inc., Microsoft Corporation&#10;Amazon.com, Inc.&#10;Tesla, Inc."
                  className="min-h-32"
                  value={bulkEntities}
                  onChange={(e) => setBulkEntities(e.target.value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {bulkEntities.split(/[,\n]/).filter(e => e.trim()).length} entities to process
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setBulkEntities("")}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button onClick={handleBulkSearch} disabled={isProcessing}>
                    <Target className="h-4 w-4 mr-2" />
                    Find Matches
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing entities...</span>
                    <span>{Math.round(processingProgress)}%</span>
                  </div>
                  <Progress value={processingProgress} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CSV Upload</CardTitle>
              <CardDescription>Upload a CSV file containing entity names for batch processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
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
                  <Button variant="outline" size="sm" asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Supported formats:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>CSV files with entity names in the first column</li>
                  <li>Text files with one entity per line</li>
                  <li>Comma-separated values in a single line</li>
                </ul>
                <p><strong>File requirements:</strong> Maximum 1,000 entities per upload</p>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing uploaded entities...</span>
                    <span>{Math.round(processingProgress)}%</span>
                  </div>
                  <Progress value={processingProgress} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {matchingResults.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2>Matching Results</h2>
                  <p className="text-muted-foreground">
                    Found matches for {matchingResults.length} input entities
                  </p>
                </div>
                <Button variant="outline" onClick={exportResults}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              </div>

              <div className="space-y-4">
                {matchingResults.map((result, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Input: "{result.inputEntity}"
                        </CardTitle>
                        <Badge variant="outline">
                          {result.matches.length} matches found
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {result.matches.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Confidence</TableHead>
                              <TableHead>LEI Code</TableHead>
                              <TableHead>Legal Name</TableHead>
                              <TableHead>Jurisdiction</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Match Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.matches.map((match, matchIndex) => (
                              <TableRow key={matchIndex}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {getConfidenceIcon(match.confidence)}
                                    <span className={getConfidenceColor(match.confidence)}>
                                      {match.confidence}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-mono text-sm">{match.lei}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{match.legalName}</div>
                                </TableCell>
                                <TableCell>{match.jurisdiction}</TableCell>
                                <TableCell>
                                  <Badge variant={match.status === 'Active' ? 'default' : 'secondary'}>
                                    {match.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{match.matchType}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <XCircle className="h-8 w-8 mx-auto mb-2" />
                          <p>No matches found for this entity</p>
                          <p className="text-sm">Try using a different variation of the entity name</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3>No Results Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Use the search tabs above to find entity matches
                </p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'entity-match' } }))}>
                    Start Single Search
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