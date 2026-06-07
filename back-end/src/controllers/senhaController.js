const crypto  = require('crypto');
const bcrypt   = require('bcryptjs');
const pool     = require('../database/connection');

// POST /api/recuperar-senha
async function recuperarSenha(req, res) {
  const { email } = req.body;

  if (!email || !email.includes('@'))
    return res.status(400).json({ erro: 'E-mail inválido' });

  try {
    // 1. Valida se o e-mail existe (sem revelar ao cliente)
    const [rows] = await pool.query(
      'SELECT IdCod_usu AS id, Nome_usu AS nome FROM tab_usuario WHERE Email_usu = ?',
      [email.trim().toLowerCase()]
    );

    const MSG_GENERICA = 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.';

    if (!rows.length)
      return res.json({ mensagem: MSG_GENERICA });

    const usuario = rows[0];

    // 2. Gera token seguro e prazo de expiração (1 hora)
    const token     = crypto.randomBytes(32).toString('hex');
    const expiracao = new Date(Date.now() + 60 * 60 * 1000);

    // 3. Persiste o token (requer colunas reset_token_usu e reset_expira_usu em tab_usuario)
    await pool.query(
      'UPDATE tab_usuario SET reset_token_usu = ?, reset_expira_usu = ? WHERE IdCod_usu = ?',
      [token, expiracao, usuario.id]
    );

    // 4. [Sem envio real] Em produção substituir por chamada ao serviço de e-mail
    console.log(`[DEV] Token de recuperação para ${email}: ${token}`);

    return res.json({ mensagem: MSG_GENERICA });

  } catch (err) {
    console.error('[recuperarSenha]', err);
    return res.status(500).json({ erro: 'Erro interno ao processar solicitação' });
  }
}

// POST /api/recuperar-senha/confirmar
async function confirmarSenha(req, res) {
  const { token, novaSenha } = req.body;

  if (!token || !novaSenha || novaSenha.length < 6)
    return res.status(400).json({ erro: 'Token e nova senha (mín. 6 caracteres) são obrigatórios' });

  try {
    // Valida token e prazo
    const [rows] = await pool.query(
      `SELECT IdCod_usu AS id FROM tab_usuario
       WHERE reset_token_usu = ? AND reset_expira_usu > NOW()`,
      [token]
    );

    if (!rows.length)
      return res.status(400).json({ erro: 'Token inválido ou expirado' });

    const hash = await bcrypt.hash(novaSenha, Number(process.env.BCRYPT_ROUNDS) || 10);

    // Redefine senha e invalida o token
    await pool.query(
      `UPDATE tab_usuario
       SET senha_usu = ?, reset_token_usu = NULL, reset_expira_usu = NULL
       WHERE IdCod_usu = ?`,
      [hash, rows[0].id]
    );

    return res.json({ mensagem: 'Senha redefinida com sucesso' });

  } catch (err) {
    console.error('[confirmarSenha]', err);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}

module.exports = { recuperarSenha, confirmarSenha };
