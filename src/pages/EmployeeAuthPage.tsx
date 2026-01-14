import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, Lock, Mail, Fingerprint, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { cn } from '@/lib/utils';

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
  const { isSupported: isBiometricSupported, isLoading: isBiometricLoading, authenticateWithPasskey } = useWebAuthn();
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [biometricEmail, setBiometricEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [showBiometricLogin, setShowBiometricLogin] = useState(false);
  const [loginAsAdmin, setLoginAsAdmin] = useState(false);

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
      const success = await authenticateWithPasskey(biometricEmail);
      if (success) {
        localStorage.setItem('biometric_email', biometricEmail);
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
        setShowResetForm(false);
        setResetEmail('');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminRedirect = () => {
    if (loginAsAdmin) {
      navigate('/auth?portal=hr');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      {/* PWA Update Prompt */}
      <PWAUpdatePrompt />
      
      {/* PWA Install Banner */}
      <PWAInstallBanner />
      
      {/* Main Container */}
      <div className="w-full max-w-6xl bg-white rounded-[32px] shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          {/* Left Panel - Login Form */}
          <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full space-y-6">
              {/* HRMS Title */}
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  HRMS
                </h1>
                
                {/* User Avatar */}
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-md">
                    <User className="w-12 h-12 text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Sign In Title with Login As Toggle */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 relative">
                    Sign In
                    <div className="absolute -bottom-1 left-0 w-16 h-1 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"></div>
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Login As :</span>
                    <button
                      onClick={() => { setLoginAsAdmin(false); }}
                      className={cn(
                        "px-3 py-1 rounded transition-colors",
                        !loginAsAdmin ? "text-gray-900 font-medium" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      User
                    </button>
                    <button
                      onClick={() => { setLoginAsAdmin(true); handleAdminRedirect(); }}
                      className={cn(
                        "px-3 py-1 rounded transition-colors",
                        loginAsAdmin ? "text-orange-500 font-medium" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Login Form or Reset Form */}
              {!showResetForm && !showBiometricLogin ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 border-b-2 border-orange-200 pb-3 focus-within:border-orange-400 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <Input
                        type="email"
                        placeholder="ravi"
                        className="border-0 bg-transparent text-gray-700 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-0"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 border-2 border-orange-300 rounded-full px-4 py-3 focus-within:border-orange-500 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="border-0 bg-transparent text-gray-700 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-0"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              ) : showBiometricLogin ? (
                <div className="space-y-5">
                  <div className="text-center space-y-3">
                    <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                      <Fingerprint className="w-10 h-10 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Biometric Sign In</h3>
                    <p className="text-sm text-gray-600">
                      Use your fingerprint, Face ID, or device PIN
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 border-b-2 border-orange-200 pb-3 focus-within:border-orange-400 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <Input
                        type="email"
                        placeholder="Enter your work email"
                        className="border-0 bg-transparent text-gray-700 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-0"
                        value={biometricEmail}
                        onChange={(e) => setBiometricEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleBiometricLogin}
                    disabled={isSubmitting || !biometricEmail}
                    className="w-full h-14 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-5 h-5 mr-2" />
                        Authenticate
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full text-gray-600 hover:text-gray-900"
                    onClick={() => setShowBiometricLogin(false)}
                  >
                    Use password instead
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-5">
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">Reset Password</h3>
                    <p className="text-sm text-gray-600">Enter your email to receive a reset link</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 border-b-2 border-orange-200 pb-3 focus-within:border-orange-400 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <Input
                        type="email"
                        placeholder="Enter your work email"
                        className="border-0 bg-transparent text-gray-700 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-0"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full text-gray-600 hover:text-gray-900"
                    onClick={() => setShowResetForm(false)}
                  >
                    Back to sign in
                  </Button>
                </form>
              )}

              {/* Biometric Login Option */}
              {!showResetForm && !showBiometricLogin && isBiometricSupported && (
                <div className="text-center">
                  <Button
                    variant="ghost"
                    className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                    onClick={() => setShowBiometricLogin(true)}
                    disabled={isBiometricLoading}
                  >
                    <Fingerprint className="w-4 h-4 mr-2" />
                    Sign in with Biometrics
                  </Button>
                </div>
              )}

              {/* Forgot Password Link */}
              {!showResetForm && !showBiometricLogin && (
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="inline-block px-6 py-2 rounded-full border-2 border-gray-300 text-gray-700 hover:border-orange-400 hover:text-orange-500 transition-colors font-medium"
                  >
                    Forgot Password ?
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Illustration */}
          <div className="hidden lg:flex flex-1 bg-gradient-to-br from-amber-50 to-orange-100 items-center justify-center p-12 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-10 right-10 w-32 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-300 to-amber-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute inset-4 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full opacity-40"></div>
            </div>
            
            <div className="absolute bottom-10 left-10 w-24 h-24">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-300 to-amber-400 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Main Illustration Area */}
            <div className="relative z-10 text-center space-y-6">
              {/* Document/Card Illustration */}
              <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto transform hover:scale-105 transition-transform">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-600" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded-full"></div>
                      <div className="h-3 bg-gray-200 rounded-full w-3/4"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-100 rounded-full"></div>
                    <div className="h-2 bg-gray-100 rounded-full"></div>
                    <div className="h-2 bg-gray-100 rounded-full w-5/6"></div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                  </div>
                </div>
              </div>

              {/* User Icons */}
              <div className="flex justify-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center transform hover:-translate-y-1 transition-transform">
                  <User className="w-7 h-7 text-gray-700" />
                </div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg flex items-center justify-center transform hover:-translate-y-1 transition-transform">
                  <ShieldCheck className="w-7 h-7 text-white" />
                </div>
                <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center transform hover:-translate-y-1 transition-transform">
                  <User className="w-7 h-7 text-gray-700" />
                </div>
              </div>

              {/* Feature Text */}
              <div className="text-center space-y-2 pt-4">
                <h3 className="text-xl font-bold text-gray-800">Employee Self-Service Portal</h3>
                <p className="text-sm text-gray-600 max-w-sm mx-auto">
                  Access your HR information, submit requests, and manage your profile securely
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
