import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateOTP, verifyOTP, createOrGetUser } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAIL, DUE_DILIGENCE_EMAIL } from '@/types/vendor';
import { Mail, KeyRound, RefreshCw, ArrowLeft, Building2, Shield } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const otpCode = await generateOTP(email);
      setGeneratedOtp(otpCode);
      setStep('otp');
      toast({
        title: 'OTP Sent',
        description: 'Please check your OTP below (displayed for MVP demo).',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate OTP. Please try again.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a valid 6-digit OTP.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyOTP(email, otp);
      if (isValid) {
        const user = await createOrGetUser(email);
        user.verified = true;
        setUser(user);
        sessionStorage.setItem('currentUserEmail', email);
        
        toast({
          title: 'Verified!',
          description: 'You have been successfully logged in.',
        });

        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          navigate('/admin');
        } else if (email.toLowerCase() === DUE_DILIGENCE_EMAIL.toLowerCase()) {
          navigate('/due-diligence');
        } else {
          navigate('/vendor-form');
        }
      } else {
        toast({
          title: 'Invalid OTP',
          description: 'The OTP entered is incorrect or expired.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify OTP. Please try again.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setLoading(true);
    const otpCode = await generateOTP(email);
    setGeneratedOtp(otpCode);
    setOtp('');
    toast({
      title: 'OTP Resent',
      description: 'A new OTP has been generated.',
    });
    setLoading(false);
  };

  const handleChangeEmail = () => {
    setStep('email');
    setOtp('');
    setGeneratedOtp(null);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-primary-foreground font-semibold text-xl">Premier Energies</span>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-primary-foreground leading-tight">
            Vendor Management<br />Portal
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Streamline your vendor registration and management process with our comprehensive platform.
          </p>
          
          <div className="flex items-center gap-4 pt-4">
            <div className="flex items-center gap-2 text-primary-foreground/70">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Secure & Encrypted</span>
            </div>
          </div>
        </div>

        <p className="text-primary-foreground/60 text-sm">
          © 2025 Premier Energies Limited. All rights reserved.
        </p>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl">Premier Energies</span>
          </div>

          <Card className="border-0 shadow-elevated">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold">
                {step === 'email' ? 'Welcome back' : 'Verify OTP'}
              </CardTitle>
              <CardDescription>
                {step === 'email' 
                  ? 'Enter your email to receive a one-time password' 
                  : `Enter the 6-digit code sent to ${email}`}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {step === 'email' ? (
                <>
                  <div className="space-y-2">
                    <label className="input-label">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="vendor@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleSendOTP} 
                    disabled={loading} 
                    className="w-full"
                    size="lg"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </Button>
                </>
              ) : (
                <>
                  {/* MVP: Display OTP on screen */}
                  {generatedOtp && (
                    <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Your OTP (MVP Demo)</p>
                      <p className="text-3xl font-mono font-bold tracking-widest text-accent">
                        {generatedOtp}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="input-label">Enter OTP</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="pl-10 text-center text-xl tracking-widest font-mono"
                        maxLength={6}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleVerifyOTP} 
                    disabled={loading || otp.length !== 6} 
                    className="w-full"
                    size="lg"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>

                  <div className="flex items-center justify-between pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleChangeEmail}
                      className="text-muted-foreground"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Change Email
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleResendOTP}
                      disabled={loading}
                      className="text-muted-foreground"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Resend OTP
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Having trouble? Contact{' '}
            <a href="mailto:support@premierenergies.com" className="text-primary hover:underline">
              support@premierenergies.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
