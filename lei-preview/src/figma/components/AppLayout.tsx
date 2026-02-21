import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "./ui/sidebar"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Bell, Settings, LogOut, User, Home, Search, Target, Network, FileText, Sun, Moon, Sparkles } from "lucide-react"
import FatCatLogo from "../../assets/fatcat-logo.png"

interface AppLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  { title: "Dashboard", icon: Home, href: "dashboard" },
  { title: "Search", icon: Search, href: "search" },
  { title: "Entity Match", icon: Target, href: "entity-match" },
  { title: "Hierarchy", icon: Network, href: "hierarchy" },
  { title: "Reports", icon: FileText, href: "reports" },
]

export function AppLayout({ children }: AppLayoutProps) {
  const [activeItem, setActiveItem] = useState("dashboard")
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-sidebar-border/50">
          <SidebarHeader className="border-b border-sidebar-border/30">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 shadow-sm ring-1 ring-amber-200/50">
                <img src={FatCatLogo} alt="FatCat Logo" className="h-7 w-7" />
                <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 ring-2 ring-sidebar" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold tracking-tight text-sidebar-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                  FatCat
                </span>
                <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
                  Hierarchy Hub
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <div className="mb-3 px-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">
                Navigation
              </span>
            </div>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    onClick={() => {
                      setActiveItem(item.href)
                      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: item.href } }))
                    }}
                    isActive={activeItem === item.href}
                    className={`w-full justify-start rounded-lg px-3 py-2.5 transition-all duration-200 ${
                      activeItem === item.href
                        ? 'bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/5 text-sidebar-primary shadow-sm'
                        : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${activeItem === item.href ? 'text-sidebar-primary' : ''}`} />
                    <span className="font-medium">{item.title}</span>
                    {activeItem === item.href && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border/30 p-4">
            <div className="rounded-lg bg-sidebar-accent/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sidebar-primary/20 to-sidebar-primary/10 ring-1 ring-sidebar-primary/20">
                  <User className="h-4 w-4 text-sidebar-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-sidebar-foreground">LEI Admin</span>
                  <span className="text-[11px] text-sidebar-foreground/50">Enterprise</span>
                </div>
                <Sparkles className="ml-auto h-3.5 w-3.5 text-sidebar-primary/60" />
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          {/* Top Navigation */}
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center px-6 gap-4">
              <SidebarTrigger className="hover:bg-muted/50 rounded-lg" />

              {/* Elegant divider */}
              <div className="h-6 w-px bg-border/50" />

              {/* Breadcrumb area */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground capitalize" style={{ fontFamily: 'var(--font-display)' }}>
                  {activeItem.replace('-', ' ')}
                </span>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-1">
                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle theme"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    className="rounded-lg hover:bg-muted/50"
                  >
                    {resolvedTheme === "dark" ? (
                      <Sun className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="rounded-lg hover:bg-muted/50 relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                </Button>

                <Button variant="ghost" size="icon" className="rounded-lg hover:bg-muted/50">
                  <Settings className="h-4 w-4" />
                </Button>

                {/* Divider */}
                <div className="mx-2 h-6 w-px bg-border/50" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="/avatars/01.png" alt="@admin" />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                          LA
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-xl shadow-lg" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                            LA
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-0.5">
                          <p className="text-sm font-semibold leading-none">LEI Administrator</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            admin@gleif.org
                          </p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="py-2.5 cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="py-2.5 cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="py-2.5 cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="animate-fade-in-up">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}