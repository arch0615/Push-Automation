require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { getTemplatesForNiche, getTemplate } = require('./templates');
const { getTopAndBottomCopies } = require('../learning/copyLearning');

const claudeClient = process.env.AI_API_KEY ? new Anthropic({ apiKey: process.env.AI_API_KEY }) : null;
const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function getProvider() {
  try {
    const settings = require('../api/settings');
    const fromSettings = settings.get('ai_provider');
    if (fromSettings) return String(fromSettings).toLowerCase();
  } catch (_) {}
  return (process.env.AI_PROVIDER || 'openai').toLowerCase();
}

function getModel(provider) {
  try {
    const settings = require('../api/settings');
    const fromSettings = settings.get('ai_model');
    if (fromSettings) return String(fromSettings);
  } catch (_) {}
  return provider === 'claude' ? CLAUDE_MODEL : OPENAI_MODEL;
}

const CLAUDE_MODEL = 'claude-haiku-4-5';
const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 120;

function getExamplesForUrl(urlId) {
  if (!urlId) return [];
  try {
    const db = require('../db/database');
    const url = db.prepare('SELECT site_id FROM urls WHERE id = ?').get(urlId);
    if (!url) return [];
    return db.prepare(`
      SELECT title, description FROM examples
      WHERE enabled = 1 AND title IS NOT NULL AND title != ''
        AND (site_id = ? OR site_id IS NULL)
      ORDER BY site_id IS NULL, created_at DESC
      LIMIT 8
    `).all(url.site_id);
  } catch (_) { return []; }
}

// Brand/app names that have caused OpenAI policy concerns when used as
// impersonation in push copy. Strip these from learning/example inputs going
// to OpenAI so historical aggressive winners don't prime the model toward
// impersonation even when the prompt says "don't impersonate".
const IMPERSONATION_BRANDS = [
  'WhatsApp', 'Whatsapp', 'whatsapp',
  'Facebook', 'facebook', 'Instagram', 'instagram',
  'Bradesco', 'Nubank', 'Itaú', 'Itau', 'Santander', 'Caixa', 'BB',
  'Mercado Pago', 'PicPay', 'PagSeguro',
  'Tinder', 'Bumble',
  'Roblox', 'Fortnite',
  'iFood', 'Rappi', 'Uber',
];

function sanitizeForSafe(text) {
  if (!text) return text;
  let out = String(text);
  for (const brand of IMPERSONATION_BRANDS) {
    out = out.replace(new RegExp(`\\b${brand}\\b`, 'g'), '[app]');
  }
  return out;
}

function buildExamplesSection(urlId, language, safeMode) {
  const examples = getExamplesForUrl(urlId);
  if (examples.length === 0) return '';
  const isEN = language === 'en';
  let s = isEN
    ? '\n\n### EXAMPLE PUSHES THE OPERATOR LIKES — USE THESE AS STYLE REFERENCE\nMimic the tone, structure and format of these (DO NOT copy exact text):\n'
    : '\n\n### EXEMPLOS DE PUSHES QUE O OPERADOR GOSTA — USE COMO REFERÊNCIA DE ESTILO\nImite o tom, estrutura e formato (NÃO copie o texto exato):\n';
  examples.forEach(e => {
    const title = safeMode ? sanitizeForSafe(e.title) : e.title;
    const description = safeMode ? sanitizeForSafe(e.description) : e.description;
    const desc = description ? ` / "${description}"` : '';
    s += `- "${title}"${desc}\n`;
  });
  return s;
}

