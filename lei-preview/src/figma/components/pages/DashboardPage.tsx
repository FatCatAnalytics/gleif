import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { TrendingUp, TrendingDown, Building2, Search, Globe, Activity, ArrowUpRight, Sparkles } from "lucide-react"

const StatCard = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend = 'up',
  highlight = false
}: {
  title: string
  value: string
  change: string
  changeLabel: string
  icon: any
  trend?: 'up' | 'down' | 'neutral'
  highlight?: boolean
}) => (
  <Card className={`card-hover-lift group relative overflow-hidden ${highlight ? 'ring-1 ring-primary/20' : ''}`}>
    {highlight && (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
    )}
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        highlight
          ? 'bg-gradient-to-br from-primary/20 to-accent/10 text-primary'
          : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
      }`}>
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent className="relative">
      <div className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        {trend === 'up' && (
          <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            {change}
          </span>
        )}
        {trend === 'down' && (
          <span className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-amber-600 dark:text-amber-400">
            <TrendingDown className="h-3 w-3" />
            {change}
          </span>
        )}
        {trend === 'neutral' && (
          <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
            <Sparkles className="h-3 w-3" />
            {change}
          </span>
        )}
        <span className="text-muted-foreground">{changeLabel}</span>
      </div>
    </CardContent>
  </Card>
)

export function DashboardPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-widest">Welcome Back</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight gold-accent-line" style={{ fontFamily: 'var(--font-display)' }}>
            FatCat Dashboard
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Monitor global LEI activity and explore corporate structures. Your gateway to comprehensive entity intelligence.
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/30 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Overview
          </TabsTrigger>
          <TabsTrigger value="statistics" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Statistics
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Reports
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Recent Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            <StatCard
              title="Total LEI Records"
              value="2,847,129"
              change="+2.1%"
              changeLabel="from last month"
              icon={Building2}
              trend="up"
              highlight
            />
            <StatCard
              title="Active LEIs"
              value="2,234,567"
              change="+1.8%"
              changeLabel="from last month"
              icon={Activity}
              trend="up"
            />
            <StatCard
              title="Daily Searches"
              value="156,789"
              change="+12%"
              changeLabel="from yesterday"
              icon={Search}
              trend="up"
            />
            <StatCard
              title="Countries"
              value="195"
              change="Complete"
              changeLabel="global coverage"
              icon={Globe}
              trend="neutral"
            />
          </div>
          
          {/* Two Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-hover-lift">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                      Recent Registrations
                      <Badge variant="secondary" className="text-[10px] font-normal">Live</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">Newly registered Legal Entity Identifiers</CardDescription>
                  </div>
                  <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { lei: "5493001KJTIIGC8Y1R12", entity: "Global Finance Corp", country: "US", date: "2024-08-04" },
                  { lei: "213800XK3L2W7K1T9R45", entity: "European Investment Ltd", country: "DE", date: "2024-08-04" },
                  { lei: "391200KHPH8T6R2F7Q89", entity: "Asia Pacific Holdings", country: "SG", date: "2024-08-03" },
                  { lei: "635400XM9N5U8S3G6P23", entity: "Nordic Capital AB", country: "SE", date: "2024-08-03" },
                  { lei: "724500PKQ3J7H9F5K1W7", entity: "Australian Mining Co", country: "AU", date: "2024-08-03" },
                ].map((registration, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate group-hover:text-primary transition-colors">
                        {registration.entity}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{registration.lei}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge variant="outline" className="bg-background font-medium">{registration.country}</Badge>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{registration.date}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="card-hover-lift">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle style={{ fontFamily: 'var(--font-display)' }}>Status Distribution</CardTitle>
                    <CardDescription className="mt-1">Current status of all LEI records</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { status: "Active", count: 2234567, progress: 78, colorClass: "from-emerald-500 to-emerald-600" },
                  { status: "Lapsed", count: 412890, progress: 14, colorClass: "from-amber-500 to-amber-600" },
                  { status: "Retired", count: 156789, progress: 6, colorClass: "from-rose-500 to-rose-600" },
                  { status: "Pending", count: 42883, progress: 2, colorClass: "from-primary to-accent" },
                ].map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${item.colorClass}`} />
                        <span className="text-sm font-medium">{item.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm tabular-nums">{item.count.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground w-8 text-right">{item.progress}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${item.colorClass} transition-all duration-500`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="statistics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
            <Card className="card-hover-lift">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Globe className="h-4 w-4 text-primary" />
                  Regional Distribution
                </CardTitle>
                <CardDescription>LEI records by region</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { region: "Europe", percentage: 45, count: "1,281,408", flag: "EU" },
                  { region: "North America", percentage: 28, count: "797,196", flag: "NA" },
                  { region: "Asia Pacific", percentage: 18, count: "512,483", flag: "AP" },
                  { region: "Latin America", percentage: 6, count: "170,828", flag: "LA" },
                  { region: "Africa & Middle East", percentage: 3, count: "85,414", flag: "AM" },
                ].map((region, index) => (
                  <div key={index} className="space-y-2 group">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded">
                          {region.flag}
                        </span>
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">{region.region}</span>
                      </div>
                      <span className="text-sm tabular-nums text-muted-foreground">{region.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                        style={{ width: `${region.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="card-hover-lift">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Building2 className="h-4 w-4 text-primary" />
                  Entity Types
                </CardTitle>
                <CardDescription>Distribution by legal form</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { type: "Corporation", percentage: 42, count: "1,195,794", color: "from-primary to-primary/80" },
                  { type: "Limited Liability", percentage: 24, count: "683,311", color: "from-accent to-accent/80" },
                  { type: "Partnership", percentage: 15, count: "427,069", color: "from-amber-500 to-amber-400" },
                  { type: "Foundation", percentage: 12, count: "341,655", color: "from-emerald-500 to-emerald-400" },
                  { type: "Other", percentage: 7, count: "199,300", color: "from-muted-foreground to-muted-foreground/80" },
                ].map((type, index) => (
                  <div key={index} className="space-y-2 group">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">{type.type}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">{type.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${type.color} transition-all duration-500`}
                        style={{ width: `${type.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="card-hover-lift">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Monthly Trends
                </CardTitle>
                <CardDescription>LEI registrations over time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { month: "August 2024", registrations: 12456, change: "+8.2%", isTop: true },
                  { month: "July 2024", registrations: 11523, change: "+5.7%", isTop: false },
                  { month: "June 2024", registrations: 10894, change: "+12.3%", isTop: false },
                  { month: "May 2024", registrations: 9703, change: "+3.1%", isTop: false },
                  { month: "April 2024", registrations: 9412, change: "+7.8%", isTop: false },
                ].map((month, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                      month.isTop ? 'bg-primary/5 ring-1 ring-primary/10' : 'hover:bg-muted/30'
                    }`}
                  >
                    <span className={`text-sm ${month.isTop ? 'font-semibold text-primary' : 'font-medium'}`}>
                      {month.month}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums">{month.registrations.toLocaleString()}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium ${
                          month.isTop
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-muted/50'
                        }`}
                      >
                        {month.change}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          <Card className="card-hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle style={{ fontFamily: 'var(--font-display)' }}>Available Reports</CardTitle>
                  <CardDescription className="mt-1">Generate and download LEI data reports</CardDescription>
                </div>
                <button className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  View all reports <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
                {[
                  { title: "Global LEI Statistics", description: "Comprehensive overview of global LEI data", lastGenerated: "Generated 2 hours ago", icon: Globe, status: "ready" },
                  { title: "Country Analysis", description: "LEI distribution and trends by country", lastGenerated: "Generated yesterday", icon: Building2, status: "ready" },
                  { title: "Entity Type Report", description: "Breakdown by legal entity types and forms", lastGenerated: "Generated 3 days ago", icon: Activity, status: "outdated" },
                  { title: "Quality Metrics", description: "Data quality and completeness analysis", lastGenerated: "Generated 1 week ago", icon: Search, status: "outdated" },
                ].map((report, index) => (
                  <div
                    key={index}
                    className="group relative p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-card to-muted/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <report.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{report.title}</h3>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            report.status === 'ready'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {report.status === 'ready' ? 'Ready' : 'Outdated'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{report.description}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-2">{report.lastGenerated}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-6">
          <Card className="card-hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle style={{ fontFamily: 'var(--font-display)' }}>System Activity</CardTitle>
                  <CardDescription className="mt-1">Recent system events and updates</CardDescription>
                </div>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Live updates
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

                <div className="space-y-1">
                  {[
                    { title: "LEI data synchronization completed", description: "Daily sync with LOU systems completed successfully", time: "15 minutes ago", type: "system", typeColor: "bg-emerald-500" },
                    { title: "Bulk registration processed", description: "1,247 new LEI registrations processed", time: "2 hours ago", type: "registration", typeColor: "bg-primary" },
                    { title: "Data quality check completed", description: "Weekly data validation completed with 99.97% accuracy", time: "5 hours ago", type: "validation", typeColor: "bg-accent" },
                    { title: "API rate limit adjusted", description: "Increased rate limits for premium API users", time: "1 day ago", type: "api", typeColor: "bg-violet-500" },
                    { title: "System maintenance scheduled", description: "Planned maintenance window scheduled for next Sunday", time: "2 days ago", type: "maintenance", typeColor: "bg-amber-500" },
                  ].map((activity, index) => (
                    <div
                      key={index}
                      className="relative flex items-start gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      {/* Timeline dot */}
                      <div className={`relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full ${activity.typeColor} ring-4 ring-background`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium group-hover:text-primary transition-colors">
                              {activity.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{activity.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize bg-muted/30"
                            >
                              {activity.type}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground/70 tabular-nums whitespace-nowrap">
                              {activity.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}