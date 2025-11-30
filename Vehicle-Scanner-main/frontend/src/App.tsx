import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, Outlet, useNavigate, NavLink } from "react-router-dom";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";
import Users from "@/pages/Users";
import DashboardPage from "@/pages/Dashboard";
import Scanner from "@/pages/Scanner";
import Vehicles from "@/pages/Vehicles";
import SignIn from "@/pages/SignIn";
import { getAuth, logout } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { QrCode, LayoutDashboard, CarFront, Users2, Settings2 } from "lucide-react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Public layout: no sidebar */}
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* App layout: with sidebar and dashboard routes */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/app" element={<Navigate to="/app/scanner" replace />} />
            <Route path="/app/scanner" element={<Scanner />} />
            <Route path="/app/dashboard" element={<RequireAdmin><DashboardPage /></RequireAdmin>} />
            <Route path="/app/admin" element={<RequireAdminOrGuard><Admin /></RequireAdminOrGuard>} />
            <Route path="/app/users" element={<RequireAdmin><Users /></RequireAdmin>} />
            <Route path="/app/vehicles" element={<RequireAdminOrGuard><Vehicles /></RequireAdminOrGuard>} />
            <Route path="/app/*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

function PublicLayout() {
  return (
    <div className="min-h-svh">
      <Outlet />
    </div>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const auth = getAuth();
  return (
    <SidebarProvider>
      <div className="flex min-h-svh">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="px-2 py-1 text-sm font-semibold">Squard24</div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="justify-start rounded-full px-4 py-2 my-1 border border-border bg-card/80 hover:bg-accent shadow-sm"
                >
                  <NavLink
                    to="/app/scanner"
                    className={({ isActive }) =>
                      `flex items-center gap-2 w-full ${isActive ? "bg-accent text-accent-foreground" : ""}`
                    }
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Scanner</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {auth?.role === "guard" && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="justify-start rounded-full px-4 py-2 my-1 border border-border bg-card/80 hover:bg-accent shadow-sm"
                    >
                      <NavLink
                        to="/app/admin"
                        className={({ isActive }) =>
                          `flex items-center gap-2 w-full ${isActive ? "bg-accent text-accent-foreground" : ""}`
                        }
                      >
                        <CarFront className="h-4 w-4" />
                        <span>Add Vehicle</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="justify-start rounded-full px-4 py-2 my-1 border border-border bg-card/80 hover:bg-accent shadow-sm"
                    >
                      <NavLink
                        to="/app/vehicles"
                        className={({ isActive }) =>
                          `flex items-center gap-2 w-full ${isActive ? "bg-accent text-accent-foreground" : ""}`
                        }
                      >
                        <CarFront className="h-4 w-4" />
                        <span>Vehicles</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              {auth?.role === "admin" && (
                <>
                  <div className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Admin
                  </div>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="justify-start rounded-full px-4 py-2 my-1 border border-border bg-card/80 hover:bg-accent shadow-sm"
                    >
                      <NavLink
                        to="/app/dashboard"
                        className={({ isActive }) =>
                          `flex items-center gap-2 w-full ${isActive ? "bg-accent text-accent-foreground" : ""}`
                        }
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="justify-start rounded-full px-4 py-2 my-1 border border-border bg-card/80 hover:bg-accent shadow-sm"
                    >
                      <NavLink
                        to="/app/vehicles"
                        className={({ isActive }) =>
                          `flex items-center gap-2 w-full ${isActive ? "bg-accent text-accent-foreground" : ""}`
                        }
                      >
                        <CarFront className="h-4 w-4" />
                        <span>Vehicles</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="justify-start rounded-full px-4 py-2 my-1 border border-border bg-card/80 hover:bg-accent shadow-sm"
                    >
                      <NavLink
                        to="/app/users"
                        className={({ isActive }) =>
                          `flex items-center gap-2 w-full ${isActive ? "bg-accent text-accent-foreground" : ""}`
                        }
                      >
                        <Users2 className="h-4 w-4" />
                        <span>Users</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="justify-start rounded-full px-4 py-2 my-1 border border-border bg-card/80 hover:bg-accent shadow-sm"
                    >
                      <NavLink
                        to="/app/admin"
                        className={({ isActive }) =>
                          `flex items-center gap-2 w-full ${isActive ? "bg-accent text-accent-foreground" : ""}`
                        }
                      >
                        <Settings2 className="h-4 w-4" />
                        <span>Admin Settings</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <button
              onClick={() => {
                logout();
                navigate('/signin', { replace: true });
              }}
              className="text-xs px-2 py-2 rounded-md border border-border hover:bg-accent w-full text-left"
            >
              Sign out
            </button>
          </SidebarFooter>
        </Sidebar>
        <SidebarRail />
        <SidebarInset>
          <div className="flex items-center gap-2 p-2 border-b border-border">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground">Dashboard</div>
          </div>
          <div className="flex-1 min-h-0">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const authed = !!getAuth();
  if (!authed) {
    return <Navigate to="/signin" replace />;
  }
  return children;
}

function RequireAdmin({ children }: { children: React.ReactElement }) {
  const auth = getAuth();
  if (!auth || auth.role !== "admin") {
    return <Navigate to="/app/scanner" replace />;
  }
  return children;
}

function RequireAdminOrGuard({ children }: { children: React.ReactElement }) {
  const auth = getAuth();
  if (!auth || (auth.role !== "admin" && auth.role !== "guard")) {
    return <Navigate to="/app/scanner" replace />;
  }
  return children;
}
