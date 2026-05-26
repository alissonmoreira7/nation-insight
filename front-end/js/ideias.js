// ─── ideias.js — VERSÃO INTEGRADA COM API ────────────────────────────────────
// Requer: <script src="js/api.js"></script> ANTES deste arquivo no HTML

let state = {
  usuario: getUsuario() || { nome: 'Usuário', iniciais: 'U', cargo: '', pontos: 0, ranking: 0 },
  ideias: []
};

let filtroAtual = 'todas';
let viewAtual   = 'lista';
let buscaAtual  = '';
let editandoId  = null;
let excluindoId = null;

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────────

const statusCfg = {
  'Pendente':   { cls: 'badge-pendente',  label: '⏳ Pendente',   passos: [true, false, false, false] },
  'Em Análise': { cls: 'badge-analise',   label: '🔍 Em Análise', passos: [true, true,  false, false] },
  'Aprovada':   { cls: 'badge-aprovada',  label: '✅ Aprovada',   passos: [true, true,  true,  true]  },
  'Rejeitada':  { cls: 'badge-rejeitada', label: '❌ Rejeitada',  passos: [true, true,  false, false] },
};
const impactoCfg = {
  'Alto':  { cls: 'badge-impacto-alto',  label: '🔴 Impacto Alto'  },
  'Médio': { cls: 'badge-impacto-medio', label: '🟠 Impacto Médio' },
  'Baixo': { cls: 'badge-impacto-baixo', label: '🟢 Impacto Baixo' },
};
const trackerLabels = ['Submetida', 'Em Análise', 'Aprovada', 'Concluída'];

// ─── INICIALIZAÇÃO (substitui render() direto) ─────────────────────────────────

async function init() {
  // 1. Verifica autenticação — redireciona se não houver token
  checkAuth();

  // 2. Preenche dados do usuário vindo do localStorage (login)
  const usu = getUsuario();
  if (usu) {
    state.usuario = usu;
  }

  // 3. Carrega ideias da API
  await carregarIdeias();
}

async function carregarIdeias() {
  try {
    mostrarLoading(true);
    state.ideias = await Ideias.minhas();
    render();
  } catch (err) {
    toast('❌ Erro ao carregar ideias: ' + err.message);
    console.error(err);
  } finally {
    mostrarLoading(false);
  }
}

