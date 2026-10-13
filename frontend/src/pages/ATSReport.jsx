import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { motion } from 'framer-motion';

const ATSReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jd, setJd] = useState('');
  const [error, setError] = useState('');
  const [resume, setResume] = useState(null);

  useEffect(() => {
    let active = true;
    api.get(`/resumes/${id}`)
      .then(({ data }) => { if (active) setResume(data); })
      .catch(() => { if (active) setResume(null); });
    return () => { active = false; };
  }, [id]);

  const handleAnalyze = async () => {
    if (!jd.trim()) {
      setError('Please provide a job description.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/resumes/${id}/analyze`, { job_description: jd }, { timeout: 130000 });
      setReport(data);
    } catch (err) {
      const status = err.response?.status;
      const message = status === 401 || status === 403
        ? 'Your session expired. Sign in again, then retry the analysis.'
        : !err.response
          ? 'Cannot reach the API server. Start the backend, then retry; your job description is still here.'
          : status === 503
            ? 'The AI service is unavailable. Start Ollama and confirm the configured model is installed, then retry.'
            : status === 504 || err.code === 'ECONNABORTED'
              ? 'The AI model took too long to respond. The request window is now longer; retry after the model is ready.'
              : err.response?.data?.message || 'Failed to generate ATS report.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-primary)] font-space">
        <motion.div
          animate={{ height: ['0%', '100%', '0%'], top: ['0%', '0%', '100%'] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 w-[2px] bg-[var(--color-signal-cyan)] shadow-[0_0_8px_var(--color-signal-cyan)] h-32"
        />
        <p className="text-[var(--color-signal-cyan)] mt-8 uppercase tracking-widest text-sm">Scanning Resume against JD...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-inter p-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <h1 className="text-2xl font-space text-[var(--color-signal-cyan)]">ATS Analysis</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Paste the job description below to analyze how well your resume matches.</p>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            className="w-full bg-transparent border border-[var(--color-signal-cyan)]/30 p-4 min-h-[300px] focus:border-[var(--color-signal-cyan)] outline-none text-sm"
            placeholder="Enter job description here..."
          />
          {error && <div className="text-[var(--color-alert-amber)] text-sm">{error}</div>}
          <div className="flex gap-4">
            <button onClick={handleAnalyze} className="bg-[var(--color-signal-cyan)] text-[#12151A] px-6 py-2 font-medium rounded-[2px] hover:bg-[#4BC5BE] transition-colors">
              Run Analysis
            </button>
            <button onClick={() => navigate(-1)} className="border border-[var(--color-signal-cyan)]/20 px-6 py-2 hover:text-[var(--color-signal-cyan)] rounded-[2px] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const scoreCards = [
    ['Formatting', report.section_scores?.formatting],
    ['Keywords', report.section_scores?.keyword],
    ['Content', report.section_scores?.content],
    ['Achievements', report.section_scores?.achievements],
    ['Projects', report.section_scores?.projects],
  ];
  const numericScore = value => Number(value?.score ?? value ?? 0);
  const resumeContent = resume?.mongo_content?.content || resume?.content || {};
  const personalInfo = resumeContent.personal_info || {};
  const asText = value => typeof value === 'string' ? value : (value == null ? '' : String(value));
  const listText = value => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : item?.name || item?.title || item?.skill || '').filter(Boolean) : [];
  const sections = [
    { title: 'Education', items: resumeContent.education || [], render: item => <><strong>{item.degree || item.qualification || 'Education'}</strong>{item.field_of_study && ` · ${item.field_of_study}`}<span>{[item.institution, item.graduation_date || item.end_date].filter(Boolean).join(' · ')}</span></> },
    { title: 'Experience', items: resumeContent.experience || [], render: item => <><strong>{item.position || item.title || item.role || 'Experience'}</strong><span>{[item.company, item.location, item.start_date && item.end_date ? `${item.start_date} – ${item.end_date}` : item.start_date || item.end_date].filter(Boolean).join(' · ')}</span>{item.description && <p>{item.description}</p>}</> },
    { title: 'Projects', items: resumeContent.projects || [], render: item => <><strong>{item.title || item.name || 'Project'}</strong>{item.description && <p>{item.description}</p>}{listText(item.tech_stack || item.technologies).length > 0 && <span>Tools: {listText(item.tech_stack || item.technologies).join(', ')}</span>}</> },
  ].filter(section => Array.isArray(section.items) && section.items.length > 0);
  const skillNames = listText(resumeContent.skills);
  const additionalInfo = Array.isArray(resumeContent.additional_info) ? resumeContent.additional_info : [];
  const contentSectionCount = sections.length + Number(Boolean(resumeContent.summary)) + Number(skillNames.length > 0) + Number((resumeContent.certifications || []).length > 0) + Number(additionalInfo.length > 0);
  const contactDetails = [personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin_url || personalInfo.linkedin, personalInfo.github_url || personalInfo.github, personalInfo.portfolio_url]
    .map(asText).filter(Boolean);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-inter p-8">
      <div className="ats-report-layout mx-auto">
        
        {/* LEFT COLUMN: Resume Outline */}
        <div className="ats-resume-panel">
          <div className="ats-panel-heading">
            <div><p className="ats-eyebrow">RESUME REVIEW</p><h2 className="font-space">{personalInfo.full_name || resume?.title || 'Resume details'}</h2></div>
            <span className="ats-section-count">{contentSectionCount} sections</span>
          </div>
          {contactDetails.length > 0 && <p className="ats-contact-line">{contactDetails.join(' · ')}</p>}
          {resumeContent.summary && <section className="ats-resume-section"><h3>SUMMARY</h3><p>{resumeContent.summary}</p></section>}
          {sections.map(section => <section className="ats-resume-section" key={section.title}>
            <h3>{section.title}<span>{section.items.length}</span></h3>
            <div className="ats-resume-items">{section.items.map((item, index) => <article key={item.id || item._id || index}>{section.render(item)}</article>)}</div>
          </section>)}
          {skillNames.length > 0 && <section className="ats-resume-section"><h3>SKILLS<span>{skillNames.length}</span></h3><div className="ats-resume-tags">{skillNames.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}</div></section>}
          {Array.isArray(resumeContent.certifications) && resumeContent.certifications.length > 0 && <section className="ats-resume-section"><h3>CERTIFICATIONS<span>{resumeContent.certifications.length}</span></h3><div className="ats-resume-items">{resumeContent.certifications.map((item, index) => <article key={item.id || index}><strong>{item.name || item.title}</strong>{item.issuer && <span>{item.issuer}</span>}</article>)}</div></section>}
          {additionalInfo.length > 0 && <section className="ats-resume-section"><h3>ADDITIONAL INFORMATION<span>{additionalInfo.length}</span></h3><div className="ats-resume-items">{additionalInfo.map((item, index) => <article key={item.id || index}><strong>{item.title || 'Additional information'}</strong>{item.content && <p>{item.content}</p>}</article>)}</div></section>}
          {!resume && <p className="ats-muted-note">Resume details could not be loaded. The score report is still available.</p>}
          {resume && !resumeContent.summary && sections.length === 0 && skillNames.length === 0 && <p className="ats-muted-note">This resume has no section details yet. Add content in the builder and analyze it again.</p>}
        </div>

        {/* RIGHT COLUMN: The Report */}
        <div className="ats-report-results">
          <div className="bg-[var(--color-bg-surface)] p-6 border border-[var(--color-signal-cyan)]/20 mb-6 flex flex-col items-center">
            <h2 className="font-space text-[var(--color-text-muted)] mb-4 tracking-widest text-sm uppercase">ATS Score</h2>
            <div className="flex items-center gap-4">
              {/* Signal Meter Base (Static for now, would use recharts or SVG) */}
              <div className="w-48 h-4 bg-[#333] flex overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${report?.overall_score || 0}%` }}
                  transition={{ delay: 1.2, duration: 1 }}
                  className={`h-full ${report?.overall_score > 75 ? 'bg-[var(--color-confirm-green)]' : report?.overall_score > 50 ? 'bg-[var(--color-signal-cyan)]' : 'bg-[var(--color-alert-amber)]'}`}
                />
              </div>
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.2 }}
                className="font-mono text-3xl"
              >
                {report?.overall_score || 0}
              </motion.span>
            </div>
          </div>

          <div className="bg-[var(--color-bg-surface)] p-4 border border-[var(--color-signal-cyan)]/20 mb-6">
            <h3 className="font-space mb-3 text-[var(--color-text-muted)]">SCORE BREAKDOWN</h3>
            <div className="ats-score-grid">
              {scoreCards.map(([label, value]) => (
                <div key={label} className="ats-score-card">
                  <div className="ats-score-card-label"><span>{label}</span><strong>{numericScore(value)}<small>/100</small></strong></div>
                  <div className="h-1.5 bg-[#333]"><div className="h-full bg-[var(--color-signal-cyan)]" style={{ width: `${numericScore(value)}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              Overall score weights: formatting 15%, keywords 25%, content 20%, achievements 20%, projects 20%.
            </p>
          </div>

          <div className="bg-[var(--color-bg-surface)] p-6 border border-[var(--color-signal-cyan)]/20 space-y-6">
             {report?.reasoning && <p className="text-sm text-[var(--color-text-muted)]">{report.reasoning}</p>}
             {report?.strengths?.length > 0 && (
               <div>
                 <h3 className="font-space mb-2 text-[var(--color-confirm-green)]">STRENGTHS</h3>
                 <ul className="space-y-2">{report.strengths.map((item, i) => <li key={i} className="text-sm">{typeof item === 'string' ? item : item.reason}</li>)}</ul>
               </div>
             )}
             <div>
               <h3 className="font-space mb-2 text-[var(--color-alert-amber)]">WEAKNESSES / DEDUCTIONS</h3>
               <ul className="space-y-2">
                 {report?.deductions?.map((d, i) => (
                   <li key={i} className="font-mono text-sm flex gap-2">
                     <span className="text-[var(--color-alert-amber)]">-{d.points}</span>
                     <span>{d.reason}</span>
                   </li>
                 ))}
               </ul>
             </div>

             <div>
               <h3 className="font-space mb-2 text-[var(--color-signal-cyan)]">RECOMMENDATIONS</h3>
               <ul className="space-y-2">
                 {report?.recommendations?.map((r, i) => (
                   <li key={i} className="text-sm flex gap-2">
                     <span className="text-[var(--color-text-muted)]">→</span>
                     {r}
                   </li>
                 ))}
               </ul>
             </div>
             
             {report?.missing_keywords && report.missing_keywords.length > 0 && (
               <div>
                 <h3 className="font-space mb-2 text-[var(--color-alert-amber)]">MISSING KEYWORDS</h3>
                 <div className="flex flex-wrap gap-2">
                   {report.missing_keywords.map((k, i) => (
                     <span key={i} className="px-2 py-1 bg-[var(--color-alert-amber)]/10 text-[var(--color-alert-amber)] text-xs border border-[var(--color-alert-amber)]/30 rounded-sm">
                       {k}
                     </span>
                   ))}
                 </div>
               </div>
             )}
             {report?.matched_keywords && report.matched_keywords.length > 0 && (
               <div>
                 <h3 className="font-space mb-2 text-[var(--color-confirm-green)]">MATCHED KEYWORDS</h3>
                 <div className="flex flex-wrap gap-2">{report.matched_keywords.map((keyword, i) => <span key={i} className="px-2 py-1 bg-[var(--color-confirm-green)]/10 text-[var(--color-confirm-green)] text-xs border border-[var(--color-confirm-green)]/30 rounded-sm">{keyword}</span>)}</div>
               </div>
             )}
          </div>
          
          <button onClick={() => setReport(null)} className="mt-6 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-signal-cyan)] transition-colors">
            ← Analyze Another JD
          </button>
          <button onClick={() => navigate(-1)} className="mt-6 ml-4 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-signal-cyan)] transition-colors">
            Back to Builder
          </button>
        </div>
      </div>
    </div>
  );
};

export default ATSReport;
