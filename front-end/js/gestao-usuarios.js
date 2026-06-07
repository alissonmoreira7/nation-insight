// ── ESTADO ────────────────────────────────────────────────────────────────────
let todosUsuarios = [];
let editandoId    = null;
let excluindoId   = null;

// Cores por índice (avatar)
const AV_CORES = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#6366F1','#EC4899','#14B8A6'];
function avCor(id)     { return AV_CORES[id % AV_CORES.length]; }
function iniciais(nome){ return nome.split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase(); }

// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
  checkAuth();
  checkAdminFront();
  await Promise.all([carregarStats(), carregarUsuarios(), carregarSetores()]);
}

// ── SETORES ───────────────────────────────────────────────────────────────────
async function carregarSetores() {
  try {
    const setores = await api('GET', '/admin/setores');
    const sel = document.getElementById('fSetor');
    setores.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.nome;
      opt.textContent = s.nome;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.warn('Não foi possível carregar setores:', err.message);
  }
}

function checkAdminFront() {
  const usu = getUsuario();
  if (!usu || (usu.tipo !== 'admin' && usu.tipo !== 'gestor')) {
    toast('⛔ Acesso restrito a administradores');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
  }
}

// ── STATS ─────────────────────────────────────────────────────────────────────
async function carregarStats() {
  try {
    const s = await api('GET', '/admin/stats');
    const cards = [
      { label: 'Total de Usuários',  valor: s.total_usuarios, icon: '👥', bg: '#EFF6FF', cor: '#3B82F6' },
      { label: 'Colaboradores',      valor: s.colaboradores,  icon: '💼', bg: '#F5F3FF', cor: '#8B5CF6' },
      { label: 'Gestores',           valor: s.gestores,       icon: '🎯', bg: '#FFFBEB', cor: '#D4AF37' },
      { label: 'Total de Ideias',    valor: s.total_ideias,   icon: '💡', bg: '#F0FDF4', cor: '#10B981' },
    ];
    document.getElementById('statsGrid').innerHTML = cards.map(c => `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:${c.bg};color:${c.cor}">${c.icon}</div>
        <div class="kpi-body">
          <div class="kpi-label">${c.label}</div>
          <div class="kpi-valor">${c.valor}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar stats:', err);
  }
}

// ── LISTAR ────────────────────────────────────────────────────────────────────
async function carregarUsuarios() {
  try {
    todosUsuarios = await api('GET', '/admin/usuarios');
    renderTabela(todosUsuarios);
  } catch (err) {
    document.getElementById('tabelaWrap').innerHTML =
      `<div class="empty-table">❌ Erro ao carregar usuários: ${err.message}</div>`;
  }
}

function renderTabela(lista) {
  const wrap = document.getElementById('tabelaWrap');
  document.getElementById('countLabel').textContent = `${lista.length} usuário${lista.length !== 1 ? 's' : ''}`;

  if (!lista.length) {
    wrap.innerHTML = '<div class="empty-table">Nenhum usuário encontrado.</div>';
    return;
  }

  const meuid = getUsuario()?.id;

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Usuário</th>
          <th>Perfil</th>
          <th>Pontos</th>
          <th>Cadastro</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${lista.map(u => {
          const cor    = avCor(u.id);
          const ini    = iniciais(u.nome);
          const data   = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—';
          const ehEu   = u.id === meuid;
          return `
            <tr>
              <td>
                <div class="user-cell">
                  <div class="user-av" style="background:${cor};color:white">${ini}</div>
                  <div>
                    <div class="user-nome">${u.nome}${ehEu ? ' <span style="font-size:10px;color:#9ca3af">(você)</span>' : ''}</div>
                    <div class="user-email">${u.email}</div>
                    ${u.cargo ? `<div class="user-email">${u.cargo}</div>` : ''}
                  </div>
                </div>
              </td>
              <td><span class="badge-perfil perfil-${u.perfil}">${u.perfil}</span></td>
              <td class="pts-cell">${(u.pontos || 0).toLocaleString('pt-BR')} pts</td>
              <td style="font-size:12px;color:#9ca3af">${data}</td>
              <td>
                <div class="acoes-cell">
                  <button class="btn-acao-sm btn-edit" onclick="abrirModalEditar(${u.id})">✏️ Editar</button>
                  ${!ehEu ? `<button class="btn-acao-sm btn-del" onclick="confirmarExcluir(${u.id},'${u.nome.replace(/'/g,"\\'")}')">🗑 Excluir</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ── FILTRO ────────────────────────────────────────────────────────────────────
function filtrarTabela() {
  const q       = document.getElementById('searchInput').value.toLowerCase();
  const perfil  = document.getElementById('filtroPerfilSel').value;
  const filtrado = todosUsuarios.filter(u => {
    const textoOk  = !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const perfilOk = !perfil || u.perfil === perfil;
    return textoOk && perfilOk;
  });
  renderTabela(filtrado);
}

// ── MODAL CRIAR ───────────────────────────────────────────────────────────────
function abrirModalNovo() {
  editandoId = null;
  document.getElementById('modalTitulo').textContent = 'Novo Usuário';
  document.getElementById('btnSalvar').textContent   = 'Criar Usuário';
  document.getElementById('senhaHint').style.display = 'none';
  document.getElementById('fNome').value   = '';
  document.getElementById('fEmail').value  = '';
  document.getElementById('fSenha').value  = '';
  document.getElementById('fCargo').value  = '';
  document.getElementById('fSetor').value  = '';
  document.getElementById('fPerfil').value = 'colaborador';
  document.getElementById('fEmail').disabled = false;
  esconderAlerta();
  document.getElementById('modalForm').classList.add('open');
}

// ── MODAL EDITAR ──────────────────────────────────────────────────────────────
function abrirModalEditar(id) {
  const u = todosUsuarios.find(x => x.id === id);
  if (!u) return;
  editandoId = id;
  document.getElementById('modalTitulo').textContent = 'Editar Usuário';
  document.getElementById('btnSalvar').textContent   = 'Salvar Alterações';
  document.getElementById('senhaHint').style.display = 'block';
  document.getElementById('fNome').value   = u.nome;
  document.getElementById('fEmail').value  = u.email;
  document.getElementById('fEmail').disabled = true;
  document.getElementById('fSenha').value  = '';
  document.getElementById('fCargo').value  = u.cargo || '';
  document.getElementById('fSetor').value  = u.departamento || '';
  document.getElementById('fPerfil').value = u.perfil;
  esconderAlerta();
  document.getElementById('modalForm').classList.add('open');
}

// ── SALVAR ────────────────────────────────────────────────────────────────────
async function salvarUsuario() {
  const nome   = document.getElementById('fNome').value.trim();
  const email  = document.getElementById('fEmail').value.trim();
  const senha  = document.getElementById('fSenha').value;
  const cargo  = document.getElementById('fCargo').value.trim();
  const setor  = document.getElementById('fSetor').value;
  const perfil = document.getElementById('fPerfil').value;

  if (!nome)  return mostrarAlerta('Informe o nome do usuário');
  if (!editandoId && !email) return mostrarAlerta('Informe o e-mail');
  if (!editandoId && senha.length < 6) return mostrarAlerta('A senha deve ter pelo menos 6 caracteres');

  const btn = document.getElementById('btnSalvar');
  btn.disabled = true;
  btn.textContent = '⏳ Salvando...';

  try {
    if (editandoId) {
      const body = { nome, cargo, perfil, departamento: setor };
      if (senha) body.senha = senha;
      await api('PUT', `/admin/usuarios/${editandoId}`, body);
      toast('✅ Usuário atualizado com sucesso');
    } else {
      await api('POST', '/admin/usuarios', { nome, email, senha, cargo, perfil, departamento: setor });
      toast('✅ Usuário criado com sucesso');
    }
    fecharModal();
    await Promise.all([carregarStats(), carregarUsuarios()]);
  } catch (err) {
    mostrarAlerta(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = editandoId ? 'Salvar Alterações' : 'Criar Usuário';
  }
}

// ── EXCLUIR ───────────────────────────────────────────────────────────────────
function confirmarExcluir(id, nome) {
  excluindoId = id;
  document.getElementById('delDesc').textContent =
    `O usuário "${nome}" será removido permanentemente. Esta ação não pode ser desfeita.`;
  document.getElementById('modalDel').classList.add('open');
}

async function confirmarExclusao() {
  if (!excluindoId) return;
  const btn = document.getElementById('btnConfirmarDel');
  btn.disabled = true;
  btn.textContent = '⏳ Excluindo...';
  try {
    await api('DELETE', `/admin/usuarios/${excluindoId}`);
    toast('🗑 Usuário excluído');
    fecharModal();
    excluindoId = null;
    await Promise.all([carregarStats(), carregarUsuarios()]);
  } catch (err) {
    toast('❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Excluir';
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function fecharModal() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  editandoId = excluindoId = null;
}

function mostrarAlerta(msg) {
  const el = document.getElementById('modalAlerta');
  el.textContent = '⚠ ' + msg;
  el.classList.add('visivel');
}
function esconderAlerta() {
  document.getElementById('modalAlerta').classList.remove('visivel');
}

function toast(msg) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

document.querySelectorAll('.modal-overlay').forEach(o =>
  o.addEventListener('click', e => { if (e.target === o) fecharModal(); })
);

// ── START ─────────────────────────────────────────────────────────────────────
init();