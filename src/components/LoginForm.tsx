import React, { useState } from 'react';
import { Eye, EyeOff, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { addNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(email, password);
    if (success) {
      addNotification('Login successful!', 'success');
    } else {
      addNotification('Invalid email or password', 'error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <div className="text-center mb-8">
        <CreditCard className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
        <p className="text-gray-600 mt-2">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Email Address"
            aria-describedby="email-error"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              aria-label="Password"
              aria-describedby="password-error"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
        >
          Sign In
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onSwitchToRegister}
          className="text-blue-600 hover:text-blue-500 text-sm"
        >
          Don't have an account? Sign up
        </button>
      </div>

      {/* Demo credentials */}
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-600 font-semibold mb-2">Demo Credentials:</p>
        <p className="text-xs text-gray-600">Email: demo@bank.com</p>
        <p className="text-xs text-gray-600">Password: demo123</p>
      </div>
    </div>
  );
}