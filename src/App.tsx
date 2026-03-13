import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DiscoverPage from "./pages/DiscoverPage";
import BusinessDetailPage from "./pages/BusinessDetailPage";
import MyQueuePage from "./pages/MyQueuePage";
import OwnerDashboard from "./pages/OwnerDashboard";
import BusinessSetupPage from "./pages/BusinessSetupPage";
import OwnerAnalytics from "./pages/OwnerAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && profile?.role !== requiredRole) return <Navigate to="/" />;
  return <>{children}</>;
};

const HomeRedirect = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <LandingPage />;
  if (profile?.role === 'owner') return <Navigate to="/owner" />;
  return <Navigate to="/discover" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/discover" element={<ProtectedRoute requiredRole="customer"><DiscoverPage /></ProtectedRoute>} />
            <Route path="/business/:id" element={<ProtectedRoute><BusinessDetailPage /></ProtectedRoute>} />
            <Route path="/my-queue" element={<ProtectedRoute requiredRole="customer"><MyQueuePage /></ProtectedRoute>} />
            <Route path="/owner" element={<ProtectedRoute requiredRole="owner"><OwnerDashboard /></ProtectedRoute>} />
            <Route path="/owner/setup" element={<ProtectedRoute requiredRole="owner"><BusinessSetupPage /></ProtectedRoute>} />
            <Route path="/owner/analytics" element={<ProtectedRoute requiredRole="owner"><OwnerAnalytics /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
