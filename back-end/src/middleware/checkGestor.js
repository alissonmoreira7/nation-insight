// src/middleware/checkGestor.js
// Usado APÓS o middleware auth — garante que apenas gestor ou admin acessam.
module.exports = function checkGestor(req, res, next) {
  const tipo = req.usuario?.tipo;
  if (tipo === 'gestor' || tipo === 'admin') return next();
  return res.status(403).json({ erro: 'Acesso restrito a gestores' });
};