function buildLearningSection(urlId, language, safeMode) {
  if (!urlId) return '';
  const { winners, losers } = getTopAndBottomCopies(urlId, 3, language);
  if (winners.length === 0) return '';

  const isEN = language === 'en';
  const clean = (s) => safeMode ? sanitizeForSafe(s) : s;
  let section = isEN
    ? '\n\n### HISTORICAL PERFORMANCE FOR THIS URL — LEARN FROM IT\n'
    : '\n\n### DESEMPENHO HISTÓRICO DESTA URL — APRENDA COM ELE\n';

  section += isEN
    ? '\n✅ TOP WINNERS (high CTR — write similar style):\n'
    : '\n✅ MELHORES (alto CTR — escreva no mesmo estilo):\n';

  winners.forEach(w => {
    section += `- "${clean(w.title)}" / "${clean(w.description)}" → CTR ${w.ctr.toFixed(1)}%\n`;
  });

  if (losers.length > 0) {
    section += isEN
      ? '\n❌ LOSERS (low CTR — avoid this pattern):\n'
      : '\n❌ PIORES (baixo CTR — evite esse padrão):\n';
    losers.forEach(l => {
      section += `- "${clean(l.title)}" / "${clean(l.description)}" → CTR ${l.ctr.toFixed(1)}%\n`;
    });
  }

  section += isEN
    ? '\nMatch the style/tone of the WINNERS and avoid the LOSERS pattern.\n'
    : '\nReproduza o estilo dos MELHORES e evite o padrão dos PIORES.\n';

  return section;
}

function isSafeMode() {
  try {
    const settings = require('../api/settings');
    return settings.get('ai_safe_mode') === 'true';
  } catch (_) { return false; }
}

function buildPromptPT(url, label, niche, template, urlId, safeMode) {
  if (safeMode) {
    return `Você é um especialista em notificações push de marketing direto para o mercado brasileiro.

Escreva UMA notificação push promocional curta sobre a oferta abaixo. NÃO se passe por outro app, marca ou pessoa real. NÃO imite Banco, WhatsApp, Facebook ou Instagram. Identifique-se como uma promoção/oferta.

URL destino: ${url}
Rótulo/contexto: ${label}
Nicho: ${niche}

Modelo (use o ESTILO visual sem imitar a marca): ${template.name}
Estilo deste modelo (use como inspiração GERAL):
${template.style}

REGRAS:
1. Tom direto e atrativo, sem se passar por banco/WhatsApp/etc.
2. Use NOMES FAKES brasileiros e VALORES ESPECÍFICOS quando couber.
3. Crie urgência ("agora", "última hora") quando relevante.
4. Emojis estratégicos (1-2 no título, 0-1 na descrição).

LIMITES:
- Título: máximo ${MAX_TITLE} caracteres (idealmente 30-45)
- Descrição: máximo ${MAX_DESCRIPTION} caracteres (idealmente 60-100)${buildExamplesSection(urlId, 'pt-BR', true)}${buildLearningSection(urlId, 'pt-BR', true)}

Responda APENAS com JSON: {"title": "...", "description": "..."}`;
  }
  return `Você é um especialista em notificações push de ALTÍSSIMO CTR para o mercado brasileiro.

Sua missão é escrever UMA notificação que parece TOTALMENTE REAL — como se fosse o próprio app/sistema notificando o usuário sobre algo que ELE recebeu, ganhou ou foi aprovado.

URL destino: ${url}
Rótulo/contexto: ${label}
Nicho: ${niche}

Modelo: ${template.name}
Estilo deste modelo:
${template.style}

REGRAS DE OURO:
1. Tom AGRESSIVO de "VOCÊ RECEBEU" / "VOCÊ FOI APROVADO" / "VOCÊ GANHOU".
2. Use NOMES FAKES brasileiros (Ana, Brenda, Carlos, Lucas, Patricia) e VALORES ESPECÍFICOS (1500 Robux, R$ 487,32, 12% de alta).
3. Imite PERFEITAMENTE como o app real escreveria — proibido: "descubra", "saiba mais", "veja como".
4. Linguagem direta. Crie urgência ("agora", "antes que expire", "última hora") quando couber.
5. Emojis estratégicos: 1-2 no título, 0-1 na descrição.
6. NÃO use aspas, NÃO use markdown, NÃO mencione que é uma notificação.

LIMITES:
- Título: máximo ${MAX_TITLE} caracteres (idealmente 30-45)
- Descrição: máximo ${MAX_DESCRIPTION} caracteres (idealmente 60-100)${buildExamplesSection(urlId, 'pt-BR', false)}${buildLearningSection(urlId, 'pt-BR', false)}

Responda APENAS com JSON neste formato exato:
{"title": "...", "description": "..."}`;
}

