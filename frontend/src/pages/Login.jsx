import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(!err.response
        ? 'Cannot reach the API server. Start the backend and try again.'
        : err.response?.data?.message || 'Failed to login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-inter">
      <div className="bg-[var(--color-bg-surface)] p-8 border border-[var(--color-signal-cyan)]/20 shadow-none w-full max-w-md">
        <h2 className="text-2xl font-space mb-6">RIP Login</h2>
        
        {error && <div className="mb-4 text-[var(--color-alert-amber)] font-mono text-sm border border-[var(--color-alert-amber)]/20 p-2">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[var(--color-bg-primary)] border border-[#333] p-2 focus:outline-none focus:border-[var(--color-signal-cyan)] transition-colors rounded-[2px]"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[var(--color-bg-primary)] border border-[#333] p-2 focus:outline-none focus:border-[var(--color-signal-cyan)] transition-colors rounded-[2px]"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[var(--color-signal-cyan)] text-[#12151A] font-medium p-2 mt-4 hover:bg-[#4BC5BE] transition-colors rounded-[8px]"
          >
            Login
          </button>
        </form>
        
        <div className="mt-6 text-sm text-center text-[var(--color-text-muted)]">
          Need an account? <Link to="/register" className="text-[var(--color-signal-cyan)] hover:underline">Register</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
