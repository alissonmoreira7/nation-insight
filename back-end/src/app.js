require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const auth         = require('./middleware/auth');
const checkAdmin   = require('./middleware/checkAdmin');
const checkGestor  = require('./middleware/checkGestor');
const authCtrl     = require('./controllers/authController');
const ideiaCtrl    = require('./controllers/ideiaController');
const recompCtrl   = require('./controllers/recompensaController');
const dashCtrl     = require('./controllers/dashboardController');
const adminCtrl    = require('./controllers/Admincontroller');
const gestorCtrl   = require('./controllers/Gestorcontroller');
const senhaCtrl    = require('./controllers/senhaController');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/registrar', authCtrl.registrar);
app.post('/api/auth/login',     authCtrl.login);
app.get ('/api/auth/perfil',    auth, authCtrl.obterPerfil);
app.put ('/api/auth/perfil',    auth, authCtrl.atualizarPerfil);

// ── RECUPERAÇÃO DE SENHA (públicas) ──────────────────────────────────────────
app.post('/api/recuperar-senha',           senhaCtrl.recuperarSenha);
app.post('/api/recuperar-senha/confirmar', senhaCtrl.confirmarSenha);

// ── IDEIAS (colaborador) ──────────────────────────────────────────────────────
app.get   ('/api/ideias/minhas',     auth, ideiaCtrl.minhasIdeias);
app.post  ('/api/ideias',            auth, ideiaCtrl.criarIdeia);
app.put   ('/api/ideias/:id',        auth, ideiaCtrl.editarIdeia);
app.delete('/api/ideias/:id',        auth, ideiaCtrl.excluirIdeia);
app.patch ('/api/ideias/:id/status', auth, ideiaCtrl.atualizarStatus);

// ── COMENTÁRIOS — qualquer usuário autenticado ────────────────────────────────
app.post('/api/ideias/:id/comentarios', auth, gestorCtrl.comentarIdeia);

// ── GESTOR — ideias do próprio departamento ───────────────────────────────────
app.get  ('/api/gestor/ideias',            auth, checkGestor, gestorCtrl.listarIdeiasDepartamento);
app.patch('/api/gestor/ideias/:id/status', auth, checkGestor, gestorCtrl.avaliarIdeia);

// ── ADMIN — todas as ideias + implementar ─────────────────────────────────────
app.get  ('/api/admin/ideias',            auth, checkAdmin, gestorCtrl.listarTodasIdeias);
app.patch('/api/admin/ideias/:id/status', auth, checkAdmin, gestorCtrl.implementarIdeia);

// ── ADMIN — gestão de usuários ────────────────────────────────────────────────
app.get   ('/api/admin/usuarios',     auth, checkAdmin, adminCtrl.listarUsuarios);
app.post  ('/api/admin/usuarios',     auth, checkAdmin, adminCtrl.criarUsuario);
app.put   ('/api/admin/usuarios/:id', auth, checkAdmin, adminCtrl.editarUsuario);
app.delete('/api/admin/usuarios/:id', auth, checkAdmin, adminCtrl.excluirUsuario);
app.get   ('/api/admin/stats',        auth, checkAdmin, adminCtrl.stats);
app.get   ('/api/admin/setores',      auth, checkAdmin, adminCtrl.listarSetores);

// ── RECOMPENSAS ───────────────────────────────────────────────────────────────
app.get ('/api/recompensas',              auth, recompCtrl.listarRecompensas);
app.get ('/api/recompensas/historico',    auth, recompCtrl.historico);
app.post('/api/recompensas/:id/resgatar', auth, recompCtrl.resgatar);

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
app.get('/api/dashboard', auth, dashCtrl.getDashboard);

app.get('/', (_, res) => res.json({ status: 'NationInsight API online' }));
app.use((req, res) => res.status(404).json({ erro: `Rota ${req.path} não encontrada` }));

app.listen(PORT, () => {
  console.log(`\n NationInsight API → http://localhost:${PORT}\n`);
});