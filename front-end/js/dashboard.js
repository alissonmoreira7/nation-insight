// ─── dashboard.js — NationInsight ────────────────────────────────────────────
// Segue exatamente o mesmo padrão de ideias.js e recompensas.js

// ─── ESTADO ───────────────────────────────────────────────────────────────────
const Dashboard = {
  kpis: null,
  graficoMensal: [],
  graficoCategorias: [],
  ideiasRecentes: [],
  topColaboradores: [],
};

// ─── DADOS FALLBACK (usado somente se a API não responder) ────────────────────
const FALLBACK = {
  kpis: {
    total_ideias:     0,
    aprovadas:        0,
    implementadas:    0,
    colaboradores:    0,
    pontos:           0,
    taxa_aprovacao:   0,
  },
  graficoMensal: [
    { mes: 'Jan', enviadas: 0, aprovadas: 0 },
    { mes: 'Fev', enviadas: 0, aprovadas: 0 },
    { mes: 'Mar', enviadas: 0, aprovadas: 0 },
    { mes: 'Abr', enviadas: 0, aprovadas: 0 },
    { mes: 'Mai', enviadas: 0, aprovadas: 0 },
    { mes: 'Jun', enviadas: 0, aprovadas: 0 },
    { mes: 'Jul', enviadas: 0, aprovadas: 0 },
  ],
  categorias: [],
  ideiasRecentes: [],
  topColaboradores: [],
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  checkAuth();

  const usu = getUsuario();
  if (usu) sincronizarPontosTopbar(usu.pontos || 0);

  await carregarDados();
}

async function carregarDados() {
  try {
    const dados = await DashboardAPI.dados();

    Dashboard.kpis              = dados.kpis;
    Dashboard.graficoMensal     = dados.graficoMensal;
    Dashboard.graficoCategorias = dados.categorias;
    Dashboard.ideiasRecentes    = dados.ideiasRecentes;
    Dashboard.topColaboradores  = dados.topColaboradores;
  } catch (err) {
    console.warn('Falha ao carregar dashboard da API, usando dados fallback:', err);
    Dashboard.kpis              = FALLBACK.kpis;
    Dashboard.graficoMensal     = FALLBACK.graficoMensal;
    Dashboard.graficoCategorias = FALLBACK.categorias;
    Dashboard.ideiasRecentes    = FALLBACK.ideiasRecentes;
    Dashboard.topColaboradores  = FALLBACK.topColaboradores;
  }

  renderDashboard();
}

