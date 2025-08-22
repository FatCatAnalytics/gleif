import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Search, Filter, UserPlus, Mail, Phone } from "lucide-react"

export function CustomersPage() {
  const customers = [
    { id: 1, name: "Alice Johnson", email: "alice.johnson@email.com", status: "Active", totalOrders: 15, totalSpent: "$2,459.00", joinDate: "Jan 15, 2024" },
    { id: 2, name: "Bob Smith", email: "bob.smith@email.com", status: "Active", totalOrders: 8, totalSpent: "$1,234.00", joinDate: "Feb 3, 2024" },
    { id: 3, name: "Carol Davis", email: "carol.davis@email.com", status: "Inactive", totalOrders: 3, totalSpent: "$567.00", joinDate: "Mar 12, 2024" },
    { id: 4, name: "David Wilson", email: "david.wilson@email.com", status: "Active", totalOrders: 22, totalSpent: "$3,891.00", joinDate: "Jan 8, 2024" },
    { id: 5, name: "Eva Brown", email: "eva.brown@email.com", status: "Pending", totalOrders: 1, totalSpent: "$89.00", joinDate: "Apr 20, 2024" },
  ]

  const segments = [
    { name: "VIP Customers", count: 234, description: "Customers with $5,000+ lifetime value", growth: "+12%" },
    { name: "Regular Customers", count: 1456, description: "Active customers with 3+ orders", growth: "+8%" },
    { name: "New Customers", count: 89, description: "Customers who joined this month", growth: "+15%" },
    { name: "At-Risk Customers", count: 67, description: "Customers with no activity in 90+ days", growth: "-5%" },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer relationships and analyze customer data.
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="all-customers">All Customers</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,847</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,923</div>
                <p className="text-xs text-muted-foreground">+8% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Customer Lifetime Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$1,247</div>
                <p className="text-xs text-muted-foreground">+15% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">84.2%</div>
                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Acquisition</CardTitle>
                <CardDescription>New customers over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { month: "April", customers: 234, change: "+15%" },
                    { month: "March", customers: 189, change: "+8%" },
                    { month: "February", customers: 156, change: "+12%" },
                    { month: "January", customers: 143, change: "+5%" },
                    { month: "December", customers: 198, change: "+18%" },
                    { month: "November", customers: 167, change: "+9%" },
                  ].map((month, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{month.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{month.customers}</span>
                        <Badge variant="outline" className="text-xs">{month.change}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Customers with highest lifetime value</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "David Wilson", email: "david@email.com", value: "$3,891" },
                  { name: "Alice Johnson", email: "alice@email.com", value: "$2,459" },
                  { name: "Sarah Miller", email: "sarah@email.com", value: "$2,234" },
                  { name: "Mike Chen", email: "mike@email.com", value: "$1,987" },
                  { name: "Lisa Garcia", email: "lisa@email.com", value: "$1,765" },
                ].map((customer, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                    <div className="font-medium">{customer.value}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="all-customers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search customers..." className="pl-8 w-64" />
              </div>
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
          
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">{customer.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.status === 'Active' ? 'default' : customer.status === 'Inactive' ? 'secondary' : 'outline'}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.totalOrders}</TableCell>
                    <TableCell>{customer.totalSpent}</TableCell>
                    <TableCell>{customer.joinDate}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {segments.map((segment, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{segment.name}</CardTitle>
                    <Badge variant="outline">{segment.growth}</Badge>
                  </div>
                  <CardDescription>{segment.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{segment.count.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Customer Segmentation Rules</CardTitle>
              <CardDescription>Define automatic rules for customer segmentation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { rule: "VIP Status", condition: "Total spent > $5,000 OR Orders > 50", action: "Assign VIP badge" },
                { rule: "At-Risk", condition: "No activity in 90 days", action: "Send re-engagement email" },
                { rule: "High Value", condition: "Average order value > $200", action: "Offer premium support" },
                { rule: "New Customer", condition: "First order within 30 days", action: "Send welcome series" },
              ].map((rule, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="font-medium mb-2">{rule.rule}</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    <strong>Condition:</strong> {rule.condition}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Action:</strong> {rule.action}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Behavior</CardTitle>
                <CardDescription>Understanding customer buying patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Repeat Purchase Rate</span>
                    <span className="text-sm font-medium">67.3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Average Days Between Orders</span>
                    <span className="text-sm font-medium">23 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Most Popular Purchase Day</span>
                    <span className="text-sm font-medium">Friday</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Peak Purchase Time</span>
                    <span className="text-sm font-medium">2-4 PM</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction</CardTitle>
                <CardDescription>Feedback and satisfaction metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Average Rating</span>
                    <span className="text-sm font-medium">4.6/5.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Net Promoter Score</span>
                    <span className="text-sm font-medium">72</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Support Tickets</span>
                    <span className="text-sm font-medium">23 open</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Response Time</span>
                    <span className="text-sm font-medium">2.3 hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Customer Journey Analysis</CardTitle>
              <CardDescription>Track customer interactions across touchpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { stage: "Awareness", description: "Customer discovers your brand", conversion: "78%" },
                  { stage: "Interest", description: "Customer shows interest in products", conversion: "45%" },
                  { stage: "Consideration", description: "Customer compares options", conversion: "32%" },
                  { stage: "Purchase", description: "Customer makes first purchase", conversion: "12%" },
                  { stage: "Retention", description: "Customer makes repeat purchases", conversion: "67%" },
                  { stage: "Advocacy", description: "Customer recommends to others", conversion: "23%" },
                ].map((stage, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{stage.stage}</div>
                      <div className="text-sm text-muted-foreground">{stage.description}</div>
                    </div>
                    <Badge variant="outline">{stage.conversion}</Badge>
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