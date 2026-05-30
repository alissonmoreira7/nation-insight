// src/controllers/authController.js — VERSÃO CORRIGIDA
// Nomenclatura unificada: usa APENAS tab_usuario / tab_cat_ideia / tab_ideia / tab_recompensa

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
        urlfoto_usu       AS foto
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
        cargo:    'Colaborador',     // campo não existe em tab_usuario, valor fixo por ora
        pontos:   user.pontos || 0,
        ranking:  1,                 // pode calcular dinamicamente depois
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}

module.exports = { registrar, login };