// ─── recompensas.js — VERSÃO INTEGRADA COM API ───────────────────────────────
// Requer: <script src="js/api.js"></script> ANTES deste arquivo no HTML
 
let state = {
  pontos: 0,
  historico: [],
  recompensas: []
};
 
let filtroAtual  = 'disponiveis';
let resgateAtual = null;
 
// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────
 
async function init() {
  checkAuth();
  await Promise.all([carregarCatalogo(), carregarHistorico()]);
}
 
async function carregarCatalogo() {
  try {
    mostrarLoading(true);
    const resultado = await Recompensas.catalogo();
    // resultado = { pontos: 450, recompensas: [...] }
    state.pontos       = resultado.pontos;
    state.recompensas  = resultado.recompensas;
    render();
  } catch (err) {
    toast('❌ Erro ao carregar catálogo: ' + err.message);
    console.error(err);
  } finally {
    mostrarLoading(false);
  }
}
 
async function carregarHistorico() {
  try {
    state.historico = await Recompensas.historico();
    // Se o filtro já estiver em histórico, re-renderiza
    if (filtroAtual === 'historico') renderGrid();
  } catch (err) {
    console.error('Erro ao carregar histórico:', err.message);
    state.historico = [];
  }
}
 
function mostrarLoading(show) {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}
 
// ─── RENDER ───────────────────────────────────────────────────────────────────
 
function render() {
  atualizarPontos();
  atualizarMeta();
  renderGrid();
  atualizarContadores();
}
 
function atualizarPontos() {
  const disponiveis = state.recompensas.filter(r => r.pts <= state.pontos && r.disponiveis > 0).length;
 
  const elHero    = document.getElementById('pontosHero');
  const elTopbar  = document.getElementById('pontosTopbar');
  const elHeroSub = document.getElementById('heroSub');
 
  if (elHero)    elHero.textContent    = state.pontos;
  if (elTopbar)  elTopbar.textContent  = state.pontos;
  if (elHeroSub) elHeroSub.textContent =
    `Você pode resgatar ${disponiveis} recompensa${disponiveis !== 1 ? 's' : ''}`;
}
 
function atualizarMeta() {
  const meta = state.recompensas.find(r => r.pts > state.pontos)
    || state.recompensas[state.recompensas.length - 1];
  if (!meta) return;
 
  const pct    = Math.min(100, Math.round(state.pontos / meta.pts * 100));
  const faltam = Math.max(0, meta.pts - state.pontos);
 
  const elFaltam   = document.getElementById('metaFaltam');
  const elProgress = document.getElementById('progressFill');
 
  if (elFaltam) elFaltam.textContent =
    faltam > 0 ? `Faltam ${faltam} pontos` : 'Meta atingida! 🎉';
 
  setTimeout(() => {
    if (elProgress) elProgress.style.width = pct + '%';
  }, 200);
}
 
function atualizarContadores() {
  const disp  = state.recompensas.filter(r => r.pts <= state.pontos && r.disponiveis > 0).length;
  const todas = state.recompensas.length;
  const elDisp  = document.getElementById('countDisp');
  const elTodas = document.getElementById('countTodas');
  if (elDisp)  elDisp.textContent  = disp;
  if (elTodas) elTodas.textContent = todas;
}
 
