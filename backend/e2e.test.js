import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { pool } from './src/config/db.js';
import { ResumeDocument, ATSReport, SimulationReport, ProjectEnhancement, JobDescription } from './src/models/mongo/index.js';

const api = axios.create({ baseURL: process.env.RIP_API_URL || 'http://localhost:5000/api', timeout: 60000 });
const email = `rip_e2e_${Date.now()}@example.com`;
const secondEmail = `rip_e2e_other_${Date.now()}@example.com`;
const resumeIds = [];
const userIds = [];
let token;
let otherToken;

test('RIP core resume and upload workflows persist data without Ollama', async () => {
  try {
    const registered = await api.post('/auth/register', { full_name: 'RIP E2E Candidate', email, password: 'password123' });
    token = registered.data.token;
    userIds.push(registered.data.user.id);
    assert.equal(registered.status, 201);
    assert.ok(token);
    const headers = { Authorization: `Bearer ${token}` };

    const login = await api.post('/auth/login', { email, password: 'password123' });
    assert.equal(login.status, 200);
    assert.ok(login.data.token);
    await assert.rejects(api.get('/resumes'));
    const unauthorized = await api.get('/resumes').catch(error => error.response);
    assert.equal(unauthorized.status, 401);

    const created = await api.post('/resumes', { title: 'Backend Candidate', targetRole: 'Backend Engineer' }, { headers });
    assert.equal(created.status, 201);
    const id = created.data.id;
    resumeIds.push(id);
    await api.put(`/resumes/${id}`, {
      title: 'Backend Candidate v2', target_role: 'Platform Engineer',
      personal_info: { full_name: 'RIP E2E Candidate', email }, summary: 'Built APIs and improved reliability.',
    }, { headers });
    await api.post(`/resumes/${id}/education`, { institution: 'National Engineering College', degree: 'B.E.', field_of_study: 'Information Technology' }, { headers });
    await api.put(`/resumes/${id}/skills`, { skills: ['Node.js', 'PostgreSQL'] }, { headers });
    const project = await api.post(`/resumes/${id}/projects`, { title: 'Resume Platform', description: 'Built a resume platform.', tech_stack: ['React', 'Node.js'], github_link: 'https://example.com/repo' }, { headers });
    await api.post(`/resumes/${id}/certifications`, { name: 'Backend Foundations', issuer: 'RIP E2E' }, { headers });

    const loaded = await api.get(`/resumes/${id}`, { headers });
    assert.equal(loaded.data.title, 'Backend Candidate v2');
    assert.equal(loaded.data.mongo_content.content.personal_info.full_name, 'RIP E2E Candidate');
    assert.equal(loaded.data.mongo_content.content.summary, 'Built APIs and improved reliability.');
    assert.deepEqual(loaded.data.mongo_content.content.skills.map(skill => skill.name).sort(), ['Node.js', 'PostgreSQL']);
    assert.equal(loaded.data.mongo_content.content.projects[0].title, 'Resume Platform');
    await api.put(`/resumes/${id}`, { template_id: 'compact' }, { headers });
    assert.equal((await api.get(`/resumes/${id}`, { headers })).data.mongo_content.template_config.template_id, 'compact');

    const education = await api.get(`/resumes/${id}/education`, { headers });
    await api.put(`/resumes/${id}/education/${education.data[0].id}`, { start_date: '2024-09-01' }, { headers });
    assert.ok((await api.get(`/resumes/${id}/education`, { headers })).data[0].start_date.startsWith('2024-09-01'));
    await api.put(`/resumes/${id}/education/${education.data[0].id}`, { start_date: null }, { headers });
    assert.equal((await api.get(`/resumes/${id}/education`, { headers })).data[0].start_date, null);
    await api.delete(`/resumes/${id}/education/${education.data[0].id}`, { headers });
    assert.equal((await api.get(`/resumes/${id}/education`, { headers })).data.length, 0);
    assert.equal((await api.get(`/resumes/${id}`, { headers })).data.mongo_content.content.education.length, 0);

    const other = await api.post('/auth/register', { full_name: 'Other Candidate', email: secondEmail, password: 'password123' });
    otherToken = other.data.token;
    userIds.push(other.data.user.id);
    const forbidden = await api.get(`/resumes/${id}`, { headers: { Authorization: `Bearer ${otherToken}` } }).catch(error => error.response);
    assert.equal(forbidden.status, 404);

    const invalidFile = new FormData();
    invalidFile.append('resume_file', Buffer.from('not a resume'), { filename: 'resume.txt', contentType: 'text/plain' });
    const invalidUpload = await api.post('/upload/resume', invalidFile, { headers: { ...invalidFile.getHeaders(), ...headers } }).catch(error => error.response);
    assert.equal(invalidUpload.status, 400);

    const form = new FormData();
    form.append('resume_file', fs.createReadStream(path.resolve('..', 'SABARISASTHA V.pdf')), {
      filename: 'SABARISASTHA V.pdf',
      contentType: 'application/pdf',
    });
    const start = Date.now();
    const upload = await api.post('/upload/resume', form, { headers: { ...form.getHeaders(), ...headers } });
    const uploadMs = Date.now() - start;
    resumeIds.push(upload.data.resumeId);
    assert.equal(upload.status, 201);
    assert.ok(uploadMs < 10000, `Upload took ${uploadMs}ms`);
    assert.equal(upload.data.data.personal_info.email, 'sabarimurugan530@gmail.com');
    assert.ok(upload.data.data.projects.length >= 5);
    assert.ok(upload.data.data.education.some(item => item.institution.includes('National Engineering College')));
    assert.ok(upload.data.data.experience.length >= 1);
    assert.ok(upload.data.data.skills.length >= 20);
    assert.ok(upload.data.data.certifications.length >= 1);
    const uploaded = await api.get(`/resumes/${upload.data.resumeId}`, { headers });
    assert.equal(uploaded.data.mongo_content.content.personal_info.full_name, upload.data.data.personal_info.full_name);
    assert.equal(uploaded.data.mongo_content.content.education.length, upload.data.data.education.length);
    assert.equal(uploaded.data.mongo_content.content.experience.length, upload.data.data.experience.length);
    assert.equal(uploaded.data.mongo_content.content.projects.length, upload.data.data.projects.length);
    assert.equal(uploaded.data.mongo_content.content.skills.length, upload.data.data.skills.length);
    assert.equal(uploaded.data.mongo_content.content.certifications.length, upload.data.data.certifications.length);
    await api.put(`/resumes/${upload.data.resumeId}`, { title: 'Imported Resume Reviewed', summary: 'Summary verified by the user.', personal_info: { ...upload.data.data.personal_info, full_name: 'Edited Candidate' } }, { headers });
    const refreshedImport = await api.get(`/resumes/${upload.data.resumeId}`, { headers });
    assert.equal(refreshedImport.data.title, 'Imported Resume Reviewed');
    assert.equal(refreshedImport.data.mongo_content.content.personal_info.full_name, 'Edited Candidate');
    assert.equal(refreshedImport.data.mongo_content.content.summary, 'Summary verified by the user.');

    const malformed = new FormData();
    malformed.append('resume_file', Buffer.from('%PDF-not-a-valid-document'), {
      filename: 'malformed.pdf',
      contentType: 'application/pdf',
    });
    const malformedResult = await api.post('/upload/resume', malformed, { headers: { ...malformed.getHeaders(), ...headers } }).catch(error => error.response);
    assert.equal(malformedResult.status, 422);
    const large = new FormData();
    large.append('resume_file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.pdf', contentType: 'application/pdf' });
    const largeResult = await api.post('/upload/resume', large, { headers: { ...large.getHeaders(), ...headers } }).catch(error => error.response);
    assert.equal(largeResult.status, 413);

    const aiStart = Date.now();
    const ats = await api.post(`/resumes/${id}/analyze`, { job_description: 'Seeking a Node.js engineer with PostgreSQL experience.' }, { headers }).catch(error => error.response);
    assert.ok([201, 502, 503, 504].includes(ats.status), `Unexpected AI service status: ${ats.status}`);
    if (ats.status === 201) assert.ok(ats.data.overall_score >= 0 && ats.data.overall_score <= 100);
    else assert.match(ats.data.message, /AI analysis is unavailable|AI returned an invalid/i);
    assert.ok(Date.now() - aiStart < 60000, 'AI failure exceeded the API timeout budget');

    for (const [label, request] of [
      ['JD analysis', () => api.post('/enhancer/jd', { job_description: 'Seeking a Node.js engineer.' }, { headers })],
      ['Project enhancement', () => api.post(`/projects/${project.data.id}/enhance`, { role_context: 'Backend Engineer' }, { headers })],
      ['Match simulation', () => api.post(`/resumes/${id}/simulate`, { job_description: 'Seeking a Node.js engineer.' }, { headers })],
    ]) {
      const response = await request().catch(error => error.response);
      assert.ok([201, 502, 503, 504].includes(response.status), `${label} failed without a controlled status: ${response.status}`);
      if (response.status !== 201) assert.ok(response.data.message);
    }
    await api.put(`/resumes/${id}/projects/${project.data.id}`, { description: null, github_link: null }, { headers });
    const changedProject = (await api.get(`/resumes/${id}/projects`, { headers })).data[0];
    assert.equal(changedProject.description, null);
    assert.equal(changedProject.github_link, null);
    await api.delete(`/resumes/${id}/projects/${project.data.id}`, { headers });
    assert.equal((await api.get(`/resumes/${id}/projects`, { headers })).data.length, 0);
  } finally {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    for (const id of resumeIds) await api.delete(`/resumes/${id}`, { headers }).catch(() => {});
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/rip_db').catch(() => {});
    if (mongoose.connection.readyState === 1) {
      await Promise.all([
        ResumeDocument.deleteMany({ pg_resume_id: { $in: resumeIds } }),
        ATSReport.deleteMany({ pg_resume_id: { $in: resumeIds } }),
        SimulationReport.deleteMany({ pg_resume_id: { $in: resumeIds } }),
        ProjectEnhancement.deleteMany({ pg_resume_id: { $in: resumeIds } }),
        JobDescription.deleteMany({ user_id: { $in: userIds } }),
      ]);
      await mongoose.disconnect();
    }
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [[email, secondEmail]]).catch(() => {});
    await pool.end();
  }
});
