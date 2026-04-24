const api = {
  async get(path) {
    const r = await fetch(path);
    if (r.status === 401) return window.location.href = '/login.html';
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401) return window.location.href = '/login.html';
    return r.json();
  },
  async patch(path, body) {
    const r = await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.status === 401) return window.location.href = '/login.html';
    return r.json();
  },
  async del(path) {
    const r = await fetch(path, { method: 'DELETE' });
    if (r.status === 401) return window.location.href = '/login.html';
    return r.status === 204 ? {} : r.json();
  },
};

const icons = {
  sites: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>',
  active: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
  send: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>',
  chart: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
  trash: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>',
  play: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>',
  pause: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  insights: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>',
  check: '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
  warn: '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
};

function toast(msg) {
  document.getElementById('toastText').textContent = msg;
  const t = document.getElementById('toast');
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}

function showModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function pct(n) {
  return (Number(n) || 0).toFixed(1) + '%';
}

async function checkAuth() {
  const r = await fetch('/api/auth/me');
  if (!r.ok) return window.location.href = '/login.html';
  document.getElementById('app').classList.remove('hidden');
}

function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  if (page === 'inicio') loadInicio();
  if (page === 'urls') loadUrls();
  if (page === 'campanhas') loadCampaigns();
  if (page === 'modelos') loadIcons();
  if (page === 'configuracoes') loadSettings();
}

function statCard({ label, value, icon, gradient, sub }) {
  return `
    <div class="stat-card rounded-2xl p-5">
      <div class="flex items-start justify-between mb-4">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg">
          ${icon}
        </div>
        ${sub ? `<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">${sub}</span>` : ''}
      </div>
      <div class="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">${value}</div>
      <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">${label}</div>
    </div>
  `;
}

async function loadInicio() {
  const period = document.getElementById('reportPeriod')?.value || 'week';
  const [sites, urls, summary] = await Promise.all([
    api.get('/api/urls/sites'),
    api.get('/api/urls'),
    api.get(`/api/reports/summary?period=${period}`),
  ]);

  const activeUrls = urls.filter(u => u.status === 'ativa').length;
  const t = summary.totals || {};

  document.getElementById('summaryCards').innerHTML = [
    statCard({ label: 'Sites conectados', value: sites.length, icon: icons.sites, gradient: 'from-violet-500 to-fuchsia-500' }),
    statCard({ label: 'URLs ativas', value: activeUrls, icon: icons.active, gradient: 'from-emerald-500 to-teal-500', sub: `de ${urls.length}` }),
    statCard({ label: 'Pushes no período', value: t.sent || 0, icon: icons.send, gradient: 'from-orange-500 to-amber-500' }),
    statCard({ label: 'CTR médio', value: pct(t.ctr || 0), icon: icons.chart, gradient: 'from-blue-500 to-cyan-500' }),
  ].join('');

  document.getElementById('sitesCount').textContent = `${sites.length} ${sites.length === 1 ? 'site' : 'sites'}`;
  document.getElementById('sitesList').innerHTML = sites.map(s => `
    <div class="flex items-center justify-between p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition">
      <div class="min-w-0 flex-1">
        <div class="font-medium text-zinc-900 dark:text-white text-sm truncate">${s.domain}</div>
        <div class="text-[11px] text-zinc-500 dark:text-zinc-500 mt-0.5 font-mono">${s.app_id.slice(0, 16)}…</div>
      </div>
      <div class="ml-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold ${s.has_api_key ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}">
        ${s.has_api_key ? icons.check : icons.warn}
        ${s.has_api_key ? 'Conectado' : 'Pendente'}
      </div>
    </div>
  `).join('') || `<div class="text-center py-6 text-sm text-zinc-400 dark:text-zinc-500">Nenhum site conectado</div>`;

  renderChart(summary.daily || []);

  const days = period === 'month' ? 30 : 7;
  document.getElementById('exportCsvBtn').href = `/api/reports/export.csv?days=${days}`;
}

function renderChart(daily) {
  if (daily.length === 0) {
    document.getElementById('dailyChart').innerHTML = `
      <div class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto mb-2 flex items-center justify-center text-zinc-400">${icons.chart}</div>
          <div class="text-sm text-zinc-400 dark:text-zinc-500">Nenhum envio no período</div>
        </div>
      </div>`;
    return;
  }

  const sorted = [...daily].reverse();
  const max = Math.max(1, ...sorted.map(d => d.sent));

  const bars = sorted.map(d => {
    const h = (d.sent / max) * 100;
    return `
      <div class="flex-1 flex flex-col items-center justify-end group relative" style="min-width:0">
        <div class="relative w-full max-w-[40px] flex flex-col items-center">
          <div class="opacity-0 group-hover:opacity-100 transition text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1 whitespace-nowrap">${d.sent}</div>
          <div class="w-full rounded-t-md bg-gradient-to-t from-fuchsia-500/50 to-violet-500 transition-all duration-300 hover:from-fuchsia-500/70 hover:to-violet-400"
               style="height:${Math.max(h, 2)}%; min-height:2px"></div>
        </div>
      </div>
    `;
  }).join('');

  const labels = sorted.map(d => {
    const [, m, day] = d.day.split('-');
    return `<div class="flex-1 text-center text-[11px] text-zinc-400 dark:text-zinc-500 font-mono" style="min-width:0">${day}/${m}</div>`;
  }).join('');

  document.getElementById('dailyChart').innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex-1 flex items-end gap-1.5 px-1">${bars}</div>
      <div class="flex gap-1.5 px-1 mt-2">${labels}</div>
    </div>
    <div class="flex items-center justify-between mt-3 text-xs pt-3 border-t border-zinc-100 dark:border-zinc-800">
      <div class="flex items-center gap-4">
        <span class="text-zinc-400 dark:text-zinc-500">Total: <span class="font-semibold text-zinc-700 dark:text-zinc-300">${sorted.reduce((s, d) => s + d.sent, 0)} envios</span></span>
        <span class="text-zinc-400 dark:text-zinc-500">Pico: <span class="font-semibold text-zinc-700 dark:text-zinc-300">${max}/dia</span></span>
      </div>
    </div>
  `;
}

