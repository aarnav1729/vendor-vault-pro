import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import VendorForm from "./pages/VendorForm";
import AdminDashboard from "./pages/AdminDashboard";
import VendorRanking from "./pages/VendorRanking";
import DueDiligenceDashboard from "./pages/DueDiligenceDashboard";
import ReviewerDashboard from "./pages/ReviewerDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
  dueDiligenceOnly?: boolean;
  reviewerOnly?: boolean;
}> = ({
  children,
  adminOnly = false,
  dueDiligenceOnly = false,
  reviewerOnly = false,
}) => {
  const { user, loading, isAdmin, isDueDiligence, isReviewer } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user?.verified) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/vendor-form" replace />;
  }

  if (dueDiligenceOnly && !isDueDiligence) {
    return <Navigate to="/vendor-form" replace />;
  }

  if (reviewerOnly && !isReviewer) {
    return <Navigate to="/vendor-form" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/vendor-form"
        element={
          <ProtectedRoute>
            <VendorForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/rankings"
        element={
          <ProtectedRoute adminOnly>
            <VendorRanking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/due-diligence"
        element={
          <ProtectedRoute dueDiligenceOnly>
            <DueDiligenceDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reviewer"
        element={
          <ProtectedRoute reviewerOnly>
            <ReviewerDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;