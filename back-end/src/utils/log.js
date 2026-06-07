const pool = require('../database/connection');

/**
 * Registra uma ação no tab_log.
 * @param {number} usuarioId   - ID do usuário que executou a ação
 * @param {string} acao        - ex: 'CRIAR_IDEIA', 'EXCLUIR_USUARIO'
 * @param {string|null} entidade   - ex: 'tab_ideia', 'tab_usuario'
 * @param {number|null} entidadeId - ID do registro afetado
 * @param {object|string|null} detalhe - informações extras (serializado em JSON se objeto)
 */
async function registrarLog(usuarioId, acao, entidade = null, entidadeId = null, detalhe = null) {
  try {
    const detalheStr = detalhe && typeof detalhe === 'object'
      ? JSON.stringify(detalhe)
      : detalhe;

    await pool.query(
      `INSERT INTO tab_log (IdCod_usu, acao_log, entidade_log, entidade_id, detalhe_log)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, acao, entidade, entidadeId, detalheStr]
    );
  } catch (err) {
    // Log não pode derrubar a request principal
    console.error('[log] Falha ao registrar log:', err.message);
  }
}

module.exports = { registrarLog };
