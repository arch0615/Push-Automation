# Go-Live Checklist

Steps required before the system can send real push notifications to end users. Complete in order.

---

## 1. Pending from client (Julio)

- [ ] **iZooto REST API keys** for all 3 sites — delivered via secure channel
- [ ] **DNS A record** `pushudc.top → 159.223.125.78` — added at domain registrar
- [ ] **DNS A record** `www.pushudc.top → 159.223.125.78`
- [ ] **Confirmation of IP whitelisting** in iZooto (Settings → API Key → 159.223.125.78)

## 2. Pending from ops

- [ ] Get **Anthropic API key** (or OpenAI) and add to `.env` as `AI_API_KEY`
- [ ] Change **`DASHBOARD_PASS`** in `.env` from `admin123` to a strong password
- [ ] Confirm Julio's/end-user's timezone matches `America/Sao_Paulo` setting

## 3. DNS + SSL setup (after DNS propagates)

```bash
# Verify DNS
dig +short pushudc.top
# Should return: 159.223.125.78

# Issue SSL certificate
certbot --nginx -d pushudc.top -d www.pushudc.top --non-interactive --agree-tos -m your-email@example.com

# Verify HTTPS
curl -I https://pushudc.top
```

## 4. Update app config

In the dashboard at **Configurações**:

- [ ] Set **URL pública do servidor** to `https://pushudc.top`
- [ ] Paste each site's REST API Key into the corresponding field and save
- [ ] Verify **horários de envio** match client's preference
- [ ] Leave **Disparar automaticamente** OFF for the first 2–3 days (manual approval while validating)

## 5. Initial smoke test

Once all keys are in place:

1. Log into dashboard
2. Create one test URL pointing to an unimportant page
3. Click **Disparar** — should show "sent" (not "mock")
4. Go to iZooto dashboard and confirm the campaign appears there
5. Click through the push on a test device and confirm CTR tracked after 30–60 min

## 6. Flip to fully automated

Once smoke test passes:

- [ ] Add all real URLs that should go into rotation
- [ ] Set `auto_approve = true` in Configurações
- [ ] Confirm scheduler is running: `pm2 logs push-automation | grep scheduler`
- [ ] Leave running for 48h and review CTR in dashboard

## 7. Hardening (recommended within first week)

- [ ] Set up a non-root user for the app (currently running as root)
- [ ] Configure UFW firewall to only allow 22, 80, 443
- [ ] Enable automated daily SQLite backup (cron → `scp data.db backup-host:`)
- [ ] Set up log rotation: `pm2 install pm2-logrotate`
- [ ] Rotate DigitalOcean SSH key away from password auth

---

## Rollback plan

If something goes wrong after go-live:

```bash
# Stop all sending immediately
pm2 stop push-automation

# Or just pause sending logic but keep dashboard up:
# Dashboard → Configurações → desligar "Disparar automaticamente"

# Roll back database to last backup:
cp data.db.bak data.db
pm2 restart push-automation
```

No user-visible push subscribers are stored in this system — iZooto holds that list. So the worst-case rollback is losing campaign history, not losing subscribers.
