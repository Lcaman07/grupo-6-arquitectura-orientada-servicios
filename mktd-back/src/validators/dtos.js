/**
 * Definición de los Request DTO (equivalente al paquete dto.request con sus anotaciones)
 *
 * Cada DTO tiene:
 *  - campos: tipo de cada campo para convertir el JSON (int, bool, string, list)
 *  - reglas: validaciones estilo Bean Validation (NotBlank, NotNull, Pattern, Min)
 *
 * Los booleanos se convierten a false si no vienen (en Java eran boolean primitivo).
 */
const DTOS = {
  UsuarioIngresoRequestDTO: {
    campos: { usuario: 'string', clave: 'string' },
    reglas: { usuario: ['NotBlank'], clave: ['NotBlank'] },
  },

  UsuarioRegistroRequestDTO: {
    campos: {
      idUsuario: 'int', idRol: 'int', nombres: 'string', apellidos: 'string', usuario: 'string',
      contrasenia: 'string', telefono: 'string', correo: 'string', flkactivo: 'bool', idTipoDocumento: 'int', dni: 'string', foto: 'string',
    },
    reglas: {
      nombres: ['NotBlank'],
      apellidos: ['NotBlank'],
      usuario: ['NotBlank'],
      //-- contrasenia: solo al crear (se valida en usuarioService); al editar no se envía
      telefono: ['NotBlank', { Pattern: /^[0-9]+$/ }, { Min: 9 }],
      correo: ['NotBlank'],
      dni: ['NotBlank'], //-- el formato depende del tipo de documento: se valida en usuarioService
    },
  },

  UsuarioPerfilRequestDTO: {
    campos: { nombres: 'string', apellidos: 'string', telefono: 'string', idTipoDocumento: 'int', dni: 'string', claveActual: 'string', claveNueva: 'string' },
    reglas: { nombres: ['NotBlank'], apellidos: ['NotBlank'], telefono: ['NotBlank'], dni: ['NotBlank'] },
  },

  AparienciaGuardarRequestDTO: { campos: { valores: 'raw' }, reglas: { valores: ['NotNull'] } },

  UsuarioModificarRequestDTO: { campos: { idUsuario: 'int', flkactivo: 'bool' }, reglas: {} },

  RolRegistroRequestDTO: { campos: { nombre: 'string', flkactivo: 'bool' }, reglas: { nombre: ['NotBlank'] } },

  RolModificacionRequestDTO: {
    campos: { idrol: 'int', nombre: 'string', flkactivo: 'bool' },
    reglas: { idrol: ['NotNull'], nombre: ['NotBlank'] },
  },

  RolModificarRequestDTO: { campos: { idRol: 'int', flkactivo: 'bool' }, reglas: {} },

  MenuRegistroRequestDTO: {
    campos: { idMenu: 'int', nombre: 'string', descripcion: 'string', orden: 'int', flkactivo: 'bool' },
    reglas: { nombre: ['NotBlank'], descripcion: ['NotBlank'], orden: ['NotNull'] },
  },

  MenuModificarRequestDTO: { campos: { idMenu: 'int', flkactivo: 'bool' }, reglas: {} },

  AccesoRegistroRequestDTO: {
    campos: { idAcceso: 'int', idMenu: 'int', nombre: 'string', path: 'string', tipo: 'string', orden: 'int', flkactivo: 'bool' },
    reglas: { idMenu: ['NotNull'], nombre: ['NotBlank'], path: ['NotBlank'], orden: ['NotNull'], tipo: [{ Pattern: /^[PA]$/ }] },
  },

  AccesoModificarRequestDTO: { campos: { idAcceso: 'int', flkactivo: 'bool' }, reglas: {} },

  AccesoRolListaRequestDTO: {
    campos: { lista: { list: { idrol: 'int', idacceso: 'int' } } },
    reglas: {},
  },

  CorreoRequestDTO: {
    campos: {
      correo: 'string', idResponsable: 'int', idAsignacion: 'int', idEncuesta: 'int', idUsuario: 'int',
      flkcorreo: 'bool', flktermando: 'bool',
    },
    reglas: {},
  },
  //-- ===================== MÓDULO ALMACÉN =====================

  MultitablaGuardarRequestDTO: {
    campos: { idMultitabla: 'int', codigoTabla: 'string', codigo: 'string', valor: 'string', valorAux: 'string', valorAux2: 'string', orden: 'raw', codigoPadre: 'string' },
    reglas: { codigoTabla: ['NotBlank'] },
  },

  MultitablaEstadoRequestDTO: { campos: { idMultitabla: 'int', flkactivo: 'bool' }, reglas: { idMultitabla: ['NotNull'] } },

  TokenRequestDTO: { campos: { token: 'string', clave: 'string' }, reglas: { token: ['NotBlank'], clave: ['NotBlank'] } },
  //-- MarketData
  AnalisisZonaRequestDTO: {
    campos: { ubigeo: 'string', seccionInteres: 'string', forzar: 'bool' },
    reglas: { ubigeo: ['NotBlank', { Pattern: /^(\d{2}|\d{4}|\d{6})$/ }] },
  },
  SimulacionRequestDTO: { campos: { servicio: 'string', modo: 'string' }, reglas: { servicio: ['NotBlank'], modo: ['NotBlank'] } },
};

module.exports = DTOS;
