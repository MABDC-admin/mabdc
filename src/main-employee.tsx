import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import EmployeeAuthPage from './pages/EmployeeAuthPage';
import EmployeeSelfServicePortal from './pages/EmployeeSelfServicePortal';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/employee-auth" replace />} />
            <Route path="/employee-auth" element={<EmployeeAuthPage />} />
            <Route path="/employee-portal" element={<EmployeeSelfServicePortal />} />
            <Route path="/login" element={<Navigate to="/employee-auth" replace />} />
            <Route path="/portal" element={<Navigate to="/employee-portal" replace />} />
            <Route path="*" element={<Navigate to="/employee-auth" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
