require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('./src/db/database');

const authRouter = require('./src/api/auth');
const urlsRouter = require('./src/api/urls');
const imagesRouter = require('./src/api/images');
const settingsRouter = require('./src/api/settings');
const campaignsRouter = require('./src/api/campaigns');
const reportsRouter = require('./src/api/reports');
const pushRouter = require('./src/api/push');
const welcomeRouter = require('./src/api/welcome');
const scheduler = require('./src/scheduler/cron');

const { requireAuth } = authRouter;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dashboard')));

app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/urls', requireAuth, urlsRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/campaigns', requireAuth, campaignsRouter);
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/welcome', requireAuth, welcomeRouter);
app.use('/api/push', pushRouter);
app.use('/images', imagesRouter);

const schedulerInfo = scheduler.start();
console.log('[startup] Scheduler:', schedulerInfo);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Push Automation running on port ${PORT}`));