function mostrarLoading(show) {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ─── RENDER PRINCIPAL ──────────────────────────────────────────────────────────

function render() {
  atualizarKPIs();
  atualizarContadores();
  renderLista();
  const pontosTop = document.getElementById('pontosTop');
  if (pontosTop) pontosTop.textContent = state.usuario.pontos;
}

function atualizarKPIs() {
  const ids = state.ideias;
  document.getElementById('kpiTotal').textContent     = ids.length;
  document.getElementById('kpiAnalise').textContent   = ids.filter(i => i.status === 'Em Análise').length;
  document.getElementById('kpiAprovadas').textContent = ids.filter(i => i.status === 'Aprovada').length;
  document.getElementById('kpiPontos').textContent    = state.usuario.pontos;
  document.getElementById('kpiRanking').textContent   = `Ranking #${state.usuario.ranking} geral`;
}

function atualizarContadores() {
  const ids = state.ideias;
  document.getElementById('cntTodas').textContent    = ids.length;
  document.getElementById('cntPendente').textContent = ids.filter(i => i.status === 'Pendente').length;
  document.getElementById('cntAnalise').textContent  = ids.filter(i => i.status === 'Em Análise').length;
  document.getElementById('cntAprovada').textContent = ids.filter(i => i.status === 'Aprovada').length;
  document.getElementById('cntRejeitada').textContent= ids.filter(i => i.status === 'Rejeitada').length;
}

function renderLista() {
  const sort = document.getElementById('sortSelect').value;
  let lista = [...state.ideias];

  if (filtroAtual !== 'todas') lista = lista.filter(i => i.status === filtroAtual);

  if (buscaAtual.trim()) {
    const q = buscaAtual.toLowerCase();
    lista = lista.filter(i =>
      i.titulo.toLowerCase().includes(q) ||
      i.desc.toLowerCase().includes(q) ||
      i.categoria.toLowerCase().includes(q)
    );
  }

  if (sort === 'antigo')  lista.sort((a,b) => a.id - b.id);
  else if (sort === 'recente') lista.sort((a,b) => b.id - a.id);
  else if (sort === 'pontos')  lista.sort((a,b) => (b.pts||0) - (a.pts||0));
  else if (sort === 'impacto') lista.sort((a,b) => {
    const ord = { Alto: 0, Médio: 1, Baixo: 2 };
    return (ord[a.impacto]||2) - (ord[b.impacto]||2);
  });

  const container = document.getElementById('ideiasContainer');

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💡</div>
        <h3>${buscaAtual ? 'Nenhum resultado encontrado' : 'Nenhuma ideia aqui ainda'}</h3>
        <p>${buscaAtual ? 'Tente outros termos de busca.' : 'Clique em "+ Nova Ideia" para começar a contribuir!'}</p>
      </div>`;
    return;
  }

  const wrapClass = viewAtual === 'grid' ? 'ideias-grid' : 'ideias-lista';
  container.innerHTML = `<div class="${wrapClass}">${lista.map(renderCard).join('')}</div>`;
}

function renderCard(ideia) {
  const sc = statusCfg[ideia.status] || statusCfg['Pendente'];
  const ic = impactoCfg[ideia.impacto] || impactoCfg['Médio'];

  const tracker = trackerLabels.map((lbl, i) => {
    const passos = sc.passos;
    const cls = (ideia.status === 'Rejeitada' && i === 2)
      ? ''
      : passos[i] ? (i < passos.filter(Boolean).length - 1 || passos[i] && !passos[i+1] ? 'done' : 'active') : '';
    const dotCls = (ideia.status === 'Rejeitada' && i === 2) ? '' :
      passos[i] ? (i === passos.lastIndexOf(true) ? 'active' : 'done') : '';
    const dotIcon = dotCls === 'done' ? '✓' : dotCls === 'active' ? '●' : '';
    return `<div class="tracker-step ${dotCls}">
      <div class="tracker-dot">${dotIcon}</div>
      <div class="tracker-label">${lbl}</div>
    </div>`;
  }).join('');

  const podEditar  = ideia.status === 'Pendente';
  const podExcluir = ideia.status === 'Pendente' || ideia.status === 'Rejeitada';

  return `
    <div class="ideia-card" onclick="verDetalhes(${ideia.id})">
      <div class="ideia-top">
        <div class="ideia-titulo">${ideia.titulo}</div>
        <div class="ideia-badges">
          <span class="badge ${sc.cls}">${sc.label}</span>
          <span class="badge ${ic.cls}">${ic.label}</span>
        </div>
      </div>
      <div class="ideia-tags">
        <span class="tag-cat">${ideia.categoria}</span>
        ${ideia.prazo ? `<span class="tag-cat">⏱ ${ideia.prazo}</span>` : ''}
        ${ideia.recursos ? `<span class="tag-cat">🔧 ${ideia.recursos}</span>` : ''}
      </div>
      <div class="ideia-desc">${ideia.desc}</div>
      <div class="status-tracker">${tracker}</div>
      <div class="ideia-footer">
        <div class="ideia-meta">
          <div class="meta-item">💬 <strong>${ideia.comentarios}</strong> comentários</div>
          <div class="meta-item">👁 <strong>${ideia.visualizacoes}</strong> visualizações</div>
          <div class="meta-item">📅 ${ideia.data}</div>
          ${ideia.pts ? `<div class="meta-item pts-earned">⭐ +${ideia.pts} pts</div>` : ''}
        </div>
        <div class="ideia-actions" onclick="event.stopPropagation()">
          <button class="btn-acao btn-ver" onclick="verDetalhes(${ideia.id})">🔍 Ver</button>
          ${podEditar ? `<button class="btn-acao btn-editar" onclick="editarIdeia(${ideia.id})">✏️ Editar</button>` : ''}
          ${podExcluir ? `<button class="btn-acao btn-excluir" onclick="confirmarExcluirModal(${ideia.id})">🗑️ Excluir</button>` : ''}
        </div>
      </div>
    </div>`;
}

// ─── FILTRO / BUSCA / VIEW ─────────────────────────────────────────────────────

function filtrar(status, btn) {
  filtroAtual = status;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLista();
}

function buscar(val) {
  buscaAtual = val;
  renderLista();
}

function setView(v) {
  viewAtual = v;
  document.getElementById('btnLista').classList.toggle('active', v === 'lista');
  document.getElementById('btnGrid').classList.toggle('active', v === 'grid');
  renderLista();
}

// ─── MODAL DETALHES ────────────────────────────────────────────────────────────

function verDetalhes(id) {
  const i = state.ideias.find(x => x.id === id);
  if (!i) return;

  const sc = statusCfg[i.status] || statusCfg['Pendente'];
  const ic = impactoCfg[i.impacto] || impactoCfg['Médio'];

  document.getElementById('detTitulo').textContent = i.titulo;

  document.getElementById('detBadges').innerHTML = `
    <span class="badge ${sc.cls}">${sc.label}</span>
    <span class="badge ${ic.cls}">${ic.label}</span>
    <span class="badge" style="background:rgba(10,37,64,.07);color:var(--azul)">${i.categoria}</span>
  `;

  document.getElementById('detDesc').textContent = i.desc;

  const fw = document.getElementById('detFeedbackWrap');
  fw.innerHTML = i.feedback ? `
    <div class="gestor-feedback">
      <div class="gestor-feedback-label">💬 Feedback do Gestor</div>
      <div class="gestor-feedback-text">${i.feedback}</div>
    </div>` : '';

  const passos = sc.passos;
  const tracker = trackerLabels.map((lbl, idx) => {
    const cls = (i.status === 'Rejeitada' && idx === 2) ? '' :
      passos[idx] ? (idx === passos.lastIndexOf(true) ? 'active' : 'done') : '';
    const dotIcon = cls === 'done' ? '✓' : cls === 'active' ? '●' : '';
    return `<div class="tracker-step ${cls}">
      <div class="tracker-dot">${dotIcon}</div>
      <div class="tracker-label">${lbl}</div>
    </div>`;
  }).join('');
  document.getElementById('detTracker').innerHTML = `<div class="status-tracker" style="display:flex">${tracker}</div>`;

  document.getElementById('detMeta').innerHTML = `
    <div class="modal-meta-item"><div class="modal-meta-key">Data de Submissão</div><div class="modal-meta-val">📅 ${i.data}</div></div>
    <div class="modal-meta-item"><div class="modal-meta-key">Comentários</div><div class="modal-meta-val">💬 ${i.comentarios}</div></div>
    <div class="modal-meta-item"><div class="modal-meta-key">Visualizações</div><div class="modal-meta-val">👁 ${i.visualizacoes}</div></div>
    <div class="modal-meta-item"><div class="modal-meta-key">Prazo Estimado</div><div class="modal-meta-val">⏱ ${i.prazo || '—'}</div></div>
    <div class="modal-meta-item"><div class="modal-meta-key">Recursos</div><div class="modal-meta-val">🔧 ${i.recursos || '—'}</div></div>
    <div class="modal-meta-item"><div class="modal-meta-key">Pontos Ganhos</div><div class="modal-meta-val">${i.pts ? `⭐ +${i.pts}` : '—'}</div></div>
  `;

  document.getElementById('modalDetalhes').classList.add('open');
}

// ─── MODAL NOVA / EDITAR ───────────────────────────────────────────────────────

function abrirModalNova() {
  editandoId = null;
  document.getElementById('formTitulo').textContent    = 'Nova Ideia';
  document.getElementById('btnFormSubmit').textContent = 'Submeter Ideia';
  document.getElementById('fTitulo').value    = '';
  document.getElementById('fCategoria').value = '';
  document.getElementById('fDesc').value      = '';
  document.getElementById('fPrazo').value     = 'Curto prazo (1-3 meses)';
  document.getElementById('fRecursos').value  = 'Apenas equipe interna';
  document.getElementById('charTitulo').textContent = '0';
  document.getElementById('charDesc').textContent   = '0';
  document.getElementById('modalForm').classList.add('open');
}

function editarIdeia(id) {
  const i = state.ideias.find(x => x.id === id);
  if (!i) return;
  editandoId = id;
  document.getElementById('formTitulo').textContent    = 'Editar Ideia';
  document.getElementById('btnFormSubmit').textContent = 'Salvar Alterações';
  document.getElementById('fTitulo').value    = i.titulo;
  document.getElementById('fCategoria').value = i.categoria;
  document.getElementById('fDesc').value      = i.desc;
  document.getElementById('fPrazo').value     = i.prazo || 'Curto prazo (1-3 meses)';
  document.getElementById('fRecursos').value  = i.recursos || 'Apenas equipe interna';
  document.getElementById('charTitulo').textContent = i.titulo.length;
  document.getElementById('charDesc').textContent   = i.desc.length;
  document.getElementById('modalForm').classList.add('open');
}

// ─── SALVAR IDEIA (CRIAR OU EDITAR) — AGORA USA A API ─────────────────────────

async function salvarIdeia() {
  const titulo    = document.getElementById('fTitulo').value.trim();
  const categoria = document.getElementById('fCategoria').value;
  const desc      = document.getElementById('fDesc').value.trim();
  const prazo     = document.getElementById('fPrazo').value;
  const recursos  = document.getElementById('fRecursos').value;

  if (!titulo)    { toast('⚠ Informe o título da ideia'); return; }
  if (!categoria) { toast('⚠ Selecione uma categoria');   return; }
  if (!desc)      { toast('⚠ Adicione uma descrição');    return; }

  const btn = document.getElementById('btnFormSubmit');
  btn.disabled = true;
  btn.textContent = '⏳ Salvando...';

  try {
    if (editandoId) {
      // PUT /api/ideias/:id
      await Ideias.editar(editandoId, { titulo, categoria, desc, prazo, recursos });

      // Atualiza localmente (sem recarregar tudo)
      const idx = state.ideias.findIndex(x => x.id === editandoId);
      if (idx !== -1) {
        state.ideias[idx] = { ...state.ideias[idx], titulo, categoria, desc, prazo, recursos };
      }
      toast('✅ Ideia atualizada com sucesso!');

    } else {
      // POST /api/ideias
      const resultado = await Ideias.criar({ titulo, categoria, desc, prazo, recursos });
      // resultado = { ideia: {...}, pontos: 500 }

      state.ideias.unshift(resultado.ideia);
      state.usuario.pontos = resultado.pontos;

      // Atualiza pontos no localStorage para refletir no topbar
      const usu = getUsuario();
      if (usu) {
        usu.pontos = resultado.pontos;
        setUsuario(usu);
      }

      toast('💡 Ideia submetida! +50 pontos adicionados');
    }

    fecharModal('modalForm');
    render();

  } catch (err) {
    toast('❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = editandoId ? 'Salvar Alterações' : 'Submeter Ideia';
  }
}

// ─── EXCLUIR ──────────────────────────────────────────────────────────────────

function confirmarExcluirModal(id) {
  excluindoId = id;
  const i = state.ideias.find(x => x.id === id);
  document.getElementById('excluirDesc').textContent =
    `A ideia "${i?.titulo || ''}" será removida permanentemente. Esta ação não pode ser desfeita.`;
  document.getElementById('modalExcluir').classList.add('open');
}

async function confirmarExclusao() {
  if (!excluindoId) return;

  const btn = document.getElementById('btnConfirmarExcluir'); // adicione este id no HTML se não existir
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Excluindo...'; }

  try {
    await Ideias.excluir(excluindoId);
    state.ideias = state.ideias.filter(x => x.id !== excluindoId);
    fecharModal('modalExcluir');
    excluindoId = null;
    render();
    toast('🗑️ Ideia excluída.');
  } catch (err) {
    toast('❌ ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar Exclusão'; }
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
}

function updateChar(inputId, countId, max) {
  document.getElementById(countId).textContent = document.getElementById(inputId).value.length;
}

function toast(msg) {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) {
      o.classList.remove('open');
      editandoId  = null;
      excluindoId = null;
    }
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
init();