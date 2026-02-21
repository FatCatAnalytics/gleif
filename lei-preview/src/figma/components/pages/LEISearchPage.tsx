import { useEffect, useRef, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Search,
  Filter,
  Download,
  Building2,
  MapPin,
  MoreHorizontal,
  Database,
  Eye,
  CheckCircle,
  Building,
  Globe,
  Users,
  Clock,
  Network,
} from "lucide-react";
import { toast } from "sonner";

// Mock GLEIF API Level 1 data structure
interface GLEIFLevel1Data {
  lei: string;
  legalName: string;
  legalAddress: {
    language: string;
    addressLines: string[];
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };
  headquartersAddress: {
    language: string;
    addressLines: string[];
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };
  registrationAuthority: {
    registrationAuthorityID: string;
    registrationAuthorityEntityID: string;
  };
  legalJurisdiction: string;
  entityCategory: string;
  entitySubCategory: string;
  entityStatus: string;
  entityCreationDate: string;
  lastUpdateDate: string;
  nextRenewalDate: string;
  managingLOU: string;
  validationSources: string;
  entityExpirationDate?: string;
}

export function LEISearchPage() {
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] =
    useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] =
    useState(false);
  const [companyDetails, setCompanyDetails] =
    useState<GLEIFLevel1Data | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] =
    useState(false);
  const [savedEntities, setSavedEntities] = useState<
    Set<string>
  >(new Set());
  type SearchRow = {
    lei: string;
    legalName: string;
    status: string;
    jurisdiction: string;
    lastUpdate: string;
    managingLOU?: string;
    address?: string;
    registrationAuthorityName?: string;
    spglobal?: string[];
    directChildrenCount?: number;
  };
  const [searchResults, setSearchResults] = useState<
    SearchRow[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const RECENT_KEY = "lei_recent_searches";
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const abortControllersRef = useRef<Set<AbortController>>(new Set());

  const abortAll = () => {
    for (const ac of abortControllersRef.current) {
      try { ac.abort(); } catch {}
    }
    abortControllersRef.current.clear();
  };

  const fetchAbort = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const ac = new AbortController();
    abortControllersRef.current.add(ac);
    try {
      const res = await fetch(input as any, { ...(init || {}), signal: ac.signal });
      return res;
    } finally {
      abortControllersRef.current.delete(ac);
    }
  };

  useEffect(() => {
    return () => {
      abortAll();
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 3));
        }
      }
    } catch {}
  }, []);

  const recordRecent = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 3);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Status mapping is handled on the backend now

  // Fetch a single LEI record and map to SearchRow (via backend)
  const fetchLeiRecordRow = async (lei: string): Promise<SearchRow | null> => {
    try {
      const res = await fetchAbort(`${API_BASE}/api/lei/${encodeURIComponent(lei)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SearchRow | null;
      return json;
    } catch (err) {
      console.error("Failed to fetch LEI record:", lei, err);
      return null;
    }
  };

  // Determine if the query looks like a LEI code (20 alphanumeric chars)
  const isLikelyLei = (q: string) => /^[a-z0-9]{20}$/i.test(q.trim());

  // Core search routine used by all triggers
  const performSearch = async (q: string) => {
    const query = q.trim();
    if (!query) return;
    setIsSearching(true);
    try {
      if (isLikelyLei(query)) {
        const row = await fetchLeiRecordRow(query);
        const results = row ? [row] : [];
        setSearchResults(results);
        if (results.length === 0) {
          toast.message("No results", {
            description: "No LEI record found for the provided code.",
          });
        }
      } else {
        const res = await fetchAbort(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = (await res.json()) as SearchRow[];
        // Fetch ultimate children counts in parallel (best-effort)
        const withCounts = await Promise.all(
          rows.map(async (r) => {
            try {
              const cRes = await fetchAbort(`${API_BASE}/api/lei/${encodeURIComponent(r.lei)}/direct-children/count`);
              if (!cRes.ok) throw new Error("bad");
              const count = (await cRes.json()) as number;
              return { ...r, directChildrenCount: count };
            } catch {
              return r;
            }
          })
        );
        const sortedByChildrenDesc = withCounts
          .slice()
          .sort((a, b) => (b.directChildrenCount ?? -1) - (a.directChildrenCount ?? -1));
        setSearchResults(sortedByChildrenDesc);
        if (rows.length === 0) {
          toast.message("No results", {
            description: "No entities found matching your query.",
          });
        }
      }
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed", {
        description: "An error occurred while searching GLEIF.",
      });
    } finally {
      setIsSearching(false);
      recordRecent(query);
    }
  };

  // Search handler: reads current input state
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    await performSearch(q);
  };

  // Details modal fetch via backend
  const fetchCompanyDetails = async (
    lei: string,
  ): Promise<GLEIFLevel1Data> => {
    const res = await fetch(`${API_BASE}/api/lei/${encodeURIComponent(lei)}/details`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json as GLEIFLevel1Data;
  };

  const handleViewDetails = async (entity: any) => {
    setSelectedEntity(entity);
    setIsLoadingDetails(true);
    setIsDetailsModalOpen(true);

    try {
      const details = await fetchCompanyDetails(entity.lei);
      setCompanyDetails(details);
    } catch (error) {
      toast.error("Failed to fetch company details");
      console.error("Error fetching company details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleAddToDatabase = (entity: any) => {
    // Add to saved entities
    setSavedEntities((prev) => new Set([...prev, entity.lei]));

    // Show success toast
    toast.success(`${entity.legalName} added to database`, {
      description: `LEI: ${entity.lei}`,
      action: {
        label: "View Database",
        onClick: () => {
          // Navigate to a saved entities view
          console.log("Navigate to saved entities");
        },
      },
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute -top-4 -right-4 h-40 w-40 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Search className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-widest">Entity Search</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight gold-accent-line" style={{ fontFamily: 'var(--font-display)' }}>
            FatCat LEI Search
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Search for Legal Entity Identifiers by LEI code, entity name, or other criteria with FatCat's intelligent search engine.
          </p>
        </div>
      </div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="bg-muted/30 p-1 rounded-xl">
          <TabsTrigger value="search" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Search
          </TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Advanced Search
          </TabsTrigger>
          <TabsTrigger value="batch" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Batch Search
          </TabsTrigger>
          <TabsTrigger value="api" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            API Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          {/* Search Card */}
          <Card className="card-hover-lift overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
            <CardHeader className="relative pb-2">
              <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                Quick Search
              </CardTitle>
              <CardDescription>
                Search by LEI code, entity name, or registration number
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter LEI code, entity name, or search term..."
                    className="pl-10 h-11 rounded-lg border-border/50 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={searchQuery}
                    onChange={(e) =>
                      setSearchQuery(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                  />
                </div>
                <Select>
                  <SelectTrigger className="w-40 h-11 rounded-lg border-border/50">
                    <SelectValue placeholder="Search Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Fields</SelectItem>
                    <SelectItem value="lei">LEI Code</SelectItem>
                    <SelectItem value="name">Entity Name</SelectItem>
                    <SelectItem value="jurisdiction">Jurisdiction</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  className="h-11 px-6 rounded-lg bg-primary hover:bg-primary/90 shadow-sm"
                >
                  {isSearching ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {recentSearches.length > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-muted-foreground">
                    Recent:
                  </span>
                  {recentSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(search);
                        performSearch(search);
                      }}
                      className="text-xs h-7 rounded-full bg-muted/30 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {search}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card className="card-hover-lift">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                    Search Results
                    {searchResults.length > 0 && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {searchResults.length.toLocaleString()} found
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Click on any result to explore entity details
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg border-border/50 hover:bg-muted/50">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg border-border/50 hover:bg-muted/50">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-visible p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">LEI Code</TableHead>
                      <TableHead className="font-semibold">Legal Name</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Jurisdiction</TableHead>
                      <TableHead className="font-semibold">S&P Global</TableHead>
                      <TableHead className="font-semibold">Last Update</TableHead>
                      <TableHead className="font-semibold">Direct Children</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                            <p>No results yet. Enter a search term above.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      searchResults.map((result) => (
                        <TableRow
                          key={result.lei}
                          className="group table-row-hover cursor-pointer"
                          onClick={() => handleViewDetails(result)}
                        >
                          <TableCell>
                            <div className="font-mono text-xs bg-muted/50 px-2 py-1 rounded inline-block group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              {result.lei}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium group-hover:text-primary transition-colors">
                              {result.legalName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                              {result.address}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium ${
                                result.status === "Active"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : result.status === "Lapsed"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : "bg-muted/50"
                              }`}
                            >
                              {result.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{result.jurisdiction}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {Array.isArray(result.spglobal) && result.spglobal.length > 0
                                ? result.spglobal.join(", ")
                                : "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground tabular-nums">{result.lastUpdate}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm tabular-nums font-medium">
                              {typeof result.directChildrenCount === 'number'
                                ? result.directChildrenCount.toLocaleString()
                                : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-52 rounded-xl shadow-lg border-border/50"
                                style={{ zIndex: 9999 }}
                              >
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(result)}
                                  className="py-2.5 cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Company Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    try {
                                      sessionStorage.setItem('hierarchyLEI', result.lei)
                                    } catch {}
                                    window.dispatchEvent(new CustomEvent('navigate', {
                                      detail: { page: 'hierarchy' }
                                    }));
                                    setTimeout(() => {
                                      try {
                                        window.dispatchEvent(new CustomEvent('hierarchy:set-lei', { detail: { lei: result.lei } }))
                                      } catch {}
                                    }, 0)
                                  }}
                                  className="py-2.5 cursor-pointer"
                                >
                                  <Network className="h-4 w-4 mr-2" />
                                  View Hierarchy
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAddToDatabase(result)}
                                  disabled={savedEntities.has(result.lei)}
                                  className="py-2.5 cursor-pointer"
                                >
                                  {savedEntities.has(result.lei) ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
                                      <span className="text-emerald-600">Added to Database</span>
                                    </>
                                  ) : (
                                    <>
                                      <Database className="h-4 w-4 mr-2" />
                                      Add to Database
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Search</CardTitle>
              <CardDescription>
                Search with multiple criteria and filters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Entity Name
                  </label>
                  <Input placeholder="Enter entity name..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    LEI Code
                  </label>
                  <Input placeholder="Enter LEI code..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Jurisdiction
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">
                        United States
                      </SelectItem>
                      <SelectItem value="GB">
                        United Kingdom
                      </SelectItem>
                      <SelectItem value="DE">
                        Germany
                      </SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Status
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        Active
                      </SelectItem>
                      <SelectItem value="lapsed">
                        Lapsed
                      </SelectItem>
                      <SelectItem value="retired">
                        Retired
                      </SelectItem>
                      <SelectItem value="pending">
                        Pending
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Registration Date From
                  </label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Registration Date To
                  </label>
                  <Input type="date" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button>Search</Button>
                <Button variant="outline">Clear Filters</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Search</CardTitle>
              <CardDescription>
                Upload a file or paste multiple LEI codes to
                search in bulk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drop a CSV or text file here, or click to
                  browse
                </p>
                <Button variant="outline" size="sm">
                  Browse Files
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Or paste LEI codes (one per line)
                </label>
                <textarea
                  className="w-full min-h-32 p-3 border rounded-md text-sm font-mono"
                  placeholder="5493001KJTIIGC8Y1R12&#10;HWUPKR0MPOU8FGXBT394&#10;213800MBFP4A78EHRX08"
                />
              </div>

              <Button>Process Batch Search</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>
                Access LEI data programmatically through our
                REST API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      API Endpoints
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="font-mono text-sm p-2 bg-muted rounded">
                      GET /api/v1/lei/&#123;lei-code&#125;
                    </div>
                    <div className="font-mono text-sm p-2 bg-muted rounded">
                      GET /api/v1/entities/search
                    </div>
                    <div className="font-mono text-sm p-2 bg-muted rounded">
                      GET
                      /api/v1/entities/hierarchy/&#123;lei-code&#125;
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Rate Limits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Free Tier</span>
                      <span className="text-sm font-medium">
                        1,000/day
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Premium</span>
                      <span className="text-sm font-medium">
                        10,000/day
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">
                        Enterprise
                      </span>
                      <span className="text-sm font-medium">
                        Unlimited
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    value="lei_sk_1234567890abcdef"
                    readOnly
                    className="font-mono"
                  />
                  <Button variant="outline">Copy</Button>
                  <Button variant="outline">Regenerate</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Company Details Modal */}
      <Dialog
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Details - GLEIF Level 1 Data
            </DialogTitle>
            <DialogDescription>
              Detailed entity information from the Global Legal
              Entity Identifier Foundation (GLEIF)
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">
                Fetching company details...
              </span>
            </div>
          ) : companyDetails ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        LEI Code
                      </label>
                      <p className="font-mono text-sm mt-1">
                        {companyDetails.lei}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Legal Name
                      </label>
                      <p className="font-medium mt-1">
                        {companyDetails.legalName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Entity Status
                      </label>
                      <Badge
                        variant={
                          companyDetails.entityStatus ===
                          "ACTIVE"
                            ? "default"
                            : "secondary"
                        }
                        className="mt-1"
                      >
                        {companyDetails.entityStatus}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Legal Jurisdiction
                      </label>
                      <p className="mt-1">
                        {companyDetails.legalJurisdiction}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Entity Category
                      </label>
                      <p className="mt-1">
                        {companyDetails.entityCategory}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Entity Sub-Category
                      </label>
                      <p className="mt-1">
                        {companyDetails.entitySubCategory}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Legal Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {companyDetails.legalAddress.addressLines.map(
                        (line, index) => (
                          <p key={index} className="text-sm">
                            {line}
                          </p>
                        ),
                      )}
                      <p className="text-sm">
                        {companyDetails.legalAddress.city},{" "}
                        {companyDetails.legalAddress.region}{" "}
                        {companyDetails.legalAddress.postalCode}
                      </p>
                      <p className="text-sm font-medium">
                        {companyDetails.legalAddress.country}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Headquarters Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {companyDetails.headquartersAddress.addressLines.map(
                        (line, index) => (
                          <p key={index} className="text-sm">
                            {line}
                          </p>
                        ),
                      )}
                      <p className="text-sm">
                        {
                          companyDetails.headquartersAddress
                            .city
                        }
                        ,{" "}
                        {
                          companyDetails.headquartersAddress
                            .region
                        }{" "}
                        {
                          companyDetails.headquartersAddress
                            .postalCode
                        }
                      </p>
                      <p className="text-sm font-medium">
                        {
                          companyDetails.headquartersAddress
                            .country
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Registration Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Registration Authority
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Registration Authority ID
                      </label>
                      <p className="font-mono text-sm mt-1">
                        {
                          companyDetails.registrationAuthority
                            .registrationAuthorityID
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Registration Authority Entity ID
                      </label>
                      <p className="font-mono text-sm mt-1">
                        {
                          companyDetails.registrationAuthority
                            .registrationAuthorityEntityID
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dates and Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Important Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Entity Creation Date
                      </label>
                      <p className="text-sm mt-1">
                        {new Date(
                          companyDetails.entityCreationDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Last Update Date
                      </label>
                      <p className="text-sm mt-1">
                        {new Date(
                          companyDetails.lastUpdateDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Next Renewal Date
                      </label>
                      <p className="text-sm mt-1">
                        {new Date(
                          companyDetails.nextRenewalDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Managing LOU
                      </label>
                      <p className="font-mono text-sm mt-1">
                        {companyDetails.managingLOU}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Validation Sources
                    </label>
                    <p className="text-sm mt-1">
                      {companyDetails.validationSources}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() =>
                    handleAddToDatabase(selectedEntity)
                  }
                >
                  <Database className="h-4 w-4 mr-2" />
                  Add to Database
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No company details available
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}