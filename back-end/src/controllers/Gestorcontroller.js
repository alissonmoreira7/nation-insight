// src/controllers/gestorController.js
const pool = require('../database/connection');

// ── GET /api/gestor/ideias ────────────────────────────────────────────────────
// Gestor: lista ideias do próprio departamento
async function listarIdeiasDepartamento(req, res) {
  try {
    const [gestorRows] = await pool.query(
      'SELECT Departamento_usu FROM tab_usuario WHERE IdCod_usu = ?',
      [req.usuario.id]
    );

    if (!gestorRows.length)
      return res.status(404).json({ erro: 'Gestor não encontrado' });

    const departamento = gestorRows[0].Departamento_usu;

    if (!departamento)
      return res.status(400).json({ erro: 'Gestor sem departamento definido' });

    const [rows] = await pool.query(
      `SELECT
         i.IdCod_ide        AS id,
         i.Titulo_ide       AS titulo,
         i.Descricao_ide    AS descricao,
         i.Status_ide       AS status,
         i.Comentarios_ide  AS comentarios,
         i.Feedback_ide     AS feedback,
         i.IdCod_usu        AS autorId,
         u.Nome_usu         AS autorNome,
         u.cargo_usu        AS autorCargo,
         u.Departamento_usu AS autorDepartamento
       FROM tab_ideia i
       INNER JOIN tab_usuario u ON i.IdCod_usu = u.IdCod_usu
       WHERE u.Departamento_usu = ?
       ORDER BY
         FIELD(i.Status_ide,'Pendente','Em Análise','Aprovada','Implementada','Rejeitada'),
         i.IdCod_ide DESC`,
      [departamento]
    );

    return res.json({ departamento, ideias: rows });
  } catch (err) {
    console.error('[gestorController.listarIdeiasDepartamento]', err);
    return res.status(500).json({ erro: 'Erro ao listar ideias do departamento' });
  }
}

