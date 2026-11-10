/**
 * Equivalente a MenuService / MenuServiceImpl.java
 */
const { MktdTXException } = require('../exceptions');
const { exito, itemBase } = require('../utils/respuesta');
const menuRepository = require('../repositories/menuRepository');

const mapMenu = (i) =>
  itemBase({ idMenu: i.idMenu, nombre: i.nombre, descripcion: i.descripcion, orden: i.orden, flkactivo: i.flkactivo });

async function menuInicializacion() {
  const lista = await menuRepository.findAll();
  return exito({ listados: lista.map(mapMenu) });
}

async function menuByActivoInicializacion() {
  const lista = await menuRepository.findByMenuActivo();
  return exito({ listados: lista.map(mapMenu) });
}

async function menuMostrar(idMenu) {
  const menu = await menuRepository.findById(idMenu);
  if (!menu) throw new MktdTXException(`No existe el menú con id ${idMenu}`);
  return exito({ idMenu: menu.idMenu, nombre: menu.nombre, descripcion: menu.descripcion, orden: menu.orden, flkactivo: menu.flkactivo });
}

/** Registrar (si no trae idMenu existente) o actualizar menú */
async function menuRegistro(request) {
  const datos = { nombre: request.nombre, descripcion: request.descripcion, orden: request.orden, flkactivo: request.flkactivo };

  let menu = request.idMenu ? await menuRepository.findById(request.idMenu) : null;

  if (menu) {
    menu.set(datos);
    menu = await menuRepository.save(menu);
  } else {
    const existe = await menuRepository.findByNombreOrOrden(request.nombre, request.orden);
    if (existe) {
      throw new MktdTXException(`El menú ${request.nombre} o el orden ${request.orden} ya existe en la base de datos`);
    }
    menu = await menuRepository.create(datos);
  }

  return exito({ id: String(menu.idMenu) });
}

async function modificarEstado(request) {
  const menu = await menuRepository.findById(request.idMenu);
  if (!menu) throw new MktdTXException(`No existe el menú con id ${request.idMenu}`);
  menu.flkactivo = request.flkactivo;
  await menuRepository.save(menu);
  return exito({ id: String(menu.idMenu) });
}

module.exports = { menuInicializacion, menuByActivoInicializacion, menuMostrar, menuRegistro, modificarEstado };
