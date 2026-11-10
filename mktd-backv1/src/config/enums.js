/**
 * Enums (equivalente a ProfileEnum, TablaEnum, TipoModificaParamGeneralEnum)
 */
const ProfileEnum = Object.freeze({
  PROFILE_DEV: { codigo: 1, perfil: 'dev' },
  PROFILE_TST: { codigo: 2, perfil: 'tst' },
  PROFILE_PRD: { codigo: 3, perfil: 'prd' },
});

const TablaEnum = Object.freeze({
  TABLA_INDICADOR_GENERAL: { codigo: 1, codigoTabla: '001' },
  TABLA_ESTADO_GENERAL: { codigo: 2, codigoTabla: '002' },
  TABLA_PARAMETRO_GENERAL: { codigo: 3, codigoTabla: '003' },
  TABLA_ROL_USUARIO: { codigo: 4, codigoTabla: '004' },
  TABLA_GENERO_SEXUAL: { codigo: 5, codigoTabla: '005' },
});

const TipoModificaParamGeneralEnum = Object.freeze({
  ESTADO_LECTURA: { codigo: 1, tipoModificacion: 'Visualización' },
  ESTADO_CRUD_MODIF_VALOR: { codigo: 2, tipoModificacion: 'CrudModifValor' },
  ESTADO_CRUD_MODIF_VALOR_VALAUX: { codigo: 3, tipoModificacion: 'CrudModifValorValaux' },
  ESTADO_MODIF_VALOR: { codigo: 4, tipoModificacion: 'ModifValor' },
  ESTADO_MODIF_VALAUX: { codigo: 5, tipoModificacion: 'ModifValorValaux' },
});

module.exports = { ProfileEnum, TablaEnum, TipoModificaParamGeneralEnum };
