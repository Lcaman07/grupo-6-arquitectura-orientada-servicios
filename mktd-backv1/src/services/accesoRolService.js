/**
 * Equivalente a AccesoRolService / AccesoRolServiceImpl.java
 * Registrar/modificar se ejecutan en una transacción (como @Transactional)
 */
const { sequelize } = require('../models');
const { exito, itemBase } = require('../utils/respuesta');
const accesoRolRepository = require('../repositories/accesoRolRepository');

async function accesosPorRol(idRol) {
  const lista = await accesoRolRepository.findByRol(idRol);
  return exito({
    lista: lista.map((obj) =>
      itemBase({
        idAccesoRol: obj.idAccesoRol,
        idAcceso: obj.acceso.idAcceso,
        idRol: obj.rol.idRol,
        idMenu: obj.acceso.menu ? obj.acceso.menu.idMenu : null,
        nombreMenu: obj.acceso.menu ? obj.acceso.menu.nombre : null,
        nombreAcceso: obj.acceso.nombre,
        nombreRol: obj.rol.nombre,
        path: obj.acceso.path,
        tipo: obj.acceso.tipo, //-- P = pantalla (menú lateral), A = acción (permiso de botón)
        flkactivo: obj.acceso.flkactivo && (!obj.acceso.menu || obj.acceso.menu.flkactivo),
        ordenMenu: obj.acceso.menu ? obj.acceso.menu.orden : null,
        ordenAcceso: obj.acceso.orden,
      })
    ),
  });
}

async function insertarLista(lista, transaction) {
  let id = 0;
  for (const obj of lista) {
    const accesoRol = await accesoRolRepository.create({ idRol: obj.idrol, idAcceso: obj.idacceso }, { transaction });
    id = accesoRol.idAccesoRol;
  }
  return id;
}

/** Asigna accesos a un rol */
async function registro(request) {
  const id = await sequelize.transaction((transaction) => insertarLista(request.lista || [], transaction));
  return exito({ id: String(id) });
}

/** Reemplaza todos los accesos del rol por los enviados */
async function modificar(request) {
  const lista = request.lista || [];
  const id = await sequelize.transaction(async (transaction) => {
    if (lista.length > 0) {
      await accesoRolRepository.deleteByRol(lista[0].idrol, { transaction });
    }
    return insertarLista(lista, transaction);
  });
  return exito({ id: String(id) });
}

module.exports = { accesosPorRol, registro, modificar };
