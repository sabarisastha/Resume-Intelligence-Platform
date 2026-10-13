import * as enhancerService from '../services/enhancerService.js';

export async function enhanceProjectDescription(req, res) {
  try {
    const { role_context } = req.body;
    const report = await enhancerService.enhanceProject(
      req.params.projectId, 
      req.user.id, 
      role_context
    );
    res.status(201).json(report);
  } catch (error) {
    console.error('[Enhancer Controller]', error);
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function enhanceJobDescription(req, res) {
  try {
    const { job_description } = req.body;
    if (!job_description) {
      return res.status(400).json({ message: 'job_description is required' });
    }
    if (job_description.length > 20000) return res.status(413).json({ message: 'Job description must be 20,000 characters or fewer' });
    const report = await enhancerService.enhanceJobDescriptionText(req.user.id, job_description);
    res.status(201).json(report);
  } catch (error) {
    console.error('[Enhancer Controller]', error);
    res.status(error.status || 500).json({ message: error.message });
  }
}
