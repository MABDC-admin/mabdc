import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ShieldX, Home, ArrowLeft, LogOut, KeyRound, RotateCcw } from 'lucide-react';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user, roles, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const roleLabel = useMemo(() => {
    if (!user) return 'Not signed in';
    if (!roles?.length) return 'No roles assigned';
    return roles.join(', ');
  }, [user, roles]);

  const handleGoToHrLogin = () => {
    navigate(`/auth?portal=hr&redirect=${encodeURIComponent('/')}`);
  };

  const handleReloadHome = () => {
    // Forces a full reload so fresh roles are fetched after backend role changes.
    window.location.href = '/';
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } finally {
      setIsSigningOut(false);
      handleGoToHrLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page. Please contact an administrator if you believe this is an error.
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/60 backdrop-blur px-4 py-3 text-left">
          <p className="text-sm text-foreground">
            Signed in as: <span className="font-medium">{user?.email ?? '—'}</span>
          </p>
          <p className="text-sm text-muted-foreground">Roles: {roleLabel}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>

          <Button variant="outline" onClick={handleGoToHrLogin}>
            <KeyRound className="w-4 h-4 mr-2" />
            Go to Login
          </Button>

          <Button onClick={handleReloadHome}>
            <Home className="w-4 h-4 mr-2" />
            Retry Home
          </Button>
        </div>

        {user && (
          <div className="flex justify-center">
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
          <RotateCcw className="w-3.5 h-3.5" />
          Tip: if roles were just updated, use “Retry Home” or sign out & sign back in.
        </div>
      </div>
    </div>
  );
}

