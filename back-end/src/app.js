require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const auth         = require('./middleware/auth');
const authCtrl     = require('./controllers/authController');
const ideiaCtrl    = require('./controllers/ideiaController');
const recompCtrl   = require('./controllers/recompensaController');
const dashCtrl     = require('./controllers/dashboardController');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.post('/api/auth/registrar', authCtrl.registrar);
app.post('/api/auth/login',     authCtrl.login);
app.get ('/api/auth/perfil',    auth, authCtrl.obterPerfil);
app.put ('/api/auth/perfil',    auth, authCtrl.atualizarPerfil);

// ── IDEIAS (requer token) ─────────────────────────────────────────────────────
app.get   ('/api/ideias/minhas', auth, ideiaCtrl.minhasIdeias);
app.post  ('/api/ideias',        auth, ideiaCtrl.criarIdeia);
app.put   ('/api/ideias/:id',    auth, ideiaCtrl.editarIdeia);
app.delete("/api/ideias/:id",    auth, ideiaCtrl.excluirIdeia);
app.patch ("/api/ideias/:id/status", auth, ideiaCtrl.atualizarStatus); 

// ── RECOMPENSAS (requer token) ────────────────────────────────────────────────
app.get ('/api/recompensas',               auth, recompCtrl.listarRecompensas); 
app.get ('/api/recompensas/historico',     auth, recompCtrl.historico);        
app.post('/api/recompensas/:id/resgatar',  auth, recompCtrl.resgatar);        

// ── DASHBOARD (requer token) ─────────────────────────────────────────────
app.get('/api/dashboard', auth, dashCtrl.getDashboard);

app.get('/', (_, res) => res.json({ status: 'NationInsight API online' }));

app.use((req, res) => res.status(404).json({ erro: `Rota ${req.path} não encontrada` }));

app.listen(PORT, () => {
  console.log(`\n NationInsight API → http://localhost:${PORT}`);
  console.log(' Rotas:');
  console.log('   POST /api/auth/registrar');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/ideias/minhas');
  console.log('   POST /api/ideias');
  console.log('   PUT  /api/ideias/:id');
  console.log('   DEL  /api/ideias/:id');
  console.log('   GET  /api/recompensas');
  console.log('   GET  /api/recompensas/historico');
  console.log('   POST /api/recompensas/:id/resgatar');
  console.log('   GET  /api/dashboard\n');
});