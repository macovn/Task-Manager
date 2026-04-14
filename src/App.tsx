import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DailyPlannerPage from './pages/DailyPlannerPage';
import WeeklyPlannerPage from './pages/WeeklyPlannerPage';
import EisenhowerPage from './pages/EisenhowerPage';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/planner/daily" 
              element={
                <PrivateRoute>
                  <DailyPlannerPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/planner/weekly" 
              element={
                <PrivateRoute>
                  <WeeklyPlannerPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/eisenhower" 
              element={
                <PrivateRoute>
                  <EisenhowerPage />
                </PrivateRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
