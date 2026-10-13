import React, { useState } from 'react';
import api from '../api/axios';

const JDEnhancer = () => {
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleEnhance = async () => {
    if (!jd.trim()) return setError('Please enter a job description.');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/enhancer/jd', { job_description: jd });
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to analyze this job description.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-inter p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-b border-[var(--color-signal-cyan)]/20 pb-4">
          <h1 className="text-2xl font-space text-[var(--color-signal-cyan)]">Job Description Enhancer</h1>
          <p className="text-[var(--color-text-muted)] mt-2">Improve clarity, extract key skills, and optimize your job descriptions.</p>
        </header>

        {!result ? (
          <div className="bg-[var(--color-bg-surface)] p-6 border border-[var(--color-signal-cyan)]/20">
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="w-full bg-transparent border border-[var(--color-signal-cyan)]/30 p-4 min-h-[300px] focus:border-[var(--color-signal-cyan)] outline-none text-sm"
              placeholder="Paste your original job description here..."
            />
            {error && <div className="text-[var(--color-alert-amber)] mt-2">{error}</div>}
            <button 
              onClick={handleEnhance} 
              disabled={loading}
              className="mt-4 bg-[var(--color-signal-cyan)] text-[#12151A] px-6 py-2 font-medium rounded-[2px] hover:bg-[#4BC5BE] transition-colors"
            >
              {loading ? 'Enhancing...' : 'Enhance JD'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-[var(--color-bg-surface)] p-6 border border-[var(--color-signal-cyan)]/20">
              <h2 className="font-space mb-4 text-[var(--color-text-muted)]">Original</h2>
              <div className="text-sm whitespace-pre-wrap opacity-75">{result.original_text}</div>
            </div>
            <div className="bg-[var(--color-bg-surface)] p-6 border border-[var(--color-signal-cyan)]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-space text-[var(--color-signal-cyan)]">Enhanced Version</h2>
                <button 
                  onClick={() => navigator.clipboard.writeText(result.enhanced_text)}
                  className="text-xs border border-[var(--color-signal-cyan)]/30 px-2 py-1 hover:bg-[var(--color-signal-cyan)]/10"
                >
                  Copy
                </button>
              </div>
              <div className="text-sm whitespace-pre-wrap mb-6">{result.enhanced_text}</div>

              {result.extracted_keywords && result.extracted_keywords.length > 0 && (
                <div className="mt-6 pt-4 border-t border-[var(--color-signal-cyan)]/20">
                  <h3 className="font-space text-sm mb-2 text-[var(--color-signal-cyan)]">Key Skills & Requirements</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.extracted_keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-1 bg-[var(--color-signal-cyan)]/10 text-[var(--color-signal-cyan)] text-xs border border-[var(--color-signal-cyan)]/30 rounded-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.improvements && result.improvements.length > 0 && (
                <div className="mt-6 pt-4 border-t border-[var(--color-signal-cyan)]/20">
                  <h3 className="font-space text-sm mb-2 text-[var(--color-text-muted)]">What was improved</h3>
                  <ul className="space-y-1 text-xs opacity-80 list-disc pl-4">
                    {result.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="col-span-2">
              <button 
                onClick={() => { setResult(null); setJd(''); }} 
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-signal-cyan)]"
              >
                ← Enhance Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JDEnhancer;
