# Guia de Uso — Push Automation

Bem-vindo(a) ao seu sistema de automação de push notifications. Este guia explica como usar o painel no dia a dia.

---

## Entrando no painel

1. Acesse: **https://pushudc.top/login.html**
2. Usuário e senha estão no arquivo `.env` no servidor (padrão: `admin` / `admin123` — recomendamos trocar antes de usar em produção)
3. Depois de entrar, o painel abre na aba **Início**

---

## O que cada aba faz

### 📊 Início
- Resumo de desempenho do sistema
- Cartões com **quantidade de sites**, **URLs ativas**, **pushes enviados no período** e **CTR médio**
- Gráfico de envios por dia
- Status de cada site (se a API Key já está configurada)
- Botão **🔄 Atualizar CTR** força o sistema a buscar estatísticas frescas do iZooto
- Botão **⬇ Exportar CSV** baixa um relatório completo das campanhas enviadas

### 🔗 URLs
- Lista de todas as landing pages cadastradas
- Botão **+ Nova URL** para cadastrar uma nova:
  - Escolha o site (domínio)
  - Informe a URL de destino (onde o usuário cai ao clicar)
  - Dê um rótulo curto (ex: "Oferta Black Friday", "Empréstimo fácil")
  - Escolha o nicho (finanças, jogos, redes sociais, etc.)
  - Defina o limite de envios por dia (recomendado: 3)
- Ações por URL:
  - **Insights** — mostra qual modelo está performando melhor e em qual horário
  - **Disparar** — força um envio imediato, sem esperar o próximo horário
  - **Pausar/Retomar** — controla se a URL entra no disparo automático
  - **Remover** — apaga a URL (e campanhas associadas)

### 📨 Campanhas
- Histórico completo de pushes enviados
- Mostra data/hora, URL, modelo usado, título, variação (A/B) e CTR
- Botão **▶ Disparar agora** roda um ciclo imediato para TODAS as URLs ativas (respeita limite diário e pausas)

### 🎨 Modelos
- Biblioteca de ícones usados nas notificações (WhatsApp, Gmail, Facebook, Roblox, etc.)
- Botão **+ Enviar ícone** sobe um novo ícone (PNG/JPEG/WebP, máximo 2MB)
- O ícone é redimensionado automaticamente para 256×256

### ⚙️ Configurações
**Disparo automático:**
- **Horários de envio** — separados por vírgula, ex: `08:00,12:00,18:00`
- **Fuso horário** — padrão: `America/Sao_Paulo`
- **URL pública do servidor** — necessária para que o iZooto consiga pegar as imagens (ex: `https://pushudc.top`)
- **Disparar automaticamente** — se ligado, envia sem pedir aprovação

**Chaves de API do iZooto:**
- Cole a **REST API Key** de cada site no campo correspondente e clique **Salvar**
- Enquanto a chave estiver marcada como "Pendente", os envios saem em modo de teste (mock) e não chegam nos usuários finais

---

## Fluxo diário recomendado

1. **Uma vez por semana** — abra a aba **Início**, confira o CTR médio e os sites conectados
2. **Sempre que tiver nova oferta** — vá em **URLs → + Nova URL**, cadastre e deixe ativa
3. **O sistema faz o resto sozinho:**
   - Gera 3 variações de copy com IA para cada URL
   - Escolhe modelos com mais CTR histórico (aprendizado automático)
   - Dispara nos horários configurados
   - A cada 6 horas, atualiza as métricas do iZooto
4. **De vez em quando** — abra **Insights** de uma URL para ver qual modelo está ganhando

---

## Dúvidas frequentes

**"Os pushes estão saindo como `[MOCK ...]`"**
A chave da API de IA (Claude/OpenAI) ou a REST API Key do iZooto não está configurada. Verifique em **Configurações**.

**"Tenho uma URL nova, quanto tempo até o primeiro envio?"**
Até o próximo horário programado. Se quiser imediato, use o botão **Disparar** na aba **URLs**.

**"Posso ter mais de 3 variações por dia por URL?"**
Sim, ajuste o campo **Limite de envios por dia** ao criar ou editar a URL.

**"Por que um push foi `skipped: daily_limit_reached`?"**
A URL já atingiu o limite diário de envios. Isso é proteção contra fadiga de inscritos.

**"Posso pausar tudo rapidamente?"**
Em **Configurações**, desligue **Disparar automaticamente**. Para reativar, ligue novamente.

---

## Em caso de erro

1. Peça pro suporte conferir os logs em `/home/Push Automation/push-automation/logs/`
2. Se o site ficar fora do ar, executar no servidor: `pm2 restart push-automation`
3. Para status: `pm2 status`
