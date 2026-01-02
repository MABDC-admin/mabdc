import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EmployeePortal from "./pages/EmployeePortal";
import AttendanceScanner from "./pages/AttendanceScanner";
import QRScannerPage from "./pages/QRScannerPage";
import InstallPage from "./pages/InstallPage";
import AdminDashboard from "./pages/AdminDashboard";
import AuthPage from "./pages/AuthPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/employee/:employeeId" element={<EmployeePortal />} />
          <Route path="/attendance-scanner" element={<AttendanceScanner />} />
          
          {/* Dedicated QR Scanner routes - short URLs for easy access */}
          <Route path="/qr" element={<QRScannerPage />} />
          <Route path="/scan" element={<QRScannerPage />} />
          
          {/* PWA Install page */}
          <Route path="/install" element={<InstallPage />} />
          
          {/* Protected HR route */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute requiredRoles={['hr', 'admin']} portal="hr">
                <Index />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Admin route */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRoles={['admin']} portal="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
