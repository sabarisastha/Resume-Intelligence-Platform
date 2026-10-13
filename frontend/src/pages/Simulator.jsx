import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Simulator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSimulate = async () => {
    if (!jobDescription) return;
    setRunning(true);
    setError('');
    try {
      const { data } = await api.post(`/resumes/${id}/simulate`, {
        job_description: jobDescription
      });
      setResult(data);
    } catch (error) {
      console.error('Simulation failed', error);
      setError(error.response?.data?.message || 'Failed to run simulation.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-inter p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-[var(--color-signal-cyan)]/20 pb-4">
          <h1 className="text-2xl font-space">AI Simulation</h1>
          <button 
            onClick={() => navigate(`/builder/${id}`)}
            className="text-sm border border-[var(--color-signal-cyan)]/20 text-[var(--color-text-muted)] hover:text-[var(--color-signal-cyan)] px-3 py-1 rounded-[8px]"
          >
            Back to Builder
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-space mb-4">Target Job Description</h2>
            <textarea
              className="w-full h-64 bg-[var(--color-bg-surface)] border border-[var(--color-signal-cyan)]/20 rounded-[8px] p-4 text-sm font-mono focus:border-[var(--color-signal-cyan)] outline-none resize-none"
              placeholder="Paste job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <button
              onClick={handleSimulate}
              disabled={running || !jobDescription}
              className="mt-4 w-full bg-[var(--color-signal-cyan)] text-[#12151A] py-2 rounded-[8px] font-medium hover:bg-[#4BC5BE] transition-colors disabled:opacity-50"
            >
              {running ? 'Running Simulation...' : 'Run Simulation'}
            </button>
            {error && <p role="alert" className="text-sm text-[var(--color-alert-amber)] mt-3">{error}</p>}
          </div>

          {result && (
            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-signal-cyan)]/20 p-6 rounded-[8px]">
              <h2 className="text-lg font-space mb-6 border-b border-[var(--color-signal-cyan)]/20 pb-2">Simulation Results</h2>
              
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--color-text-muted)]">Match Score</span>
                  <span className="font-mono text-[var(--color-signal-cyan)]">{result.match_score}/100</span>
                </div>
                <div className="w-full bg-[#12151A] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[var(--color-signal-cyan)] h-full" 
                    style={{ width: `${result.match_score}%` }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Matched Keywords</h3>
                <div className="flex flex-wrap gap-2">
                    {result.matched_keywords?.map((kw, idx) => (
                    <span key={idx} className="text-xs bg-[var(--color-signal-cyan)]/10 text-[var(--color-signal-cyan)] px-2 py-1 rounded">
                      {typeof kw === 'string' ? kw : kw.keyword}
                    </span>
                  ))}
                  {(!result.matched_keywords || result.matched_keywords.length === 0) && (
                    <span className="text-xs text-[var(--color-text-muted)]">None</span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                    {result.missing_keywords?.map((kw, idx) => (
                    <span key={idx} className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded">
                      {typeof kw === 'string' ? kw : kw.keyword}
                    </span>
                  ))}
                  {(!result.missing_keywords || result.missing_keywords.length === 0) && (
                    <span className="text-xs text-[var(--color-text-muted)]">None</span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Analysis</h3>
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                  {typeof result.analysis === 'string' ? result.analysis : result.analysis?.fit_assessment}
                </p>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-4">This comparison is an estimate of resume alignment, not a guarantee of screening or selection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Simulator;
