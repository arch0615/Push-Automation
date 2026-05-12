require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const PROMPT = `You are looking at a screenshot of a push notification (or several stacked notifications). Extract the TITLE and BODY of each notification visible.

Return ONLY a JSON array, even for a single notification:
[{"title": "...", "body": "..."}]

Rules:
- Keep the original language of the text (do not translate).
- Skip system chrome (browser headers, "Google Chrome", site URLs at the bottom of cards, timestamps like "21:02").
- Title = the bold/larger first line of the notification.
- Body = the smaller text below the title (ignore if it just shows a website URL).
- If a notification has no body text, set body to "".
- If you cannot read the image at all, return [].`;

async function extractFromImage(filePath) {
  if (!client) throw new Error('OPENAI_API_KEY not configured');
  const buffer = await fs.promises.readFile(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : (ext || 'png');
  const dataUrl = `data:image/${mime};base64,${buffer.toString('base64')}`;

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    }],
  });

  const raw = res.choices[0].message.content.trim();
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]);
    return arr
      .filter(x => x && (x.title || x.body))
      .map(x => ({
        title: String(x.title || '').trim().slice(0, 120),
        body: String(x.body || x.description || '').trim().slice(0, 200),
      }));
  } catch (_) {
    return [];
  }
}

module.exports = { extractFromImage };
