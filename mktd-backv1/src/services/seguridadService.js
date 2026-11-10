/**
 * Validación de permisos de acción (acceso tipo 'A') en el back.
 * El front oculta los botones con fnCommon.tienePermiso; aquí se vuelve a validar
 * para que nadie apruebe o anule llamando al servicio directamente.
 */
const { MktdTXException } = require('../exceptions');
const { usuarioActual } = require('../utils/contexto');
const accesoRolRepository = require('../repositories/accesoRolRepository');

async function validarPermiso(codigoAccion, descripcion) {
  const usuario = usuarioActual();
  const ok = await accesoRolRepository.tienePermiso(usuario, codigoAccion);
  if (!ok) throw new MktdTXException(`El usuario ${usuario} no tiene permiso para ${descripcion}`);
}

module.exports = { validarPermiso };
