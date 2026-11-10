/**
 * Equivalente a ResetTokenRepository.java
 */
const { ResetToken, Usuario } = require('../models');

module.exports = {
  findByToken: (token) => ResetToken.findOne({ where: { token }, include: [{ model: Usuario, as: 'usuario' }] }),
  guardar: (data) => ResetToken.create(data),
  eliminar: (resetToken) => resetToken.destroy(),
};
