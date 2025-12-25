import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { toast } from 'sonner';
import { Eye, EyeOff, ChevronRight, Mail, Phone, User } from 'lucide-react';
import api from '../lib/api';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { user, login } = useAuth();

  // Login State
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register State
  const [step, setStep] = useState('details');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [requestSupplier, setRequestSupplier] = useState(false);
  const [regGst, setRegGst] = useState('');
  const [otp, setOtp] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success(response.data.message || "Password sent to your email!");
      setShowForgot(false);
    } catch (error) {
      const errorMsg = error.response?.data?.detail ||
        (error.response?.data?.message) ||
        (Array.isArray(error.response?.data) ? error.response.data[0]?.msg : null) ||
        "Failed to reset password";
      toast.error(typeof errorMsg === 'string' ? errorMsg : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier || !loginPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login({ identifier, password: loginPassword });
      toast.success("Welcome back!");
      navigate(redirectTo);
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.detail ||
        (Array.isArray(error.response?.data) ? error.response.data[0]?.msg : null) ||
        "Login failed";
      toast.error(typeof errorMsg === 'string' ? errorMsg : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!regName || !regPhone || !regEmail) {
      toast.error("Please fill in Name, Phone and Email");
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: regPhone, email: regEmail });
      toast.success(`OTP sent to ${regEmail}`);
      setStep('otp');
    } catch (error) {
      const errorMsg = error.response?.data?.detail ||
        (Array.isArray(error.response?.data) ? error.response.data[0]?.msg : null) ||
        "Failed to send OTP";
      toast.error(typeof errorMsg === 'string' ? errorMsg : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone: regPhone, otp });
      if (res.data.verified) {
        toast.success("OTP Verified!");
        setStep('password');
      }
    } catch (error) {
      toast.error("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regPassword) {
      toast.error("Please set a password");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/auth/register", {
        name: regName,
        phone: regPhone,
        email: regEmail,
        password: regPassword,
        gst_number: requestSupplier ? regGst : null
      });
      if (response.data.supplier_pending) {
        toast.info(response.data.message);
      }
      // Auto login after register
      await login({ identifier: regPhone, password: regPassword });
      toast.success("Account created successfully!");
      navigate(redirectTo);
    } catch (error) {
      const errorMsg = error.response?.data?.detail ||
        (Array.isArray(error.response?.data) ? error.response.data[0]?.msg : null) ||
        "Registration failed";
      toast.error(typeof errorMsg === 'string' ? errorMsg : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center px-4 bg-muted/30">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>Enter your email to receive a new password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@amorlias.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Password'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgot(false)}>
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 flex items-center justify-center px-4 bg-muted/30">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* LOGIN CONTENT */}
          <TabsContent value="login">
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>Login with your Phone or Email</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Phone or Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="identifier"
                      placeholder="9876543210 or user@example.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-primary hover:underline">Forgot password?</button>
                </div>
                <Button type="submit" className="w-full btn-primary" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </TabsContent>

          {/* REGISTER CONTENT */}
          <TabsContent value="register">
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>
                {step === 'details' && 'Enter your details'}
                {step === 'otp' && 'Verify OTP sent to your email'}
                {step === 'password' && 'Set a password'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step 1: Details */}
              {step === 'details' && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="reg-name" placeholder="John Doe" value={regName} onChange={(e) => setRegName(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="reg-phone" type="tel" placeholder="9876543210" value={regPhone} onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="reg-email" type="email" placeholder="you@amorlias.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="pl-10" />
                    </div>
                  </div>

                  {/* Supplier Registration */}
                  <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 mt-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="request-supplier"
                        checked={requestSupplier}
                        onChange={(e) => setRequestSupplier(e.target.checked)}
                        className="mt-1"
                      />
                      <label htmlFor="request-supplier" className="text-sm cursor-pointer">
                        <strong className="text-purple-700 dark:text-purple-300">Register as Supplier</strong> to get wholesale prices
                        <p className="text-xs text-muted-foreground mt-1">
                          Get access to bulk pricing and special supplier benefits
                        </p>
                      </label>
                    </div>
                    
                    {requestSupplier && (
                      <div className="space-y-2 pl-7">
                        <Label htmlFor="reg-gst">GST Number (Required for Suppliers)</Label>
                        <Input
                          id="reg-gst"
                          placeholder="22AAAAA0000A1Z5"
                          value={regGst}
                          onChange={(e) => setRegGst(e.target.value.toUpperCase())}
                          className="font-mono"
                          required={requestSupplier}
                        />
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ Admin approval required. You'll be notified via email once approved.
                        </p>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full btn-primary" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Continue'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              )}

              {/* Step 2: OTP */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">OTP sent to {regEmail}</p>
                  </div>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button type="submit" className="w-full btn-primary" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('details')}>Back</Button>
                </form>
              )}

              {/* Step 3: Password */}
              {step === 'password' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-pass">Create Password</Label>
                    <div className="relative">
                      <Input
                        id="reg-pass"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="******"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full btn-primary" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Finish Registration'}
                  </Button>
                </form>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
