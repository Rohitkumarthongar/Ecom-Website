import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Phone, Lock, User, Building2, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, sendOTP, verifyOTP, register, login } = useAuth();
  
  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  const [activeTab, setActiveTab] = useState('login');
  const [step, setStep] = useState('phone'); // phone, otp, details
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form data
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [hasGst, setHasGst] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const result = await sendOTP(`+91${phone}`);
      toast.success('OTP sent successfully!');
      // For testing, show OTP
      if (result.otp_for_testing) {
        toast.info(`Test OTP: ${result.otp_for_testing}`);
      }
      setStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(`+91${phone}`, otp);
      toast.success('OTP verified!');
      setStep('details');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !password) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await register({
        phone: `+91${phone}`,
        name,
        email,
        password,
        gst_number: hasGst ? gstNumber : null,
      });
      toast.success('Registration successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('Please enter phone and password');
      return;
    }

    setLoading(true);
    try {
      await login(`+91${phone}`, password);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-extrabold text-3xl">B</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome to BharatBazaar</h1>
          <p className="text-muted-foreground mt-1">Login or create an account to continue</p>
        </div>

        <Card>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setStep('phone'); }}>
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1" data-testid="login-tab">Login</TabsTrigger>
              <TabsTrigger value="register" className="flex-1" data-testid="register-tab">Register</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <CardHeader>
                <CardTitle>Login to your account</CardTitle>
                <CardDescription>Enter your phone number and password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-phone">Phone Number</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">+91</span>
                      <Input
                        id="login-phone"
                        type="tel"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="pl-12"
                        data-testid="login-phone-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        data-testid="login-password-input"
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
                  <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="login-submit-btn">
                    {loading ? 'Logging in...' : 'Login'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <CardHeader>
                <CardTitle>
                  {step === 'phone' && 'Create Account'}
                  {step === 'otp' && 'Verify OTP'}
                  {step === 'details' && 'Complete Profile'}
                </CardTitle>
                <CardDescription>
                  {step === 'phone' && 'Enter your phone number to get started'}
                  {step === 'otp' && 'Enter the 6-digit code sent to your phone'}
                  {step === 'details' && 'Fill in your details to complete registration'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Step 1: Phone */}
                {step === 'phone' && (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">Phone Number</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">+91</span>
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="pl-12"
                          data-testid="register-phone-input"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="send-otp-btn">
                      {loading ? 'Sending...' : 'Send OTP'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                )}

                {/* Step 2: OTP */}
                {step === 'otp' && (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="otp-input">
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
                    <p className="text-center text-sm text-muted-foreground">
                      Didn't receive? <button type="button" onClick={handleSendOTP} className="text-primary font-medium">Resend OTP</button>
                    </p>
                    <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="verify-otp-btn">
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('phone')}>
                      Change Phone Number
                    </Button>
                  </form>
                )}

                {/* Step 3: Details */}
                {step === 'details' && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        data-testid="register-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          data-testid="register-password-input"
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

                    {/* GST Section */}
                    <div className="p-4 bg-[#5b21b6]/5 rounded-xl border border-[#5b21b6]/20">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="hasGst"
                          checked={hasGst}
                          onCheckedChange={setHasGst}
                        />
                        <div>
                          <Label htmlFor="hasGst" className="font-medium cursor-pointer">
                            I have a GST Number
                          </Label>
                          <p className="text-xs text-muted-foreground">Get wholesale prices on bulk orders</p>
                        </div>
                      </div>
                      {hasGst && (
                        <div className="mt-3">
                          <Input
                            placeholder="Enter GST Number (e.g., 29ABCDE1234F1Z5)"
                            value={gstNumber}
                            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                            data-testid="gst-input"
                          />
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="register-submit-btn">
                      {loading ? 'Creating Account...' : 'Create Account'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Admin Login Link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Are you a seller? <button onClick={() => navigate('/admin')} className="text-primary font-medium">Access Admin Panel</button>
        </p>
      </div>
    </div>
  );
}