// ── GET /api/admin/ideias ─────────────────────────────────────────────────────
// Admin: lista TODAS as ideias de todos os departamentos
async function listarTodasIdeias(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
         i.IdCod_ide        AS id,
         i.Titulo_ide       AS titulo,
         i.Descricao_ide    AS descricao,
         i.Status_ide       AS status,
         i.Comentarios_ide  AS comentarios,
         i.Feedback_ide     AS feedback,
         i.IdCod_usu        AS autorId,
         u.Nome_usu         AS autorNome,
         u.cargo_usu        AS autorCargo,
         u.Departamento_usu AS autorDepartamento
       FROM tab_ideia i
       INNER JOIN tab_usuario u ON i.IdCod_usu = u.IdCod_usu
       ORDER BY
         FIELD(i.Status_ide,'Pendente','Em Análise','Aprovada','Implementada','Rejeitada'),
         i.IdCod_ide DESC`
    );

    return res.json({ ideias: rows });
  } catch (err) {
    console.error('[gestorController.listarTodasIdeias]', err);
    return res.status(500).json({ erro: 'Erro ao listar todas as ideias' });
  }
}

// ── PATCH /api/gestor/ideias/:id/status ──────────────────────────────────────
// Gestor: avalia ideias do seu departamento
// Em Análise → +25 pts | Aprovada → +75 pts (ou pontosCustom)
async function avaliarIdeia(req, res) {
  const ideiaId = req.params.id;
  const { status, feedback, pontosCustom } = req.body;

  const statusPermitidos = ['Em Análise', 'Aprovada', 'Rejeitada'];
  if (!status || !statusPermitidos.includes(status))
    return res.status(400).json({ erro: `Status inválido. Permitidos: ${statusPermitidos.join(', ')}` });

  try {
    const [gestorRows] = await pool.query(
      'SELECT Departamento_usu FROM tab_usuario WHERE IdCod_usu = ?',
      [req.usuario.id]
    );
    if (!gestorRows.length)
      return res.status(404).json({ erro: 'Gestor não encontrado' });

    const departamento = gestorRows[0].Departamento_usu;

    const [ideiaRows] = await pool.query(
      `SELECT i.IdCod_ide, i.Status_ide, i.IdCod_usu AS donoId
       FROM tab_ideia i
       INNER JOIN tab_usuario u ON i.IdCod_usu = u.IdCod_usu
       WHERE i.IdCod_ide = ? AND u.Departamento_usu = ?`,
      [ideiaId, departamento]
    );
    if (!ideiaRows.length)
      return res.status(404).json({ erro: 'Ideia não encontrada ou fora do seu departamento' });

    const { donoId } = ideiaRows[0];

    const PONTOS = { 'Em Análise': 25, 'Aprovada': 75, 'Rejeitada': 0 };
    const pontosGanhos = (pontosCustom != null && status === 'Aprovada')
      ? Number(pontosCustom)
      : PONTOS[status];

    await pool.query(
      `UPDATE tab_ideia
       SET Status_ide   = ?,
           Feedback_ide = COALESCE(?, Feedback_ide)
       WHERE IdCod_ide = ?`,
      [status, feedback || null, ideiaId]
    );

    if (pontosGanhos > 0) {
      await pool.query(
        'UPDATE tab_usuario SET saldoPontos_usu = saldoPontos_usu + ? WHERE IdCod_usu = ?',
        [pontosGanhos, donoId]
      );
    }

    const [saldoRows] = await pool.query(
      'SELECT saldoPontos_usu AS saldo FROM tab_usuario WHERE IdCod_usu = ?',
      [donoId]
    );

    return res.json({
      mensagem: `Ideia atualizada para "${status}" com sucesso`,
      pontosGanhos,
      novoSaldoColaborador: saldoRows[0]?.saldo || 0,
    });
  } catch (err) {
    console.error('[gestorController.avaliarIdeia]', err);
    return res.status(500).json({ erro: 'Erro ao avaliar ideia' });
  }
}

// ── PATCH /api/admin/ideias/:id/status ───────────────────────────────────────
// Admin: pode mover qualquer ideia para "Implementada" (ou qualquer status)
async function implementarIdeia(req, res) {
  const ideiaId = req.params.id;
  const { status, feedback } = req.body;

  const statusPermitidos = ['Em Análise', 'Aprovada', 'Implementada', 'Rejeitada'];
  if (!status || !statusPermitidos.includes(status))
    return res.status(400).json({ erro: `Status inválido. Permitidos: ${statusPermitidos.join(', ')}` });

  try {
    const [ideiaRows] = await pool.query(
      'SELECT IdCod_ide, IdCod_usu AS donoId FROM tab_ideia WHERE IdCod_ide = ?',
      [ideiaId]
    );
    if (!ideiaRows.length)
      return res.status(404).json({ erro: 'Ideia não encontrada' });

    const { donoId } = ideiaRows[0];

    // Implementada concede +100 pts bonus ao colaborador
    const PONTOS = { 'Implementada': 100, 'Aprovada': 75, 'Em Análise': 25, 'Rejeitada': 0 };
    const pontosGanhos = PONTOS[status] || 0;

    await pool.query(
      `UPDATE tab_ideia
       SET Status_ide   = ?,
           Feedback_ide = COALESCE(?, Feedback_ide)
       WHERE IdCod_ide = ?`,
      [status, feedback || null, ideiaId]
    );

    if (pontosGanhos > 0) {
      await pool.query(
        'UPDATE tab_usuario SET saldoPontos_usu = saldoPontos_usu + ? WHERE IdCod_usu = ?',
        [pontosGanhos, donoId]
      );
    }

    const [saldoRows] = await pool.query(
      'SELECT saldoPontos_usu AS saldo FROM tab_usuario WHERE IdCod_usu = ?',
      [donoId]
    );

    return res.json({
      mensagem: `Ideia marcada como "${status}" com sucesso`,
      pontosGanhos,
      novoSaldoColaborador: saldoRows[0]?.saldo || 0,
    });
  } catch (err) {
    console.error('[gestorController.implementarIdeia]', err);
    return res.status(500).json({ erro: 'Erro ao atualizar status da ideia' });
  }
}

// ── POST /api/ideias/:id/comentarios ─────────────────────────────────────────
async function comentarIdeia(req, res) {
  const ideiaId = req.params.id;
  const { texto } = req.body;

  if (!texto || !texto.trim())
    return res.status(400).json({ erro: 'O texto do comentário é obrigatório' });

  try {
    const [ideiaRows] = await pool.query(
      'SELECT IdCod_ide FROM tab_ideia WHERE IdCod_ide = ?',
      [ideiaId]
    );
    if (!ideiaRows.length)
      return res.status(404).json({ erro: 'Ideia não encontrada' });

    const [result] = await pool.query(
      'INSERT INTO tab_comentario (Texto_com, IdCod_ide, IdCod_usu) VALUES (?, ?, ?)',
      [texto.trim(), ideiaId, req.usuario.id]
    );

    await pool.query(
      'UPDATE tab_ideia SET Comentarios_ide = Comentarios_ide + 1 WHERE IdCod_ide = ?',
      [ideiaId]
    );

    return res.status(201).json({ mensagem: 'Comentário adicionado com sucesso', comentarioId: result.insertId });
  } catch (err) {
    console.error('[gestorController.comentarIdeia]', err);
    return res.status(500).json({ erro: 'Erro ao adicionar comentário' });
  }
}

module.exports = { listarIdeiasDepartamento, listarTodasIdeias, avaliarIdeia, implementarIdeia, comentarIdeia };