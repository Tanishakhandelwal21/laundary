import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Droplets } from 'lucide-react';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      navigate(`/dashboard/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex items-center justify-center px-4 py-8">
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
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-sm sm:text-base text-gray-600">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm sm:text-base text-gray-700 font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 h-11 sm:h-12 text-sm sm:text-base"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm sm:text-base text-gray-700 font-medium">Password</Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 sm:h-12 pr-12 text-sm sm:text-base"
                  data-testid="login-password-input"
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Forgot Password?
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="login-error-message">
                <p className="text-red-600 text-xs sm:text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white h-11 sm:h-12 text-base sm:text-lg font-medium rounded-xl"
              data-testid="login-submit-btn"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* <div className="mt-6 sm:mt-8 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                Sign up here
              </button>
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;