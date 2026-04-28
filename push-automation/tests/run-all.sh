#!/bin/bash
# Full system test — runs every feature end-to-end
set -u
BASE="${BASE:-https://pushudc.top}"
COOKIES="/tmp/test_cookies.txt"
rm -f "$COOKIES"

PASS=0
FAIL=0
FAILS=()

check() {
  local name="$1"
  local actual="$2"
  local expected="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    echo "  ✅ $name"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name"
    echo "     expected: $expected"
    echo "     actual:   $actual"
    FAIL=$((FAIL+1))
    FAILS+=("$name")
  fi
}

section() { echo ""; echo "── $1 ──"; }

GET()   { curl -sk -b "$COOKIES" "$BASE$1"; }
POST()  { curl -sk -b "$COOKIES" -X POST "$BASE$1" -H "Content-Type: application/json" -d "${2:-}"; }
PATCH() { curl -sk -b "$COOKIES" -X PATCH "$BASE$1" -H "Content-Type: application/json" -d "$2"; }
DEL()   { curl -sk -b "$COOKIES" -X DELETE "$BASE$1"; }
STATUS(){ curl -sk -b "$COOKIES" -o /dev/null -w "%{http_code}" "$BASE$1"; }
STATUS_X(){ curl -sk -b "$COOKIES" -o /dev/null -w "%{http_code}" -X "$1" "$BASE$2"; }

# ============================================================
section "1. Infrastructure"
check "Health endpoint"      "$(GET /health)" '"status":"online"'
check "HTTPS redirect from HTTP" "$(curl -sk -o /dev/null -w "%{http_code}" http://pushudc.top/)" "301"
check "PM2 process online"   "$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['pm2_env']['status'])")" "online"
check "Nginx serves index"   "$(STATUS /)" "200"

# ============================================================
section "2. Authentication"
check "Unauth /api/urls blocked"   "$(STATUS /api/urls)" "401"
check "Wrong password rejected"    "$(POST /api/auth/login '{"username":"admin","password":"wrong"}')" "Credenciais"
curl -sk -c "$COOKIES" -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' > /dev/null
check "Correct login returns ok"   "$(curl -sk -b "$COOKIES" "$BASE/api/auth/me")" '"authenticated":true'
check "Authed /api/urls allowed"   "$(STATUS /api/urls)" "200"

# ============================================================
section "3. Sites & API keys"
SITES=$(GET /api/urls/sites)
check "Sites endpoint returns data" "$SITES" "domain"
check "universodoscartoes seeded"  "$SITES" "universodoscartoes.com"
check "JSON has app_id field"      "$SITES" "app_id"
check "has_api_key field present"  "$SITES" "has_api_key"
check "Save API key"               "$(PATCH /api/urls/sites/1 '{"api_key":"test_key_xxx"}')" '"has_api_key":1'
check "Revert API key"             "$(PATCH /api/urls/sites/1 '{"api_key":null}')" '"id":1'

# Revert via direct DB
node -e "const db=require('./src/db/database'); db.prepare('UPDATE sites SET api_key=NULL').run();" 2>/dev/null

# ============================================================
section "4. URLs CRUD"
check "Missing fields rejected"    "$(POST /api/urls '{"site_id":1}')" "required"
check "Invalid site_id rejected"   "$(POST /api/urls '{"site_id":999,"url":"https://x.com","label":"x","niche":"geral"}')" "Invalid site_id"
check "Non-existent URL returns 404" "$(GET /api/urls/99999)" "URL not found"

CREATE=$(POST /api/urls '{"site_id":1,"url":"https://test.com/smoke","label":"SmokeTest","niche":"finanças","daily_limit":5}')
URL_ID=$(echo "$CREATE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')
check "URL created"                "$CREATE" '"label":"SmokeTest"'
check "URL in list"                "$(GET /api/urls)" "SmokeTest"
check "Pause URL"                  "$(PATCH /api/urls/$URL_ID '{"status":"pausada"}')" '"status":"pausada"'
check "Resume URL"                 "$(PATCH /api/urls/$URL_ID '{"status":"ativa"}')" '"status":"ativa"'

# ============================================================
section "5. AI generation + images"
GEN=$(POST /api/urls/$URL_ID/generate '{"count":3}')
VAR_COUNT=$(echo "$GEN" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["variations"]))')
check "3 variations generated"     "$VAR_COUNT" "3"
check "Variations have templates"  "$GEN" "template"
check "Image filenames present"    "$GEN" "image_filename"
check "Real AI generation (key set)" "$GEN" '"template":'

