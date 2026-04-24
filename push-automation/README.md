# Push Automation

Automated push notification system for iZooto. Generates AI-written copy and matching notification images, rotates A/B variations, sends at optimal times, and learns from CTR.

**Stack:** Node.js 20, Express, SQLite (better-sqlite3), Sharp, node-cron, Anthropic SDK, Tailwind CSS (CDN), PM2.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Nginx (80/443)                          │
│                           ↓                                 │
│                   Express on :3000                          │
│    ┌──────────┬──────────┬──────────┬──────────┐            │
│    │ /api/auth│ /api/urls│ /api/ca- │ /images  │            │
│    │          │          │ mpaigns  │          │            │
│    └──────────┴──────────┴──────────┴──────────┘            │
│           │         │         │         │                   │
│   SQLite (data.db)  │    Sharp (icons)  │                   │
│           │         │         │         │                   │
│    ┌──────▼─────────▼─────────▼─────────▼──────┐            │
│    │  Scheduler (node-cron)                    │            │
│    │  • Send cycle at 08:00/12:00/18:00 BRT    │            │
│    │  • CTR refresh every 6 hours              │            │
│    └───────────────────────────────────────────┘            │
│                           │                                 │
│                      ┌────▼────┐                            │
│                      │ iZooto  │                            │
│                      │ REST API│                            │
│                      └─────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory layout

```
push-automation/
├── index.js                    # Express app entry
├── ecosystem.config.js         # PM2 config
├── package.json
├── .env                        # secrets (not committed)
├── .env.example
├── data.db                     # SQLite database
├── src/
│   ├── api/
│   │   ├── auth.js             # cookie session auth
│   │   ├── urls.js             # sites + URLs CRUD + generate
│   │   ├── images.js           # icon upload + image serving
│   │   ├── settings.js         # app-level settings K/V
│   │   ├── campaigns.js        # list + manual send
│   │   └── reports.js          # summary, insights, CSV
│   ├── ai/
│   │   ├── templates.js        # 16 notification templates
│   │   └── generate.js         # Claude-powered copywriter
│   ├── images/
│   │   ├── iconSpecs.js        # placeholder icon palette
│   │   ├── generateIcons.js    # one-shot icon builder
│   │   └── composer.js         # per-copy image producer
│   ├── izooto/
│   │   └── client.js           # iZooto REST API wrapper
│   ├── scheduler/
│   │   ├── cron.js             # node-cron registration
│   │   └── sender.js           # rotation + send logic
│   ├── learning/
│   │   ├── tracker.js          # CTR polling
│   │   └── engine.js           # weighted template selection
│   └── db/
│       ├── database.js         # schema + migrations
│       └── seed.js             # seed iZooto sites
├── dashboard/
│   ├── index.html              # SPA shell (PT-BR)
│   ├── login.html              # login page (PT-BR)
│   └── app.js                  # dashboard logic
├── icons/                      # app icon library (PNG, 256×256)
└── generated/                  # per-copy notification images
```

---

## Data model

| Table | Purpose |
|---|---|
| `sites` | iZooto properties (domain, App ID, REST API key) |
| `urls` | Landing pages registered per site (status, daily_limit, niche) |
| `copies` | AI-generated copy variations per URL (title, description, template, image_filename) |
| `campaigns` | Sent pushes (iZooto campaign ID, impressions, clicks, CTR) |
| `settings` | K/V for send times, timezone, public URL, auto-approve |

---

## Environment variables

See [`.env.example`](.env.example). The REST API keys per site are stored in DB, not `.env`.

---

## Running

```bash
# Install deps
npm install

# Seed sites into DB (one-time)
node src/db/seed.js

# Generate icon library (one-time)
node src/images/generateIcons.js

# Start in production
pm2 start ecosystem.config.js
pm2 save

# Logs
pm2 logs push-automation

# Restart
pm2 restart push-automation

# Stop
pm2 stop push-automation
```

---

## Nginx

Config is at `/etc/nginx/sites-available/pushudc`. SSL is managed by certbot. To renew: `certbot renew` (auto runs via systemd timer).

---

## Key API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | no | Login, sets cookie |
| POST | `/api/auth/logout` | yes | Clear session |
| GET | `/api/auth/me` | no | Check auth state |
| GET | `/api/urls/sites` | yes | List sites + `has_api_key` |
| PATCH | `/api/urls/sites/:id` | yes | Save REST API key |
| CRUD | `/api/urls` | yes | Manage URLs |
| POST | `/api/urls/:id/generate` | yes | Generate N variations |
| GET | `/api/campaigns` | yes | List sent campaigns |
| POST | `/api/campaigns/send-now` | yes | Full cycle across active URLs |
| POST | `/api/campaigns/send-url/:id` | yes | Send one URL immediately |
| GET | `/api/reports/summary` | yes | Totals + daily chart |
| GET | `/api/reports/url/:id/insights` | yes | Per-URL best template/hour |
| GET | `/api/reports/export.csv` | yes | CSV download |
| POST | `/api/reports/refresh-ctr` | yes | Force CTR poll |
| GET/PATCH | `/api/settings` | yes | Global settings |
| CRUD | `/images/icons` | yes (write) | Icon library |
| GET | `/images/generated/:file` | no | Notification images (iZooto fetches these) |

---

## Learning engine

Each URL keeps running CTR per template. Next cycle picks templates with weighted probability proportional to their Bayesian-smoothed CTR. Templates with no history start at prior CTR 1% — they compete but don't dominate. Min 50 impressions before a template is marked "reliable".

```
adjusted_ctr = (clicks + prior_clicks) / (impressions + prior_weight) × 100
```

Where `prior_clicks = 0.2`, `prior_weight = 20`.

---

## Swapping from MVP to Phase 2

The iZooto client is isolated in `src/izooto/client.js`. To replace with Web Push API:

1. Drop in a new `src/webpush/client.js` with the same `sendCampaign(apiKey, opts)` signature
2. Update `src/scheduler/sender.js` to require the new module
3. Add a `subscribers` table + subscription-registration endpoint
4. Add `service-worker.js` to the dashboard for browser subscription

Everything else (AI pipeline, image composer, scheduler, learning, dashboard, reporting) is vendor-agnostic.
