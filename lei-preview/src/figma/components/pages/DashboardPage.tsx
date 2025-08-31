import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"
import { TrendingUp, TrendingDown, Building2, Search, Globe, Activity } from "lucide-react"

export function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>FatCat Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to FatCat Hierarchy Hub. Monitor global LEI activity and explore corporate structures with style.
        </p>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total LEI Records</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,847,129</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +2.1% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active LEIs</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,234,567</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +1.8% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Searches</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156,789</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +12% from yesterday
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Countries</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">195</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingDown className="inline h-3 w-3 mr-1" />
                  Coverage complete
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent LEI Registrations</CardTitle>
                <CardDescription>Newly registered Legal Entity Identifiers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { lei: "5493001KJTIIGC8Y1R12", entity: "Global Finance Corp", country: "US", date: "2024-08-04" },
                  { lei: "213800XK3L2W7K1T9R45", entity: "European Investment Ltd", country: "DE", date: "2024-08-04" },
                  { lei: "391200KHPH8T6R2F7Q89", entity: "Asia Pacific Holdings", country: "SG", date: "2024-08-03" },
                  { lei: "635400XM9N5U8S3G6P23", entity: "Nordic Capital AB", country: "SE", date: "2024-08-03" },
                  { lei: "724500PKQ3J7H9F5K1W7", entity: "Australian Mining Co", country: "AU", date: "2024-08-03" },
                ].map((registration, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{registration.entity}</p>
                      <p className="text-sm text-muted-foreground">{registration.lei}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{registration.country}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{registration.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>LEI Status Distribution</CardTitle>
                <CardDescription>Current status of all LEI records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { status: "Active", count: 2234567, progress: 78, color: "bg-green-500" },
                  { status: "Lapsed", count: 412890, progress: 14, color: "bg-yellow-500" },
                  { status: "Retired", count: 156789, progress: 6, color: "bg-red-500" },
                  { status: "Pending", count: 42883, progress: 2, color: "bg-blue-500" },
                ].map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.status}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{item.count.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground">{item.progress}%</span>
                      </div>
                    </div>
                    <Progress value={item.progress} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Regional Distribution</CardTitle>
                <CardDescription>LEI records by region</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { region: "Europe", percentage: 45, count: "1,281,408" },
                  { region: "North America", percentage: 28, count: "797,196" },
                  { region: "Asia Pacific", percentage: 18, count: "512,483" },
                  { region: "Latin America", percentage: 6, count: "170,828" },
                  { region: "Africa & Middle East", percentage: 3, count: "85,414" },
                ].map((region, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{region.region}</span>
                      <span className="text-sm text-muted-foreground">{region.count}</span>
                    </div>
                    <Progress value={region.percentage} />
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Entity Types</CardTitle>
                <CardDescription>Distribution by legal form</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: "Corporation", percentage: 42, count: "1,195,794" },
                  { type: "Limited Liability", percentage: 24, count: "683,311" },
                  { type: "Partnership", percentage: 15, count: "427,069" },
                  { type: "Foundation", percentage: 12, count: "341,655" },
                  { type: "Other", percentage: 7, count: "199,300" },
                ].map((type, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{type.type}</span>
                      <span className="text-sm text-muted-foreground">{type.count}</span>
                    </div>
                    <Progress value={type.percentage} />
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>LEI registrations over time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { month: "August 2024", registrations: 12456, change: "+8.2%" },
                  { month: "July 2024", registrations: 11523, change: "+5.7%" },
                  { month: "June 2024", registrations: 10894, change: "+12.3%" },
                  { month: "May 2024", registrations: 9703, change: "+3.1%" },
                  { month: "April 2024", registrations: 9412, change: "+7.8%" },
                ].map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{month.month}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{month.registrations.toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs">{month.change}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
              <CardDescription>Generate and download LEI data reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Global LEI Statistics", description: "Comprehensive overview of global LEI data", lastGenerated: "Generated 2 hours ago" },
                  { title: "Country Analysis", description: "LEI distribution and trends by country", lastGenerated: "Generated yesterday" },
                  { title: "Entity Type Report", description: "Breakdown by legal entity types and forms", lastGenerated: "Generated 3 days ago" },
                  { title: "Quality Metrics", description: "Data quality and completeness analysis", lastGenerated: "Generated 1 week ago" },
                ].map((report, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{report.lastGenerated}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
              <CardDescription>Recent system events and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: "LEI data synchronization completed", description: "Daily sync with LOU systems completed successfully", time: "15 minutes ago", type: "system" },
                { title: "Bulk registration processed", description: "1,247 new LEI registrations processed", time: "2 hours ago", type: "registration" },
                { title: "Data quality check completed", description: "Weekly data validation completed with 99.97% accuracy", time: "5 hours ago", type: "validation" },
                { title: "API rate limit adjusted", description: "Increased rate limits for premium API users", time: "1 day ago", type: "api" },
                { title: "System maintenance scheduled", description: "Planned maintenance window scheduled for next Sunday", time: "2 days ago", type: "maintenance" },
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge variant="outline">{activity.type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}