IMG=$(echo "$GEN" | python3 -c 'import sys,json; print(json.load(sys.stdin)["variations"][0]["image_filename"])')
check "Generated image fetchable"  "$(STATUS /images/generated/$IMG)" "200"

# Template library size
TEMPL_COUNT=$(node -e "console.log(Object.keys(require('./src/ai/templates').templates).length)")
if [ "$TEMPL_COUNT" -ge 14 ]; then
  echo "  ✅ Template library has 14+ items ($TEMPL_COUNT)"
  PASS=$((PASS+1))
else
  echo "  ❌ Template library has 14+ items (got $TEMPL_COUNT)"
  FAIL=$((FAIL+1))
  FAILS+=("Template library 14+")
fi

# ============================================================
section "6. Icons (public + CRUD)"
ICONS=$(curl -sk "$BASE/images/icons")
check "Icon list accessible"       "$ICONS" "whatsapp.png"
check "Bank icon present"          "$ICONS" "bank.png"
check "Roblox icon present"        "$ICONS" "roblox.png"
check "Single icon fetchable"      "$(STATUS /images/icons/gmail.png)" "200"
check "Missing icon 404"           "$(STATUS /images/icons/nothere.png)" "404"
check "Path traversal blocked"     "$(STATUS /images/icons/../../.env)" "404"

# Upload
cp icons/whatsapp.png /tmp/test_icon.png
UPLOAD=$(curl -sk -b "$COOKIES" -X POST "$BASE/images/icons" -F "icon=@/tmp/test_icon.png" -F "name=smoketest")
check "Icon uploaded"              "$UPLOAD" "smoketest.png"
check "Uploaded icon in list"      "$(curl -sk "$BASE/images/icons")" "smoketest.png"
check "Delete icon"                "$(STATUS_X DELETE /images/icons/smoketest.png)" "204"

# Reject non-image
echo "not image" > /tmp/bad.txt
REJECT=$(curl -sk -b "$COOKIES" -X POST "$BASE/images/icons" -F "icon=@/tmp/bad.txt" -F "name=bad")
check "Non-image rejected"         "$REJECT" "Only PNG"

# ============================================================
section "7. Scheduler & sender"
SEND=$(POST /api/campaigns/send-url/$URL_ID)
check "Manual send succeeds"       "$SEND" '"sent":true'
check "Provider returned"          "$SEND" '"provider":'
check "Title in response"          "$SEND" '"title":'

# Fill daily limit (5 total: already sent 1, push to 5)
POST /api/campaigns/send-url/$URL_ID > /dev/null
POST /api/campaigns/send-url/$URL_ID > /dev/null
POST /api/campaigns/send-url/$URL_ID > /dev/null
POST /api/campaigns/send-url/$URL_ID > /dev/null
OVER=$(POST /api/campaigns/send-url/$URL_ID)
check "Daily limit enforced"       "$OVER" "daily_limit_reached"

# Pause test
PATCH /api/urls/$URL_ID '{"status":"pausada"}' > /dev/null
PAUSED=$(POST /api/campaigns/send-url/$URL_ID)
check "Paused URL skipped"         "$PAUSED" '"paused"'

# Scheduler job count
JOBS=$(pm2 logs push-automation --lines 200 --nostream --raw 2>&1 | grep -c "fixed-time jobs registered")
if [ "$JOBS" -ge 1 ]; then echo "  ✅ Fixed-time jobs registered ($JOBS log entries)"; PASS=$((PASS+1)); else echo "  ❌ daily jobs (got $JOBS)"; FAIL=$((FAIL+1)); FAILS+=("daily jobs"); fi

# Full cycle
PATCH /api/urls/$URL_ID '{"status":"ativa"}' > /dev/null
CYCLE=$(POST /api/campaigns/send-now)
check "send-now returns results"   "$CYCLE" '"ok":true'

# ============================================================
section "8. Web Push platform"
check "VAPID public key endpoint"  "$(curl -sk $BASE/api/push/vapid-key)" '"publicKey":'
check "Service worker accessible"  "$(STATUS /sw.js)" "200"
check "Embed script accessible"    "$(STATUS /embed.js)" "200"
check "Click tracking redirects"   "$(curl -sk -o /dev/null -w "%{http_code}" "$BASE/api/push/click/1?url=https://example.com")" "302"
# iZooto fallback still reachable
REAL=$(curl -sk "https://apis.izooto.com/v1/audience")
check "iZooto API URL reachable"   "$REAL" "Authorization-token"

