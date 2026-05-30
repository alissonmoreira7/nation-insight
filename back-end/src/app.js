require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const auth         = require('./middleware/auth');
const authCtrl     = require('./controllers/authController');
const ideiaCtrl    = require('./controllers/ideiaController');
const recompCtrl   = require('./controllers/recompensaController');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/registrar', authCtrl.registrar);
app.post('/api/auth/login',     authCtrl.login);

// ── IDEIAS (requer token) ─────────────────────────────────────────────────────
app.get   ('/api/ideias/minhas', auth, ideiaCtrl.minhasIdeias);  // GET  → carrega lista
app.post  ('/api/ideias',        auth, ideiaCtrl.criarIdeia);    // POST → salvarIdeia()
app.put   ('/api/ideias/:id',    auth, ideiaCtrl.editarIdeia);   // PUT  → salvarIdeia() edição
app.delete('/api/ideias/:id',    auth, ideiaCtrl.excluirIdeia);  // DEL  → confirmarExclusao()

// ── RECOMPENSAS (requer token) ────────────────────────────────────────────────
app.get ('/api/recompensas',               auth, recompCtrl.listarRecompensas); // GET  → render()
app.get ('/api/recompensas/historico',     auth, recompCtrl.historico);         // GET  → state.historico
app.post('/api/recompensas/:id/resgatar',  auth, recompCtrl.resgatar);          // POST → confirmarResgate()

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/', (_, res) => res.json({ status: '🚀 NationInsight API online' }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ erro: `Rota ${req.path} não encontrada` }));

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 NationInsight API → http://localhost:${PORT}`);
  console.log('📋 Rotas:');
  console.log('   POST /api/auth/registrar');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/ideias/minhas');
  console.log('   POST /api/ideias');
  console.log('   PUT  /api/ideias/:id');
  console.log('   DEL  /api/ideias/:id');
  console.log('   GET  /api/recompensas');
  console.log('   GET  /api/recompensas/historico');
  console.log('   POST /api/recompensas/:id/resgatar\n');
});