function renderGrid() {
  const grid = document.getElementById('rewardsGrid');
  const hist = document.getElementById('historicoList');
 
  if (filtroAtual === 'historico') {
    grid.style.display = 'none';
    hist.style.display = 'flex';
    hist.innerHTML = state.historico.length === 0
      ? '<p style="color:var(--cinza-claro);font-size:14px">Nenhum resgate realizado ainda.</p>'
      : state.historico.map(h => `
        <div class="historico-item">
          <div class="hist-icon">${h.icon}</div>
          <div class="hist-info">
            <div class="hist-nome">${h.nome}</div>
            <div class="hist-data">Resgatado em ${h.data}</div>
          </div>
          <div class="hist-pts">-${h.pts} pts</div>
        </div>
      `).join('');
    return;
  }
 
  hist.style.display = 'none';
  grid.style.display = 'grid';
 
  let lista = state.recompensas;
  if (filtroAtual === 'disponiveis') {
    lista = lista.filter(r => r.pts <= state.pontos && r.disponiveis > 0);
  }
 
  if (lista.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--cinza-claro);font-size:14px">
      Nenhuma recompensa disponível com seus pontos atuais.
    </div>`;
    return;
  }
 
  grid.innerHTML = lista.map(r => {
    const podeSgatar = r.pts <= state.pontos && r.disponiveis > 0;
    return `
      <div class="reward-card ${!podeSgatar ? 'locked' : ''}">
        <div class="card-top">
          <div>
            <div class="card-icon-wrap">${r.icon}</div>
            <div class="card-top-name">${r.nome}</div>
          </div>
          <span class="card-pts-badge">${r.pts} pts</span>
        </div>
        <div class="card-body">
          <div class="card-desc">${r.desc}</div>
          <div class="card-disponiveis">📦 ${r.disponiveis} disponíve${r.disponiveis === 1 ? 'l' : 'is'}</div>
          <button class="btn-resgatar"
            ${!podeSgatar ? 'disabled' : ''}
            onclick="abrirModal(${r.id})">
            ${podeSgatar ? 'Resgatar Agora' : r.pts > state.pontos ? `🔒 Faltam ${r.pts - state.pontos} pts` : 'Esgotado'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}
 
// ─── FILTRO ───────────────────────────────────────────────────────────────────
 
function filtrar(tipo, btn) {
  filtroAtual = tipo;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Carrega histórico fresh se necessário
  if (tipo === 'historico') carregarHistorico().then(() => renderGrid());
  else renderGrid();
}
 
// ─── MODAL ────────────────────────────────────────────────────────────────────
 
function abrirModal(id) {
  const r = state.recompensas.find(r => r.id === id);
  if (!r) return;
  resgateAtual = r;
  document.getElementById('modalTitle').textContent = `Resgatar ${r.nome}?`;
  document.getElementById('modalDesc').textContent  = r.desc;
  document.getElementById('modalPts').textContent   = `${r.pts} pontos`;
  document.getElementById('modalConfirm').classList.add('open');
}
 
function fecharModal() {
  document.getElementById('modalConfirm').classList.remove('open');
  resgateAtual = null;
}
 
// ─── CONFIRMAR RESGATE — AGORA USA A API ──────────────────────────────────────
 
async function confirmarResgate() {
  if (!resgateAtual) return;
  const r = resgateAtual;
 
  const btn = document.getElementById('btnConfirmarResgate'); // adicione este id no HTML se não existir
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Processando...'; }
 
  try {
    const resultado = await Recompensas.resgatar(r.id);
    // resultado = { mensagem, pontos: novoSaldo, resgate: { id, nome, icon, pts, data } }
 
    // Atualiza state com dados reais do servidor
    state.pontos = resultado.pontos;
    state.historico.unshift(resultado.resgate);
 
    // Decrementa estoque localmente (evita recarregar tudo)
    const rec = state.recompensas.find(x => x.id === r.id);
    if (rec) {
      rec.disponiveis = Math.max(0, rec.disponiveis - 1);
      rec.desbloqueado = rec.custo_pontos <= state.pontos && rec.disponiveis > 0;
    }
 
    fecharModal();
 
    document.getElementById('modalSucessoDesc').textContent =
      `"${r.nome}" foi resgatado com sucesso! Você usou ${r.pts} pontos e agora tem ${state.pontos} pontos.`;
    document.getElementById('modalSucesso').classList.add('open');
 
    render();
 
  } catch (err) {
    toast('❌ ' + err.message);
    fecharModal();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar Resgate'; }
  }
}
 
function fecharSucesso() {
  document.getElementById('modalSucesso').classList.remove('open');
  toast(`✓ Resgate de "${resgateAtual?.nome || 'benefício'}" confirmado!`);
  resgateAtual = null;
}
 
// ─── TOAST ────────────────────────────────────────────────────────────────────
 
function toast(msg) {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>🏆</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
 
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) {
      o.classList.remove('open');
      resgateAtual = null;
    }
  });
});
 
// ─── START ────────────────────────────────────────────────────────────────────
init();