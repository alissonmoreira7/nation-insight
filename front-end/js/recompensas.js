// ─── DADOS MOCKADOS ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'ni_recompensas';

function getState() {
  let s;
  try { 
      s = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState(); 
  } catch { 
      s = defaultState(); 
  }

  const pontosGlobais = localStorage.getItem('nation_user_points');
  if (pontosGlobais !== null) {
      s.pontos = parseInt(pontosGlobais); 
  } else {
      localStorage.setItem('nation_user_points', s.pontos);
  }

  return s;
}

function saveState(s) { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); 
    
    localStorage.setItem('nation_user_points', s.pontos);
}

function defaultState() {
  return {
    pontos: 450, // Pontos iniciais mockados
    historico: [
      { id: 99, nome: 'Vale-Presente iFood', icon: '🍔', pts: 80,  data: '10/05/2026' },
      { id: 98, nome: 'Day Off Extra',       icon: '🌴', pts: 200, data: '02/04/2026' },
    ],
    recompensas: [
      { id: 1, nome: 'Vale-Presente Amazon',   icon: '🎁', pts: 100, desc: 'Voucher de R$ 100 para compras na Amazon',      disponiveis: 25, desbloqueado: true  },
      { id: 2, nome: 'Day Off Extra',          icon: '🌴', pts: 200, desc: 'Um dia de folga remunerada adicional',          disponiveis: 10, desbloqueado: true  },
      { id: 3, nome: 'Curso Online Udemy',     icon: '📚', pts: 150, desc: 'Acesso a qualquer curso da plataforma Udemy',   disponiveis: 15, desbloqueado: true  },
      { id: 4, nome: 'Vale-Presente iFood',    icon: '🍔', pts: 80,  desc: 'Voucher de R$ 80 para pedidos no iFood',        disponiveis: 30, desbloqueado: true  },
      { id: 5, nome: 'Equipamento Home Office',icon: '📦', pts: 500, desc: 'Cadeira ergonômica ou monitor adicional',        disponiveis: 5,  desbloqueado: false },
      { id: 6, nome: 'Troféu Inovador do Mês', icon: '🏆', pts: 800, desc: 'Reconhecimento especial e troféu físico',       disponiveis: 2,  desbloqueado: false },
    ]
  };
}

let state = getState();
let filtroAtual = 'disponiveis';
let resgateAtual = null;

// ─── RENDER ──────────────────────────────────────────────────────────────────

function render() {
  atualizarPontos();
  atualizarMeta();
  renderGrid();
  atualizarContadores();
}

function atualizarPontos() {
  document.getElementById('pontosHero').textContent    = state.pontos;
  document.getElementById('pontosTopbar').textContent  = state.pontos;
  const disponiveis = state.recompensas.filter(r => r.pts <= state.pontos && r.disponiveis > 0).length;
  document.getElementById('heroSub').textContent =
    `Você pode resgatar ${disponiveis} recompensa${disponiveis !== 1 ? 's' : ''}`;
}

function atualizarMeta() {
  const meta = state.recompensas.find(r => r.pts > state.pontos) || state.recompensas[state.recompensas.length - 1];
  const pct  = Math.min(100, Math.round(state.pontos / meta.pts * 100));
  const faltam = Math.max(0, meta.pts - state.pontos);

  document.getElementById('metaFaltam').textContent =
    faltam > 0 ? `Faltam ${faltam} pontos` : 'Meta atingida! 🎉';

  setTimeout(() => {
    document.getElementById('progressFill').style.width = pct + '%';
  }, 200);
}

function atualizarContadores() {
  const disp  = state.recompensas.filter(r => r.pts <= state.pontos && r.disponiveis > 0).length;
  const todas = state.recompensas.length;
  document.getElementById('countDisp').textContent  = disp;
  document.getElementById('countTodas').textContent = todas;
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

// ─── FILTRO ──────────────────────────────────────────────────────────────────

function filtrar(tipo, btn) {
  filtroAtual = tipo;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGrid();
}

// ─── MODAL ───────────────────────────────────────────────────────────────────

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

function confirmarResgate() {
  if (!resgateAtual) return;
  const r = resgateAtual;

  // Debitar pontos
  state.pontos -= r.pts;
  r.disponiveis = Math.max(0, r.disponiveis - 1);

  // Registrar histórico
  const hoje = new Date();
  const data = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;
  state.historico.unshift({ id: Date.now(), nome: r.nome, icon: r.icon, pts: r.pts, data });

  saveState(state);
  fecharModal();

  // Mostrar sucesso
  document.getElementById('modalSucessoDesc').textContent =
    `"${r.nome}" foi resgatado com sucesso! Você usou ${r.pts} pontos e agora tem ${state.pontos} pontos.`;
  document.getElementById('modalSucesso').classList.add('open');
}

function fecharSucesso() {
  document.getElementById('modalSucesso').classList.remove('open');
  toast(`✓ Resgate de "${resgateAtual?.nome || 'benefício'}" confirmado!`);
  resgateAtual = null;
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

function toast(msg) {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>🏆</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ─── FECHAR MODAL AO CLICAR FORA ─────────────────────────────────────────────

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) {
      o.classList.remove('open');
      resgateAtual = null;
    }
  });
});

// ─── START ───────────────────────────────────────────────────────────────────
render();