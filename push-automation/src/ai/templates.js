const templates = {
  whatsapp_voice: {
    name: 'WhatsApp - Mensagem de Voz',
    icons: ['whatsapp.png'],
    style: `Notificação fake de mensagem de voz do WhatsApp.
Título: nome curto fake (ex: "Mãe ❤️", "Carlos") OU "Tentei falar com você 🚫".
Descrição: começar com "🎤 Mensagem de Voz" + duração tipo (0:14), depois UMA frase intrigante curta.
Exemplos perfeitos:
- "Mãe ❤️" / "🎤 Mensagem de Voz (0:23) Filho, é urgente, escuta"
- "Tentei falar com você 🚫" / "🎤 Mensagem de Voz (0:18) Sobre aquela oferta que te falei"`,
    niches: ['finanças', 'entretenimento', 'redes sociais', 'relacionamentos'],
  },
  whatsapp_message: {
    name: 'WhatsApp - Mensagem',
    icons: ['whatsapp.png'],
    style: `Notificação fake de mensagem de texto do WhatsApp.
Título: nome fake brasileiro (ex: "Ana 💕", "João", "Patricia").
Descrição: mensagem curta como se fosse alguém próximo, despertando curiosidade.
Exemplos perfeitos:
- "Ana 💕" / "Olha o que eu achei pra você, vai amar 😍"
- "Bia" / "Você viu isso? Tá todo mundo falando"
- "Lucas" / "Cara, tem que ver isso AGORA"`,
    niches: ['relacionamentos', 'entretenimento', 'jogos'],
  },
  gmail_inbox: {
    name: 'Gmail - Novos E-mails',
    icons: ['gmail.png'],
    style: `Notificação fake do Gmail estilo "novos e-mails".
Título: "Gmail" ou nome fake do remetente.
Descrição: "Você tem (N) novos e-mails" OU assunto curto sobre algo que afeta a pessoa.
Exemplos perfeitos:
- "Gmail" / "Você tem (3) novos e-mails - 1 importante 📧"
- "Banco Itaú" / "✉️ Confirmação de aprovação - leia agora"
- "Receita Federal" / "Você tem 1 mensagem urgente sobre seu CPF"`,
    niches: ['finanças', 'trabalho'],
  },
  facebook_message: {
    name: 'Facebook - Nova Mensagem',
    icons: ['facebook.png'],
    style: `Notificação fake do Facebook Messenger.
Título: "Facebook" ou nome fake.
Descrição: "💬 Você Recebeu N mensagens" OU "Fulana enviou uma mensagem".
Exemplos perfeitos:
- "Facebook" / "💬 Você recebeu 5 novas mensagens"
- "Brenda Souza" / "Te mandei uma coisa, dá uma olhada 👀"
- "Facebook" / "(9) novas notificações esperando você"`,
    niches: ['redes sociais', 'relacionamentos'],
  },
  facebook_alert: {
    name: 'Facebook - Curtida / Pedido',
    icons: ['facebook.png'],
    style: `Notificação fake do Facebook estilo curtida/pedido de amizade/marcação.
Use nome fake brasileiro + ação social específica.
Exemplos perfeitos:
- "Facebook" / "Ana Clara curtiu sua foto ❤️"
- "Facebook" / "Brenda enviou um pedido de amizade"
- "Facebook" / "Marcaram você em uma publicação 📌"
- "Facebook" / "Você apareceu em 3 buscas hoje 🔍"`,
    niches: ['redes sociais'],
  },
  roblox_reward: {
    name: 'Roblox - Recompensa Robux',
    icons: ['robux.png', 'roblox.png'],
    style: `Notificação fake de recompensa de Robux. AGRESSIVO E ESPECÍFICO.
SEMPRE mencione um número específico (500, 1000, 1500, 2500, 5000 Robux).
Use linguagem de "VOCÊ RECEBEU" / "VOCÊ GANHOU" — passe a sensação que JÁ É DA PESSOA.
Exemplos perfeitos:
- "🎁 VOCÊ RECEBEU 1500 ROBUX!" / "Clique para resgatar antes que expire ⏰"
- "Roblox 🪙" / "1000 Robux disponíveis na sua conta - retire agora"
- "💰 ROBUX GRÁTIS LIBERADO" / "Resgate seus 2500 Robux antes da meia-noite"
- "ITEM SECRETO LIBERADO" / "Você ganhou um item raro - clique para pegar"`,
    niches: ['jogos', 'crianças', 'entretenimento'],
  },
  gift_received: {
    name: 'Presente Recebido',
    icons: ['gift.png', 'gift_box.png'],
    style: `Notificação fake "alguém te enviou um presente".
Use nome fake + ação. Curto e direto.
Exemplos perfeitos:
- "🎁 @Ana te enviou um presente!" / "Abra agora para ver o que é"
- "💝 Presente surpresa pra você" / "De um admirador secreto - clique para descobrir"
- "🎀 Você ganhou um presente!" / "Disponível por 24h apenas - aceite"`,
    niches: ['ofertas', 'e-commerce', 'relacionamentos', 'jogos'],
  },
  bank_approval: {
    name: 'Banco - Aprovação / Pix',
    icons: ['bank.png'],
    style: `Notificação fake bancária. SEMPRE com valor específico em R$.
Use linguagem oficial bancária brasileira: Pix, empréstimo, FGTS, saque, cartão.
Tom de "VOCÊ FOI APROVADO" / "VOCÊ RECEBEU".
Exemplos perfeitos:
- "💸 Pix recebido" / "Valor de R$ 487,32 caiu na sua conta - confirme"
- "✅ Empréstimo aprovado" / "R$ 5.000,00 disponíveis - clique para sacar"
- "🏦 FGTS liberado" / "Você tem R$ 1.247,80 disponível para saque"
- "💳 Cartão Black aprovado" / "Limite de R$ 8.000 - ative agora"
- "💰 Pix devolvido" / "Clique para ver o valor de R$ 312,45"`,
    niches: ['finanças', 'ofertas'],
  },
  instagram_dm: {
    name: 'Instagram - DM ou Curtida',
    icons: ['instagram.png'],
    style: `Notificação fake do Instagram.
Use @arroba + nome fake + ação social específica.
Exemplos perfeitos:
- "Instagram" / "@anaclara_ curtiu sua foto ❤️"
- "Instagram" / "@brendinha te marcou em um story 📸"
- "Instagram" / "💬 Nova DM de @lucasoficial - 'oi sumido'"
- "Instagram" / "Você apareceu em 12 buscas hoje 🔥"`,
    niches: ['redes sociais'],
  },
  telegram_message: {
    name: 'Telegram - Mensagem',
    icons: ['telegram.png'],
    style: `Notificação fake do Telegram.
Título: nome fake + 📱 ou número de mensagens.
Exemplos perfeitos:
- "Telegram 📱" / "Marina: Olha o que eu achei sobre aquilo"
- "Grupo VIP" / "(12) novas mensagens - alguém te marcou"
- "Carlos" / "Cara você precisa ver isso urgente"`,
    niches: ['redes sociais'],
  },
  tiktok_notification: {
    name: 'TikTok - Notificação',
    icons: ['tiktok.png'],
    style: `Notificação fake do TikTok.
Use linguagem de viralização e conquista, com números específicos.
Exemplos perfeitos:
- "TikTok" / "🔥 Seu vídeo bombou! Já tem 12k visualizações"
- "TikTok" / "@anitta_oficial seguiu você - confira"
- "TikTok 🎵" / "Você tem 47 novos seguidores hoje"`,
    niches: ['redes sociais', 'entretenimento'],
  },
  youtube_notification: {
    name: 'YouTube - Notificação',
    icons: ['youtube.png'],
    style: `Notificação fake do YouTube.
Use canal fake brasileiro + ação (live, novo vídeo, comentário).
Exemplos perfeitos:
- "YouTube" / "🔴 Whindersson Nunes está AO VIVO agora"
- "YouTube" / "Novo vídeo de Felipe Neto - 1 milhão em 1 hora"
- "YouTube 🎬" / "Seu canal favorito acabou de postar"`,
    niches: ['entretenimento', 'jogos'],
  },
  gift_delivery: {
    name: 'Entrega - Pacote chegando',
    icons: ['gift_box.png', 'shopping.png'],
    style: `Notificação fake de entrega de pacote/Correios/marketplace.
Use linguagem oficial dos Correios/Mercado Livre/Shopee.
Exemplos perfeitos:
- "📦 Seu pedido saiu para entrega" / "Chegará hoje - clique para rastrear"
- "🚚 Pacote chegando" / "Mercado Livre - pedido será entregue agora"
- "📦 Tentativa de entrega" / "Confirme o endereço para receber hoje"`,
    niches: ['e-commerce', 'ofertas'],
  },
  shopping_deal: {
    name: 'Oferta Relâmpago',
    icons: ['shopping.png'],
    style: `Notificação de oferta urgente com tempo limitado.
SEMPRE com desconto específico ou preço.
Exemplos perfeitos:
- "🛒 OFERTA RELÂMPAGO -70%" / "Acaba em 1 hora - aproveite"
- "💥 Liquidação Shopee" / "iPhone por R$ 1.299 - últimas 3 unidades"
- "⚡ Frete Grátis hoje" / "Pedido mínimo R$ 79 - última hora"`,
    niches: ['ofertas', 'e-commerce'],
  },
  crypto_alert: {
    name: 'Cripto - Alerta',
    icons: ['crypto.png'],
    style: `Notificação fake de variação cripto com número específico.
Use percentual e valor em R$.
Exemplos perfeitos:
- "🚀 Bitcoin subiu 12% agora" / "Atingiu R$ 380.000 - veja análise"
- "💰 ETH em alta" / "Ethereum +8% nas últimas 2h - momento de comprar"
- "📈 Sua carteira cripto" / "Lucro de R$ 1.247 hoje - confira"`,
    niches: ['finanças', 'investimentos'],
  },
  secret_reveal: {
    name: 'Segredo Revelado',
    icons: ['secret.png'],
    style: `Notificação clickbait estilo "segredo descoberto".
USE COM MODERAÇÃO — só quando outros estilos não couberem ao nicho.
Exemplos perfeitos:
- "🔥 Descoberto método secreto" / "Já viralizou - veja antes que tirem"
- "👀 Vazou na internet" / "Todo mundo está falando disso agora"`,
    niches: ['entretenimento', 'ofertas', 'jogos'],
  },
};