async function refreshCtr() {
  const btn = document.getElementById('refreshCtrBtn');
  btn.disabled = true;
  btn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Atualizando`;
  try {
    const r = await api.post('/api/reports/refresh-ctr');
    if (r.error) return toast(r.error);
    toast(`CTR atualizado (${r.count})`);
    loadInicio();
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Atualizar CTR`;
  }
}

async function loadUrls() {
  const [sites, urls] = await Promise.all([
    api.get('/api/urls/sites'),
    api.get('/api/urls'),
  ]);
  window._sites = sites;

  document.getElementById('urlsTable').innerHTML = urls.map(u => {
    const isActive = u.status === 'ativa';
    return `
    <tr class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 border border-violet-200/50 dark:border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-sm">
            ${u.site_domain.slice(0, 1).toUpperCase()}
          </div>
          <div class="min-w-0">
            <div class="font-semibold text-zinc-900 dark:text-white truncate">${u.label}</div>
            <div class="text-xs text-zinc-500 dark:text-zinc-500 truncate max-w-sm font-mono">${u.url}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium">${u.niche}</span>
      </td>
      <td class="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-sm font-medium">${u.daily_limit}/dia</td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
          <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse-soft' : 'bg-zinc-400'}"></span>
          ${u.status}
        </span>
      </td>
      <td class="px-6 py-4 text-right">
        <div class="inline-flex items-center gap-1">
          <button onclick="showInsights(${u.id}, '${u.label.replace(/'/g, "\\'")}')" class="p-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 transition" title="Insights">${icons.insights}</button>
          <button onclick="sendUrl(${u.id})" class="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition" title="Disparar agora">${icons.play}</button>
          <button onclick="toggleUrl(${u.id}, '${u.status}')" class="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition" title="${isActive ? 'Pausar' : 'Retomar'}">${icons.pause}</button>
          <button onclick="deleteUrl(${u.id})" class="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition" title="Remover">${icons.trash}</button>
        </div>
      </td>
    </tr>
  `}).join('') || `
    <tr>
      <td colspan="5" class="px-6 py-16">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto mb-3 flex items-center justify-center text-zinc-400">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          </div>
          <div class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nenhuma URL cadastrada</div>
          <div class="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Clique em "Nova URL" para começar</div>
        </div>
      </td>
    </tr>`;
}

