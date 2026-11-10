/**
 * Equivalente a AccesoService / AccesoServiceImpl.java
 */
const { MktdTXException } = require('../exceptions');
const { exito, itemBase } = require('../utils/respuesta');
const accesoRepository = require('../repositories/accesoRepository');

/** Accesos activos (para armar el menú) */
async function accesos() {
  const lista = await accesoRepository.findAllAccesos();
  return exito({
    lista: lista.map((obj) =>
      itemBase({
        idAcceso: obj.idAcceso,
        idMenu: obj.menu.idMenu,
        nombreMenu: obj.menu.nombre,
        nombreAcceso: obj.nombre,
        path: obj.path,
        tipo: obj.tipo,
        ordenMenu: obj.menu.orden,
        ordenAcceso: obj.orden,
        flkactivo: false, //-- en Java no se llenaba en este listado
      })
    ),
  });
}

/** Todos los accesos (mantenimiento) */
async function accesoInicializacion() {
  const lista = await accesoRepository.findByAllAcceso();
  return exito({
    lista: lista.map((i) =>
      itemBase({
        idAcceso: i.idAcceso,
        idMenu: null,
        nombreMenu: i.menu.nombre,
        nombreAcceso: i.nombre,
        path: i.path,
        tipo: i.tipo,
        ordenMenu: null,
        ordenAcceso: i.orden,
        flkactivo: i.flkactivo,
      })
    ),
  });
}

/** Registrar (si no trae idAcceso existente) o actualizar acceso */
async function accesoRegistro(request) {
  const datos = {
    idMenu: request.idMenu,
    nombre: request.nombre,
    orden: request.orden,
    flkactivo: request.flkactivo,
    path: request.path,
    tipo: request.tipo || 'P',
  };

  let acceso = request.idAcceso ? await accesoRepository.findById(request.idAcceso) : null;

  if (acceso) {
    acceso.set(datos);
    acceso = await accesoRepository.save(acceso);
  } else {
    const existe = await accesoRepository.findByNombre(request.nombre);
    if (existe) throw new MktdTXException(`El nombre ${request.nombre} ya existe en la base de datos`);
    acceso = await accesoRepository.create(datos);
  }

  return exito({ id: String(acceso.idAcceso) });
}

async function modificarEstado(request) {
  const acceso = await accesoRepository.findById(request.idAcceso);
  if (!acceso) throw new MktdTXException(`No existe el acceso con id ${request.idAcceso}`);
  acceso.flkactivo = request.flkactivo;
  await accesoRepository.save(acceso);
  return exito({ id: String(acceso.idAcceso) });
}

async function accesoMostrar(idAcceso) {
  const acceso = await accesoRepository.findById(idAcceso);
  if (!acceso) throw new MktdTXException(`No existe el acceso con id ${idAcceso}`);
  return exito({
    idAcceso: acceso.idAcceso,
    idMenu: acceso.idMenu,
    nombreMenu: null,
    nombreAcceso: acceso.nombre,
    path: acceso.path,
    tipo: acceso.tipo,
    ordenMenu: null,
    ordenAcceso: acceso.orden,
    flkactivo: acceso.flkactivo,
  });
}

module.exports = { accesos, accesoInicializacion, accesoRegistro, modificarEstado, accesoMostrar };
