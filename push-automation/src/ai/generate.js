require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { getTemplatesForNiche, getTemplate } = require('./templates');

const client = process.env.AI_API_KEY
  ? new Anthropic({ apiKey: process.env.AI_API_KEY })
  : null;

const MODEL = 'claude-haiku-4-5';
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 120;

function buildPromptPT(url, label, niche, template) {
  return `Você é um especialista em notificações push de ALTÍSSIMO CTR para o mercado brasileiro.

Sua missão é escrever UMA notificação que parece TOTALMENTE REAL — como se fosse o próprio app/sistema notificando o usuário sobre algo que ELE recebeu, ganhou ou foi aprovado.

URL destino: ${url}
Rótulo/contexto: ${label}
Nicho: ${niche}

Modelo: ${template.name}
Estilo deste modelo:
${template.style}

REGRAS DE OURO:
1. Tom AGRESSIVO de "VOCÊ RECEBEU" / "VOCÊ FOI APROVADO" / "VOCÊ GANHOU" — passe a sensação que JÁ É DA PESSOA, ela só precisa clicar para pegar.
2. Use NOMES FAKES brasileiros (Ana, Brenda, Carlos, Lucas, Patricia) e VALORES ESPECÍFICOS (1500 Robux, R$ 487,32, 12% de alta).
3. Imite PERFEITAMENTE como o app real escreveria — não use linguagem de propaganda ("descubra", "saiba mais", "veja como" são proibidos).
4. Linguagem direta, sem rodeios. Crie urgência ("agora", "antes que expire", "última hora") quando couber.
5. Emojis estratégicos: 1-2 no título, 0-1 na descrição. Nunca exagere.
6. NÃO use aspas, NÃO use markdown, NÃO mencione que é uma notificação ou anúncio.

LIMITES:
- Título: máximo ${MAX_TITLE} caracteres (idealmente 30-45)
- Descrição: máximo ${MAX_DESCRIPTION} caracteres (idealmente 60-100)

Responda APENAS com JSON neste formato exato:
{"title": "...", "description": "..."}`;
}

function buildPromptEN(url, label, niche, template) {
  return `You are a top-tier push notification copywriter optimizing for HIGHEST CTR.

Your job: write ONE notification that looks TOTALLY REAL — as if the app/system itself was notifying the user about something THEY received, won, or were approved for.

Destination URL: ${url}
Context/label: ${label}
Niche: ${niche}

Template: ${template.name}
Template style examples (translate to English while keeping the same realistic-notification feeling):
${template.style}

GOLDEN RULES:
1. Use AGGRESSIVE "YOU RECEIVED / YOU WERE APPROVED / YOU WON" tone — make the user feel they ALREADY HAVE the prize, just need to click to claim.
2. Use FAKE NAMES (Sarah, Mike, Emily, Jake, Olivia) and SPECIFIC NUMBERS (1500 Robux, $487, 12% rise).
3. Imitate the EXACT phrasing the real app would use — banned: "discover", "learn how", "see how" (sounds too ad-like).
4. Direct, urgent language. Use "now", "before it expires", "last chance" when it fits.
5. Strategic emoji: 1-2 in title, 0-1 in description. Don't overdo it.
6. NO quotes, NO markdown, NEVER mention that it's a notification or ad.

LIMITS:
- Title: max ${MAX_TITLE} characters (ideal 30-45)
- Description: max ${MAX_DESCRIPTION} characters (ideal 60-100)

Respond ONLY with JSON in this exact format:
{"title": "...", "description": "..."}`;
}

function buildPrompt(url, label, niche, template, language) {
  return language === 'en'
    ? buildPromptEN(url, label, niche, template)
    : buildPromptPT(url, label, niche, template);
}

async function generateCopy(url, label, niche, templateKey, language = 'pt-BR') {
  const template = getTemplate(templateKey);
  if (!template) throw new Error(`Unknown template: ${templateKey}`);

  if (!client) {
    return {
      title: `[MOCK ${template.name.slice(0, 30)}]`,
      description: `[MOCK desc for ${label.slice(0, 40)}]`,
      template: templateKey,
      mock: true,
    };
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: 'user', content: buildPrompt(url, label, niche, template, language) }],
  });

  const text = response.content[0].text.trim();
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
    const copy = await generateCopy(url, label, niche, template.key, language);
    variations.push(copy);
  }
  return variations;
}

module.exports = { generateCopy, generateVariations };