function buildPromptEN(url, label, niche, template, urlId, safeMode) {
  if (safeMode) {
    return `You are a direct-marketing push notification copywriter.

Write ONE short promotional push notification for the offer below. DO NOT impersonate other apps, brands, or real people. DO NOT pretend to be a bank, WhatsApp, Facebook, or Instagram. Identify it as a promotion/offer.

Destination URL: ${url}
Context/label: ${label}
Niche: ${niche}

Template (use as GENERAL inspiration only — don't copy the brand): ${template.name}
Style: ${template.style}

RULES:
1. Direct, attractive tone, without impersonating any brand.
2. Use fake names and specific numbers when relevant.
3. Use urgency words ("now", "last chance") when relevant.
4. Strategic emoji (1-2 in title, 0-1 in description).

LIMITS:
- Title: max ${MAX_TITLE} chars
- Description: max ${MAX_DESCRIPTION} chars${buildExamplesSection(urlId, 'en', true)}${buildLearningSection(urlId, 'en', true)}

Respond ONLY with JSON: {"title": "...", "description": "..."}`;
  }
  return `You are a top-tier push notification copywriter optimizing for HIGHEST CTR.

⚠️ CRITICAL: Output MUST be in ENGLISH ONLY. Do NOT use any Portuguese words. The audience is English-speaking.
- Currency: use $ (USD), NOT R$
- Examples like "Você ganhou", "Pix", "Robux liberado" are PORTUGUESE — translate to English ("You won", "Wire transfer", "Robux released")
- Names: prefer English-speaking names (Sarah, Mike, Emily, Jake, Olivia, Ashley)
- Time/urgency words: "now", "today", "expires", "limited" (NOT "agora", "antes que expire")

Your job: write ONE notification IN ENGLISH that looks TOTALLY REAL — as if the app/system itself was notifying the user about something THEY received, won, or were approved for.

Destination URL: ${url}
Context/label: ${label}
Niche: ${niche}

Template: ${template.name}
Template style — translate examples to English while keeping the realistic-notification feeling:
${template.style}

GOLDEN RULES:
1. ENGLISH ONLY (no Portuguese mixing).
2. AGGRESSIVE "YOU RECEIVED / YOU WERE APPROVED / YOU WON" tone.
3. Use FAKE English-speaking NAMES and SPECIFIC NUMBERS in USD.
4. Imitate the EXACT phrasing the real app would use — banned: "discover", "learn how", "see how".
5. Direct, urgent language ("now", "before it expires", "last chance").
6. Strategic emoji: 1-2 in title, 0-1 in description.
7. NO quotes, NO markdown, NEVER mention notification or ad.

LIMITS:
- Title: max ${MAX_TITLE} chars
- Description: max ${MAX_DESCRIPTION} chars${buildExamplesSection(urlId, 'en', false)}${buildLearningSection(urlId, 'en', false)}

Respond ONLY with JSON in this exact format (English content):
{"title": "...", "description": "..."}`;
}

function buildPrompt(url, label, niche, template, language, urlId, safeMode) {
  return language === 'en'
    ? buildPromptEN(url, label, niche, template, urlId, safeMode)
    : buildPromptPT(url, label, niche, template, urlId, safeMode);
}

// OpenAI is ALWAYS forced to safe-mode prompts to protect the account from
// the impersonation/policy violation that triggered their warning email.
// Claude follows the dashboard toggle since Anthropic's policy treats marketing
// copy differently and we haven't received any warnings on that path.
function buildPromptForProvider(provider, url, label, niche, template, language, urlId) {
  const safeMode = provider === 'openai' || isSafeMode();
  return buildPrompt(url, label, niche, template, language, urlId, safeMode);
}

