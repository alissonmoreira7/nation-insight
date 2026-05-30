const API_URL = 'http://localhost:3000/api'; // ← troque pela URL do deploy

// ── TOKEN / SESSÃO ────────────────────────────────────────────────────────────
function getToken()    { return localStorage.getItem('ni_token'); }
function getUsuario()  { return JSON.parse(localStorage.getItem('ni_usuario') || 'null'); }
function setToken(t)   { localStorage.setItem('ni_token', t); }
function setUsuario(u) { localStorage.setItem('ni_usuario', JSON.stringify(u)); }

function checkAuth() {
  if (!getToken()) window.location.href = 'login.html';
}

function logout() {
  localStorage.removeItem('ni_token');
  localStorage.removeItem('ni_usuario');
  window.location.href = 'login.html';
}

// ── FETCH HELPER ──────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API_URL + path, opts);
  const data = await res.json();

  if (res.status === 401) { logout(); return; }
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');

  return data;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
const Auth = {
  async login(email, senha) {
    const data = await api('POST', '/auth/login', { email, senha });
    setToken(data.token);
    setUsuario(data.usuario);
    return data.usuario;
  },
};

// ── IDEIAS ────────────────────────────────────────────────────────────────────
const Ideias = {

  // Substitui o defaultState().ideias
  // Use no lugar de: let state = getState()
  async minhas() {
    return api('GET', '/ideias/minhas');
    // Retorna: [{ id, titulo, desc, categoria, status, impacto, prazo,
    //             recursos, visualizacoes, comentarios, pts, feedback, data }]
  },

  // Substitui: state.ideias.unshift({ id: Date.now(), ... })
  // front envia: { titulo, categoria, desc, prazo, recursos }
  // retorna: { ideia: {...}, pontos: 500 }
  async criar(dados) {
    return api('POST', '/ideias', dados);
  },

  // Substitui: state.ideias[idx] = { ...state.ideias[idx], ...dados }
  async editar(id, dados) {
    return api('PUT', `/ideias/${id}`, dados);
  },

  // Substitui: state.ideias = state.ideias.filter(x => x.id !== excluindoId)
  async excluir(id) {
    return api('DELETE', `/ideias/${id}`);
  },
};

// ── RECOMPENSAS ───────────────────────────────────────────────────────────────
const Recompensas = {

  // Substitui o defaultState() inteiro do recompensas.js
  // retorna: { pontos: 450, recompensas: [{id, nome, icon, pts, desc, disponiveis, desbloqueado}] }
  async catalogo() {
    return api('GET', '/recompensas');
  },

  // Substitui: state.historico do defaultState()
  // retorna: [{ id, nome, icon, pts, data }]
  async historico() {
    return api('GET', '/recompensas/historico');
  },

  // Substitui: confirmarResgate() do recompensas.js
  // retorna: { mensagem, pontos: novoSaldo, resgate: { id, nome, icon, pts, data } }
  async resgatar(id) {
    return api('POST', `/recompensas/${id}/resgatar`);
  },
};
