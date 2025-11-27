import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, Outlet, useNavigate } from "react-router-dom";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";
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
            <Route path="/app/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            <Route path="/app/vehicles" element={<RequireAdmin><Vehicles /></RequireAdmin>} />
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
                <SidebarMenuButton asChild>
                  <Link to="/app/scanner">Scanner</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {auth?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/app/admin">Admin</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {auth?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/app/vehicles">Vehicles</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