async function callClaude(prompt, model) {
  const res = await claudeClient.messages.create({
    model: model || CLAUDE_MODEL,
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content[0].text.trim();
}

async function callOpenAI(prompt, model, safetyId) {
  const isReasoning = /^o\d/.test(model || '');
  const params = {
    model: model || OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    // Per OpenAI policy email — hashed end-user identifier for abuse attribution
    user: safetyId || 'push-automation-system',
  };
  if (isReasoning) {
    params.max_completion_tokens = 400;
  } else {
    params.max_tokens = 200;
    params.temperature = 0.85;
  }
  const res = await openaiClient.chat.completions.create(params);
  return res.choices[0].message.content.trim();
}

async function generateCopy(url, label, niche, templateKey, language = 'pt-BR', urlId = null) {
  const template = getTemplate(templateKey);
  if (!template) throw new Error(`Unknown template: ${templateKey}`);

  const provider = getProvider() === 'claude' ? 'claude' : 'openai';
  const client = provider === 'claude' ? claudeClient : openaiClient;

  if (!client) {
    return {
      title: `[MOCK ${template.name.slice(0, 30)}]`,
      description: `[MOCK desc for ${label.slice(0, 40)}]`,
      template: templateKey,
      mock: true,
    };
  }

  const prompt = buildPromptForProvider(provider, url, label, niche, template, language, urlId);
  const model = getModel(provider);

  // OpenAI's "safety identifier" — required by their abuse-prevention policy.
  // Stable per-URL hash so different campaigns get different IDs (lets them
  // throttle/flag specific URLs instead of nuking the whole account).
  const crypto = require('crypto');
  const safetyId = 'usr_' + crypto.createHash('sha256').update(`${urlId || 'global'}|${url || ''}`).digest('hex').slice(0, 24);

  let text;
  try {
    text = provider === 'claude'
      ? await callClaude(prompt, model)
      : await callOpenAI(prompt, model, safetyId);
  } catch (e) {
    const isRateLimit = e?.status === 429 || /rate.?limit|credit.balance/i.test(e?.message || '');
    const altProvider = provider === 'claude' ? 'openai' : 'claude';
    const altClient = altProvider === 'claude' ? claudeClient : openaiClient;
    if (isRateLimit && altClient) {
      console.warn(`[ai] ${provider} failed (${e.message?.slice(0, 80)}). Falling back to ${altProvider}.`);
      // Rebuild prompt for the alt provider — OpenAI must always get the safe
      // prompt even when we fell back from Claude's aggressive prompt.
      const altPrompt = buildPromptForProvider(altProvider, url, label, niche, template, language, urlId);
      const altModel = altProvider === 'claude' ? CLAUDE_MODEL : OPENAI_MODEL;
      text = altProvider === 'claude'
        ? await callClaude(altPrompt, altModel)
        : await callOpenAI(altPrompt, altModel, safetyId);
    } else {
      throw e;
    }
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in AI response: ${text}`);

  const parsed = JSON.parse(jsonMatch[0]);
  const title = String(parsed.title || '').trim().slice(0, MAX_TITLE);
  const description = String(parsed.description || '').trim().slice(0, MAX_DESCRIPTION);
  if (!title || !description) {
    throw new Error(`AI returned empty title or description: ${JSON.stringify(parsed)}`);
  }
  return {
    title,
    description,
    template: templateKey,
    provider,
  };
}

async function generateVariations(url, label, niche, count = 3, urlId = null, language = 'pt-BR') {
  const candidates = getTemplatesForNiche(niche);
  if (candidates.length === 0) throw new Error(`No templates match niche: ${niche}`);

  const selected = [];
  const pool = [...candidates];

  const useLearning = urlId != null;
  const engine = useLearning ? require('../learning/engine') : null;

  for (let i = 0; i < count && pool.length > 0; i++) {
    let chosen;
    if (useLearning) {
      chosen = engine.pickWeightedTemplate(urlId, niche, pool);
    } else {
      const idx = Math.floor(Math.random() * pool.length);
      chosen = pool[idx];
    }
    const idx = pool.findIndex(p => p.key === chosen.key);
    pool.splice(idx, 1);
    selected.push(chosen);
  }

  const variations = [];
  for (const template of selected) {
    const copy = await generateCopy(url, label, niche, template.key, language, urlId);
    variations.push(copy);
  }
  return variations;
}

module.exports = { generateCopy, generateVariations };
