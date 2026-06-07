const pool = require('../database/connection');

function mapIdeia(row) {
  return {
    id:            row.id,
    titulo:        row.titulo,
    desc:          row.descricao,
    categoria:     row.categoria_nome || '',
    status:        row.status,
    impacto:       row.impacto  || null,
    prazo:         row.prazo    || '',
    recursos:      row.recursos || '',
    visualizacoes: row.visualizacoes || 0,
    comentarios:   row.comentarios   || 0,
    pts:           row.pts           || null,
    feedback:      row.feedback      || null,
    data:          row.created_at
                     ? new Date(row.created_at).toLocaleDateString('pt-BR')
                     : '',
  };
}

// ── Pontos concedidos por fase (nova regra de negócio) ────────────────────────
// Colaborador NÃO ganha pontos ao criar a ideia.
// Pontos são creditados apenas quando o GESTOR avança o status da ideia.
const PONTOS_POR_STATUS = {
  'Em Análise': 25,   // gestor aceitou para análise
  'Aprovada':   75,   // ideia aprovada
};

// GET /api/ideias/minhas
async function minhasIdeias(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
         i.IdCod_ide          AS id,
         i.Titulo_ide         AS titulo,
         i.Descricao_ide      AS descricao,
         i.Status_ide         AS status,
         i.Prazo_ide          AS prazo,
         i.Recursos_ide       AS recursos,
         i.Impacto_ide        AS impacto,
         i.Visualizacoes_ide  AS visualizacoes,
         i.Comentarios_ide    AS comentarios,
         i.Pontos_ide         AS pts,
         i.Feedback_ide       AS feedback,
         i.DataCadastro_ide   AS created_at,
         c.Nome_cat           AS categoria_nome
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

    // Credita +15 pontos ao autor pela submissão da ideia
    await pool.query(
      'UPDATE tab_usuario SET saldoPontos_usu = saldoPontos_usu + 15 WHERE IdCod_usu = ?',
      [req.usuario.id]
    );

    const [pontosRow] = await pool.query(
      'SELECT saldoPontos_usu AS pontos FROM tab_usuario WHERE IdCod_usu = ?',
      [req.usuario.id]
    );
    const pontosAtuais = pontosRow[0]?.pontos || 0;

    // Busca ideia recém-criada com todos os campos
    const [nova] = await pool.query(
      `SELECT
         i.IdCod_ide         AS id,
         i.Titulo_ide        AS titulo,
         i.Descricao_ide     AS descricao,
         i.Status_ide        AS status,
         i.Prazo_ide         AS prazo,
         i.Recursos_ide      AS recursos,
         i.Impacto_ide       AS impacto,
         i.Visualizacoes_ide AS visualizacoes,
         i.Comentarios_ide   AS comentarios,
         i.Pontos_ide        AS pts,
         i.Feedback_ide      AS feedback,
         i.DataCadastro_ide  AS created_at,
         c.Nome_cat          AS categoria_nome
       FROM tab_ideia i
       LEFT JOIN tab_cat_ideia c ON i.IdCod_cat = c.IdCod_cat
       WHERE i.IdCod_ide = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      ideia:  mapIdeia(nova[0]),
      pontos: pontosAtuais,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao criar ideia' });
  }
}

// PUT /api/ideias/:id  (edição pelo colaborador — sem alteração de pontos)
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
        titulo    || rows[0].Titulo_ide,
        desc      || rows[0].Descricao_ide,
        prazo     || rows[0].Prazo_ide,
        recursos  || rows[0].Recursos_ide,
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

// PATCH /api/ideias/:id/status  (exclusivo para gestor/admin)
// Avança o status da ideia e credita pontos ao colaborador conforme a fase.
async function atualizarStatus(req, res) {
  const { status, feedback, impacto, pontos: pontosCustom } = req.body;

  const statusPermitidos = ['Em Análise', 'Aprovada', 'Rejeitada'];
  if (!status || !statusPermitidos.includes(status))
    return res.status(400).json({ erro: `Status inválido. Permitidos: ${statusPermitidos.join(', ')}` });

  // Somente gestores e admins podem alterar status
  if (!['gestor', 'admin'].includes(req.usuario.tipo))
    return res.status(403).json({ erro: 'Apenas gestores podem atualizar o status de uma ideia' });

  try {
    const [rows] = await pool.query(
      `SELECT i.*, u.IdCod_usu AS dono_id
       FROM tab_ideia i
       JOIN tab_usuario u ON i.IdCod_usu = u.IdCod_usu
       WHERE i.IdCod_ide = ?`,
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ erro: 'Ideia não encontrada' });

    const ideia = rows[0];

    // Calcula pontos a creditar nesta transição
    const pontosGanhos = pontosCustom ?? PONTOS_POR_STATUS[status] ?? 0;

    // Atualiza status, feedback e impacto da ideia
    await pool.query(
      `UPDATE tab_ideia
       SET Status_ide   = ?,
           Feedback_ide = COALESCE(?, Feedback_ide),
           Impacto_ide  = COALESCE(?, Impacto_ide),
           Pontos_ide   = Pontos_ide + ?
       WHERE IdCod_ide = ?`,
      [status, feedback || null, impacto || null, pontosGanhos, req.params.id]
    );

    // Credita pontos ao colaborador dono da ideia (somente se houver pontos para esta fase)
    if (pontosGanhos > 0) {
      await pool.query(
        'UPDATE tab_usuario SET saldoPontos_usu = saldoPontos_usu + ? WHERE IdCod_usu = ?',
        [pontosGanhos, ideia.dono_id]
      );
    }

    // Busca saldo atualizado do colaborador para retornar
    const [pontosRow] = await pool.query(
      'SELECT saldoPontos_usu AS pontos FROM tab_usuario WHERE IdCod_usu = ?',
      [ideia.dono_id]
    );

    return res.json({
      mensagem:     `Status atualizado para "${status}" com sucesso`,
      pontosGanhos,
      novoSaldoColaborador: pontosRow[0]?.pontos || 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao atualizar status' });
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

module.exports = { minhasIdeias, criarIdeia, editarIdeia, atualizarStatus, excluirIdeia };