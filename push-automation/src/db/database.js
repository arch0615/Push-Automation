const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,
    app_id TEXT NOT NULL,
    api_key TEXT,
    daily_target INTEGER NOT NULL DEFAULT 0,
    active_window_start TEXT NOT NULL DEFAULT '08:00',
    active_window_end TEXT NOT NULL DEFAULT '22:00',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    label TEXT NOT NULL,
    niche TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'pt-BR',
    status TEXT NOT NULL DEFAULT 'ativa',
    daily_limit INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS copies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url_id INTEGER NOT NULL,
    template TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_filename TEXT,
    variation INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    language TEXT NOT NULL DEFAULT 'pt-BR',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    copy_id INTEGER NOT NULL,
    izooto_campaign_id TEXT,
    sent_at DATETIME,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr REAL DEFAULT 0,
    FOREIGN KEY (copy_id) REFERENCES copies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    country TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    subscriber_id INTEGER,
    site_id INTEGER,
    ip TEXT,
    user_agent TEXT,
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS welcome_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    step_order INTEGER NOT NULL,
    delay_minutes INTEGER NOT NULL,
    template TEXT NOT NULL,
    label TEXT NOT NULL,
    landing_url TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    language TEXT NOT NULL DEFAULT 'pt-BR',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS welcome_sent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id INTEGER NOT NULL,
    step_id INTEGER NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscriber_id, step_id),
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES welcome_steps(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS welcome_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    step_id INTEGER,
    ip TEXT,
    user_agent TEXT,
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS examples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    image_filename TEXT NOT NULL,
    title TEXT,
    description TEXT,
    label TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_urls_site ON urls(site_id);
  CREATE INDEX IF NOT EXISTS idx_copies_url ON copies(url_id);
  CREATE INDEX IF NOT EXISTS idx_campaigns_copy ON campaigns(copy_id);
  CREATE INDEX IF NOT EXISTS idx_subscribers_site ON subscribers(site_id);
  CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(active);
  CREATE INDEX IF NOT EXISTS idx_clicks_campaign ON clicks(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_welcome_steps_site ON welcome_steps(site_id);
  CREATE INDEX IF NOT EXISTS idx_welcome_sent_sub ON welcome_sent(subscriber_id);
  CREATE INDEX IF NOT EXISTS idx_welcome_sent_step ON welcome_sent(step_id);
  CREATE INDEX IF NOT EXISTS idx_welcome_clicks_step ON welcome_clicks(step_id);
  CREATE INDEX IF NOT EXISTS idx_examples_site ON examples(site_id);
`);

const defaultSettings = {
  send_times: '08:00,12:00,18:00',
  timezone: 'America/Sao_Paulo',
  public_base_url: 'https://pushudc.top',
  auto_approve: 'true',
  delivery_provider: 'webpush',
  daily_target: '0',
  active_window_start: '08:00',
  active_window_end: '22:00',
  tracking_params: 'utm_source=push&utm_medium=notification',
  ai_provider: 'openai',
};
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(defaultSettings)) insertSetting.run(k, v);

module.exports = db;
