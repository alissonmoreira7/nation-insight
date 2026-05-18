// ─── ESTADO ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ni_minhas_ideias';

function defaultState() {
  return {
    usuario: { nome: 'Ana Costa', iniciais: 'AC', cargo: 'Análise de Dados', pontos: 450, ranking: 3 },
    ideias: [
      {
        id: 1,
        titulo: 'Automação de Relatórios Financeiros com IA',
        categoria: 'Tecnologia',
        status: 'Em Análise',
        impacto: 'Alto',
        comentarios: 8,
        visualizacoes: 34,
        desc: 'Implementar sistema de IA para gerar automaticamente relatórios mensais, reduzindo tempo de processamento em 70% e minimizando erros humanos. A solução integraria dados de múltiplos sistemas contábeis e geraria insights automatizados.',
        prazo: 'Médio prazo (3-6 meses)',
        recursos: 'Ferramentas/Softwares',
        data: '15/03/2026',
        pts: null,
        feedback: 'Ideia muito relevante! Estamos avaliando a viabilidade técnica e o custo de implementação. Aguarde retorno em até 10 dias úteis.'
      },
      {
        id: 2,
        titulo: 'Dashboard em Tempo Real para Análise de Mercado',
        categoria: 'Análise de Dados',
        status: 'Aprovada',
        impacto: 'Alto',
        comentarios: 12,
        visualizacoes: 67,
        desc: 'Criar dashboard interativo que consolida dados de múltiplas fontes globais para análise de tendências de mercado em tempo real. Permitirá tomada de decisões mais ágeis pela equipe de investimentos.',
        prazo: 'Curto prazo (1-3 meses)',
        recursos: 'Apenas equipe interna',
        data: '02/03/2026',
        pts: 80,
        feedback: 'Excelente proposta! Alinhada com os objetivos estratégicos do trimestre. A equipe de TI já iniciou o planejamento de implementação.'
      },
      {
        id: 3,
        titulo: 'Otimização de Processos de Onboarding',
        categoria: 'Processos',
        status: 'Pendente',
        impacto: 'Médio',
        comentarios: 5,
        visualizacoes: 18,
        desc: 'Reduzir tempo de integração de novos colaboradores de 30 para 15 dias através de digitalização e automação de documentos. Inclui criação de portal de onboarding e trilhas de aprendizado personalizadas.',
        prazo: 'Curto prazo (1-3 meses)',
        recursos: 'Ferramentas/Softwares',
        data: '20/04/2026',
        pts: null,
        feedback: null
      },
      {
        id: 4,
        titulo: 'Programa de Mentoria entre Departamentos',
        categoria: 'RH',
        status: 'Rejeitada',
        impacto: 'Médio',
        comentarios: 3,
        visualizacoes: 12,
        desc: 'Criar programa estruturado de mentoria cruzada entre departamentos para compartilhamento de conhecimento e desenvolvimento profissional de colaboradores júnior e pleno.',
        prazo: 'Longo prazo (6-12 meses)',
        recursos: 'Apenas equipe interna',
        data: '10/04/2026',
        pts: null,
        feedback: 'Proposta interessante, porém já temos uma iniciativa similar em desenvolvimento pelo RH. Sugerimos aguardar a conclusão do programa atual antes de implementar algo paralelo.'
      },
    ]
  };
}

function getState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState(); }
  catch { return defaultState(); }
}
function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

let state = getState();
let filtroAtual = 'todas';
let viewAtual   = 'lista';
let buscaAtual  = '';
let editandoId  = null;
let excluindoId = null;

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const statusCfg = {
  'Pendente':    { cls: 'badge-pendente',   label: '⏳ Pendente',    passos: [true, false, false, false] },
  'Em Análise':  { cls: 'badge-analise',    label: '🔍 Em Análise',  passos: [true, true,  false, false] },
  'Aprovada':    { cls: 'badge-aprovada',   label: '✅ Aprovada',    passos: [true, true,  true,  true]  },
  'Rejeitada':   { cls: 'badge-rejeitada',  label: '❌ Rejeitada',   passos: [true, true,  false, false] },
};
const impactoCfg = {
  'Alto':  { cls: 'badge-impacto-alto',  label: '🔴 Impacto Alto'  },
  'Médio': { cls: 'badge-impacto-medio', label: '🟠 Impacto Médio' },
  'Baixo': { cls: 'badge-impacto-baixo', label: '🟢 Impacto Baixo' },
};
const trackerLabels = ['Submetida', 'Em Análise', 'Aprovada', 'Concluída'];

// ─── RENDER PRINCIPAL ────────────────────────────────────────────────────────

function render() {
  atualizarKPIs();
  atualizarContadores();
  renderLista();
  const pontosTop = document.getElementById('pontosTop');
  if (pontosTop) pontosTop.textContent = state.usuario.pontos;
}

