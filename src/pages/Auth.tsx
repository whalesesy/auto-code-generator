import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Monitor, Check, X, ArrowLeft, Chrome, KeyRound, Phone, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

const emailSchema = z.string().email('Invalid email address');

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'staff' | 'approver' | 'admin'>('staff');
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
    if (searchParams.get('tab') === 'reset') {
      setIsResetMode(true);
    }
  }, [user, navigate, searchParams]);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const newPasswordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch {
      toast({ title: 'Invalid email', variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    // Check if user signup is approved
    const { data: signupRequest } = await supabase
      .from('signup_requests')
      .select('status')
      .eq('email', email)
      .single();
    
    if (signupRequest && signupRequest.status !== 'approved') {
      setLoading(false);
      toast({ 
        title: 'Account pending approval', 
        description: 'Your account is awaiting approval from an approver. Please wait for approval before logging in.',
        variant: 'destructive' 
      });
      return;
    }

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!' });
      navigate('/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: 'Validation error', description: err.errors[0].message, variant: 'destructive' });
      }
      return;
    }

    if (!fullName.trim()) {
      toast({ title: 'Full name is required', variant: 'destructive' });
      return;
    }

    // Format phone with country code if provided
    const formattedPhone = phone ? (phone.startsWith('+') ? phone : `+254${phone.replace(/^0/, '')}`) : '';
    
    if (formattedPhone && !/^\+254[0-9]{9}$/.test(formattedPhone.replace(/[\s-]/g, ''))) {
      toast({ title: 'Invalid phone number', description: 'Please enter a valid Kenyan phone number (e.g., 710366205).', variant: 'destructive' });
      return;
    }

    setLoading(true);

    // First create signup request for approval
    const { error: signupRequestError } = await supabase
      .from('signup_requests')
      .insert({
        email,
        full_name: fullName,
        phone: formattedPhone || null,
        requested_role: selectedRole,
        status: 'pending',
      });

    if (signupRequestError) {
      setLoading(false);
      if (signupRequestError.message.includes('duplicate') || signupRequestError.message.includes('unique')) {
        toast({ title: 'Email already registered', description: 'This email has already been used for a signup request.', variant: 'destructive' });
      } else {
        toast({ title: 'Signup request failed', description: signupRequestError.message, variant: 'destructive' });
      }
      return;
    }

    // Create the actual user account
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      phone: formattedPhone || undefined,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: fullName, phone: formattedPhone, requested_role: selectedRole }
      }
    });
    setLoading(false);

    if (error) {
      // Cleanup signup request if auth fails
      await supabase.from('signup_requests').delete().eq('email', email);
      
      if (error.message.includes('already registered')) {
        toast({ title: 'Email already registered', description: 'Please login or use a different email.', variant: 'destructive' });
      } else {
        toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
      }
    } else {
      // Sign out immediately - user can't access until approved
      await supabase.auth.signOut();
      
      toast({ 
        title: 'Signup request submitted!', 
        description: 'Your account request has been sent to an approver. You will be notified when your account is approved. Please check your email and wait for approval before logging in.' 
      });
      setActiveTab('login');
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setSelectedRole('staff');
    }
  };

  const handleSendPhoneOtp = async () => {
    const formattedPhone = phone.startsWith('+') ? phone : `+254${phone.replace(/^0/, '')}`;
    
    if (!/^\+254[0-9]{9}$/.test(formattedPhone.replace(/[\s-]/g, ''))) {
      toast({ title: 'Invalid phone number', description: 'Please enter a valid Kenyan phone number (e.g., 710366205).', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Error sending code', description: error.message, variant: 'destructive' });
    } else {
      setShowPhoneVerification(true);
      toast({ title: 'Verification code sent!', description: 'Check your phone for the SMS code.' });
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      toast({ title: 'Invalid code', description: 'Please enter the 6-digit code.', variant: 'destructive' });
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+254${phone.replace(/^0/, '')}`;

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: phoneOtp,
      type: 'sms',
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
    } else {
      setPhoneVerified(true);
      setShowPhoneVerification(false);
      toast({ title: 'Phone verified!', description: 'Your phone number has been verified.' });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?tab=reset`,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Password reset email sent!', 
        description: 'Check your inbox for the reset link.' 
      });
      setShowForgotPassword(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      passwordSchema.parse(newPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: 'Validation error', description: err.errors[0].message, variant: 'destructive' });
      }
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated!', description: 'You can now login with your new password.' });
      setIsResetMode(false);
      navigate('/auth');
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'approver' | 'staff') => {
    const demoCredentials = {
      admin: { email: 'admin@demo.com', password: 'Demo@123456' },
      approver: { email: 'approver@demo.com', password: 'Demo@123456' },
      staff: { email: 'staff@demo.com', password: 'Demo@123456' },
    };

    setLoading(true);
    const { error } = await signIn(demoCredentials[role].email, demoCredentials[role].password);
    setLoading(false);

    if (error) {
      toast({ 
        title: 'Demo account not set up', 
        description: 'Please create a regular account or contact admin to set up demo accounts.',
        variant: 'destructive' 
      });
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);

    if (error) {
      toast({ 
        title: 'Google sign-in not configured', 
        description: 'Please configure Google OAuth in your backend settings.',
        variant: 'destructive' 
      });
    }
  };

  const handleMicrosoftSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'openid profile email',
      },
    });
    setLoading(false);

    if (error) {
      toast({ 
        title: 'Microsoft sign-in not configured', 
        description: 'Please configure Microsoft OAuth in your backend settings.',
        variant: 'destructive' 
      });
    }
  };

  const PasswordStrength = ({ checks }: { checks: typeof passwordChecks }) => (
    <div className="space-y-2 mt-2 animate-fade-in">
      <p className="text-sm text-muted-foreground">Password strength:</p>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {Object.entries({
          '8+ characters': checks.length,
          'Uppercase letter': checks.uppercase,
          'Lowercase letter': checks.lowercase,
          'Number': checks.number,
          'Special character': checks.special,
        }).map(([label, valid]) => (
          <div 
            key={label} 
            className={`flex items-center gap-1 transition-colors duration-300 ${valid ? 'text-green-600' : 'text-muted-foreground'}`}
          >
            {valid ? <Check className="h-3 w-3 animate-scale-in" /> : <X className="h-3 w-3" />}
            {label}
          </div>
        ))}
      </div>
    </div>
  );

  // Password Reset Mode
  if (isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <Card className="w-full max-w-md animate-scale-in relative z-10 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-xl bg-primary/10 animate-fade-in">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Set New Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <PasswordStrength checks={newPasswordChecks} />
              </div>
              <Button type="submit" className="w-full transition-transform hover:scale-[1.02]" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot Password Mode
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <Card className="w-full max-w-md animate-scale-in relative z-10 shadow-xl">
          <CardHeader className="text-center relative">
            <Button 
              variant="ghost" 
              className="absolute left-4 top-4 transition-transform hover:scale-105" 
              onClick={() => setShowForgotPassword(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex justify-center mb-4 pt-8">
              <div className="p-3 rounded-xl bg-primary/10 animate-fade-in">
                <Monitor className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>Enter your email to receive a password reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email Address</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button type="submit" className="w-full transition-transform hover:scale-[1.02]" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-primary/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <Card className="w-full max-w-md animate-scale-in relative z-10 shadow-xl border-primary/10">
        <CardHeader className="text-center relative">
          <Button 
            variant="ghost" 
            className="absolute left-4 top-4 transition-all hover:scale-105 hover:bg-primary/10" 
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Home
          </Button>
          <div className="flex justify-center mb-4 pt-8">
            <div className="p-3 rounded-xl bg-primary/10 animate-fade-in transition-transform hover:scale-110 duration-300">
              <Monitor className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl animate-fade-in" style={{ animationDelay: '0.1s' }}>ICT Device Manager</CardTitle>
          <CardDescription className="animate-fade-in" style={{ animationDelay: '0.2s' }}>Sign in to manage device requests</CardDescription>
        </CardHeader>
        <CardContent className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="transition-all data-[state=active]:shadow-md">Login</TabsTrigger>
              <TabsTrigger value="signup" className="transition-all data-[state=active]:shadow-md">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Button 
                      type="button" 
                      variant="link" 
                      className="px-0 h-auto text-xs hover:text-primary transition-colors"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full transition-all hover:scale-[1.02] hover:shadow-lg" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleGoogleSignIn} 
                    disabled={loading} 
                    className="w-full transition-all hover:scale-[1.02] hover:border-primary/50"
                  >
                    <Chrome className="h-4 w-4 mr-2" />
                    Google
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleMicrosoftSignIn} 
                    disabled={loading} 
                    className="w-full transition-all hover:scale-[1.02] hover:border-primary/50"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 21 21" fill="none">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                    </svg>
                    Microsoft
                  </Button>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground text-center mb-3">Quick demo access:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDemoLogin('staff')} 
                      disabled={loading}
                      className="transition-all hover:scale-[1.02] hover:border-primary/50"
                    >
                      Staff
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDemoLogin('approver')} 
                      disabled={loading}
                      className="transition-all hover:scale-[1.02] hover:border-primary/50"
                    >
                      Approver
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDemoLogin('admin')} 
                      disabled={loading}
                      className="transition-all hover:scale-[1.02] hover:border-primary/50"
                    >
                      Admin
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="animate-fade-in">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPhone">Phone Number (Optional)</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 border rounded-md bg-muted text-muted-foreground text-sm">
                      +254
                    </div>
                    <Input
                      id="signupPhone"
                      type="tel"
                      placeholder="710366205"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 flex-1"
                      disabled={phoneVerified}
                      maxLength={9}
                    />
                    {phone && !phoneVerified && !showPhoneVerification && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleSendPhoneOtp}
                        disabled={loading}
                      >
                        Verify
                      </Button>
                    )}
                    {phoneVerified && (
                      <Badge className="h-9 flex items-center bg-green-600">Verified</Badge>
                    )}
                  </div>
                  {showPhoneVerification && (
                    <div className="flex gap-2 mt-2 animate-fade-in">
                      <Input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="transition-all duration-300"
                      />
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={handleVerifyPhoneOtp}
                        disabled={loading || phoneOtp.length !== 6}
                      >
                        Confirm
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Kenya country code (+254) is automatically added</p>
                </div>
                
                {/* Role Selection */}
                <div className="space-y-2">
                  <Label htmlFor="role">Select Your Role</Label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      <SelectItem value="staff">Staff (Request Devices)</SelectItem>
                      <SelectItem value="approver">Approver (Approve Requests)</SelectItem>
                      <SelectItem value="admin">Admin (Full System Access)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Your role will be verified by an approver before activation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Password</Label>
                  <div className="relative">
                    <Input
                      id="signupPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <PasswordStrength checks={passwordChecks} />
                </div>
                <Button type="submit" className="w-full transition-all hover:scale-[1.02] hover:shadow-lg" disabled={loading}>
                  {loading ? 'Submitting request...' : 'Request Account'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  ⏳ Your account will require approval from an approver before you can log in.
                </p>
              </form>

              <div className="mt-6 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleGoogleSignIn} 
                    disabled={loading} 
                    className="w-full transition-all hover:scale-[1.02] hover:border-primary/50"
                  >
                    <Chrome className="h-4 w-4 mr-2" />
                    Google
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleMicrosoftSignIn} 
                    disabled={loading} 
                    className="w-full transition-all hover:scale-[1.02] hover:border-primary/50"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 21 21" fill="none">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                    </svg>
                    Microsoft
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By signing up, you agree to our{' '}
                <Link to="/terms" className="text-primary hover:underline transition-colors">Terms</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary hover:underline transition-colors">Privacy Policy</Link>
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
