import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft, Mail, User, Phone, MapPin, Lock } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: signup form, 2: OTP verification
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    address: ''
  });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/signup`, formData);
      setSuccess(response.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/verify-otp`, {
        email: formData.email,
        otp: otp
      });
      setSuccess(response.data.message);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/resend-otp`, {
        email: formData.email
      });
      setSuccess(response.data.message);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="absolute top-4 sm:top-6 md:top-8 left-4 sm:left-6 md:left-8">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          data-testid="back-home-btn"
        >
          <img 
            src="/assets/logo.png"
            alt="Infinite Laundry Solutions Logo"
            className="h-14 lg:h-16 w-auto"
          />
        </button>
      </div>

      <div className="max-w-md w-full px-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 lg:p-12">
          {step === 1 ? (
            // Signup Form
            <>
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                <p className="text-sm sm:text-base text-gray-600">Sign up to get started with our services</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="full_name" className="text-sm sm:text-base text-gray-700 font-medium flex items-center gap-2">
                    <User className="w-3 h-3 sm:w-4 sm:h-4" />
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="mt-2 h-11 sm:h-12 text-sm sm:text-base"
                    data-testid="signup-fullname-input"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm sm:text-base text-gray-700 font-medium flex items-center gap-2">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="mt-2 h-11 sm:h-12 text-sm sm:text-base"
                    data-testid="signup-email-input"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm sm:text-base text-gray-700 font-medium flex items-center gap-2">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+61 400 000 000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-2 h-11 sm:h-12 text-sm sm:text-base"
                    data-testid="signup-phone-input"
                  />
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm sm:text-base text-gray-700 font-medium flex items-center gap-2">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                    Address
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="Enter your address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-2 h-11 sm:h-12 text-sm sm:text-base"
                    data-testid="signup-address-input"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm sm:text-base text-gray-700 font-medium flex items-center gap-2">
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                    Password
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="h-11 sm:h-12 pr-12 text-sm sm:text-base"
                      data-testid="signup-password-input"
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

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="signup-error">
                    <p className="text-red-600 text-xs sm:text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-600 text-xs sm:text-sm">{success}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white h-11 sm:h-12 text-base sm:text-lg font-medium rounded-xl"
                  data-testid="signup-submit-btn"
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </form>

              <div className="mt-4 sm:mt-6 text-center">
                <p className="text-sm sm:text-base text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-teal-500 hover:text-teal-600 font-semibold"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </>
          ) : (
            // OTP Verification
            <>
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-teal-600" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
                <p className="text-sm sm:text-base text-gray-600">We've sent a 6-digit code to</p>
                <p className="text-sm sm:text-base text-teal-600 font-semibold break-all">{formData.email}</p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4 sm:space-y-6">
                <div>
                  <Label htmlFor="otp" className="text-sm sm:text-base text-gray-700 font-medium text-center block">Enter OTP Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="mt-2 h-12 sm:h-14 text-center text-xl sm:text-2xl font-bold tracking-widest"
                    data-testid="otp-input"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="otp-error">
                    <p className="text-red-600 text-xs sm:text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-600 text-xs sm:text-sm">{success}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white h-11 sm:h-12 text-base sm:text-lg font-medium rounded-xl"
                  data-testid="verify-otp-btn"
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </Button>
              </form>

              <div className="mt-4 sm:mt-6 text-center">
                <p className="text-sm sm:text-base text-gray-600 mb-3">Didn't receive the code?</p>
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm sm:text-base text-teal-500 hover:text-teal-600 font-semibold"
                  data-testid="resend-otp-btn"
                >
                  Resend OTP
                </button>
              </div>

              <div className="mt-3 sm:mt-4 text-center">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm sm:text-base text-gray-600 hover:text-gray-800 flex items-center gap-2 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to signup
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SignupPage;