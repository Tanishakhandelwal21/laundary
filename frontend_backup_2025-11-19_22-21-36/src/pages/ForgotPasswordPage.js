import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft, Mail, Lock, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      toast.success(response.data.message);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/verify-reset-otp`, { email, otp });
      toast.success(response.data.message);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/reset-password`, {
        email,
        otp,
        new_password: newPassword
      });
      toast.success(response.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      toast.success('New reset code sent to your email');
    } catch (err) {
      toast.error('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 sm:top-6 md:top-8 left-4 sm:left-6 md:left-8">
        <button 
          onClick={() => navigate('/login')} 
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Login</span>
        </button>
      </div>

      <div className="max-w-md w-full px-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 lg:p-12">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-sm sm:text-base text-gray-600">
              {step === 1 && "Enter your email to receive a reset code"}
              {step === 2 && "Enter the code sent to your email"}
              {step === 3 && "Create a new password"}
            </p>
          </div>

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleRequestReset} className="space-y-4 sm:space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm sm:text-base text-gray-700 font-medium">
                  Email Address
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white h-11 sm:h-12 text-base sm:text-lg font-medium rounded-xl"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </Button>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4 sm:space-y-6">
              <div>
                <Label htmlFor="otp" className="text-sm sm:text-base text-gray-700 font-medium">
                  Reset Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="mt-2 h-11 sm:h-12 text-center text-2xl tracking-widest"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white h-11 sm:h-12 text-base sm:text-lg font-medium rounded-xl"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Didn't receive the code? Resend
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-6">
              <div>
                <Label htmlFor="newPassword" className="text-sm sm:text-base text-gray-700 font-medium">
                  New Password
                </Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pl-10 pr-12 h-11 sm:h-12 text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm sm:text-base text-gray-700 font-medium">
                  Confirm Password
                </Label>
                <div className="relative mt-2">
                  <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white h-11 sm:h-12 text-base sm:text-lg font-medium rounded-xl"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}

          {/* Progress Indicator */}
          <div className="mt-6 sm:mt-8 flex justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-teal-500' : 'bg-gray-300'}`}></div>
            <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-teal-500' : 'bg-gray-300'}`}></div>
            <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-teal-500' : 'bg-gray-300'}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
