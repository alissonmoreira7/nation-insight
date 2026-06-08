const backend = import.meta.env.VITE_BACKEND;
const API_URL = `${backend}/api`; // ← troque pela URL do deploy

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
  window.location.href = '../login.html';
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

  async obterPerfil() {
    return api('GET', '/auth/perfil');
  },

  async atualizarPerfil(dados) {
    const data = await api('PUT', '/auth/perfil', dados);
    if (data.usuario) {
      // Mescla com dados locais existentes para preservar propriedades como pontos/ranking que podem não vir no retorno
      const usuarioLocal = getUsuario() || {};
      const usuarioAtualizado = { ...usuarioLocal, ...data.usuario };
      setUsuario(usuarioAtualizado);
    }
    return data;
  },
};

// ── IDEIAS ────────────────────────────────────────────────────────────────────
const Ideias = {

  async minhas() {
    return api('GET', '/ideias/minhas');
  },

  async criar(dados) {
    return api('POST', '/ideias', dados);
  },

  async editar(id, dados) {
    return api('PUT', `/ideias/${id}`, dados);
  },

  async excluir(id) {
    return api('DELETE', `/ideias/${id}`);
  },
};

// ── RECOMPENSAS ───────────────────────────────────────────────────────────────
const Recompensas = {

  async catalogo() {
    return api('GET', '/recompensas');
  },

  async historico() {
    return api('GET', '/recompensas/historico');
  },

  async resgatar(id) {
    return api('POST', `/recompensas/${id}/resgatar`);
  },
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
const DashboardAPI = {

  async dados() {
    return api('GET', '/dashboard');
  },
};
