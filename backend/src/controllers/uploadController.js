import { extractText } from '../utils/fileParser.js';
import * as resumeService from '../services/resumeService.js';

const SECTION_NAMES = {
  summary: ['summary', 'professional summary', 'profile', 'objective'],
  education: ['education', 'academic background'],
  skills: ['skills', 'technical skills', 'core competencies'],
  experience: ['experience', 'work experience', 'employment'],
  projects: ['projects', 'personal projects', 'academic projects'],
  certifications: ['certifications', 'certificates'],
};

export function extractStructuredResume(rawText) {
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = rawText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || '';
  const name = lines.find(line => line.length <= 80 && !/@|https?:\/\/|\d{3}/.test(line) && !/resume|curriculum vitae/i.test(line)) || '';
  const sections = {};
  let current = '';
  for (const line of lines) {
    const normalized = line.replace(/[:\-–]+$/, '').toLowerCase();
    const section = Object.entries(SECTION_NAMES).find(([, labels]) => labels.includes(normalized))?.[0];
    if (section) { current = section; sections[current] = []; continue; }
    if (/^(achievements|interests|technical skills|languages|tools|web|databases|concepts)$/i.test(normalized)) {
      current = normalized === 'technical skills' ? 'skills' : '';
      if (current) sections[current] ||= [];
      continue;
    }
    if (current) sections[current].push(line);
  }

  const sectionText = key => (sections[key] || []).join('\n').trim();
  const skills = sectionText('skills').split(/\r?\n/).flatMap(line => (line.includes(':') ? line.slice(line.indexOf(':') + 1) : line).split(/,(?![^()]*\))|[;|•]+/)).map(value => value.trim()).filter(value => value && value.length <= 100);
  const bullets = text => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const dateRange = text => {
    const range = text.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})\s*[–-]\s*((?:Present)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})/i);
    const format = value => value?.match(/\d{4}/)?.[0] + (value?.match(/\d{4}/) && !/^\d{4}$/.test(value.trim()) ? `-${String(new Date(`${value} 1`).getMonth() + 1).padStart(2, '0')}` : '');
    return range ? { start_date: format(range[1]), end_date: /^present$/i.test(range[2]) ? null : format(range[2]), is_current: /^present$/i.test(range[2]) } : { start_date: null, end_date: null, is_current: false };
  };
  const education = bullets(sectionText('education')).filter(line => /[—–-]/.test(line)).map(line => {
    const parts = line.match(/^(.+?)\s+[—–-]\s+(.+)$/);
    const degreeText = parts?.[1] || line;
    const right = parts?.[2] || '';
    const dates = dateRange(right);
    const institution = right.replace(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}.*$/i, '').trim();
    const degreeParts = degreeText.split(/\s+in\s+/i);
    return { institution: institution.slice(0, 200), degree: degreeParts[0] || '', field_of_study: degreeParts[1] || '', start_date: dates.start_date, end_date: dates.end_date, grade: sectionText('education').match(/(?:CGPA|GPA):\s*([\d.]+(?:\s*\/\s*[\d.]+)?)/i)?.[1]?.slice(0, 20) || '' };
  });
  const parseEntries = key => {
    const entries = []; let active = null;
    for (const line of bullets(sectionText(key))) {
      const isBullet = /^[•*-]/.test(line);
      const hasHeaderSeparator = /\s+[—–]\s+/.test(line);
      if ((!isBullet && hasHeaderSeparator) || (!isBullet && !active)) { active = { heading: line.replace(/^[•*-]\s*/, ''), details: [] }; entries.push(active); }
      else if (active) active.details.push(line.replace(/^[•*-]\s*/, ''));
    }
    return entries;
  };
  const experience = parseEntries('experience').map(({ heading, details }) => {
    const parts = heading.match(/^(.+?)\s+[—–]\s+(.+)$/);
    const role = parts?.[1] || heading;
    const companyWithDate = parts?.[2] || '';
    const dates = dateRange(companyWithDate);
    const company = companyWithDate.replace(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}.*$/i, '').trim();
    return { company: company.slice(0, 200), role: role.slice(0, 150), ...dates, description: details.join(' ') };
  });
  const projects = parseEntries('projects').map(({ heading, details }) => {
    const segments = heading.split(/\s+[—–]\s+/);
    const tech = (segments.slice(2).join(' ').match(/(?:React(?:\.js)?|Node\.js|MongoDB|Express(?:\.js)?|Python|Java|C\+\+?|SQL|PostgreSQL|MySQL|Spring Boot|n8n|Meta Graph API|Google Apps Script)/gi) || []);
    const metadata = segments.slice(1).join(' ');
    return { title: (segments[0] || '').slice(0, 200), description: [metadata, ...details].filter(Boolean).join(' '), tech_stack: [...new Set(tech)] };
  });
  const certifications = sectionText('certifications').split(/\s*[·•|]\s*/).map(entry => entry.trim()).filter(Boolean).map(name => ({ name: name.slice(0, 200), issuer: '', issue_date: null }));

  return {
    personal_info: { full_name: name, email, phone },
    summary: sectionText('summary'), education, experience, projects, skills, certifications,
  };
}

export async function uploadResume(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const rawText = await extractText(req.file.buffer, req.file.mimetype);
    
    if (!rawText || rawText.length < 50) {
      return res.status(400).json({ message: 'Could not extract sufficient text from document' });
    }
    
    // Deterministic extraction keeps upload available when local AI is unavailable.
    const data = extractStructuredResume(rawText);
    const resume = await resumeService.createResumeFromImport(req.user.id, data, req.file);
    res.status(201).json({ message: 'Resume extracted and saved', resumeId: resume.id, data });
  } catch (error) {
    console.error('[UploadController] Error:', error);
    res.status(error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500)).json({ message: error.message || 'An unexpected error occurred during upload' });
  }
}
