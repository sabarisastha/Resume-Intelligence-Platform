import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useReactToPrint } from 'react-to-print';

const safeExternalUrl = value => {
  if (!value?.trim()) return '';
  const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
};

const ResumeBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [resume, setResume] = useState(null);
  const componentRef = useRef();
  const originalFileUrlRef = useRef('');
  const originalPreviewRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: resume?.title || 'Resume',
  });
  
  // Use data from upload if available, otherwise empty
  const [education, setEducation] = useState(location.state?.extractedData?.education || []);
  const [experience, setExperience] = useState(location.state?.extractedData?.experience || []);
  const [projects, setProjects] = useState(location.state?.extractedData?.projects || []);
  const [skills, setSkills] = useState(location.state?.extractedData?.skills || []);
  const [certifications, setCertifications] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const originalSections = useRef({ education: [], experience: [], projects: [], certifications: [] });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const fetchResumeData = async () => {
      try {
        const { data: resumeData } = await api.get('/resumes/' + id);
        setResume(resumeData);
        
        const [edu, exp, proj, cert, skillRows] = await Promise.all([
          api.get('/resumes/' + id + '/education'), api.get('/resumes/' + id + '/experience'),
          api.get('/resumes/' + id + '/projects'), api.get('/resumes/' + id + '/certifications'),
          api.get('/resumes/' + id + '/skills'),
        ]);
        setEducation(edu.data); setExperience(exp.data); setProjects(proj.data);
        setCertifications(cert.data); setSkills(skillRows.data);
        setAdditionalInfo(resumeData.mongo_content?.content?.additional_info || []);
        originalSections.current = { education: edu.data, experience: exp.data, projects: proj.data, certifications: cert.data };
      } catch (err) {
        console.error('Failed to fetch resume details:', err);
      }
    };

    fetchResumeData();
  }, [id, location.state]);

  const sourceFileData = resume?.mongo_content?.original_file?.data;
  const sourceFileMimeType = resume?.mongo_content?.original_file?.mime_type;
  const sourceFileName = resume?.mongo_content?.original_file?.filename;
  useEffect(() => {
    if (!sourceFileData || !sourceFileMimeType) return undefined;
    const binary = atob(sourceFileData);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: sourceFileMimeType }));
    originalFileUrlRef.current = objectUrl;
    if (originalPreviewRef.current) originalPreviewRef.current.src = objectUrl;
    return () => {
      URL.revokeObjectURL(objectUrl);
      if (originalFileUrlRef.current === objectUrl) originalFileUrlRef.current = '';
    };
  }, [sourceFileData, sourceFileMimeType]);

  const handleEnhanceProject = async (index) => {
    const proj = projects[index];
    if (!proj.id) {
      setNotice({ type: 'error', text: 'Save the project before using AI enhancement.' });
      return;
    }
    try {
      const { data } = await api.post('/projects/' + proj.id + '/enhance', { role_context: resume.target_role || 'Software Engineer' });
      setProjects(current => current.map((project, i) => i === index ? { ...project, description: data.enhanced_description } : project));
      setNotice({ type: 'success', text: 'Project enhancement is ready to review.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'The AI service is unavailable. Try again when it is ready.' });
    }
  };

  const updateEducation = (index, field, value) => {
      setEducation(current => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const updateExperience = (index, field, value) => {
      setExperience(current => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const updateProject = (index, field, value) => {
      setProjects(current => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const updateSkill = (index, value) => {
      setSkills(current => current.map((skill, i) => i === index ? (typeof skill === 'object' ? { ...skill, name: value } : value) : skill));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setNotice(null);
    try {
      // Basic update for title/role if changed
      const content = resume.mongo_content?.content || {};
      await api.put('/resumes/' + id, {
        title: resume.title, target_role: resume.target_role, template_id: resume.template_id,
        personal_info: content.personal_info || {}, summary: content.summary || '', additional_info: additionalInfo,
      });

      // Save Education
      for (const edu of education.filter(item => item.institution?.trim())) {
        if (edu.id) {
          await api.put('/resumes/' + id + '/education/' + edu.id, edu);
        } else {
          await api.post('/resumes/' + id + '/education', edu);
        }
      }

      // Save Experience
      for (const exp of experience.filter(item => item.company?.trim())) {
        if (exp.id) {
          await api.put('/resumes/' + id + '/experience/' + exp.id, exp);
        } else {
          await api.post('/resumes/' + id + '/experience', exp);
        }
      }

      // Save Projects
      for (const proj of projects.filter(item => item.title?.trim())) {
        const techStack = Array.isArray(proj.tech_stack) ? proj.tech_stack : (proj.tech_stack || '').split(',').map(value => value.trim()).filter(Boolean);
        const projectPayload = { ...proj, tech_stack: techStack };
        if (proj.id) {
          await api.put('/resumes/' + id + '/projects/' + proj.id, projectPayload);
        } else {
          await api.post('/resumes/' + id + '/projects', projectPayload);
        }
      }

      for (const cert of certifications.filter(item => item.name)) {
        if (cert.id) await api.put(`/resumes/${id}/certifications/${cert.id}`, cert);
        else await api.post(`/resumes/${id}/certifications`, cert);
      }

      const currentById = { education, experience, projects, certifications };
      for (const [section, rows] of Object.entries(originalSections.current)) {
        const keptIds = new Set(currentById[section].map(item => item.id).filter(Boolean));
        for (const row of rows) {
          if (row.id && !keptIds.has(row.id)) await api.delete(`/resumes/${id}/${section}/${row.id}`);
        }
      }

      // Save Skills
      const skillObjects = skills.map(s => typeof s === 'object' ? s : { name: s }).filter(s => s.name?.trim());
      await api.put('/resumes/' + id + '/skills', { skills: skillObjects });

      const [edu, exp, proj, cert, skillsData, refreshed] = await Promise.all([
        api.get('/resumes/' + id + '/education'), api.get('/resumes/' + id + '/experience'),
        api.get('/resumes/' + id + '/projects'), api.get('/resumes/' + id + '/certifications'),
        api.get('/resumes/' + id + '/skills'), api.get('/resumes/' + id),
      ]);
      setEducation(edu.data); setExperience(exp.data); setProjects(proj.data); setCertifications(cert.data);
      setSkills(skillsData.data); setResume(refreshed.data);
      originalSections.current = { education: edu.data, experience: exp.data, projects: proj.data, certifications: cert.data };
      setNotice({ type: 'success', text: 'Resume saved successfully.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Could not reach the API. Your current edits are still on this page.' });
    } finally {
      setSaving(false);
    }
  };

  if (!resume) return <div className="p-8 text-[var(--color-text-primary)]">Loading...</div>;

  const personalInfo = resume.mongo_content?.content?.personal_info || location.state?.extractedData?.personal_info || {};
  const updatePersonalInfo = (field, value) => setResume(current => {
    const currentInfo = current.mongo_content?.content?.personal_info || location.state?.extractedData?.personal_info || {};
    return {
      ...current,
      mongo_content: { ...current.mongo_content, content: { ...current.mongo_content?.content, personal_info: { ...currentInfo, [field]: value } } },
    };
  });
  const updateSummary = value => setResume(current => ({
    ...current,
    mongo_content: { ...current.mongo_content, content: { ...current.mongo_content?.content, summary: value } },
  }));

  const updateAdditionalInfo = (index, field, value) => setAdditionalInfo(current =>
    current.map((section, i) => i === index ? { ...section, [field]: value } : section)
  );
  const handlePhotoUpload = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Photo must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updatePersonalInfo('profile_photo_data', reader.result);
      setPhotoError('');
    };
    reader.readAsDataURL(file);
  };
  const originalFile = resume.mongo_content?.original_file;
  const downloadOriginalFile = () => {
    if (!originalFileUrlRef.current) return;
    const link = document.createElement('a');
    link.href = originalFileUrlRef.current;
    link.download = sourceFileName || 'original-resume';
    link.click();
  };
  const templateId = resume.template_id === 'original' && originalFile
    ? 'original'
    : ['compact', 'modern', 'executive', 'minimal'].includes(resume.template_id) ? resume.template_id : 'classic';
  const profileLinks = [
    ['LinkedIn', personalInfo.linkedin_url],
    ['GitHub', personalInfo.github_url],
    ['Portfolio', personalInfo.portfolio_url],
  ].map(([label, value]) => {
    if (!value?.trim()) return null;
    const href = safeExternalUrl(value);
    return href ? { label, href } : null;
  }).filter(Boolean);

  return (
    <div className="builder-workspace bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-inter">
      {/* LEFT COLUMN - FORM */}
      <div className="builder-editor p-6 overflow-y-auto border-r border-[var(--color-signal-cyan)]/20">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-[var(--color-signal-cyan)]/20 pb-4">
          <h1 className="text-xl font-space text-[var(--color-signal-cyan)]">Builder Mode</h1>
          <div className="space-x-2">
            <button onClick={handleSaveAll} disabled={saving} className="text-sm bg-[var(--color-signal-cyan)] text-[#12151A] px-3 py-1 font-medium hover:bg-[#4BC5BE] transition-colors rounded-[2px]">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => navigate('/simulator/' + resume.id)} className="text-sm bg-[#4BC5BE] text-[#12151A] px-3 py-1 font-medium hover:bg-[#3AA8A2] transition-colors rounded-[2px]">
              Simulate
            </button>
            {templateId === 'original' && originalFile ? <button type="button" onClick={downloadOriginalFile} className="text-sm border border-[var(--color-signal-cyan)] text-[var(--color-signal-cyan)] px-3 py-1 font-medium hover:bg-[var(--color-signal-cyan)] hover:text-[#12151A] transition-colors rounded-lg">Download original</button> : <button onClick={handlePrint} className="text-sm border border-[var(--color-signal-cyan)] text-[var(--color-signal-cyan)] px-3 py-1 font-medium hover:bg-[var(--color-signal-cyan)] hover:text-[#12151A] transition-colors rounded-lg">Export PDF</button>}
            <button onClick={() => navigate('/ats-report/' + resume.id)} className="text-sm border border-[var(--color-signal-cyan)] text-[var(--color-signal-cyan)] px-3 py-1 font-medium hover:bg-[#4BC5BE] transition-colors rounded-[2px]">
              Analyze
            </button>
            <button onClick={() => navigate('/dashboard')} className="text-sm border border-[var(--color-signal-cyan)]/20 px-3 py-1 hover:text-[var(--color-signal-cyan)]">Back</button>
          </div>
        </div>
        {notice && <p role={notice.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mb-4 rounded-lg border px-3 py-2 text-sm ${notice.type === 'error' ? 'border-rose-400/40 bg-rose-950/30 text-rose-200' : 'border-emerald-400/40 bg-emerald-950/20 text-emerald-200'}`}>{notice.text}</p>}
        
        <div className="space-y-6">
          <section className="bg-[var(--color-bg-surface)] p-4 border border-[var(--color-signal-cyan)]/20">
            <h2 className="font-space mb-4">Basic Info</h2>
            <input type="text" value={resume.title || ''} onChange={(e) => setResume({...resume, title: e.target.value})} className="w-full bg-transparent border border-[#333] p-2 mb-2 focus:border-[var(--color-signal-cyan)] outline-none" placeholder="Resume Title" />
            <input type="text" value={resume.target_role || ''} onChange={(e) => setResume({...resume, target_role: e.target.value})} className="w-full bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none" placeholder="Target Role" />
            <label className="block mt-3 text-xs uppercase tracking-wide text-[var(--color-text-muted)]" htmlFor="resume-template">Resume template</label>
            <select id="resume-template" aria-label="Resume template" value={templateId} onChange={e => setResume(current => ({ ...current, template_id: e.target.value }))} className="w-full rounded-lg bg-[var(--color-bg-primary)] border border-[#333] p-2 mt-1">
              {originalFile && <option value="original">Original uploaded file</option>}
              <option value="classic">Classic · Traditional</option>
              <option value="compact">Compact · Dense</option>
              <option value="modern">Modern · Teal</option>
              <option value="executive">Executive · Navy</option>
              <option value="minimal">Minimal · Clean</option>
            </select>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">Every designed template keeps a single-column, selectable-text layout for ATS readability. Choose a style to preview it.</p>
            {originalFile && <button type="button" onClick={downloadOriginalFile} className="mt-2 inline-flex text-xs text-[var(--color-signal-cyan)] underline underline-offset-2">Download the preserved original file</button>}
            <div className="mt-4 space-y-2">
              <label className="block text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Name</label>
              <input type="text" value={personalInfo.full_name || ''} onChange={e => updatePersonalInfo('full_name', e.target.value)} className="w-full rounded-lg bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none" placeholder="Your full name" />
              <label className="block text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Email</label>
              <input type="email" value={personalInfo.email || ''} onChange={e => updatePersonalInfo('email', e.target.value)} className="w-full rounded-lg bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none" placeholder="name@example.com" />
              <label className="block text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Phone</label>
              <input type="tel" value={personalInfo.phone || ''} onChange={e => updatePersonalInfo('phone', e.target.value)} className="w-full rounded-lg bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none" placeholder="Phone number" />
            </div>
            <div className="mt-4 rounded-xl border border-[var(--color-signal-cyan)]/20 p-3">
              <h3 className="text-sm font-semibold">Profile links</h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Add a URL here; the resume preview shows a clean clickable label.</p>
              {[['linkedin_url', 'LinkedIn profile URL'], ['github_url', 'GitHub profile URL'], ['portfolio_url', 'Portfolio URL']].map(([field, label]) => (
                <label key={field} className="mt-3 block text-xs text-[var(--color-text-muted)]">{label}
                  <input type="url" value={personalInfo[field] || ''} onChange={e => updatePersonalInfo(field, e.target.value)} className="mt-1 w-full rounded-lg bg-transparent border border-[#333] p-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-signal-cyan)] outline-none" placeholder={`https://${field.startsWith('linkedin') ? 'linkedin.com/in/your-name' : field.startsWith('github') ? 'github.com/your-name' : 'your-site.com'}`} />
                </label>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-[var(--color-signal-cyan)]/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="text-sm font-semibold">Photo</h3><p className="mt-1 text-xs text-[var(--color-text-muted)]">Optional · JPG, PNG, or WebP · up to 2 MB</p></div>
                {personalInfo.profile_photo_data && <button type="button" className="text-xs text-amber-300" onClick={() => updatePersonalInfo('profile_photo_data', '')}>Remove photo</button>}
              </div>
              <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-[var(--color-signal-cyan)]/40 px-3 py-2 text-sm hover:bg-[var(--color-signal-cyan)]/10">
                {personalInfo.profile_photo_data ? 'Replace photo' : 'Upload photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="sr-only" />
              </label>
              {photoError && <p role="alert" className="mt-2 text-xs text-rose-300">{photoError}</p>}
            </div>
            <textarea value={resume.mongo_content?.content?.summary || ''} onChange={e => updateSummary(e.target.value)} className="w-full bg-transparent border border-[#333] p-2 mt-2 focus:border-[var(--color-signal-cyan)] outline-none" placeholder="Professional summary" />
          </section>

          <section className="bg-[var(--color-bg-surface)] p-4 border border-[var(--color-signal-cyan)]/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-space">Education</h2>
              <button className="text-[var(--color-signal-cyan)] text-sm" onClick={() => setEducation([...education, {}])}>+ Add</button>
            </div>
            <div className="space-y-4">
              {education.map((edu, index) => (
                <div key={edu.id || index} className="border border-[#333] p-3 space-y-2">
                  <button type="button" className="text-xs text-amber-400" onClick={() => setEducation(education.filter((_, i) => i !== index))}>Remove</button>
                  <input type="text" value={edu.institution || ''} onChange={(e) => updateEducation(index, 'institution', e.target.value)} className="w-full bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none text-sm" placeholder="Institution" />
                  <input type="text" value={edu.degree || ''} onChange={(e) => updateEducation(index, 'degree', e.target.value)} className="w-full bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none text-sm" placeholder="Degree" />
                  <input type="text" value={edu.field_of_study || ''} onChange={(e) => updateEducation(index, 'field_of_study', e.target.value)} className="w-full bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none text-sm" placeholder="Field of Study" />
                  <div className="grid grid-cols-3 gap-2"><input type="date" value={(edu.start_date || '').slice(0, 10)} onChange={e => updateEducation(index, 'start_date', e.target.value || null)} className="bg-transparent border border-[#333] p-2 text-sm" /><input type="date" value={(edu.end_date || '').slice(0, 10)} onChange={e => updateEducation(index, 'end_date', e.target.value || null)} className="bg-transparent border border-[#333] p-2 text-sm" /><input value={edu.grade || ''} onChange={e => updateEducation(index, 'grade', e.target.value)} className="bg-transparent border border-[#333] p-2 text-sm" placeholder="Grade" /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[var(--color-bg-surface)] p-4 border border-[var(--color-signal-cyan)]/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-space">Experience</h2>
              <button className="text-[var(--color-signal-cyan)] text-sm" onClick={() => setExperience([...experience, {}])}>+ Add</button>
            </div>
            <div className="space-y-4">
              {experience.map((exp, index) => (
                <div key={exp.id || index} className="border border-[#333] p-3 space-y-2">
                  <button type="button" className="text-xs text-amber-400" onClick={() => setExperience(experience.filter((_, i) => i !== index))}>Remove</button>
                  <input type="text" value={exp.role || ''} onChange={(e) => updateExperience(index, 'role', e.target.value)} className="w-full bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none text-sm" placeholder="Role" />
                  <input type="text" value={exp.company || ''} onChange={(e) => updateExperience(index, 'company', e.target.value)} className="w-full bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none text-sm" placeholder="Company" />
                  <textarea value={exp.description || ''} onChange={(e) => updateExperience(index, 'description', e.target.value)} className="w-full bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none text-sm h-24" placeholder="Description"></textarea>
                  <div className="grid grid-cols-2 gap-2"><input type="date" value={(exp.start_date || '').slice(0, 10)} onChange={e => updateExperience(index, 'start_date', e.target.value || null)} className="bg-transparent border border-[#333] p-2 text-sm" /><input type="date" value={(exp.end_date || '').slice(0, 10)} onChange={e => updateExperience(index, 'end_date', e.target.value || null)} className="bg-transparent border border-[#333] p-2 text-sm" /></div>
                  <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={Boolean(exp.is_current)} onChange={e => updateExperience(index, 'is_current', e.target.checked)} />Currently here</label>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[var(--color-bg-surface)] p-4 border border-[var(--color-signal-cyan)]/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-space">Projects</h2>
              <button className="text-[var(--color-signal-cyan)] text-sm" onClick={() => setProjects([...projects, {}])}>+ Add</button>
            </div>
            <div className="space-y-4">
              {projects.map((proj, index) => (
                <div key={proj.id || index} className="border border-[#333] p-3 space-y-2">
                  <button type="button" className="text-xs text-amber-400" onClick={() => setProjects(projects.filter((_, i) => i !== index))}>Remove</button>
                  <div className="flex justify-between items-center">
                    <input type="text" value={proj.title || ''} onChange={(e) => updateProject(index, 'title', e.target.value)} className="w-full bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none text-sm mr-2" placeholder="Project Title" />
                    <button 
                      onClick={() => handleEnhanceProject(index)} 
                      className="text-xs bg-[#2A2D35] text-[var(--color-signal-cyan)] px-2 py-1 whitespace-nowrap hover:bg-[#333] transition-colors border border-[var(--color-signal-cyan)]/30 rounded-[2px]"
                    >
                      o" AI Enhance
                    </button>
                  </div>
                  <textarea value={proj.description || ''} onChange={(e) => updateProject(index, 'description', e.target.value)} className="w-full bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none text-sm h-24" placeholder="Description"></textarea>
                  <input value={Array.isArray(proj.tech_stack) ? proj.tech_stack.join(', ') : proj.tech_stack || ''} onChange={e => updateProject(index, 'tech_stack', e.target.value)} className="w-full bg-transparent border border-[#333] p-2 text-sm" placeholder="Technologies (comma separated)" />
                  <input value={proj.github_link || ''} onChange={e => updateProject(index, 'github_link', e.target.value)} className="w-full bg-transparent border border-[#333] p-2 text-sm" placeholder="GitHub URL" />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[var(--color-bg-surface)] p-4 border border-[var(--color-signal-cyan)]/20">
            <div className="flex justify-between items-center mb-4"><h2 className="font-space">Certifications</h2><button className="text-[var(--color-signal-cyan)] text-sm" onClick={() => setCertifications([...certifications, {}])}>+ Add</button></div>
            {certifications.map((cert, index) => <div key={cert.id || index} className="border border-[#333] p-3 space-y-2"><button type="button" className="text-xs text-amber-400" onClick={() => setCertifications(certifications.filter((_, i) => i !== index))}>Remove</button><input value={cert.name || ''} onChange={e => setCertifications(certifications.map((row, i) => i === index ? {...row, name: e.target.value} : row))} className="w-full bg-transparent border border-[#333] p-2" placeholder="Certification name" /><input value={cert.issuer || ''} onChange={e => setCertifications(certifications.map((row, i) => i === index ? {...row, issuer: e.target.value} : row))} className="w-full bg-transparent border border-[#333] p-2" placeholder="Issuer" /></div>)}
          </section>
          
          <section className="bg-[var(--color-bg-surface)] p-4 border border-[var(--color-signal-cyan)]/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-space">Skills</h2>
              <button className="text-[var(--color-signal-cyan)] text-sm" onClick={() => setSkills([...skills, ''])}>+ Add</button>
            </div>
            <div className="space-y-2">
              {skills.map((skill, index) => (
                <input key={index} type="text" value={typeof skill === 'object' ? skill.name : skill} onChange={(e) => updateSkill(index, e.target.value)} className="w-full bg-transparent border border-[#333] p-2 focus:border-[var(--color-signal-cyan)] outline-none text-sm" placeholder="Skill" />
              ))}
            </div>
          </section>

          <section className="bg-[var(--color-bg-surface)] p-4 border border-[var(--color-signal-cyan)]/20 rounded-xl">
            <div className="flex justify-between items-center gap-3 mb-2">
              <div><h2 className="font-space">Additional information</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">Optional sections such as awards, languages, publications, or volunteering.</p></div>
              <button type="button" className="rounded-lg border border-[var(--color-signal-cyan)]/30 px-3 py-2 text-sm text-[var(--color-signal-cyan)] hover:bg-[var(--color-signal-cyan)]/10" onClick={() => setAdditionalInfo(current => [...current, { title: '', content: '' }])}>+ Add section</button>
            </div>
            <div className="space-y-3">
              {additionalInfo.map((section, index) => (
                <div key={section.id || index} className="rounded-lg border border-[#333] p-3 space-y-2">
                  <div className="flex justify-end"><button type="button" className="text-xs text-amber-300" onClick={() => setAdditionalInfo(current => current.filter((_, i) => i !== index))}>Remove section</button></div>
                  <input value={section.title || ''} onChange={e => updateAdditionalInfo(index, 'title', e.target.value)} className="w-full rounded-lg bg-transparent border border-[#333] p-2 text-sm" placeholder="Section title (for example, Languages)" />
                  <textarea value={section.content || ''} onChange={e => updateAdditionalInfo(index, 'content', e.target.value)} className="w-full rounded-lg bg-transparent border border-[#333] p-2 text-sm" rows="3" placeholder="Add details" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* RIGHT COLUMN - PREVIEW */}
      <div className="builder-preview p-5 lg:p-8 bg-[var(--color-bg-surface)]">
        {templateId === 'original' && originalFile ? (
          <div className="resume-original-shell mx-auto w-full max-w-[900px] overflow-hidden rounded-2xl border border-white/10 bg-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-slate-800">
              <div><p className="font-semibold">Original uploaded resume</p><p className="text-xs text-slate-500">Your source file is preserved. Choose a designed template above whenever you want a refreshed layout.</p></div>
              <button type="button" onClick={downloadOriginalFile} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">Download original</button>
            </div>
            {originalFile.mime_type === 'application/pdf'
              ? <iframe ref={element => { originalPreviewRef.current = element; if (element && originalFileUrlRef.current) element.src = originalFileUrlRef.current; }} title="Original uploaded resume" className="h-[calc(100vh-130px)] min-h-[700px] w-full" />
              : <div className="p-10 text-center text-slate-700"><h2 className="text-xl font-semibold">Your original DOCX is preserved</h2><p className="mt-2">Download the source file or choose a designed template to edit the extracted content.</p></div>}
          </div>
        ) : <div ref={componentRef} className={`resume-sheet resume-template-${templateId} bg-white text-black ${templateId === 'compact' ? 'p-6 text-sm' : 'p-8'} shadow-xl min-h-[842px] max-w-[595px] mx-auto rounded-sm`}>
          <header className={`resume-header border-b-2 pb-3 mb-4 ${templateId === 'modern' ? 'text-left' : 'text-center'}`}>
            {personalInfo.profile_photo_data && <img src={personalInfo.profile_photo_data} alt="Profile" className={`resume-photo ${templateId === 'modern' ? 'resume-photo-square' : ''}`} />}
            <h1 className="resume-name text-3xl font-bold uppercase tracking-wider">{personalInfo.full_name || 'Your Name'}</h1>
            <div className="text-sm text-gray-600 mt-1 space-x-2">
              {personalInfo.email && <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a>}
              {personalInfo.phone && <a href={`tel:${personalInfo.phone}`}>{personalInfo.phone}</a>}
            </div>
            {profileLinks.length > 0 && <nav aria-label="Profile links" className="resume-profile-links text-xs mt-2">{profileLinks.map(link => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</nav>}
          </header>

          {(resume.mongo_content?.content?.summary || '').trim() && <section className="resume-section mb-4"><h2 className="resume-section-title text-lg font-bold uppercase border-b border-gray-400 mb-2">Summary</h2><p className="text-sm whitespace-pre-line">{resume.mongo_content.content.summary}</p></section>}

          <div className="mb-4">
            <h2 className="resume-section-title text-lg font-bold uppercase border-b border-gray-400 mb-2">Education</h2>
            {education.length === 0 ? (
              <p className="text-gray-400 text-sm italic">Add education entries...</p>
            ) : (
              <div className="space-y-3">
                {education.map((edu, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-bold">{edu.institution || 'Institution'}</div>
                    <div className="text-gray-700">{edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mb-4">
            <h2 className="resume-section-title text-lg font-bold uppercase border-b border-gray-400 mb-2">Experience</h2>
            {experience.length === 0 ? (
              <p className="text-gray-400 text-sm italic">Add experience entries...</p>
            ) : (
              <div className="space-y-3">
                {experience.map((exp, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-bold">{(exp.role || 'Role')} - {(exp.company || 'Company')}</div>
                    <p className="text-gray-700 whitespace-pre-line">{exp.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <h2 className="resume-section-title text-lg font-bold uppercase border-b border-gray-400 mb-2">Projects</h2>
            {projects.length === 0 ? (
              <p className="text-gray-400 text-sm italic">Add project entries...</p>
            ) : (
              <div className="space-y-3">
                {projects.map((proj, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-bold">{proj.title || 'Project Title'}</div>
                    <p className="text-gray-700 whitespace-pre-line">{proj.description}</p>
                    {proj.tech_stack && <div className="text-xs text-gray-500 mt-1">Tech: {Array.isArray(proj.tech_stack) ? proj.tech_stack.join(', ') : proj.tech_stack}</div>}
                    {safeExternalUrl(proj.github_link) && <a className="resume-project-link" href={safeExternalUrl(proj.github_link)} target="_blank" rel="noreferrer">Project link</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <h2 className="resume-section-title text-lg font-bold uppercase border-b border-gray-400 mb-2">Skills</h2>
            {skills.length === 0 ? (
              <p className="text-gray-400 text-sm italic">Add skills...</p>
            ) : (
              <p className="text-sm text-gray-700">
                {skills.map(s => typeof s === 'object' ? s.name : s).join(' - ')}
              </p>
            )}
          </div>
          {certifications.length > 0 && <section className="resume-section mb-4"><h2 className="resume-section-title text-lg font-bold uppercase border-b border-gray-400 mb-2">Certifications</h2>{certifications.map((cert, i) => <div key={cert.id || i} className="text-sm">{cert.name}{cert.issuer ? ` — ${cert.issuer}` : ''}</div>)}</section>}
          {additionalInfo.filter(section => section.title?.trim() && section.content?.trim()).map((section, i) => <section className="resume-section mb-4" key={section.id || i}><h2 className="resume-section-title text-lg font-bold uppercase border-b border-gray-400 mb-2">{section.title}</h2><p className="text-sm whitespace-pre-line">{section.content}</p></section>)}
        </div>}
      </div>
    </div>
  );
};

export default ResumeBuilder;

