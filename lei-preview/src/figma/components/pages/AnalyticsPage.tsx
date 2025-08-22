import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"
import { Badge } from "../ui/badge"
import { Building2, Globe, TrendingUp, Users, Search, Database } from "lucide-react"

export function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>LEI Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive analytics and insights into global LEI data and usage patterns.
        </p>
      </div>
      
      <Tabs defaultValue="global-stats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global-stats">Global Statistics</TabsTrigger>
          <TabsTrigger value="usage-patterns">Usage Patterns</TabsTrigger>
          <TabsTrigger value="geographic">Geographic Analysis</TabsTrigger>
          <TabsTrigger value="quality-metrics">Quality Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="global-stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total LEI Records</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,847,129</div>
                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Entities</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,234,567</div>
                <p className="text-xs text-muted-foreground">+1.8% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily API Calls</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2M</div>
                <p className="text-xs text-muted-foreground">+12% from yesterday</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Completeness</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">97.8%</div>
                <p className="text-xs text-muted-foreground">+0.3% from last week</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>LEI Registration Trends</CardTitle>
                <CardDescription>Monthly registration volume over the past year</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { month: "August 2024", registrations: 12456, change: "+8.2%", growth: 85 },
                  { month: "July 2024", registrations: 11523, change: "+5.7%", growth: 78 },
                  { month: "June 2024", registrations: 10894, change: "+12.3%", growth: 92 },
                  { month: "May 2024", registrations: 9703, change: "+3.1%", growth: 65 },
                  { month: "April 2024", registrations: 9412, change: "+7.8%", growth: 72 },
                  { month: "March 2024", registrations: 8934, change: "+15.2%", growth: 95 },
                ].map((month, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{month.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{month.registrations.toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs">{month.change}</Badge>
                      </div>
                    </div>
                    <Progress value={month.growth} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Entity Status Distribution</CardTitle>
                <CardDescription>Current status breakdown of all LEI records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { status: "Active", count: "2,234,567", percentage: 78.5, color: "bg-green-500" },
                  { status: "Lapsed", count: "412,890", percentage: 14.5, color: "bg-yellow-500" },
                  { status: "Retired", count: "156,789", percentage: 5.5, color: "bg-red-500" },
                  { status: "Pending", count: "42,883", percentage: 1.5, color: "bg-blue-500" },
                ].map((status, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{status.status}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{status.count}</span>
                        <span className="text-sm text-muted-foreground">{status.percentage}%</span>
                      </div>
                    </div>
                    <Progress value={status.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="usage-patterns" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>API Usage by Hour</CardTitle>
                <CardDescription>Peak usage times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { time: "6 AM - 9 AM", calls: "45K", level: 25 },
                    { time: "9 AM - 12 PM", calls: "156K", level: 85 },
                    { time: "12 PM - 3 PM", calls: "189K", level: 95 },
                    { time: "3 PM - 6 PM", calls: "142K", level: 78 },
                    { time: "6 PM - 9 PM", calls: "89K", level: 55 },
                    { time: "9 PM - 12 AM", calls: "34K", level: 32 },
                  ].map((period, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">{period.time}</span>
                        <span className="text-sm text-muted-foreground">{period.calls}</span>
                      </div>
                      <Progress value={period.level} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Search Patterns</CardTitle>
                <CardDescription>Most common search types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: "LEI Code Lookup", percentage: 45, count: "540K" },
                    { type: "Entity Name Search", percentage: 32, count: "384K" },
                    { type: "Jurisdiction Filter", percentage: 15, count: "180K" },
                    { type: "Hierarchy Queries", percentage: 8, count: "96K" },
                  ].map((search, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{search.type}</span>
                        <span className="text-sm text-muted-foreground">{search.count}</span>
                      </div>
                      <Progress value={search.percentage} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>User Segments</CardTitle>
                <CardDescription>API usage by user type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { segment: "Financial Institutions", percentage: 55, users: "2,847" },
                    { segment: "Data Vendors", percentage: 25, users: "1,289" },
                    { segment: "Regulatory Bodies", percentage: 12, users: "619" },
                    { segment: "Other", percentage: 8, users: "412" },
                  ].map((segment, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{segment.segment}</span>
                        <span className="text-sm text-muted-foreground">{segment.users}</span>
                      </div>
                      <Progress value={segment.percentage} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
              <CardDescription>API calls and data access patterns over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { metric: "Daily API Calls", current: "1.2M", previous: "1.1M", change: "+9.1%" },
                  { metric: "Unique Users", current: "5,167", previous: "4,923", change: "+5.0%" },
                  { metric: "Data Downloads", current: "89K", previous: "82K", change: "+8.5%" },
                  { metric: "Average Response Time", current: "120ms", previous: "135ms", change: "-11.1%" },
                ].map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{trend.metric}</div>
                      <div className="text-sm text-muted-foreground">Current: {trend.current} | Previous: {trend.previous}</div>
                    </div>
                    <Badge variant={trend.change.startsWith('+') ? 'default' : 'secondary'}>
                      {trend.change}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global LEI Distribution</CardTitle>
              <CardDescription>LEI records by geographic region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4>By Region</h4>
                  {[
                    { region: "Europe", percentage: 45, count: "1,281,408", growth: "+2.3%" },
                    { region: "North America", percentage: 28, count: "797,196", growth: "+1.8%" },
                    { region: "Asia Pacific", percentage: 18, count: "512,483", growth: "+4.2%" },
                    { region: "Latin America", percentage: 6, count: "170,828", growth: "+3.1%" },
                    { region: "Africa & Middle East", percentage: 3, count: "85,214", growth: "+5.7%" },
                  ].map((region, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{region.region}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{region.count}</span>
                          <Badge variant="outline" className="text-xs">{region.growth}</Badge>
                        </div>
                      </div>
                      <Progress value={region.percentage} />
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h4>Top Countries</h4>
                  {[
                    { country: "United States", percentage: 24, count: "683,311" },
                    { country: "United Kingdom", percentage: 18, count: "512,483" },
                    { country: "Germany", percentage: 12, count: "341,655" },
                    { country: "France", percentage: 9, count: "256,241" },
                    { country: "Canada", percentage: 6, count: "170,828" },
                    { country: "Japan", percentage: 5, count: "142,356" },
                  ].map((country, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">{country.country}</span>
                        <span className="text-sm text-muted-foreground">{country.count}</span>
                      </div>
                      <Progress value={country.percentage} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="quality-metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Completeness</CardTitle>
                <CardDescription>Percentage of complete data fields</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { field: "Legal Name", completeness: 99.9, quality: "Excellent" },
                  { field: "Legal Address", completeness: 98.7, quality: "Excellent" },
                  { field: "Headquarters Address", completeness: 94.2, quality: "Good" },
                  { field: "Registration Authority", completeness: 99.5, quality: "Excellent" },
                  { field: "Legal Form", completeness: 96.8, quality: "Good" },
                  { field: "Entity Status", completeness: 99.8, quality: "Excellent" },
                ].map((field, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{field.field}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{field.completeness}%</span>
                        <Badge variant={field.quality === "Excellent" ? "default" : "secondary"}>
                          {field.quality}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={field.completeness} />
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Data Quality Trends</CardTitle>
                <CardDescription>Quality metrics over time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { metric: "Overall Completeness", current: "97.8%", trend: "+0.3%", status: "Improving" },
                  { metric: "Data Accuracy", current: "99.2%", trend: "+0.1%", status: "Stable" },
                  { metric: "Timeliness", current: "95.4%", trend: "+1.2%", status: "Improving" },
                  { metric: "Consistency", current: "98.9%", trend: "0.0%", status: "Stable" },
                ].map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{metric.metric}</div>
                      <div className="text-sm text-muted-foreground">{metric.current}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{metric.trend}</Badge>
                      <div className="text-xs text-muted-foreground mt-1">{metric.status}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Quality Issues</CardTitle>
              <CardDescription>Common data quality issues and resolution status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { issue: "Missing headquarters address", count: 45678, priority: "Medium", resolved: 85 },
                  { issue: "Outdated entity status", count: 12456, priority: "High", resolved: 92 },
                  { issue: "Incomplete legal form data", count: 8923, priority: "Low", resolved: 67 },
                  { issue: "Address format inconsistency", count: 6734, priority: "Medium", resolved: 78 },
                ].map((issue, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{issue.issue}</div>
                      <div className="text-sm text-muted-foreground">{issue.count.toLocaleString()} records affected</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={issue.priority === "High" ? "destructive" : issue.priority === "Medium" ? "default" : "secondary"}>
                        {issue.priority}
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm font-medium">{issue.resolved}% resolved</div>
                        <Progress value={issue.resolved} className="w-16 h-2" />
                      </div>
                    </div>
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