const ctaByTemplate = {
  whatsapp_voice: { 'pt-BR': 'Ouvir agora 🎤', en: 'Listen now 🎤' },
  whatsapp_message: { 'pt-BR': 'Ler agora 👆', en: 'Read now 👆' },
  gmail_inbox: { 'pt-BR': 'Abrir e-mail', en: 'Open email' },
  facebook_message: { 'pt-BR': 'Ver mensagens', en: 'View messages' },
  facebook_alert: { 'pt-BR': 'Ver agora', en: 'View now' },
  roblox_reward: { 'pt-BR': 'Resgatar agora 🎁', en: 'Claim now 🎁' },
  gift_received: { 'pt-BR': 'Abrir presente 🎁', en: 'Open gift 🎁' },
  bank_approval: { 'pt-BR': 'Sacar agora 💸', en: 'Withdraw now 💸' },
  instagram_dm: { 'pt-BR': 'Ver agora', en: 'View now' },
  telegram_message: { 'pt-BR': 'Ler agora 👆', en: 'Read now 👆' },
  tiktok_notification: { 'pt-BR': 'Ver agora 🔥', en: 'View now 🔥' },
  youtube_notification: { 'pt-BR': 'Assistir agora ▶️', en: 'Watch now ▶️' },
  gift_delivery: { 'pt-BR': 'Rastrear agora 📦', en: 'Track now 📦' },
  shopping_deal: { 'pt-BR': 'Aproveitar 🛒', en: 'Get it now 🛒' },
  crypto_alert: { 'pt-BR': 'Ver análise 📈', en: 'View analysis 📈' },
  secret_reveal: { 'pt-BR': 'Descobrir 👀', en: 'Discover 👀' },
};

function getCta(templateKey, language) {
  const lang = language === 'en' ? 'en' : 'pt-BR';
  return ctaByTemplate[templateKey]?.[lang] || (lang === 'en' ? 'Open' : 'Abrir');
}

function getTemplatesForNiche(niche) {
  if (niche === 'geral') {
    return Object.entries(templates).map(([key, t]) => ({ key, ...t }));
  }
  return Object.entries(templates)
    .filter(([_, t]) => t.niches.includes(niche))
    .map(([key, t]) => ({ key, ...t }));
}

function getTemplate(key) {
  return templates[key];
}

module.exports = { templates, getTemplatesForNiche, getTemplate, getCta };
