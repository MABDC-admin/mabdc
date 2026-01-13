import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'hr' | 'employee';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
  redirectTo?: string;
  portal?: 'admin' | 'hr';
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  redirectTo,
  portal = 'admin'
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { user, isLoading, hasRole, isAdmin } = useAuth();
  const isRedirecting = useRef(false);

  useEffect(() => {
    if (!isLoading && !isRedirecting.current) {
      if (!user) {
        // Not logged in, redirect to auth
        isRedirecting.current = true;
        const authUrl = redirectTo || `/auth?portal=${portal}&redirect=${encodeURIComponent(window.location.pathname)}`;
        navigate(authUrl);
        return;
      }

      // Check if user has required role
      if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some(role => hasRole(role)) || isAdmin();
        if (!hasRequiredRole) {
          // Sign out and redirect to login with access denied error
          isRedirecting.current = true;
          supabase.auth.signOut().then(() => {
            const authUrl = `/auth?portal=${portal}&redirect=${encodeURIComponent(window.location.pathname)}&error=access_denied`;
            navigate(authUrl);
          });
        }
      }
    }
  }, [user, isLoading, hasRole, isAdmin, navigate, requiredRoles, redirectTo, portal]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user || isRedirecting.current) {
    return null; // Will redirect in useEffect
  }

  // Check role access
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role)) || isAdmin();
    if (!hasRequiredRole) {
      return null; // Will redirect in useEffect
    }
  }

  return <>{children}</>;
}
