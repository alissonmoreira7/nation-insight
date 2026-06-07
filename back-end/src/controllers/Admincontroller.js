// src/controllers/adminController.js
const bcrypt = require('bcryptjs');
const pool   = require('../database/connection');

// GET /api/admin/setores
async function listarSetores(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT IdCod_set AS id, Nome_set AS nome, Descricao_set AS descricao FROM tab_setor ORDER BY Nome_set ASC'
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao listar setores' });
  }
}

// GET /api/admin/usuarios
async function listarUsuarios(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        IdCod_usu       AS id,
        Nome_usu        AS nome,
        Email_usu       AS email,
        perfilacesso_usu AS perfil,
        cargo_usu       AS cargo,
        Departamento_usu AS departamento,
        saldoPontos_usu AS pontos,
        created_at
      FROM tab_usuario
      ORDER BY created_at DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
}

// POST /api/admin/usuarios
async function criarUsuario(req, res) {
  const { nome, email, senha, perfil = 'colaborador', cargo = 'Colaborador', departamento = '' } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });

  if (!['colaborador', 'gestor', 'admin'].includes(perfil))
    return res.status(400).json({ erro: 'Perfil inválido' });

  try {
    const [existe] = await pool.query(
      'SELECT IdCod_usu FROM tab_usuario WHERE Email_usu = ?', [email]
    );
    if (existe.length)
      return res.status(409).json({ erro: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(senha, Number(process.env.BCRYPT_ROUNDS) || 10);

    const [result] = await pool.query(
      `INSERT INTO tab_usuario (Nome_usu, Email_usu, senha_usu, perfilacesso_usu, cargo_usu, Departamento_usu, saldoPontos_usu)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [nome, email, hash, perfil, cargo, departamento]
    );

    return res.status(201).json({
      mensagem: 'Usuário criado com sucesso',
      id: result.insertId,
      usuario: { id: result.insertId, nome, email, perfil, cargo, departamento, pontos: 0 }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
}

// PUT /api/admin/usuarios/:id
async function editarUsuario(req, res) {
  const { nome, cargo, perfil, pontos, departamento } = req.body;

  // Admin não pode rebaixar a si mesmo
  if (String(req.params.id) === String(req.usuario.id) && perfil && perfil !== req.usuario.tipo)
    return res.status(403).json({ erro: 'Não é possível alterar o próprio perfil' });

  try {
    const [rows] = await pool.query(
      'SELECT IdCod_usu FROM tab_usuario WHERE IdCod_usu = ?', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });

    const campos = [];
    const vals   = [];

    if (nome   !== undefined) { campos.push('Nome_usu = ?');          vals.push(nome); }
    if (cargo  !== undefined) { campos.push('cargo_usu = ?');         vals.push(cargo); }
    if (perfil !== undefined) { campos.push('perfilacesso_usu = ?');  vals.push(perfil); }
    if (pontos !== undefined) { campos.push('saldoPontos_usu = ?');   vals.push(pontos); }
    if (departamento !== undefined) { campos.push('Departamento_usu = ?'); vals.push(departamento); }

    if (!campos.length) return res.status(400).json({ erro: 'Nenhum campo para atualizar' });

    vals.push(req.params.id);
    await pool.query(`UPDATE tab_usuario SET ${campos.join(', ')} WHERE IdCod_usu = ?`, vals);

    return res.json({ mensagem: 'Usuário atualizado com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao editar usuário' });
  }
}

// DELETE /api/admin/usuarios/:id
async function excluirUsuario(req, res) {
  if (String(req.params.id) === String(req.usuario.id))
    return res.status(403).json({ erro: 'Não é possível excluir a própria conta' });

  try {
    const [rows] = await pool.query(
      'SELECT IdCod_usu FROM tab_usuario WHERE IdCod_usu = ?', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });

    await pool.query('DELETE FROM tab_usuario WHERE IdCod_usu = ?', [req.params.id]);
    return res.json({ mensagem: 'Usuário removido com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao excluir usuário' });
  }
}

// GET /api/admin/stats  — KPIs gerais para dashboard admin
async function stats(req, res) {
  try {
    const [[s]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM tab_usuario)                                      AS total_usuarios,
        (SELECT COUNT(*) FROM tab_usuario WHERE perfilacesso_usu = 'colaborador') AS colaboradores,
        (SELECT COUNT(*) FROM tab_usuario WHERE perfilacesso_usu = 'gestor')    AS gestores,
        (SELECT COUNT(*) FROM tab_usuario WHERE perfilacesso_usu = 'admin')     AS admins,
        (SELECT COUNT(*) FROM tab_ideia)                                        AS total_ideias,
        (SELECT COUNT(*) FROM tab_ideia WHERE Status_ide = 'Aprovada')          AS ideias_aprovadas
    `);
    return res.json(s);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao carregar stats' });
  }
}

module.exports = { listarUsuarios, criarUsuario, editarUsuario, excluirUsuario, stats, listarSetores };