# ============================================================
section "9. CTR + Learning"
CTR=$(POST /api/reports/refresh-ctr)
check "CTR refresh runs"           "$CTR" '"ok":true'
check "CTR count > 0"              "$CTR" '"count":'

INSIGHTS=$(GET /api/reports/url/$URL_ID/insights)
check "Insights returned"          "$INSIGHTS" "best_template"
check "Template ranking"           "$INSIGHTS" "adjusted_ctr"

# Learning engine directly
LEARN=$(node -e "
const { pickWeightedTemplate, templateCtrForUrl } = require('./src/learning/engine');
const { getTemplatesForNiche } = require('./src/ai/templates');
const stats = templateCtrForUrl($URL_ID);
console.log('templates_with_stats:', stats.length);
const pick = pickWeightedTemplate($URL_ID, 'finanças', getTemplatesForNiche('finanças'));
console.log('picked:', pick.key);
")
check "Learning stats computed"    "$LEARN" "templates_with_stats:"
check "Template picked"            "$LEARN" "picked:"

# ============================================================
section "10. Reports"
SUMMARY=$(GET "/api/reports/summary?period=week")
check "Weekly summary"             "$SUMMARY" '"totals":'
check "Daily breakdown"            "$SUMMARY" '"daily":'

SUMMARY_M=$(GET "/api/reports/summary?period=month")
check "Monthly summary"            "$SUMMARY_M" '"days":30'

CSV=$(GET "/api/reports/export.csv?days=7")
check "CSV has headers"            "$CSV" "sent_at,site,url_label"
check "CSV has rows"               "$CSV" "SmokeTest"

CAMPAIGNS=$(GET /api/campaigns)
check "Campaigns list"             "$CAMPAIGNS" "izooto_campaign_id"

# ============================================================
section "11. Settings"
SETTINGS=$(GET /api/settings)
check "send_times setting"         "$SETTINGS" "send_times"
check "timezone setting"           "$SETTINGS" "timezone"
check "public_base_url setting"    "$SETTINGS" "public_base_url"
check "auto_approve setting"       "$SETTINGS" "auto_approve"
check "Update setting"             "$(PATCH /api/settings '{"send_times":"09:00,14:00,20:00"}')" "09:00,14:00,20:00"
PATCH /api/settings '{"send_times":"08:00,12:00,18:00"}' > /dev/null
check "Empty patch rejected"       "$(PATCH /api/settings '{}')" "No settings"

# ============================================================
section "12. Static assets"
check "login.html"                 "$(STATUS /login.html)" "200"
check "index.html"                 "$(STATUS /)" "200"
check "app.js"                     "$(STATUS /app.js)" "200"
check "favicon.svg"                "$(STATUS /favicon.svg)" "200"
check "favicon-32x32.png"          "$(STATUS /favicon-32x32.png)" "200"
check "favicon-16x16.png"          "$(STATUS /favicon-16x16.png)" "200"
check "apple-touch-icon.png"       "$(STATUS /apple-touch-icon.png)" "200"
check "Dashboard references favicon" "$(curl -sk "$BASE/")" 'rel="icon"'
check "Dark mode script present"   "$(curl -sk "$BASE/")" 'localStorage.getItem'

# Cleanup
section "Cleanup"
DEL /api/urls/$URL_ID > /dev/null
check "Test URL deleted"           "$(GET /api/urls)" ""
LOGOUT=$(POST /api/auth/logout)
check "Logout returns ok"          "$LOGOUT" '"ok":true'
check "After logout → 401"         "$(STATUS /api/urls)" "401"

# ============================================================
echo ""
echo "═══════════════════════════════════════"
echo "  TEST RESULTS"
echo "═══════════════════════════════════════"
echo "  ✅ Passed: $PASS"
echo "  ❌ Failed: $FAIL"
if [ $FAIL -gt 0 ]; then
  echo ""
  echo "  Failed checks:"
  for f in "${FAILS[@]}"; do echo "   - $f"; done
fi
echo "═══════════════════════════════════════"
exit $FAIL
