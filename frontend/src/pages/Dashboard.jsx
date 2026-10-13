import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const { data } = await api.get('/resumes');
        setResumes(data);
      } catch (error) {
        console.error('Failed to fetch resumes', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResumes();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateNew = async () => {
    try {
      const { data } = await api.post('/resumes', {
        title: 'Untitled Resume',
        targetRole: 'Software Engineer',
      });
      navigate(`/builder/${data.id}`);
    } catch (error) {
      console.error('Failed to create resume', error);
      window.alert(error.response?.data?.message || 'Could not create a resume. Please try again.');
    }
  };

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = React.useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume_file', file);

    setUploading(true);
    setUploadProgress(10);
    setUploadStatus('Uploading document...');
    
    try {
      // The upload endpoint parses and persists the complete resume itself.
      // Reusing its resumeId avoids creating a second, empty resume and
      // replaying the imported sections from the browser.
      setUploadStatus('Extracting and saving your resume...');
      setUploadProgress(40);
      
      const { data } = await api.post('/upload/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (!data.resumeId) throw new Error('Upload succeeded without returning a resume ID. Please refresh and check your resume list.');

      setUploadProgress(100);
      setUploadStatus('Complete! Redirecting to Builder...');
      
      // Navigate to builder
      setTimeout(() => {
        navigate(`/builder/${data.resumeId}`);
      }, 500);
      
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error occurred';
      alert(`Failed to parse the resume:\n${errorMsg}`);
      setUploadStatus('Upload failed. Please try again.');
      setTimeout(() => {
        setUploading(false); // Close loader after showing error
      }, 2000);
    } finally {
      // clear input
      e.target.value = null;
    }
  };

  const handleDeleteResume = async (e, id) => {
    e.stopPropagation(); // prevent opening the resume
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    try {
      await api.delete(`/resumes/${id}`);
      setResumes(resumes.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete resume', error);
      alert('Failed to delete resume.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-inter p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-[var(--color-signal-cyan)]/20 pb-4">
          <h1 className="text-2xl font-space">RIP <span className="text-[var(--color-text-muted)] text-sm ml-2">[{user?.full_name}]</span></h1>
          <button onClick={handleLogout} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-signal-cyan)] border border-[var(--color-signal-cyan)]/20 px-3 py-1 rounded-[8px]">
            Logout
          </button>
        </header>

        <section className="bg-[var(--color-bg-surface)] border border-[var(--color-signal-cyan)]/20 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-space">Your Resumes</h2>
            <div className="space-x-3 flex items-center">
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx" onChange={handleFileChange} />
              <button 
                onClick={handleUploadClick}
                disabled={uploading}
                className="text-sm border border-[var(--color-signal-cyan)] text-[var(--color-signal-cyan)] px-3 py-1 rounded-[8px] font-medium hover:bg-[var(--color-signal-cyan)] hover:text-[#12151A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Parsing...' : 'Upload PDF'}
              </button>
              <button 
                onClick={handleCreateNew}
                className="text-sm bg-[var(--color-signal-cyan)] text-[#12151A] px-3 py-1 rounded-[8px] font-medium hover:bg-[#4BC5BE] transition-colors"
              >
                + New
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-[var(--color-text-muted)]">Loading...</div>
          ) : resumes.length === 0 ? (
            <div className="text-[var(--color-text-muted)] text-center py-8">
              No resumes yet - create one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.map(resume => (
                <div key={resume.id} className="group border border-[var(--color-signal-cyan)]/20 p-4 rounded-[2px] bg-[var(--color-bg-primary)] cursor-pointer hover:border-[var(--color-signal-cyan)] transition-colors relative" onClick={() => navigate(`/builder/${resume.id}`)}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-space flex-1 pr-6 truncate">{resume.title}</h3>
                    <button 
                      onClick={(e) => handleDeleteResume(e, resume.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10"
                      title="Delete Resume"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                  <div className="text-[var(--color-text-muted)] text-sm font-mono flex justify-between items-center">
                    <span>Target: {resume.target_role || 'N/A'}</span>
                    <span className="text-[var(--color-signal-cyan)] group-hover:underline">Open -&gt;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        <section className="bg-[var(--color-bg-surface)] border border-[var(--color-signal-cyan)]/20 p-6 mt-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-space text-[var(--color-signal-cyan)]">Job Description Enhancer</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Improve and analyze job descriptions to tailor your resume.</p>
            </div>
            <button 
              onClick={() => navigate('/jd-enhancer')}
              className="text-sm bg-transparent border border-[var(--color-signal-cyan)] text-[var(--color-signal-cyan)] px-4 py-2 rounded-[8px] font-medium hover:bg-[var(--color-signal-cyan)]/10 transition-colors"
            >
              Open Enhancer
            </button>
          </div>
        </section>
      </div>

      {uploading && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center flex-col">
          <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-[var(--color-signal-cyan)] transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <p className="text-[var(--color-signal-cyan)] font-space mb-2 animate-pulse">{uploadStatus}</p>
          <p className="text-gray-400 text-sm">Please do not close this window</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
