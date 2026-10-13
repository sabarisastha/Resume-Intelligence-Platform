import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ResumeBuilder from './pages/ResumeBuilder';
import ATSReport from './pages/ATSReport';
import Simulator from './pages/Simulator';
import JDEnhancer from './pages/JDEnhancer';

const ProtectedRoute = ({ children }) => {
  const { user, loading, authUnavailable, retryProfile } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (authUnavailable) {
    return (
      <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center p-6">
        <section className="max-w-md rounded-xl border border-[var(--color-alert-amber)]/40 bg-[var(--color-bg-surface)] p-6 text-center">
          <h1 className="text-lg font-semibold">The API server is temporarily unavailable</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Your saved session is still available. Start the backend, then retry the connection.</p>
          <button type="button" onClick={retryProfile} className="mt-4 rounded-lg bg-[var(--color-signal-cyan)] px-4 py-2 font-medium text-[#12151A]">Retry connection</button>
        </section>
      </main>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/builder/:id" 
            element={
              <ProtectedRoute>
                <ResumeBuilder />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ats-report/:id" 
            element={
              <ProtectedRoute>
                <ATSReport />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/jd-enhancer" 
            element={
              <ProtectedRoute>
                <JDEnhancer />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/simulator/:id" 
            element={
              <ProtectedRoute>
                <Simulator />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
