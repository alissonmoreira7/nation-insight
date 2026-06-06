// src/middleware/checkAdmin.js
// Usado APÓS o middleware auth — garante que apenas admin ou gestor acessam

module.exports = function checkAdmin(req, res, next) {
  const tipo = req.usuario?.tipo;
  if (tipo === 'admin' || tipo === 'gestor') return next();
  return res.status(403).json({ erro: 'Acesso restrito a administradores e gestores' });
};