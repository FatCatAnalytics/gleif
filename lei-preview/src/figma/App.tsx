import { useState, useEffect } from "react"
import { AppLayout } from "./components/AppLayout"
import { DashboardPage } from "./components/pages/DashboardPage"
import { LEISearchPage } from "./components/pages/LEISearchPage"
import { EntityMatchPage } from "./components/pages/EntityMatchPage"
import { HierarchyPage } from "./components/pages/HierarchyPage"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Button } from "./components/ui/button"
import { Toaster } from "./components/ui/sonner"

import { FileText, Sparkles, BarChart3, Globe, Clock, Download, ArrowUpRight } from "lucide-react"

// LEI Reports Page
function ReportsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute -top-4 left-1/4 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-widest">Analytics & Reporting</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight gold-accent-line" style={{ fontFamily: 'var(--font-display)' }}>
            FatCat Reports
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Generate and manage LEI data reports and analytics with FatCat's powerful intelligence tools.
          </p>
        </div>
      </div>

      <Tabs defaultValue="standard-reports" className="space-y-6">
        <TabsList className="bg-muted/30 p-1 rounded-xl">
          <TabsTrigger value="standard-reports" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Standard Reports
          </TabsTrigger>
          <TabsTrigger value="custom-reports" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Custom Reports
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="exports" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Data Exports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard-reports">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {[
              { title: "Global LEI Statistics", description: "Comprehensive overview of worldwide LEI data", lastGenerated: "Generated 2 hours ago", status: "ready", icon: Globe },
              { title: "Jurisdiction Analysis", description: "LEI distribution by country and region", lastGenerated: "Generated yesterday", status: "ready", icon: BarChart3 },
              { title: "Status Report", description: "Active, lapsed, and retired LEI breakdown", lastGenerated: "Generated 3 days ago", status: "outdated", icon: FileText },
              { title: "Growth Trends", description: "LEI registration growth over time", lastGenerated: "Generated 1 week ago", status: "outdated", icon: Sparkles },
              { title: "Data Quality Report", description: "Completeness and accuracy metrics", lastGenerated: "Generated 2 days ago", status: "ready", icon: BarChart3 },
              { title: "LOU Performance", description: "Local Operating Unit statistics", lastGenerated: "Generated yesterday", status: "ready", icon: Clock },
            ].map((report, index) => (
              <Card key={index} className="group card-hover-lift relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="relative pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <report.icon className="h-5 w-5" />
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ${
                      report.status === 'ready'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {report.status === 'ready' ? 'Ready' : 'Outdated'}
                    </span>
                  </div>
                  <CardTitle className="text-base mt-3 group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
                    {report.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">{report.description}</CardDescription>
                </CardHeader>
                <CardContent className="relative pt-0">
                  <p className="text-[11px] text-muted-foreground/70 mb-4">{report.lastGenerated}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 rounded-lg bg-primary hover:bg-primary/90 shadow-sm">
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Generate
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-lg border-border/50">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="custom-reports">
          <Card className="card-hover-lift">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'var(--font-display)' }}>Custom Report Builder</CardTitle>
              <CardDescription>Create customized LEI data reports tailored to your needs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                {[
                  { title: "Data Analytics", description: "Statistical analysis and trends", icon: BarChart3, gradient: "from-primary to-accent" },
                  { title: "Geographic", description: "Regional and country-based reports", icon: Globe, gradient: "from-emerald-500 to-emerald-400" },
                  { title: "Time Series", description: "Historical data analysis", icon: Clock, gradient: "from-violet-500 to-violet-400" },
                  { title: "Custom Query", description: "Build custom data queries", icon: Sparkles, gradient: "from-amber-500 to-amber-400" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="group relative p-5 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-lg cursor-pointer transition-all bg-gradient-to-br from-card to-muted/10"
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-sm mb-4`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold mb-1.5 group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <ArrowUpRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scheduled">
          <Card className="card-hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle style={{ fontFamily: 'var(--font-display)' }}>Scheduled Reports</CardTitle>
                  <CardDescription className="mt-1">Automated report generation schedule</CardDescription>
                </div>
                <Button size="sm" className="rounded-lg">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  New Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Weekly Status Report", frequency: "Every Monday at 9:00 AM", status: "active", nextRun: "Next: Monday, Aug 12" },
                  { name: "Monthly Analytics", frequency: "First day of each month", status: "active", nextRun: "Next: Sep 1" },
                  { name: "Quarterly Review", frequency: "Every 3 months", status: "paused", nextRun: "Paused" },
                ].map((schedule, index) => (
                  <div
                    key={index}
                    className="group flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-muted/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        schedule.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium group-hover:text-primary transition-colors">{schedule.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{schedule.frequency}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">{schedule.nextRun}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                        schedule.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {schedule.status === 'active' ? 'Active' : 'Paused'}
                      </span>
                      <Button size="sm" variant="outline" className="h-8 rounded-lg border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="exports">
          <Card className="card-hover-lift">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'var(--font-display)' }}>Data Exports</CardTitle>
              <CardDescription>Bulk data export and download tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-children">
                {[
                  { title: "CSV Export", description: "Export data in CSV format", icon: FileText, gradient: "from-primary to-primary/80" },
                  { title: "Excel Export", description: "Export formatted Excel files", icon: BarChart3, gradient: "from-accent to-accent/80" },
                  { title: "API Export", description: "Programmatic data access", icon: Globe, gradient: "from-emerald-500 to-emerald-400" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="group relative text-center p-8 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer transition-all"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} mx-auto mb-4 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Export
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard")

  useEffect(() => {
    const handleNavigation = (event: CustomEvent) => {
      setCurrentPage(event.detail.page)
    }

    window.addEventListener('navigate', handleNavigation as EventListener)
    
    return () => {
      window.removeEventListener('navigate', handleNavigation as EventListener)
    }
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />
      case "search":
        return <LEISearchPage />
      case "entity-match":
        return <EntityMatchPage />
      case "hierarchy":
        return <HierarchyPage />
      // analytics removed
      case "reports":
        return <ReportsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <AppLayout>
      {renderPage()}
      <Toaster />
    </AppLayout>
  )
}