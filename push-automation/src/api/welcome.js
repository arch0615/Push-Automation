const express = require('express');
const manager = require('../welcome/manager');

const router = express.Router();

router.get('/:siteId/steps', (req, res) => {
  const steps = manager.listStepsForSite(parseInt(req.params.siteId, 10));
  res.json(steps);
});

router.post('/:siteId/steps', (req, res) => {
  try {
    const step = manager.createStep(parseInt(req.params.siteId, 10), req.body || {});
    res.status(201).json(step);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/steps/:id', (req, res) => {
  const step = manager.updateStep(parseInt(req.params.id, 10), req.body || {});
  if (!step) return res.status(404).json({ error: 'Step not found' });
  res.json(step);
});

router.delete('/steps/:id', (req, res) => {
  const changes = manager.deleteStep(parseInt(req.params.id, 10));
  if (!changes) return res.status(404).json({ error: 'Step not found' });
  res.status(204).end();
});

router.post('/run-now', (req, res) => {
  res.json({ ok: true, message: 'Welcome cycle iniciado em segundo plano.' });
  setImmediate(async () => {
    try {
      const result = await manager.processDueWelcomes();
      console.log(`[welcome] run-now: processed=${result.processed} sent=${result.sent} failed=${result.failed} due_total=${result.due_total}`);
    } catch (e) {
      console.error('[welcome] run-now failed:', e.message);
    }
  });
});

module.exports = router;
