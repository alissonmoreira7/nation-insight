// src/controllers/recompensaController.js — VERSÃO CORRIGIDA
// Nomenclatura unificada: tab_recompensa, rel_usuario_recompensa, tab_usuario

const pool = require('../database/connection');

function mapRecompensa(row, pontosUsuario) {
  return {
    id:           row.id,
    nome:         row.nome,
    icon:         row.icone,
    pts:          row.custo_pontos,
    desc:         row.descricao,
    disponiveis:  row.disponiveis,
    desbloqueado: row.custo_pontos <= pontosUsuario && row.disponiveis > 0,
  };
}

// GET /api/recompensas
async function listarRecompensas(req, res) {
  try {
    const [usuRow] = await pool.query(
      'SELECT saldoPontos_usu AS pontos FROM tab_usuario WHERE IdCod_usu = ?',
      [req.usuario.id]
    );
    const pontos = usuRow[0]?.pontos || 0;

    const [rows] = await pool.query(
      `SELECT
        IdCod_rec     AS id,
        Nome_rec      AS nome,
        Icone_rec     AS icone,
        Custo_rec     AS custo_pontos,
        Descricao_rec AS descricao,
        Quantidade_rec AS disponiveis
      FROM tab_recompensa
      WHERE Quantidade_rec > 0
      ORDER BY Custo_rec ASC`
    );

    return res.json({
      pontos,
      recompensas: rows.map(r => mapRecompensa(r, pontos)),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao buscar recompensas' });
  }
}

// GET /api/recompensas/historico
async function historico(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
        rg.IdCod_uur        AS id,
        r.Nome_rec          AS nome,
        r.Icone_rec         AS icon,
        r.Custo_rec         AS pts,
        rg.DataResgate_uur  AS data_resgate
      FROM rel_usuario_recompensa rg
      JOIN tab_recompensa r ON rg.IdCod_rec = r.IdCod_rec
      WHERE rg.IdCod_usu = ?
      ORDER BY rg.DataResgate_uur DESC`,
      [req.usuario.id]
    );

    const resultado = rows.map(h => ({
      id:   h.id,
      nome: h.nome,
      icon: h.icon,
      pts:  h.pts,
      data: h.data_resgate
              ? new Date(h.data_resgate).toLocaleDateString('pt-BR')
              : new Date().toLocaleDateString('pt-BR'),
    }));

    return res.json(resultado);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
}

// POST /api/recompensas/:id/resgatar
async function resgatar(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Pontos do usuário
    const [usuRow] = await conn.query(
      'SELECT saldoPontos_usu AS pontos FROM tab_usuario WHERE IdCod_usu = ? FOR UPDATE',
      [req.usuario.id]
    );
    if (!usuRow.length) {
      await conn.rollback();
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    const pontos = usuRow[0].pontos;

    // Recompensa
    const [recRow] = await conn.query(
      'SELECT * FROM tab_recompensa WHERE IdCod_rec = ? AND Quantidade_rec > 0 FOR UPDATE',
      [req.params.id]
    );
    if (!recRow.length) {
      await conn.rollback();
      return res.status(404).json({ erro: 'Recompensa não encontrada ou esgotada' });
    }
    const r = recRow[0];

    if (pontos < r.Custo_rec) {
      await conn.rollback();
      return res.status(400).json({
        erro: `Pontos insuficientes. Você tem ${pontos} pts e precisa de ${r.Custo_rec} pts`
      });
    }

    // Debita pontos
    await conn.query(
      'UPDATE tab_usuario SET saldoPontos_usu = saldoPontos_usu - ? WHERE IdCod_usu = ?',
      [r.Custo_rec, req.usuario.id]
    );

    // Decrementa estoque
    await conn.query(
      'UPDATE tab_recompensa SET Quantidade_rec = Quantidade_rec - 1 WHERE IdCod_rec = ?',
      [r.IdCod_rec]
    );

    // Registra resgate
    const [ins] = await conn.query(
      'INSERT INTO rel_usuario_recompensa (IdCod_usu, IdCod_rec, DataResgate_uur) VALUES (?, ?, NOW())',
      [req.usuario.id, r.IdCod_rec]
    );

    await conn.commit();

    const novosPontos = pontos - r.Custo_rec;

    return res.json({
      mensagem: `"${r.Nome_rec}" resgatado com sucesso!`,
      pontos:   novosPontos,
      resgate: {
        id:   ins.insertId,
        nome: r.Nome_rec,
        icon: r.Icone_rec,
        pts:  r.Custo_rec,
        data: new Date().toLocaleDateString('pt-BR'),
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao resgatar recompensa' });
  } finally {
    conn.release();
  }
}

module.exports = { listarRecompensas, historico, resgatar };