import React, { useState, useEffect } from 'react';
import { User, CreditCard, ArrowUpDown, History, LogOut, Eye, EyeOff } from 'lucide-react';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import TransferForm from './components/TransferForm';
import TransactionHistory from './components/TransactionHistory';
import TransferHistory from './components/TransferHistory';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import LoadingSpinner from './components/LoadingSpinner';
import NotificationContainer from './components/NotificationContainer';

type ViewType = 'login' | 'register' | 'dashboard' | 'transfer' | 'history' | 'audit';

function AppContent() {
  const { user, logout, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('login');

  useEffect(() => {
    if (user) {
      setCurrentView('dashboard');
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {currentView === 'login' ? (
            <LoginForm onSwitchToRegister={() => setCurrentView('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setCurrentView('login')} />
          )}
        </div>
        {isLoading && <LoadingSpinner />}
      </div>
    );
  }

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: CreditCard },
    { id: 'transfer', label: 'Transfer', icon: ArrowUpDown },
    { id: 'history', label: 'History', icon: History },
    { id: 'audit', label: 'Audit Log', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">SecureBank</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                Welcome, {user.firstName}
              </div>
              <button
                onClick={logout}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as ViewType)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                    currentView === item.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'transfer' && <TransferForm />}
        {currentView === 'history' && <TransactionHistory />}
        {currentView === 'audit' && <TransferHistory />}
      </main>

      {isLoading && <LoadingSpinner />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
        <NotificationContainer />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;