function openNewUrlModal() {
  const sites = window._sites || [];
  const inputCls = 'w-full px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-1.5';
  showModal(`
    <h3 class="text-xl font-bold text-zinc-900 dark:text-white mb-1">Nova URL</h3>
    <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Cadastre uma página de destino para campanhas</p>
    <form id="newUrlForm" class="space-y-4">
      <div>
        <label class="${labelCls}">Site</label>
        <select name="site_id" required class="${inputCls}">
          ${sites.map(s => `<option value="${s.id}">${s.domain}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="${labelCls}">URL de destino</label>
        <input name="url" type="url" required class="${inputCls} font-mono" placeholder="https://..."/>
      </div>
      <div>
        <label class="${labelCls}">Rótulo</label>
        <input name="label" type="text" required class="${inputCls}" placeholder="Ex: Oferta Black Friday"/>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="${labelCls}">Nicho</label>
          <select name="niche" required class="${inputCls}">
            <option value="finanças">Finanças</option>
            <option value="jogos">Jogos</option>
            <option value="redes sociais">Redes sociais</option>
            <option value="entretenimento">Entretenimento</option>
            <option value="e-commerce">E-commerce</option>
            <option value="ofertas">Ofertas</option>
            <option value="relacionamentos">Relacionamentos</option>
            <option value="geral">Geral</option>
          </select>
        </div>
        <div>
          <label class="${labelCls}">Limite/dia</label>
          <input name="daily_limit" type="number" min="1" max="20" value="3" class="${inputCls}"/>
        </div>
      </div>
      <div class="flex gap-2 pt-3">
        <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 transition">Cancelar</button>
        <button type="submit" class="flex-1 btn-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium">Criar URL</button>
      </div>
    </form>
  `);
  document.getElementById('newUrlForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.site_id = parseInt(data.site_id, 10);
    data.daily_limit = parseInt(data.daily_limit, 10);
    const r = await api.post('/api/urls', data);
    if (r.error) return toast(r.error);
    closeModal();
    toast('URL criada');
    loadUrls();
  });
}

async function toggleUrl(id, current) {
  const status = current === 'ativa' ? 'pausada' : 'ativa';
  await api.patch(`/api/urls/${id}`, { status });
  toast(status === 'ativa' ? 'Retomada' : 'Pausada');
  loadUrls();
}

async function deleteUrl(id) {
  if (!confirm('Remover esta URL? As campanhas relacionadas também serão removidas.')) return;
  await api.del(`/api/urls/${id}`);
  toast('URL removida');
  loadUrls();
}

async function showInsights(urlId, label) {
  document.getElementById('insightsLabel').textContent = label;
  document.getElementById('insightsPanel').classList.remove('hidden');
  document.getElementById('insightsBody').innerHTML = '<div class="col-span-3 text-sm text-zinc-400 text-center py-4">Carregando…</div>';
  const r = await api.get(`/api/reports/url/${urlId}/insights`);
  const best = r.best_template;
  const hour = r.best_hour;
  const top = (r.templates || []).slice(0, 8);

  const insightCard = (title, value, sub, gradient, darkGradient, icon) => `
    <div class="rounded-xl bg-gradient-to-br ${gradient} dark:${darkGradient} p-5 border border-zinc-100 dark:border-zinc-800">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-7 h-7 rounded-lg bg-white/80 dark:bg-white/10 backdrop-blur flex items-center justify-center text-zinc-700 dark:text-zinc-200">${icon}</div>
        <div class="text-[11px] uppercase tracking-wide font-semibold text-zinc-600 dark:text-zinc-400">${title}</div>
      </div>
      <div class="text-xl font-bold text-zinc-900 dark:text-white">${value}</div>
      <div class="text-xs text-zinc-600 dark:text-zinc-400 mt-1">${sub}</div>
    </div>
  `;

  document.getElementById('insightsBody').innerHTML = `
    ${insightCard(
      'Melhor modelo',
      best ? best.template : '—',
      best ? `CTR ${pct(best.adjusted_ctr)} · ${best.impressions} impressões` : 'Sem dados',
      'from-violet-50 to-fuchsia-50',
      'from-violet-500/10 to-fuchsia-500/10',
      icons.chart
    )}
    ${insightCard(
      'Melhor horário',
      hour ? String(hour.hour).padStart(2, '0') + ':00' : '—',
      hour ? `CTR ${pct(hour.ctr)} · ${hour.impressions} impressões` : 'Sem dados',
      'from-blue-50 to-cyan-50',
      'from-blue-500/10 to-cyan-500/10',
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    )}
    <div class="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 p-5 border border-zinc-100 dark:border-zinc-800">
      <div class="text-[11px] uppercase tracking-wide font-semibold text-zinc-600 dark:text-zinc-400 mb-3">Ranking</div>
      ${top.length === 0 ? '<div class="text-xs text-zinc-400 dark:text-zinc-500">Sem dados ainda</div>' :
        top.map(t => `
          <div class="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
            <span class="text-xs text-zinc-700 dark:text-zinc-300 ${t.reliable ? 'font-semibold' : ''}">${t.template}</span>
            <span class="text-xs text-zinc-500 dark:text-zinc-400 font-mono">${pct(t.adjusted_ctr)}</span>
          </div>
        `).join('')
      }
    </div>
  `;
}

function closeInsights() {
  document.getElementById('insightsPanel').classList.add('hidden');
}

async function sendUrl(id) {
  const r = await api.post(`/api/campaigns/send-url/${id}`);
  if (r.error) return toast(r.error);
  if (r.skipped) toast(`Ignorado: ${r.skipped}`);
  else toast(`Enviado: ${r.title}`);
  loadUrls();
}

async function loadCampaigns() {
  const campaigns = await api.get('/api/campaigns');
  document.getElementById('campaignsTable').innerHTML = campaigns.map(c => `
    <tr class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
      <td class="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap font-medium">${fmtDate(c.sent_at)}</td>
      <td class="px-6 py-4">
        <div class="font-semibold text-zinc-900 dark:text-white text-sm truncate max-w-md">${c.title}</div>
        <div class="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">${c.label} · ${c.site_domain}</div>
      </td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 text-xs font-medium">${c.template}</span>
      </td>
      <td class="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-xs font-mono">v${c.variation}</td>
      <td class="px-6 py-4 text-right">
        <span class="text-sm font-bold ${(c.ctr || 0) > 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'} font-mono">${pct(c.ctr)}</span>
      </td>
    </tr>
  `).join('') || `
    <tr>
      <td colspan="5" class="px-6 py-16">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto mb-3 flex items-center justify-center text-zinc-400">
            ${icons.send}
          </div>
          <div class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nenhuma campanha enviada</div>
          <div class="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Use "Disparar agora" para começar</div>
        </div>
      </td>
    </tr>`;
}

async function sendNow() {
  if (!confirm('Disparar campanhas para todas as URLs ativas agora?')) return;
  const r = await api.post('/api/campaigns/send-now');
  if (r.error) return toast(r.error);
  const sent = r.results.filter(x => x.sent).length;
  toast(`${sent} push(es) disparado(s)`);
  loadCampaigns();
}

async function loadIcons() {
  const iconsList = await api.get('/images/icons');
  document.getElementById('iconsGrid').innerHTML = iconsList.map(f => `
    <div class="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm p-4 text-center hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-md transition group">
      <div class="w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
        <img src="/images/icons/${f}" class="w-full h-full object-contain" alt="${f}"/>
      </div>
      <div class="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate mb-2">${f}</div>
      <button onclick="deleteIcon('${f}')" class="opacity-0 group-hover:opacity-100 text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-medium transition">Remover</button>
    </div>
  `).join('');
}

async function deleteIcon(name) {
  if (!confirm(`Remover o ícone ${name}?`)) return;
  await api.del(`/images/icons/${encodeURIComponent(name)}`);
  toast('Ícone removido');
  loadIcons();
}

document.getElementById('iconUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const name = prompt('Nome do ícone (apenas letras/números):', file.name.replace(/\.[^.]+$/, ''));
  if (!name) return;
  const fd = new FormData();
  fd.append('icon', file);
  fd.append('name', name);
  const r = await fetch('/images/icons', { method: 'POST', body: fd });
  const j = await r.json();
  if (!r.ok) return toast(j.error || 'Falha no upload');
  toast('Ícone enviado');
  loadIcons();
});

async function loadSettings() {
  const [settings, sites] = await Promise.all([
    api.get('/api/settings'),
    api.get('/api/urls/sites'),
  ]);
  document.getElementById('sendTimes').value = settings.send_times || '';
  document.getElementById('timezone').value = settings.timezone || '';
  document.getElementById('publicBaseUrl').value = settings.public_base_url || '';
  document.getElementById('autoApprove').checked = settings.auto_approve === 'true';

  document.getElementById('apiKeysList').innerHTML = sites.map(s => `
    <div class="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/30">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 border border-violet-200/50 dark:border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-xs">${s.domain.slice(0, 1).toUpperCase()}</div>
          <div>
            <div class="font-semibold text-zinc-900 dark:text-white text-sm">${s.domain}</div>
            <div class="text-[11px] text-zinc-500 dark:text-zinc-500">App ID ${s.app_id.slice(0, 16)}…</div>
          </div>
        </div>
        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${s.has_api_key ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}">
          ${s.has_api_key ? icons.check : icons.warn}
          ${s.has_api_key ? 'Configurada' : 'Pendente'}
        </span>
      </div>
      <div class="flex gap-2">
        <input id="apiKey_${s.id}" type="password" placeholder="Cole aqui a REST API Key"
               class="flex-1 px-3.5 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"/>
        <button onclick="saveApiKey(${s.id})" class="px-4 py-2 bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white rounded-lg text-sm font-medium transition">Salvar</button>
      </div>
    </div>
  `).join('');
}

async function saveApiKey(siteId) {
  const key = document.getElementById(`apiKey_${siteId}`).value.trim();
  if (!key) return toast('Digite a chave');
  const r = await api.patch(`/api/urls/sites/${siteId}`, { api_key: key });
  if (r.error) return toast(r.error);
  toast('Chave salva');
  loadSettings();
}

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  const body = {
    send_times: document.getElementById('sendTimes').value,
    timezone: document.getElementById('timezone').value,
    public_base_url: document.getElementById('publicBaseUrl').value,
    auto_approve: document.getElementById('autoApprove').checked ? 'true' : 'false',
  };
  const r = await api.patch('/api/settings', body);
  if (r.error) return toast(r.error);
  toast('Configurações salvas');
});

function applyThemeUI() {
  const isDark = document.documentElement.classList.contains('dark');
  document.getElementById('themeIconDark').classList.toggle('hidden', !isDark);
  document.getElementById('themeIconLight').classList.toggle('hidden', isDark);
  document.getElementById('themeLabel').textContent = isDark ? 'Modo claro' : 'Modo escuro';
}
applyThemeUI();

document.getElementById('themeToggle').addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  applyThemeUI();
  const active = document.querySelector('.nav-item.active')?.dataset.page;
  if (active === 'inicio') loadInicio();
});

document.getElementById('newUrlBtn').addEventListener('click', openNewUrlModal);
document.getElementById('sendNowBtn').addEventListener('click', sendNow);
document.getElementById('refreshCtrBtn').addEventListener('click', refreshCtr);
document.getElementById('reportPeriod').addEventListener('change', loadInicio);
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api.post('/api/auth/logout');
  window.location.href = '/login.html';
});
document.querySelectorAll('.nav-item').forEach(n => {
  n.addEventListener('click', () => navigate(n.dataset.page));
});
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') closeModal();
});

window.toggleUrl = toggleUrl;
window.deleteUrl = deleteUrl;
window.sendUrl = sendUrl;
window.deleteIcon = deleteIcon;
window.saveApiKey = saveApiKey;
window.closeModal = closeModal;
window.showInsights = showInsights;
window.closeInsights = closeInsights;

checkAuth().then(() => navigate('inicio'));
