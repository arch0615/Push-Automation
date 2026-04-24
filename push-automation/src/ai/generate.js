require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { getTemplatesForNiche, getTemplate } = require('./templates');

const client = process.env.AI_API_KEY
  ? new Anthropic({ apiKey: process.env.AI_API_KEY })
  : null;

const MODEL = 'claude-sonnet-4-5';
const MAX_TITLE = 50;
const MAX_DESCRIPTION = 90;

function buildPrompt(url, label, niche, template) {
  return `Você é um copywriter especialista em notificações push com alto CTR para o mercado brasileiro.

Gere UMA notificação push em português do Brasil para a URL abaixo, seguindo o estilo do modelo indicado.

URL destino: ${url}
Rótulo/contexto: ${label}
Nicho: ${niche}
Modelo: ${template.name}
Estilo: ${template.style}

Regras obrigatórias:
- Título com no máximo ${MAX_TITLE} caracteres
- Descrição com no máximo ${MAX_DESCRIPTION} caracteres
- Use emojis estrategicamente (1-2 por campo, não mais)
- Linguagem informal, direta, que gera curiosidade
- NÃO use aspas ou markdown
- NÃO mencione que é uma notificação ou anúncio
- Imite EXATAMENTE o estilo do modelo para simular uma mensagem real

Responda APENAS com JSON no formato:
{"title": "...", "description": "..."}`;
}

async function generateCopy(url, label, niche, templateKey) {
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
    messages: [{ role: 'user', content: buildPrompt(url, label, niche, template) }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in AI response: ${text}`);

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    title: parsed.title.slice(0, MAX_TITLE),
    description: parsed.description.slice(0, MAX_DESCRIPTION),
    template: templateKey,
  };
}

async function generateVariations(url, label, niche, count = 3, urlId = null) {
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
    const copy = await generateCopy(url, label, niche, template.key);
    variations.push(copy);
  }
  return variations;
}

module.exports = { generateCopy, generateVariations };
