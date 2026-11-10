/**
 * Equivalente a RolService / RolServiceImpl.java
 */
const C = require('../config/constantes');
const { MktdTXException } = require('../exceptions');
const { exito } = require('../utils/respuesta');
const rolRepository = require('../repositories/rolRepository');

const mapRol = (i) => ({ idRol: i.idRol, nombre: i.nombre, flkactivo: i.flkactivo });

async function rolRegistro(request) {
  const rol = await rolRepository.create({ nombre: request.nombre, flkactivo: request.flkactivo });
  return exito({ id: String(rol.idRol) });
}

/** Todos los roles */
async function rolListado() {
  const lista = await rolRepository.findAll();
  return exito({ listados: lista.map(mapRol) });
}

/** Solo roles activos */
async function rolInicializacion() {
  const lista = await rolRepository.findByRolActivo();
  return exito({ listados: lista.map(mapRol) });
}

async function rolModificar(request) {
  //-- Antes era upsert (INSERT ... ON DUPLICATE KEY UPDATE): MySQL exigía usuario_crea aunque solo actualizara
  const rol = await rolRepository.findById(request.idrol);
  if (!rol) throw new MktdTXException(`No existe el rol con id ${request.idrol}`);
  rol.set({ nombre: request.nombre, flkactivo: request.flkactivo });
  await rolRepository.save(rol);
  return exito({ id: String(request.idrol) });
}

async function rolMostrar(idRol) {
  const rol = await rolRepository.findById(idRol);
  if (!rol) throw new MktdTXException(`No existe el rol con id ${idRol}`);
  return exito(mapRol(rol));
}

async function rolCambiarEstado(idRol, estado) {
  try {
    await rolRepository.changeState(idRol, estado);
    return exito({ id: String(idRol) });
  } catch (ex) {
    return {
      codigoRespuesta: C.CODIGO_RESPUESTA_GENERAL_ERROR,
      mensajeRespuesta: String(ex),
      objErrorResource: null,
      id: String(idRol),
    };
  }
}

async function modificarEstado(request) {
  const rol = await rolRepository.findById(request.idRol);
  if (!rol) throw new MktdTXException(`No existe el rol con id ${request.idRol}`);
  rol.flkactivo = request.flkactivo;
  await rolRepository.save(rol);
  return exito({ id: String(rol.idRol) });
}

module.exports = { rolRegistro, rolListado, rolInicializacion, rolModificar, rolMostrar, rolCambiarEstado, modificarEstado };
