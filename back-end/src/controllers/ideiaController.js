// src/controllers/ideiaController.js — VERSÃO CORRIGIDA
// Nomenclatura unificada: tab_ideia, tab_cat_ideia, tab_usuario

const pool = require('../database/connection');

function mapIdeia(row) {
  return {
    id:           row.id,
    titulo:       row.titulo,
    desc:         row.descricao,
    categoria:    row.categoria_nome || '',
    status:       row.status,
    impacto:      row.impacto || null,
    prazo:        row.prazo   || '',
    recursos:     row.recursos || '',
    visualizacoes: row.visualizacoes || 0,
    comentarios:   row.comentarios   || 0,
    pts:          row.pts,
    feedback:     row.feedback || null,
    data:         row.created_at
                    ? new Date(row.created_at).toLocaleDateString('pt-BR')
                    : '',
  };
}

// GET /api/ideias/minhas
async function minhasIdeias(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
        i.IdCod_ide       AS id,
        i.Titulo_ide      AS titulo,
        i.Descricao_ide   AS descricao,
        i.Status_ide      AS status,
        i.DataCadastro_ide AS created_at,
        c.Nome_cat        AS categoria_nome
      FROM tab_ideia i
      LEFT JOIN tab_cat_ideia c ON i.IdCod_cat = c.IdCod_cat
      WHERE i.IdCod_usu = ?
      ORDER BY i.DataCadastro_ide DESC`,
      [req.usuario.id]
    );
    return res.json(rows.map(mapIdeia));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao buscar ideias' });
  }
}

// POST /api/ideias
async function criarIdeia(req, res) {
  const { titulo, categoria, desc, prazo, recursos } = req.body;

  if (!titulo || !categoria || !desc)
    return res.status(400).json({ erro: 'Título, categoria e descrição são obrigatórios' });

  try {
    const [cats] = await pool.query(
      'SELECT IdCod_cat FROM tab_cat_ideia WHERE Nome_cat = ?',
      [categoria]
    );
    const categoriaId = cats.length ? cats[0].IdCod_cat : null;

    const [result] = await pool.query(
      `INSERT INTO tab_ideia
        (Titulo_ide, Descricao_ide, Status_ide, Prazo_ide, Recursos_ide, DataCadastro_ide, IdCod_usu, IdCod_cat)
       VALUES (?, ?, 'Pendente', ?, ?, CURDATE(), ?, ?)`,
      [titulo, desc, prazo || null, recursos || null, req.usuario.id, categoriaId]
    );

    // Credita +50 pontos
    await pool.query(
      'UPDATE tab_usuario SET saldoPontos_usu = saldoPontos_usu + 50 WHERE IdCod_usu = ?',
      [req.usuario.id]
    );

    const [pontosRow] = await pool.query(
      'SELECT saldoPontos_usu AS pontos FROM tab_usuario WHERE IdCod_usu = ?',
      [req.usuario.id]
    );
    const novosPontos = pontosRow[0]?.pontos || 0;

    // Busca a ideia recém-criada
    const [nova] = await pool.query(
      `SELECT i.IdCod_ide AS id, i.Titulo_ide AS titulo, i.Descricao_ide AS descricao,
              i.Status_ide AS status, i.DataCadastro_ide AS created_at, c.Nome_cat AS categoria_nome
       FROM tab_ideia i
       LEFT JOIN tab_cat_ideia c ON i.IdCod_cat = c.IdCod_cat
       WHERE i.IdCod_ide = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      ideia:  mapIdeia(nova[0]),
      pontos: novosPontos,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao criar ideia' });
  }
}

// PUT /api/ideias/:id
async function editarIdeia(req, res) {
  const { titulo, categoria, desc, prazo, recursos } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM tab_ideia WHERE IdCod_ide = ? AND IdCod_usu = ?',
      [req.params.id, req.usuario.id]
    );

    if (!rows.length)
      return res.status(404).json({ erro: 'Ideia não encontrada' });

    if (rows[0].Status_ide !== 'Pendente')
      return res.status(403).json({ erro: 'Só é possível editar ideias com status Pendente' });

    const [cats] = await pool.query(
      'SELECT IdCod_cat FROM tab_cat_ideia WHERE Nome_cat = ?',
      [categoria]
    );
    const categoriaId = cats.length ? cats[0].IdCod_cat : rows[0].IdCod_cat;

    await pool.query(
      `UPDATE tab_ideia
       SET Titulo_ide=?, Descricao_ide=?, Prazo_ide=?, Recursos_ide=?, IdCod_cat=?
       WHERE IdCod_ide=? AND IdCod_usu=?`,
      [
        titulo   || rows[0].Titulo_ide,
        desc     || rows[0].Descricao_ide,
        prazo    || rows[0].Prazo_ide,
        recursos || rows[0].Recursos_ide,
        categoriaId,
        req.params.id,
        req.usuario.id,
      ]
    );

    return res.json({ mensagem: 'Ideia atualizada com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao editar ideia' });
  }
}

// DELETE /api/ideias/:id
async function excluirIdeia(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tab_ideia WHERE IdCod_ide = ? AND IdCod_usu = ?',
      [req.params.id, req.usuario.id]
    );

    if (!rows.length)
      return res.status(404).json({ erro: 'Ideia não encontrada' });

    if (!['Pendente', 'Rejeitada'].includes(rows[0].Status_ide))
      return res.status(403).json({ erro: 'Só é possível excluir ideias Pendentes ou Rejeitadas' });

    await pool.query(
      'DELETE FROM tab_ideia WHERE IdCod_ide = ? AND IdCod_usu = ?',
      [req.params.id, req.usuario.id]
    );

    return res.json({ mensagem: 'Ideia excluída com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao excluir ideia' });
  }
}

module.exports = { minhasIdeias, criarIdeia, editarIdeia, excluirIdeia };