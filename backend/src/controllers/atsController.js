import * as atsService from '../services/atsService.js';

export async function analyzeResume(req, res) {
  try {
    const { job_description } = req.body;
    if (!job_description) {
      return res.status(400).json({ message: 'job_description is required' });
    }
    if (job_description.length > 20000) return res.status(413).json({ message: 'Job description must be 20,000 characters or fewer' });

    // Takes a few seconds depending on hardware
    const report = await atsService.generateATSReport(
      req.params.resumeId, 
      req.user.id, 
      job_description
    );

    res.status(201).json(report);
  } catch (error) {
    console.error('[ATS Controller]', error);
    res.status(error.status || 500).json({ message: error.message });
  }
}
