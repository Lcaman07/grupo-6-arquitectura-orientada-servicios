/**
 * Combos de la multitabla (devuelven { listados: [...] } como el resto de servicios)
 * Ej.: departamentos (001), provincias de un departamento (002 + codigoPadre), sectores CIIU (033)
 */
const { exito, itemBase } = require('../utils/respuesta');
const catalogoRepository = require('../repositories/catalogoRepository');

async function multitabla(codigoTabla, codigoPadre) {
  const lista = await catalogoRepository.multitablaPorCodigo(codigoTabla, codigoPadre);
  return exito({
    listados: lista.map((i) =>
      itemBase({
        idMultitabla: i.idMultitabla,
        codigoTabla: i.codigoTabla,
        codigo: i.codigo,
        orden: i.orden,
        valor: i.valor,
        valorAux: i.valorAux,
        valorAux2: i.valorAux2,
        codigoPadre: i.codigoPadre,
      })
    ),
  });
}

module.exports = { multitabla };
