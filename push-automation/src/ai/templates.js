const templates = {
  whatsapp_voice: {
    name: 'WhatsApp - Mensagem de Voz',
    icon: 'whatsapp.png',
    style: 'Mensagem de voz fake do WhatsApp. Título curto como "Tentei Falar com você 🚫" ou nome fake. Descrição como "🎤 Mensagem de Voz (0:13)" com duração variável.',
    niches: ['geral', 'finanças', 'entretenimento', 'redes sociais'],
  },
  whatsapp_message: {
    name: 'WhatsApp - Mensagem',
    icon: 'whatsapp.png',
    style: 'Mensagem de texto fake do WhatsApp de alguém próximo. Emojis casuais, linguagem íntima.',
    niches: ['geral', 'relacionamentos', 'entretenimento'],
  },
  gmail_inbox: {
    name: 'Gmail - Novos E-mails',
    icon: 'gmail.png',
    style: 'Notificação do Gmail com contagem de e-mails novos. Título "Gmail", descrição tipo "Você tem (5) novos e-mails".',
    niches: ['finanças', 'trabalho', 'geral'],
  },
  facebook_message: {
    name: 'Facebook - Nova Mensagem',
    icon: 'facebook.png',
    style: 'Notificação do Facebook Messenger. Título "Facebook", descrição tipo "💬 Você Recebeu 5 mensagens de..." ou "(9) mensagens novas".',
    niches: ['redes sociais', 'geral', 'relacionamentos'],
  },
  facebook_alert: {
    name: 'Facebook - Alerta',
    icon: 'facebook.png',
    style: 'Alerta no Facebook com emoji chamativo. Título curto com emoji como "👆 Seu empréstimo foi liberado com sucesso?", descrição complementa com detalhe financeiro.',
    niches: ['finanças', 'ofertas'],
  },
  roblox_reward: {
    name: 'Roblox - Recompensa',
    icon: 'roblox.png',
    style: 'Oferta de Robux grátis ou item secreto. Título "ROBUX INFINITO" ou "ITEM SECRETO", descrição promete ganho rápido.',
    niches: ['jogos', 'crianças', 'entretenimento'],
  },
  gift_received: {
    name: 'Presente Recebido',
    icon: 'gift.png',
    style: 'Notificação estilo presente surpresa. Título com "❤️ @Nome te enviou um presente 🎁", descrição pede para abrir.',
    niches: ['ofertas', 'geral', 'e-commerce'],
  },
  bank_approval: {
    name: 'Banco - Aprovação',
    icon: 'bank.png',
    style: 'Aprovação bancária fake. Título tipo "Empréstimo aprovado ✅", descrição com valor específico "R$ 2.500 na sua conta".',
    niches: ['finanças', 'ofertas'],
  },
  instagram_dm: {
    name: 'Instagram - DM',
    icon: 'instagram.png',
    style: 'Mensagem direta do Instagram. Título "Instagram", descrição tipo "💬 Nova mensagem de @usuario".',
    niches: ['redes sociais', 'geral'],
  },
  telegram_message: {
    name: 'Telegram - Mensagem',
    icon: 'telegram.png',
    style: 'Notificação do Telegram. Título com nome de contato fake, descrição curta de mensagem.',
    niches: ['redes sociais', 'geral'],
  },
  tiktok_notification: {
    name: 'TikTok - Notificação',
    icon: 'tiktok.png',
    style: 'Notificação do TikTok de novo vídeo viral. Título "TikTok", descrição tipo "🔥 Seu vídeo está viralizando!" ou "Alguém curtiu seu vídeo".',
    niches: ['redes sociais', 'entretenimento'],
  },
  youtube_notification: {
    name: 'YouTube - Notificação',
    icon: 'youtube.png',
    style: 'Notificação do YouTube. Título "YouTube", descrição sobre novo vídeo ou live começando.',
    niches: ['entretenimento', 'geral'],
  },
  gift_delivery: {
    name: 'Presente - Entrega',
    icon: 'gift_box.png',
    style: 'Simula entrega de presente ou pacote. Título "📦 Seu pedido chegou" ou "🎁 Presente a caminho".',
    niches: ['e-commerce', 'ofertas'],
  },
  shopping_deal: {
    name: 'Oferta Relâmpago',
    icon: 'shopping.png',
    style: 'Oferta urgente de e-commerce. Título com desconto ou "🛒 Oferta relâmpago!", descrição com preço específico.',
    niches: ['ofertas', 'e-commerce'],
  },
  crypto_alert: {
    name: 'Cripto - Alerta',
    icon: 'crypto.png',
    style: 'Alerta de variação de cripto. Título "🚀 Bitcoin disparou!", descrição com valor e percentual.',
    niches: ['finanças', 'investimentos'],
  },
  secret_reveal: {
    name: 'Segredo Revelado',
    icon: 'secret.png',
    style: 'Clickbait estilo "segredo revelado". Título "🔥 Descoberto o segredo...", descrição gera curiosidade.',
    niches: ['geral', 'entretenimento', 'ofertas'],
  },
};

function getTemplatesForNiche(niche) {
  return Object.entries(templates)
    .filter(([_, t]) => t.niches.includes(niche) || t.niches.includes('geral'))
    .map(([key, t]) => ({ key, ...t }));
}

function getTemplate(key) {
  return templates[key];
}

module.exports = { templates, getTemplatesForNiche, getTemplate };
