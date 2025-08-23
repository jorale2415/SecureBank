import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Dashboard from './components/Dashboard';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import TransferForm from './components/TransferForm';
import TransactionHistory from './components/TransactionHistory';
import TransferHistory from './components/TransferHistory';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationContainer from './components/NotificationContainer';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <NotificationContainer />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute />}>
              <Route path="" element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Layout />}>
                <Route index element={<Dashboard />} />
              </Route>
              <Route path="home" element={<Layout />}>
                <Route index element={<Dashboard />} />
              </Route>
              <Route path="transfer" element={<Layout />}>
                <Route index element={<TransferForm />} />
              </Route>
              <Route path="history" element={<Layout />}>
                <Route index element={<TransactionHistory />} />
              </Route>
              <Route path="audit" element={<Layout />}>
                <Route index element={<TransferHistory />} />
              </Route>
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}