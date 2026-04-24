# Push Notification Automation System — Project Plan

**Client:** Julio  
**Domain:** pushudc.top  
**VPS:** 159.223.125.78  
**Deadline:** 7 days from project start  
**Phase:** MVP using iZooto API  

---

## Overview

Build a fully automated push notification system that:
- Accepts manually added URLs (landing pages, offers)
- Uses AI to generate high-CTR copy in Brazilian Portuguese
- Mimics real app notifications (WhatsApp, Gmail, Facebook, Roblox, Banks)
- Runs A/B tests automatically and learns which templates perform best
- Sends daily at optimal times via the iZooto API
- Provides a Portuguese-language dashboard for control and reporting

---

## Daily Plan

### Day 1 — Environment Setup & iZooto Integration
**Goal:** Working server, confirmed iZooto API connection.

**Tasks:**
- Configure VPS (Node.js, PM2, Nginx, SSL via Let's Encrypt for pushudc.top)
- Initialize project repository and folder structure
- Install core dependencies: Express, Axios, node-cron, Sharp, Sequelize (SQLite for MVP)
- Authenticate with iZooto API and confirm: subscriber list access, campaign creation, send endpoint
- Create `.env` file with all credentials (iZooto API key, AI API key)
- Verify domain resolves correctly and HTTPS works

**Deliverable:** Server is live, iZooto API handshake confirmed, test campaign sent manually via API.

---

### Day 2 — URL Management Backend + AI Copy Pipeline
**Goal:** System can receive URLs and generate push notification copy using AI.

**Tasks:**
- Build REST API endpoints:
  - `POST /urls` — add a new URL with label, niche, and status
  - `GET /urls` — list all URLs
  - `PATCH /urls/:id` — pause/resume a URL
  - `DELETE /urls/:id` — remove a URL
- Build AI copy generation module:
  - Prompt engineering for each template type (WhatsApp, Gmail, Facebook, Roblox, Banks, Gifts)
  - Generate title (max 50 chars) + description (max 90 chars) per URL
  - Output 3 variations per URL per day (for A/B testing)
- Store generated copies in database with status `pending`

**Deliverable:** `POST /urls` + AI generation pipeline working end-to-end, output logged to console.

---

### Day 3 — Template Library & Image Builder
**Goal:** System generates notification images (icon + text overlay) for each push.

**Tasks:**
- Collect and store 15–20 app icons: WhatsApp, Gmail, Gmail with badge, Facebook, Facebook Messenger, Roblox, bank icons (generic), gift box, Instagram DM
- Build image composer using Sharp + Canvas:
  - Input: icon file + short label text (e.g. "Mensagem de Voz (0:13)")
  - Output: 256×256 PNG notification image
- Map each template type to its corresponding icon automatically
- Add endpoint `GET /images/:filename` to serve generated images
- Add icon upload endpoint for client to add new icons later: `POST /icons`

**Deliverable:** For every AI-generated copy, a matching notification image is auto-created and served via URL.

---

### Day 4 — A/B Testing Logic + Daily Scheduler
**Goal:** System sends daily pushes automatically, rotates variations, and tracks winners.

**Tasks:**
- Build scheduler using `node-cron`:
  - Runs at configurable times (default: 08:00, 12:00, 18:00 BRT)
  - For each active URL, picks the day's best unused variation
  - Creates and fires iZooto campaign via API
- Build A/B rotation logic:
  - Send variation A to 33%, B to 33%, C to 34% of subscribers (if iZooto API supports segmentation; otherwise rotate by day)
  - After 48h, mark the variation with highest CTR as `winner`
  - Next generation cycle uses the winner's style as base prompt input
- Store every sent campaign: URL, variation, send time, iZooto campaign ID

**Deliverable:** Scheduler fires automatically, creates iZooto campaigns, 3 variations rotate per URL.

---

### Day 5 — Portuguese Dashboard (Frontend)
**Goal:** Client-facing control panel, fully in Brazilian Portuguese.

**Tasks:**
- Build frontend using plain HTML + Tailwind CSS (no heavy framework, fast to ship)
- Pages / sections:
  - **Início (Home):** summary cards — total subscribers, pushes sent today, average CTR this week
  - **URLs:** table with URL label, niche, status (ativa/pausada), pushes sent, CTR — add/pause/delete actions
  - **Campanhas:** list of sent campaigns with template used, variation, CTR, send time
  - **Modelos:** icon library grid — upload new icon button
  - **Configurações:** daily send times, max sends per URL per day, auto-approve or manual review toggle
- Protect dashboard with simple login (username + password stored in `.env`)
- All labels, buttons, and messages in Portuguese

**Deliverable:** Dashboard accessible at `https://pushudc.top`, fully functional in Portuguese.

---

### Day 6 — CTR Tracking, Reporting & Learning Engine
**Goal:** System reads performance data back from iZooto and improves over time.

**Tasks:**
- Poll iZooto API every 6 hours for campaign stats (clicks, impressions, CTR)
- Store results in database per campaign record
- Build learning logic:
  - Per URL: track CTR by template type → weight next generation toward best-performing template
  - Per URL: track CTR by send time → shift scheduler toward best-performing hour
- Build reporting module:
  - Daily summary (auto-generated, shown on dashboard)
  - Weekly PDF or CSV export (triggered by button on dashboard)
- Add `GET /reports/weekly` API endpoint

**Deliverable:** Dashboard shows live CTR per URL and per template; system favors top-performing styles in next generation cycle.

---

### Day 7 — Integration Testing, Bug Fixes & Client Demo
**Goal:** Full end-to-end system is stable, tested, and handed off to client.

**Tasks:**
- Run full integration test (see Testing Plan below)
- Fix all critical bugs found during testing
- Write quick-start guide for client (in Portuguese): how to add URLs, read reports, upload icons
- Record a short screen walkthrough of the dashboard (optional but recommended)
- Deploy final version to VPS with PM2 process manager (auto-restart on crash)
- Hand off `.env` template and credential list to client securely

**Deliverable:** System live on pushudc.top, client can operate independently.

---

## Testing Plan

### 1. Unit Tests (Days 2–4)

| Module | What to Test |
|---|---|
| AI Copy Generator | Output contains title ≤50 chars, description ≤90 chars, no empty fields |
| Image Builder | Output is valid PNG, correct dimensions (256×256), icon is visible |
| A/B Rotator | 3 unique variations generated per URL, no duplicate copy |
| Scheduler | Fires at correct times, skips paused URLs, logs campaign ID |
| URL API | CRUD operations return correct HTTP status codes |

**Tool:** Jest (Node.js) — run with `npm test`

---

### 2. iZooto API Integration Tests (Day 4)

- Authenticate with real API key → expect 200
- Create a test campaign with generated copy + image → confirm campaign appears in iZooto dashboard
- Retrieve campaign stats after 1 hour → confirm CTR data is returned
- Attempt to send to a paused URL → confirm system skips it

---

### 3. End-to-End Test (Day 7)

Full flow run manually before handoff:

1. Log into dashboard at `https://pushudc.top`
2. Add 2 test URLs with different niches (e.g. finance + entertainment)
3. Trigger manual generation via dashboard button
4. Confirm 3 variations are created per URL with images
5. Trigger a manual send and verify campaign appears in iZooto
6. Wait 1 hour, check CTR is pulled back and displayed on dashboard
7. Verify scheduler fires at next scheduled time without manual trigger
8. Pause one URL — confirm next scheduler cycle skips it
9. Upload a new icon — confirm it appears in the model library
10. Export weekly report — confirm file downloads correctly

---

### 4. Manual QA Checklist (Day 7)

- [ ] Dashboard loads correctly on mobile and desktop
- [ ] All text is in Brazilian Portuguese with no English labels visible
- [ ] Login page blocks unauthenticated access
- [ ] Adding a URL with a missing field shows a validation error
- [ ] Pausing a URL immediately stops it from appearing in next scheduler cycle
- [ ] AI-generated copy never exceeds character limits
- [ ] Images render correctly in iZooto campaign preview
- [ ] System recovers gracefully if iZooto API is temporarily unavailable (retry logic)
- [ ] PM2 auto-restarts the process after a simulated crash (`pm2 kill` then check recovery)

---

## Folder Structure

```
/push-automation/
├── src/
│   ├── api/           # Express routes (urls, icons, reports)
│   ├── ai/            # AI copy generation prompts and logic
│   ├── images/        # Image builder (Sharp/Canvas)
│   ├── scheduler/     # node-cron jobs
│   ├── izooto/        # iZooto API client
│   ├── db/            # SQLite models (URL, Campaign, Icon)
│   └── learning/      # CTR tracking and weight engine
├── dashboard/         # Frontend HTML + Tailwind CSS
├── icons/             # Pre-loaded app icons
├── tests/             # Jest unit tests
├── .env               # Credentials (never committed)
├── pm2.config.js      # PM2 process config
└── package.json
```

---

## Budget Reference

| Cost | Monthly Estimate |
|---|---|
| VPS | ~$15–20/month |
| AI API (Claude or GPT) | ~$5–10/month |
| iZooto | Client's existing plan |
| **Total** | **~$30/month** |

---

## Notes

- Phase 2 (custom system from scratch, without iZooto) begins after MVP validation
- Phase 2 will replace iZooto with Web Push API (free, unlimited subscribers)
- Phase 2 will add a dedicated PostgreSQL database and Next.js dashboard
