// front-end/js/gestao-ideias.js
// Usado por: pages/gestor-ideias.html
// Funciona para GESTOR (vê apenas seu departamento) e ADMIN (vê tudo + pode implementar)

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────────────────────────────────────
let todasIdeias = [];
let filtroAtual = 'todas';
let ideiaEmFoco = null;

// Detecta perfil do usuário logado
const _usu   = JSON.parse(localStorage.getItem('ni_usuario') || 'null');
const _perfil = String(_usu?.tipo || _usu?.perfilacesso_usu || '').toLowerCase();
const isAdmin = _perfil === 'admin';

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  ajustarInterfacePorPerfil();
  carregarIdeias();

  document.getElementById('modalAvaliacao').addEventListener('click', e => {
    if (e.target.id === 'modalAvaliacao') fecharModalAvaliacao();
  });
  document.getElementById('modalComentario').addEventListener('click', e => {
    if (e.target.id === 'modalComentario') fecharModalComentario();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ajusta título e opções do select de acordo com o perfil
// ─────────────────────────────────────────────────────────────────────────────
function ajustarInterfacePorPerfil() {
  if (isAdmin) {
    setText('heroTitulo', 'Gestão de Ideias');
    setText('heroSub', 'Visualize e implemente ideias de todos os departamentos.');

    // Adiciona opção "Implementada" no select do modal
    const sel = document.getElementById('selectStatus');
    const opt = document.createElement('option');
    opt.value       = 'Implementada';
    opt.textContent = 'Implementada (+100 pts)';
    sel.appendChild(opt);

    // Adiciona filtro "Implementada" na toolbar
    const filtros = document.getElementById('filtrosContainer');
    const btnImpl = document.createElement('button');
    btnImpl.className   = 'filtro-btn';
    btnImpl.innerHTML   = 'Implementada (<span id="cntImplementada">0</span>)';
    btnImpl.onclick     = function() { filtrar('Implementada', this); };
    filtros.appendChild(btnImpl);

    // Adiciona KPI de implementadas
    const kpiGrid = document.getElementById('kpiGrid');
    kpiGrid.insertAdjacentHTML('beforeend', `
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Implementadas</span>
          <span class="kpi-icon" style="color:#7c3aed">🚀</span>
        </div>
        <div class="kpi-valor" style="color:#7c3aed" id="kpiImplementada">0</div>
      </div>
    `);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARREGA IDEIAS — rota diferente por perfil
// ─────────────────────────────────────────────────────────────────────────────
async function carregarIdeias() {
  mostrarSkeleton(true);
  try {
    const rota = isAdmin ? '/admin/ideias' : '/gestor/ideias';
    const data = await api('GET', rota);

    todasIdeias = data.ideias || [];

    if (!isAdmin && data.departamento) {
      const elDepto = document.getElementById('labelDepartamento');
      if (elDepto) elDepto.textContent = data.departamento;
    }

    atualizarKPIs();
    renderizarLista(todasIdeias);
  } catch (err) {
    mostrarErro(err.message || 'Não foi possível carregar as ideias.');
  } finally {
    mostrarSkeleton(false);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AVALIAÇÃO — rota diferente por perfil
// ─────────────────────────────────────────────────────────────────────────────
async function submeterAvaliacao(event) {
  event.preventDefault();

  const status       = document.getElementById('selectStatus').value;
  const feedback     = document.getElementById('textFeedback').value.trim();
  const pontosCustom = document.getElementById('inputPontosCustom').value;

  if (!status) { mostrarToast('Selecione um status.', 'erro'); return; }

  const body = { status, feedback };
  if (status === 'Aprovada' && pontosCustom !== '') {
    body.pontosCustom = Number(pontosCustom);
  }

  const btnSalvar = document.getElementById('btnSalvarAvaliacao');
  btnSalvar.disabled    = true;
  btnSalvar.textContent = 'Salvando…';

  try {
    const rota = isAdmin
      ? `/admin/ideias/${ideiaEmFoco.id}/status`
      : `/gestor/ideias/${ideiaEmFoco.id}/status`;

    const resp = await api('PATCH', rota, body);

    // Atualiza estado local
    const idx = todasIdeias.findIndex(i => i.id === ideiaEmFoco.id);
    if (idx !== -1) {
      todasIdeias[idx].status   = status;
      todasIdeias[idx].feedback = feedback || todasIdeias[idx].feedback;
    }

    atualizarKPIs();
    renderizarLista(getFiltradas());
    fecharModalAvaliacao();

    mostrarToast(
      `✅ ${resp.mensagem}${resp.pontosGanhos > 0 ? ` (+${resp.pontosGanhos} pts ao colaborador)` : ''}`,
      'sucesso'
    );
  } catch (err) {
    mostrarToast(err.message || 'Erro ao salvar avaliação.', 'erro');
  } finally {
    btnSalvar.disabled    = false;
    btnSalvar.textContent = 'Salvar';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMENTÁRIO
// ─────────────────────────────────────────────────────────────────────────────
async function submeterComentario(event) {
  event.preventDefault();

  const texto = document.getElementById('textComentario').value.trim();
  if (!texto) { mostrarToast('Digite um comentário antes de enviar.', 'erro'); return; }

  const btnEnviar = document.getElementById('btnEnviarComentario');
  btnEnviar.disabled    = true;
  btnEnviar.textContent = 'Enviando…';

  try {
    await api('POST', `/ideias/${ideiaEmFoco.id}/comentarios`, { texto });

    const idx = todasIdeias.findIndex(i => i.id === ideiaEmFoco.id);
    if (idx !== -1) todasIdeias[idx].comentarios = (todasIdeias[idx].comentarios || 0) + 1;

    renderizarLista(getFiltradas());
    fecharModalComentario();
    mostrarToast('💬 Comentário adicionado!', 'sucesso');
  } catch (err) {
    mostrarToast(err.message || 'Erro ao enviar comentário.', 'erro');
  } finally {
    btnEnviar.disabled    = false;
    btnEnviar.textContent = 'Enviar';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERIZAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
function renderizarLista(ideias) {
  const lista = document.getElementById('listaIdeias');

  if (!ideias.length) {
    lista.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <p>Nenhuma ideia encontrada para este filtro.</p>
      </div>`;
    return;
  }

  lista.innerHTML = ideias.map(ideia => `
    <div class="ideia-card" data-id="${ideia.id}">
      <div class="ideia-card__header">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="ideia-card__titulo">${escapeHtml(ideia.titulo)}</span>
          <span class="badge badge--${slugStatus(ideia.status)}">${ideia.status}</span>
        </div>
        <div class="ideia-card__autor">
          <i class="fa-regular fa-user"></i>
          ${escapeHtml(ideia.autorNome)}
          <span class="ideia-card__cargo">${escapeHtml(ideia.autorCargo || '')}</span>
          ${isAdmin ? `<span class="ideia-card__depto"><i class="fa-solid fa-building"></i> ${escapeHtml(ideia.autorDepartamento || '')}</span>` : ''}
        </div>
      </div>

      <p class="ideia-card__desc">${escapeHtml(ideia.descricao || '')}</p>

      ${ideia.feedback
        ? `<div class="ideia-card__feedback"><strong>Feedback:</strong> ${escapeHtml(ideia.feedback)}</div>`
        : ''}

      <div class="ideia-card__footer">
        <span class="ideia-card__meta">
          <i class="fa-regular fa-comment"></i> ${ideia.comentarios || 0}
        </span>
        <div class="ideia-card__actions">
          <button class="btn btn--outline btn--sm" onclick="abrirModalComentario(${ideia.id})">
            <i class="fa-regular fa-comment-dots"></i> Comentar
          </button>
          <button class="btn btn--primary btn--sm" onclick="abrirModalAvaliacao(${ideia.id})">
            <i class="fa-solid fa-check-to-slot"></i> ${isAdmin ? 'Atualizar' : 'Avaliar'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTROS
// ─────────────────────────────────────────────────────────────────────────────
function filtrar(valor, btn) {
  filtroAtual = valor;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderizarLista(getFiltradas());
}

function getFiltradas() {
  if (filtroAtual === 'todas') return todasIdeias;
  return todasIdeias.filter(i => i.status === filtroAtual);
}

// ─────────────────────────────────────────────────────────────────────────────
// KPIs
// ─────────────────────────────────────────────────────────────────────────────
function atualizarKPIs() {
  const cnt = (s) => todasIdeias.filter(i => i.status === s).length;

  setText('kpiTotal',    todasIdeias.length);
  setText('kpiPendente', cnt('Pendente'));
  setText('kpiAnalise',  cnt('Em Análise'));
  setText('kpiAprovada', cnt('Aprovada'));

  setText('cntTodas',    todasIdeias.length);
  setText('cntPendente', cnt('Pendente'));
  setText('cntAnalise',  cnt('Em Análise'));
  setText('cntAprovada', cnt('Aprovada'));

  if (isAdmin) {
    setText('kpiImplementada',  cnt('Implementada'));
    setText('cntImplementada',  cnt('Implementada'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL AVALIAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
function abrirModalAvaliacao(ideiaId) {
  ideiaEmFoco = todasIdeias.find(i => i.id === ideiaId);
  if (!ideiaEmFoco) return;

  document.getElementById('modalAvaliacaoTitulo').textContent = ideiaEmFoco.titulo;
  document.getElementById('selectStatus').value               = ideiaEmFoco.status;
  document.getElementById('textFeedback').value               = ideiaEmFoco.feedback || '';
  document.getElementById('inputPontosCustom').value          = '';

  toggleCampoPontosCustom();
  document.getElementById('modalAvaliacao').classList.add('aberto');
}

function fecharModalAvaliacao() {
  document.getElementById('modalAvaliacao').classList.remove('aberto');
  ideiaEmFoco = null;
}

function toggleCampoPontosCustom() {
  const status = document.getElementById('selectStatus').value;
  const wrapper = document.getElementById('wrapperPontosCustom');
  if (wrapper) wrapper.style.display = status === 'Aprovada' ? 'block' : 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL COMENTÁRIO
// ─────────────────────────────────────────────────────────────────────────────
function abrirModalComentario(ideiaId) {
  ideiaEmFoco = todasIdeias.find(i => i.id === ideiaId);
  if (!ideiaEmFoco) return;

  document.getElementById('modalComentarioTitulo').textContent = ideiaEmFoco.titulo;
  document.getElementById('textComentario').value              = '';
  document.getElementById('modalComentario').classList.add('aberto');
}

function fecharModalComentario() {
  document.getElementById('modalComentario').classList.remove('aberto');
  ideiaEmFoco = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────
function mostrarSkeleton(v) {
  const el = document.getElementById('skeleton');
  if (el) el.style.display = v ? 'block' : 'none';
}

function mostrarErro(msg) {
  document.getElementById('listaIdeias').innerHTML =
    `<div class="erro-state"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(msg)}</div>`;
}

function mostrarToast(msg, tipo = 'info') {
  const t = document.createElement('div');
  t.className   = `toast toast--${tipo}`;
  t.textContent = msg;
  document.body.appendChild(t);
  void t.offsetHeight;
  t.classList.add('toast--visivel');
  setTimeout(() => {
    t.classList.remove('toast--visivel');
    t.addEventListener('transitionend', () => t.remove());
  }, 3500);
}

function slugStatus(s) {
  return { 'Pendente':'pendente','Em Análise':'analise','Aprovada':'aprovada','Rejeitada':'rejeitada','Implementada':'implementada' }[s] || 'pendente';
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}