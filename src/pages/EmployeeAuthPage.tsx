import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNativeBiometric } from '@/hooks/useNativeBiometric';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, KeyRound, Mail, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { CompanyBrandingHeader } from '@/components/CompanyBrandingHeader';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export default function EmployeeAuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading, signIn, hasRole } = useAuth();
  const { isAvailable: isBiometricSupported, isLoading: isBiometricLoading, authenticate: authenticateWithBiometric } = useNativeBiometric();
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [biometricEmail, setBiometricEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showBiometricLogin, setShowBiometricLogin] = useState(false);

  const redirect = searchParams.get('redirect') || '/employee-portal';

  // Load remembered email for biometric login
  useEffect(() => {
    const savedEmail = localStorage.getItem('biometric_email');
    if (savedEmail) {
      setBiometricEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      // Check if user has employee role
      if (hasRole('employee')) {
        navigate(redirect);
      } else if (hasRole('admin') || hasRole('hr')) {
        // Admin/HR users should use the main auth
        toast.info('Please use the HR/Admin portal');
        navigate('/');
      }
    }
  }, [user, isLoading, hasRole, navigate, redirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = loginSchema.parse(loginForm);
      const { error } = await signIn(validated.email, validated.password);
      
      if (error) {
        toast.error(error.message || 'Invalid email or password');
      } else {
        // Save email for biometric login
        localStorage.setItem('biometric_email', validated.email);
        toast.success('Welcome back!');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await authenticateWithBiometric(biometricEmail);
      if (success) {
        localStorage.setItem('biometric_email', biometricEmail);
        toast.success('Welcome back!');
        // Navigation will happen automatically via auth state change
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = resetSchema.parse({ email: resetEmail });
      
      const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
        redirectTo: `${window.location.origin}/employee-auth?tab=reset`,
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset email sent! Check your inbox.');
        setActiveTab('login');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* PWA Update Prompt */}
        <PWAUpdatePrompt />
        
        {/* PWA Install Banner */}
        <PWAInstallBanner />
        
        <Card className="w-full">
          <CardHeader className="text-center space-y-2">
            <CompanyBrandingHeader 
              fallbackTitle="Employee Portal"
              fallbackIcon={<User className="w-8 h-8 text-primary" />}
            />
            <CardDescription>
              Sign in to access your HR self-service portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="reset">Reset Password</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-4">
                {!showBiometricLogin ? (
                  <>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Work Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your work email"
                            className="pl-10"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </form>

                    {/* Biometric Login Option */}
                    {isBiometricSupported && (
                      <>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">or</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowBiometricLogin(true)}
                          disabled={isBiometricLoading}
                        >
                          <Fingerprint className="w-4 h-4 mr-2" />
                          Sign in with Biometrics
                        </Button>
                      </>
                    )}
                    
                    <div className="text-center text-sm text-muted-foreground">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setActiveTab('reset')}
                      >
                        Forgot your password?
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center space-y-2">
                      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Fingerprint className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-semibold">Biometric Sign In</h3>
                      <p className="text-sm text-muted-foreground">
                        Use your fingerprint, Face ID, or device PIN to sign in
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="biometric-email">Work Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="biometric-email"
                          type="email"
                          placeholder="Enter your work email"
                          className="pl-10"
                          value={biometricEmail}
                          onChange={(e) => setBiometricEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleBiometricLogin}
                      disabled={isSubmitting || !biometricEmail}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-4 h-4 mr-2" />
                          Authenticate
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowBiometricLogin(false)}
                    >
                      Use password instead
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="reset" className="space-y-4 mt-4">
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Work Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your work email"
                        className="pl-10"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </form>
                
                <div className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab('login')}
                  >
                    Back to sign in
                  </button>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 pt-6 border-t text-center text-xs text-muted-foreground">
              <p>Don't have an account? Contact your HR department.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