function atualizarKPIs() {
  const ids = state.ideias;
  document.getElementById('kpiTotal').textContent    = ids.length;
  document.getElementById('kpiAnalise').textContent  = ids.filter(i => i.status === 'Em Análise').length;
  document.getElementById('kpiAprovadas').textContent= ids.filter(i => i.status === 'Aprovada').length;
  document.getElementById('kpiPontos').textContent   = state.usuario.pontos;
  document.getElementById('kpiRanking').textContent  = `Ranking #${state.usuario.ranking} geral`;
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

  // Filtro status
  if (filtroAtual !== 'todas') lista = lista.filter(i => i.status === filtroAtual);

  // Busca
  if (buscaAtual.trim()) {
    const q = buscaAtual.toLowerCase();
    lista = lista.filter(i =>
      i.titulo.toLowerCase().includes(q) ||
      i.desc.toLowerCase().includes(q) ||
      i.categoria.toLowerCase().includes(q)
    );
  }

  // Ordenação
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

// ─── FILTRO / BUSCA / VIEW ────────────────────────────────────────────────────

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

// ─── MODAL DETALHES ──────────────────────────────────────────────────────────

function verDetalhes(id) {
  const i = state.ideias.find(x => x.id === id);
  if (!i) return;

  // Incrementa visualizações
  i.visualizacoes++;
  saveState(state);

  const sc = statusCfg[i.status] || statusCfg['Pendente'];
  const ic = impactoCfg[i.impacto] || impactoCfg['Médio'];

  document.getElementById('detTitulo').textContent = i.titulo;

  document.getElementById('detBadges').innerHTML = `
    <span class="badge ${sc.cls}">${sc.label}</span>
    <span class="badge ${ic.cls}">${ic.label}</span>
    <span class="badge" style="background:rgba(10,37,64,.07);color:var(--azul)">${i.categoria}</span>
  `;

  document.getElementById('detDesc').textContent = i.desc;

  // Feedback do gestor
  const fw = document.getElementById('detFeedbackWrap');
  fw.innerHTML = i.feedback ? `
    <div class="gestor-feedback">
      <div class="gestor-feedback-label">💬 Feedback do Gestor</div>
      <div class="gestor-feedback-text">${i.feedback}</div>
    </div>` : '';

  // Tracker
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

  // Meta
  document.getElementById('detMeta').innerHTML = `
    <div class="modal-meta-item"><div class="modal-meta-key">Data de Submissão</div><div class="modal-meta-val">📅 ${i.data}</div></div>
    <div class="modal-meta-item"><div class="modal-meta-key">Comentários</div><div class="modal-meta-val">💬 ${i.comentarios}</div></div>
    <div class="modal-meta-item"><div class="modal-meta-key">Visualizações</div><div class="modal-meta-val">👁 ${i.visualizacoes}</div></div>
    <div class="modal-meta-item"><div class="modal-meta-key">Prazo Estimado</div><div class="modal-meta-val">⏱ ${i.prazo || '—'}</div></div>
    <div class="modal-meta-item"><div class="modal-meta-key">Recursos</div><div class="modal-meta-val">🔧 ${i.recursos || '—'}</div></div>
    <div class="modal-meta-item"><div class="modal-meta-key">Pontos Ganhos</div><div class="modal-meta-val">${i.pts ? `⭐ +${i.pts}` : '—'}</div></div>
  `;

  document.getElementById('modalDetalhes').classList.add('open');
  renderLista();
}

// ─── MODAL NOVA / EDITAR ─────────────────────────────────────────────────────

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

function salvarIdeia() {
  const titulo    = document.getElementById('fTitulo').value.trim();
  const categoria = document.getElementById('fCategoria').value;
  const desc      = document.getElementById('fDesc').value.trim();
  const prazo     = document.getElementById('fPrazo').value;
  const recursos  = document.getElementById('fRecursos').value;

  if (!titulo)    { toast('⚠ Informe o título da ideia'); return; }
  if (!categoria) { toast('⚠ Selecione uma categoria');   return; }
  if (!desc)      { toast('⚠ Adicione uma descrição');    return; }

  const hoje = new Date();
  const data = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;

  if (editandoId) {
    const idx = state.ideias.findIndex(x => x.id === editandoId);
    if (idx !== -1) {
      state.ideias[idx] = { ...state.ideias[idx], titulo, categoria, desc, prazo, recursos };
      toast('✅ Ideia atualizada com sucesso!');
    }
  } else {
    state.ideias.unshift({
      id: Date.now(), titulo, categoria, status: 'Pendente',
      comentarios: 0, visualizacoes: 0,
      desc, prazo, recursos, data, pts: null, feedback: null
    });
    state.usuario.pontos += 50;
    toast('💡 Ideia submetida! +50 pontos adicionados');
  }

  saveState(state);
  fecharModal('modalForm');
  render();
}

// ─── EXCLUIR ─────────────────────────────────────────────────────────────────

function confirmarExcluirModal(id) {
  excluindoId = id;
  const i = state.ideias.find(x => x.id === id);
  document.getElementById('excluirDesc').textContent = `A ideia "${i?.titulo || ''}" será removida permanentemente. Esta ação não pode ser desfeita.`;
  document.getElementById('modalExcluir').classList.add('open');
}

function confirmarExclusao() {
  if (!excluindoId) return;
  state.ideias = state.ideias.filter(x => x.id !== excluindoId);
  saveState(state);
  fecharModal('modalExcluir');
  excluindoId = null;
  render();
  toast('🗑️ Ideia excluída.');
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
}

function updateChar(inputId, countId, max) {
  const len = document.getElementById(inputId).value.length;
  document.getElementById(countId).textContent = len;
}

function toast(msg) {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// fechar modais ao clicar fora
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) {
      o.classList.remove('open');
      editandoId  = null;
      excluindoId = null;
    }
  });
});

// ─── START ───────────────────────────────────────────────────────────────────
render();