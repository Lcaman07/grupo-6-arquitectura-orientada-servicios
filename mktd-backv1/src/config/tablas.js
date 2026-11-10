/**
 * Códigos de las tablas de la multitabla que usa el back (multitabla.codigo_tabla).
 * Los valores de cada tabla (textos, colores, parámetros) se mantienen en Maestros > Multitabla.
 */
module.exports = {
  DEPARTAMENTO: '001',
  PROVINCIA: '002',
  DISTRITO: '003',
  TIPO_DOCUMENTO: '004',
  MONEDA: '005',
  PAIS: '006',
  PARAMETRO_GENERAL: '031',
  APARIENCIA: '032',
  //-- MarketData
  SECTOR_ECONOMICO: '033',
  ESTADO_CONTRIBUYENTE: '034',
  CONDICION_DOMICILIO: '035',
  NIVEL_ATRACTIVO: '036',
  ORIGEN_DATO: '037',
  ESTADO_ANALISIS: '038',

  //-- tablas jerárquicas: el codigo_padre de un valor es el codigo de un valor de la tabla padre
  PADRES: { '002': '001', '003': '002' },
};
