const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../database/connection');

// POST /api/auth/registrar
async function registrar(req, res) {
  const { nome, email, senha, departamento = '', cargo = '' } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });

  try {
    const [existe] = await pool.query('SELECT IdCod_usu FROM tab_usuario WHERE Email_usu = ?', [email]);
    if (existe.length)
      return res.status(409).json({ erro: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(senha, Number(process.env.BCRYPT_ROUNDS) || 10);

    const [result] = await pool.query(
      `INSERT INTO tab_usuario (Nome_usu, Email_usu, senha_usu, perfilacesso_usu, saldoPontos_usu)
       VALUES (?, ?, ?, 'colaborador', 450)`,
      [nome, email, hash]
    );

    return res.status(201).json({ mensagem: 'Usuário criado com sucesso', id: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha)
    return res.status(400).json({ erro: 'Email e senha obrigatórios' });

  try {
    const [rows] = await pool.query(
      `SELECT
        IdCod_usu  AS id,
        Nome_usu   AS nome,
        Email_usu  AS email,
        senha_usu  AS senha,
        perfilacesso_usu  AS tipo,
        saldoPontos_usu   AS pontos,
        urlfoto_usu       AS foto,
        cargo_usu         AS cargo
      FROM tab_usuario
      WHERE Email_usu = ?`,
      [email]
    );

    if (!rows.length)
      return res.status(401).json({ erro: 'Credenciais inválidas' });

    const user = rows[0];
    const ok   = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: user.id, nome: user.nome, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      usuario: {
        id:       user.id,
        nome:     user.nome,
        email:    user.email,
        tipo:     user.tipo,
        iniciais: user.nome.split(' ').map(p => p[0]).join('').substring(0,2).toUpperCase(),
        cargo:    user.cargo || 'Colaborador',
        pontos:   user.pontos || 0,
        ranking:  1,
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}

// GET /api/auth/perfil
async function obterPerfil(req, res) {
  const userId = req.usuario.id;
  try {
    const [rows] = await pool.query(
      `SELECT
        IdCod_usu  AS id,
        Nome_usu   AS nome,
        Email_usu  AS email,
        perfilacesso_usu  AS tipo,
        saldoPontos_usu   AS pontos,
        urlfoto_usu       AS foto,
        cargo_usu         AS cargo,
        notif_email_usu   AS notifEmail,
        notif_push_usu    AS notifPush,
        notif_novidades_usu AS notifNovidades
      FROM tab_usuario
      WHERE IdCod_usu = ?`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao obter perfil' });
  }
}

// PUT /api/auth/perfil
async function atualizarPerfil(req, res) {
  const userId = req.usuario.id;
  const { nome, email, cargo, senha, notifEmail, notifPush, notifNovidades } = req.body;

  try {
    // 1. Validações e checagem de e-mail existente se houver mudança
    if (email) {
      const [existe] = await pool.query(
        'SELECT IdCod_usu FROM tab_usuario WHERE Email_usu = ? AND IdCod_usu <> ?',
        [email, userId]
      );
      if (existe.length) {
        return res.status(409).json({ erro: 'E-mail já cadastrado por outro usuário' });
      }
    }

    // 2. Busca o usuário atual
    const [atualRows] = await pool.query(
      'SELECT Nome_usu, Email_usu, senha_usu, cargo_usu, notif_email_usu, notif_push_usu, notif_novidades_usu FROM tab_usuario WHERE IdCod_usu = ?',
      [userId]
    );
    if (!atualRows.length) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    const usuarioAtual = atualRows[0];

    // 3. Define os novos valores ou mantém os antigos
    const novoNome = nome !== undefined ? nome : usuarioAtual.Nome_usu;
    const novoEmail = email !== undefined ? email : usuarioAtual.Email_usu;
    const novoCargo = cargo !== undefined ? cargo : usuarioAtual.cargo_usu;
    const novaNotifEmail = notifEmail !== undefined ? (notifEmail ? 1 : 0) : usuarioAtual.notif_email_usu;
    const novaNotifPush = notifPush !== undefined ? (notifPush ? 1 : 0) : usuarioAtual.notif_push_usu;
    const novaNotifNovidades = notifNovidades !== undefined ? (notifNovidades ? 1 : 0) : usuarioAtual.notif_novidades_usu;

    let novaSenhaHash = usuarioAtual.senha_usu;
    if (senha) {
      novaSenhaHash = await bcrypt.hash(senha, Number(process.env.BCRYPT_ROUNDS) || 10);
    }

    // 4. Executa o update
    await pool.query(
      `UPDATE tab_usuario
       SET Nome_usu = ?, Email_usu = ?, senha_usu = ?, cargo_usu = ?, notif_email_usu = ?, notif_push_usu = ?, notif_novidades_usu = ?
       WHERE IdCod_usu = ?`,
      [novoNome, novoEmail, novaSenhaHash, novoCargo, novaNotifEmail, novaNotifPush, novaNotifNovidades, userId]
    );

    // 5. Retorna dados atualizados
    return res.json({
      mensagem: 'Perfil atualizado com sucesso',
      usuario: {
        id: userId,
        nome: novoNome,
        email: novoEmail,
        cargo: novoCargo,
        iniciais: novoNome.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase(),
        notifEmail: !!novaNotifEmail,
        notifPush: !!novaNotifPush,
        notifNovidades: !!novaNotifNovidades
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao atualizar perfil' });
  }
}

module.exports = { registrar, login, obterPerfil, atualizarPerfil };