function statusCor(status) {
  const mapa = {
    'Pendente':   '#6B7280',
    'Em Análise': '#F59E0B',
    'Aprovada':   '#3B82F6',
    'Rejeitada':  '#EF4444',
    'Implementada':'#10B981',
  };
  return mapa[status] || '#6B7280';
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderDashboard() {
  renderKPIs();
  renderGraficoArea();
  renderGraficoDonut();
  renderIdeiasRecentes();
  renderTaxaAprovacao();
  renderTopColaboradores();
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
function renderKPIs() {
  const k = Dashboard.kpis;
  const cards = [
    { id: 'kpi-total',    valor: k.total_ideias,                      label: 'Total de Ideias',         sub: 'submetidas',       icon: '💡', bg: '#EFF6FF', cor: '#3B82F6' },
    { id: 'kpi-aprov',    valor: k.aprovadas,                         label: 'Aprovadas',                sub: `taxa: ${k.taxa_aprovacao.toFixed(1)}%`, icon: '✅', bg: '#FFFBEB', cor: '#D4AF37' },
    { id: 'kpi-impl',     valor: k.implementadas,                     label: 'Implementadas',            sub: 'em produção',      icon: '⚡', bg: '#F0FDF4', cor: '#10B981' },
    { id: 'kpi-colab',    valor: k.colaboradores,                     label: 'Colaboradores Ativos',     sub: 'participantes',    icon: '👥', bg: '#F5F3FF', cor: '#8B5CF6' },
    { id: 'kpi-pontos',   valor: k.pontos.toLocaleString('pt-BR'),    label: 'Pontos Distribuídos',      sub: 'total acumulado',  icon: '⭐', bg: '#FFFBEB', cor: '#F59E0B' },
  ];

  const grid = document.getElementById('kpiGrid');
  if (!grid) return;

  grid.innerHTML = cards.map(c => `
    <div class="kpi-card">
      <div class="kpi-icon" style="background:${c.bg};color:${c.cor}">${c.icon}</div>
      <div class="kpi-body">
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-valor" id="${c.id}">${c.valor}</div>
        <div class="kpi-sub">${c.sub}</div>
      </div>
    </div>
  `).join('');

  // Anima entrada dos números
  grid.querySelectorAll('.kpi-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    setTimeout(() => {
      el.style.transition = 'opacity .35s ease, transform .35s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, i * 60);
  });
}

// ─── GRÁFICO DE ÁREA (SVG puro, sem libs externas) ───────────────────────────
function renderGraficoArea() {
  const dados = Dashboard.graficoMensal;
  const wrap  = document.getElementById('areaChartWrap');
  if (!wrap) return;

  const W = wrap.offsetWidth || 480;
  const H = 200;
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const maxY = Math.max(...dados.map(d => d.enviadas)) + 2;
  const n    = dados.length;

  const xPos = (i) => PAD.left + (i / (n - 1)) * chartW;
  const yPos = (v) => PAD.top  + chartH - (v / maxY) * chartH;

  // Pontos das linhas
  const ptsEnv  = dados.map((d, i) => [xPos(i), yPos(d.enviadas)]);
  const ptsAprov = dados.map((d, i) => [xPos(i), yPos(d.aprovadas)]);

  const polyline = (pts) => pts.map(p => p.join(',')).join(' ');
  const areaPath = (pts) => {
    const last  = pts[pts.length - 1];
    const first = pts[0];
    return `M${pts.map(p => p.join(' ')).join(' L')} L${last[0]} ${PAD.top + chartH} L${first[0]} ${PAD.top + chartH} Z`;
  };

  // Grid horizontal
  const gridLines = [0, .25, .5, .75, 1].map(t => {
    const y = PAD.top + chartH * t;
    const v = Math.round(maxY * (1 - t));
    return `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + chartW}" y2="${y}" stroke="rgba(0,0,0,.05)" stroke-dasharray="3 3"/>
            <text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#9ca3af">${v}</text>`;
  }).join('');

  // Labels X
  const xLabels = dados.map((d, i) =>
    `<text x="${xPos(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#9ca3af">${d.mes}</text>`
  ).join('');

  // Tooltips (circles + title)
  const dots = (pts, cor, label) => pts.map((p, i) =>
    `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${cor}" stroke="white" stroke-width="1.5">
       <title>${label}: ${Dashboard.graficoMensal[i][label === 'Enviadas' ? 'enviadas' : 'aprovadas']}</title>
     </circle>`
  ).join('');

  wrap.innerHTML = `
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gEnv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3B82F6" stop-opacity=".15"/>
          <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="gAprov" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#D4AF37" stop-opacity=".18"/>
          <stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      ${xLabels}
      <path d="${areaPath(ptsEnv)}"  fill="url(#gEnv)"   stroke="none"/>
      <path d="${areaPath(ptsAprov)}" fill="url(#gAprov)" stroke="none"/>
      <polyline points="${polyline(ptsEnv)}"  fill="none" stroke="#3B82F6" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      <polyline points="${polyline(ptsAprov)}" fill="none" stroke="#D4AF37" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots(ptsEnv,  '#3B82F6', 'Enviadas')}
      ${dots(ptsAprov, '#D4AF37', 'Aprovadas')}
    </svg>
  `;
}

// ─── GRÁFICO DONUT (SVG puro) ─────────────────────────────────────────────────
function renderGraficoDonut() {
  const cats    = Dashboard.graficoCategorias;
  const totalGr = cats.reduce((s, c) => s + c.total, 0);

  const svgWrap = document.getElementById('donutSvg');
  const legend  = document.getElementById('donutLegend');
  if (!svgWrap || !legend) return;

  const R = 70, r = 42, cx = 80, cy = 80;
  const TAU = 2 * Math.PI;

  let startAngle = -Math.PI / 2;
  const paths = cats.map(cat => {
    const angle = (cat.total / totalGr) * TAU;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const endAngle = startAngle + angle;
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const xi1 = cx + r * Math.cos(startAngle);
    const yi1 = cy + r * Math.sin(startAngle);
    const xi2 = cx + r * Math.cos(endAngle);
    const yi2 = cy + r * Math.sin(endAngle);
    const large = angle > Math.PI ? 1 : 0;

    const d = `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${xi2} ${yi2} A${r} ${r} 0 ${large} 0 ${xi1} ${yi1} Z`;
    startAngle = endAngle;

    return `<path d="${d}" fill="${cat.cor}" stroke="white" stroke-width="1.5">
              <title>${cat.nome}: ${cat.total}</title>
            </path>`;
  }).join('');

  svgWrap.innerHTML = `
    <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" width="160" height="160">
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="${r - 2}" fill="white"/>
    </svg>
    <div class="donut-center-label">
      <div class="donut-center-num">${totalGr}</div>
      <div class="donut-center-text">total</div>
    </div>
  `;

  legend.innerHTML = cats.map(cat => {
    const pct = Math.round(cat.total / totalGr * 100);
    return `
      <div class="donut-legend-item">
        <div style="width:10px;height:10px;border-radius:50%;background:${cat.cor};flex-shrink:0"></div>
        <span style="flex:1;font-size:11.5px;color:#374151">${cat.nome}</span>
        <div class="donut-legend-bar-wrap">
          <div class="donut-legend-bar" style="width:${pct}%;background:${cat.cor}"></div>
        </div>
        <div class="donut-legend-count">${cat.total}</div>
      </div>
    `;
  }).join('');
}

// ─── IDEIAS RECENTES ──────────────────────────────────────────────────────────
function renderIdeiasRecentes() {
  const el = document.getElementById('ideiasRecentesList');
  if (!el) return;

  el.innerHTML = Dashboard.ideiasRecentes.map(i => {
    const ptsTag = i.pts > 0
      ? `<span class="pts-tag">+${i.pts} pts</span>`
      : '';
    return `
      <div class="ideia-row">
        <div class="ideia-status-dot" style="background:${i.cor}"></div>
        <div class="ideia-row-body">
          <div class="ideia-row-title">${i.titulo}</div>
          <div class="ideia-row-meta">${i.autor} · ${i.data}</div>
        </div>
        <div class="ideia-row-right">
          ${ptsTag}
          <span class="status-tag" style="background:${i.cor}18;color:${i.cor}">${i.status}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ─── TAXA DE APROVAÇÃO ────────────────────────────────────────────────────────
function renderTaxaAprovacao() {
  const el = document.getElementById('taxaList');
  if (!el) return;

  const k    = Dashboard.kpis;
  const taxa = [
    { label: 'Taxa de Aprovação',   pct: k.taxa_aprovacao,                                                         cor: '#D4AF37' },
    { label: 'Implementadas',       pct: k.aprovadas > 0 ? (k.implementadas / k.aprovadas) * 100 : 0,             cor: '#10B981' },
    { label: 'Taxa de Participação',pct: k.colaboradores > 0 ? Math.min(100, (k.total_ideias / k.colaboradores) * 100 * 3) : 0, cor: '#3B82F6' },
  ];

  el.innerHTML = taxa.map(t => `
    <div class="taxa-item">
      <div class="taxa-item-header">
        <span class="taxa-item-label">${t.label}</span>
        <span class="taxa-item-pct" style="color:${t.cor}">${t.pct.toFixed(1)}%</span>
      </div>
      <div class="taxa-bar-track">
        <div class="taxa-bar-fill" style="width:0%;background:${t.cor}" data-target="${t.pct}"></div>
      </div>
    </div>
  `).join('');

  // Animação das barras
  setTimeout(() => {
    el.querySelectorAll('.taxa-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 200);
}

// ─── TOP COLABORADORES ────────────────────────────────────────────────────────
function renderTopColaboradores() {
  const el = document.getElementById('topColabList');
  if (!el) return;

  const rankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
  const rankIcon  = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;

  el.innerHTML = Dashboard.topColaboradores.map((c, i) => `
    <div class="colab-item">
      <div class="colab-rank ${rankClass(i)}">${rankIcon(i)}</div>
      <div class="colab-avatar" style="background:${c.bg};color:white">${c.iniciais}</div>
      <div class="colab-info">
        <div class="colab-nome">${c.nome}</div>
        <div class="colab-dept">${c.dept}</div>
      </div>
      <div class="colab-pts">${c.pts.toLocaleString('pt-BR')} pts</div>
    </div>
  `).join('');
}

// ─── SINCRONIZAÇÃO TOPBAR ─────────────────────────────────────────────────────
function sincronizarPontosTopbar(pontos) {
  if (typeof window.atualizarPontosTopbar === 'function') {
    window.atualizarPontosTopbar(pontos);
  }
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
function toast(msg) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// Recalcula gráfico de área em resize
window.addEventListener('resize', () => {
  if (Dashboard.graficoMensal.length) renderGraficoArea();
});

// ─── START ────────────────────────────────────────────────────────────────────
init();