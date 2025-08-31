import { useState, useEffect } from "react"
import { AppLayout } from "./components/AppLayout"
import { DashboardPage } from "./components/pages/DashboardPage"
import { LEISearchPage } from "./components/pages/LEISearchPage"
import { EntityMatchPage } from "./components/pages/EntityMatchPage"
import { HierarchyPage } from "./components/pages/HierarchyPage"
import { AnalyticsPage } from "./components/pages/AnalyticsPage"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Button } from "./components/ui/button"
import { Toaster } from "./components/ui/sonner"

// LEI Reports Page
function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>FatCat Reports</h1>
        <p className="text-muted-foreground">Generate and manage LEI data reports and analytics with FatCat's powerful tools.</p>
      </div>
      
      <Tabs defaultValue="standard-reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="standard-reports">Standard Reports</TabsTrigger>
          <TabsTrigger value="custom-reports">Custom Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="exports">Data Exports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard-reports">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Global LEI Statistics", description: "Comprehensive overview of worldwide LEI data", lastGenerated: "Generated 2 hours ago", status: "ready", color: "bg-green-100 text-green-800" },
              { title: "Jurisdiction Analysis", description: "LEI distribution by country and region", lastGenerated: "Generated yesterday", status: "ready", color: "bg-blue-100 text-blue-800" },
              { title: "Status Report", description: "Active, lapsed, and retired LEI breakdown", lastGenerated: "Generated 3 days ago", status: "outdated", color: "bg-amber-100 text-amber-800" },
              { title: "Growth Trends", description: "LEI registration growth over time", lastGenerated: "Generated 1 week ago", status: "outdated", color: "bg-amber-100 text-amber-800" },
              { title: "Data Quality Report", description: "Completeness and accuracy metrics", lastGenerated: "Generated 2 days ago", status: "ready", color: "bg-green-100 text-green-800" },
              { title: "LOU Performance", description: "Local Operating Unit statistics", lastGenerated: "Generated yesterday", status: "ready", color: "bg-blue-100 text-blue-800" },
            ].map((report, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${report.color}`}>
                      {report.status === 'ready' ? '✓ Ready' : '⚠ Outdated'}
                    </span>
                  </div>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">{report.lastGenerated}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">Generate</Button>
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="custom-reports">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
              <CardDescription>Create customized LEI data reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-accent/10 border-2 border-accent/20 hover:bg-accent/20 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-full bg-accent mb-3 flex items-center justify-center">
                    <span className="text-accent-foreground text-sm">📊</span>
                  </div>
                  <h3 className="font-medium mb-2">Data Analytics</h3>
                  <p className="text-sm text-muted-foreground">Statistical analysis and trends</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border-2 border-green-200 hover:bg-green-100 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-full bg-green-500 mb-3 flex items-center justify-center">
                    <span className="text-white text-sm">🌍</span>
                  </div>
                  <h3 className="font-medium mb-2">Geographic</h3>
                  <p className="text-sm text-muted-foreground">Regional and country-based reports</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border-2 border-purple-200 hover:bg-purple-100 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-full bg-purple-500 mb-3 flex items-center justify-center">
                    <span className="text-white text-sm">📈</span>
                  </div>
                  <h3 className="font-medium mb-2">Time Series</h3>
                  <p className="text-sm text-muted-foreground">Historical data analysis</p>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 border-2 border-orange-200 hover:bg-orange-100 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-full bg-orange-500 mb-3 flex items-center justify-center">
                    <span className="text-white text-sm">🔍</span>
                  </div>
                  <h3 className="font-medium mb-2">Custom Query</h3>
                  <p className="text-sm text-muted-foreground">Build custom data queries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Automated report generation schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Weekly Status Report", frequency: "Every Monday at 9:00 AM", status: "active", nextRun: "Next: Monday, Aug 12" },
                  { name: "Monthly Analytics", frequency: "First day of each month", status: "active", nextRun: "Next: Sep 1" },
                  { name: "Quarterly Review", frequency: "Every 3 months", status: "paused", nextRun: "Paused" },
                ].map((schedule, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex-1">
                      <h4 className="font-medium">{schedule.name}</h4>
                      <p className="text-sm text-muted-foreground">{schedule.frequency}</p>
                      <p className="text-xs text-muted-foreground mt-1">{schedule.nextRun}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${schedule.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {schedule.status === 'active' ? '● Active' : '⏸ Paused'}
                      </span>
                      <Button size="sm" variant="outline">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="exports">
          <Card>
            <CardHeader>
              <CardTitle>Data Exports</CardTitle>
              <CardDescription>Bulk data export and download tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-6 rounded-lg border-2 border-dashed border-primary/20 hover:border-primary/40 cursor-pointer transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-primary text-lg">📄</span>
                  </div>
                  <h3 className="font-medium mb-2">CSV Export</h3>
                  <p className="text-sm text-muted-foreground">Export data in CSV format</p>
                </div>
                <div className="text-center p-6 rounded-lg border-2 border-dashed border-accent/20 hover:border-accent/40 cursor-pointer transition-colors">
                  <div className="w-12 h-12 rounded-full bg-accent/10 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-accent text-lg">📊</span>
                  </div>
                  <h3 className="font-medium mb-2">Excel Export</h3>
                  <p className="text-sm text-muted-foreground">Export formatted Excel files</p>
                </div>
                <div className="text-center p-6 rounded-lg border-2 border-dashed border-green-300 hover:border-green-400 cursor-pointer transition-colors">
                  <div className="w-12 h-12 rounded-full bg-green-100 mx-auto mb-3 flex items-center justify-center">
                    <span className="text-green-600 text-lg">🔗</span>
                  </div>
                  <h3 className="font-medium mb-2">API Export</h3>
                  <p className="text-sm text-muted-foreground">Programmatic data access</p>
                </div>
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
      case "analytics":
        return <AnalyticsPage />
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