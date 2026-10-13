import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(!err.response
        ? 'Cannot reach the API server. Start the backend and try again.'
        : err.response?.data?.message || 'Failed to register');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-inter py-12">
      <div className="bg-[var(--color-bg-surface)] p-8 border border-[var(--color-signal-cyan)]/20 shadow-none w-full max-w-md">
        <h2 className="text-2xl font-space mb-6">RIP Registration</h2>
        
        {error && <div className="mb-4 text-[var(--color-alert-amber)] font-mono text-sm border border-[var(--color-alert-amber)]/20 p-2">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Full Name *</label>
            <input name="full_name" type="text" required value={formData.full_name} onChange={handleChange}
              className="w-full bg-[var(--color-bg-primary)] border border-[#333] p-2 focus:outline-none focus:border-[var(--color-signal-cyan)] transition-colors rounded-[2px]" />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Email *</label>
            <input name="email" type="email" required value={formData.email} onChange={handleChange}
              className="w-full bg-[var(--color-bg-primary)] border border-[#333] p-2 focus:outline-none focus:border-[var(--color-signal-cyan)] transition-colors rounded-[2px]" />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Password *</label>
            <input name="password" type="password" required minLength={6} value={formData.password} onChange={handleChange}
              className="w-full bg-[var(--color-bg-primary)] border border-[#333] p-2 focus:outline-none focus:border-[var(--color-signal-cyan)] transition-colors rounded-[2px]" />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Use at least 6 characters.</p>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Phone</label>
            <input name="phone" type="text" value={formData.phone} onChange={handleChange}
              className="w-full bg-[var(--color-bg-primary)] border border-[#333] p-2 focus:outline-none focus:border-[var(--color-signal-cyan)] transition-colors rounded-[2px]" />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">LinkedIn URL</label>
            <input name="linkedin_url" type="url" value={formData.linkedin_url} onChange={handleChange}
              className="w-full bg-[var(--color-bg-primary)] border border-[#333] p-2 focus:outline-none focus:border-[var(--color-signal-cyan)] transition-colors rounded-[2px]" />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">GitHub URL</label>
            <input name="github_url" type="url" value={formData.github_url} onChange={handleChange}
              className="w-full bg-[var(--color-bg-primary)] border border-[#333] p-2 focus:outline-none focus:border-[var(--color-signal-cyan)] transition-colors rounded-[2px]" />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1">Portfolio URL</label>
            <input name="portfolio_url" type="url" value={formData.portfolio_url} onChange={handleChange}
              className="w-full bg-[var(--color-bg-primary)] border border-[#333] p-2 focus:outline-none focus:border-[var(--color-signal-cyan)] transition-colors rounded-[2px]" />
          </div>
          
          <button type="submit"
            className="w-full bg-[var(--color-signal-cyan)] text-[#12151A] font-medium p-2 mt-4 hover:bg-[#4BC5BE] transition-colors rounded-[8px]">
            Register
          </button>
        </form>
        
        <div className="mt-6 text-sm text-center text-[var(--color-text-muted)]">
          Already have an account? <Link to="/login" className="text-[var(--color-signal-cyan)] hover:underline">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
