/**
 * Adaptador SOAP / XML de la SUNAT (servicio de UTILIDAD)
 * ----------------------------------------------------------------------------
 * Arma el sobre SOAP, lo envía, interpreta el SOAP Fault y transforma el XML a un objeto interno:
 *   SOAP/XML -> objeto interno -> (el controlador lo devuelve en JSON)
 * También normaliza los textos de la SUNAT a los códigos de MarketData
 *   "BAJA DE OFICIO" -> BAJA_DE_OFICIO (multitabla 034), "NO HABIDO" -> NO_HABIDO (multitabla 035)
 */
const { XMLParser } = require('fast-xml-parser');
const config = require('../config');
const { invocar, ErrorIntegracion } = require('./invocador');

const SERVICIO = 'SUNAT';
const NS = 'http://ws.consultaruc.sunat.mock.marketdata.pe/';

const parser = new XMLParser({
  removeNSPrefix: true, //-- soap:Envelope -> Envelope, ns2:getDatos... -> getDatos...
  ignoreAttributes: true,
  parseTagValue: false, //-- todo llega como texto: el RUC y el ubigeo no deben perder ceros
  trimValues: true,
  isArray: (nombre) => nombre === 'sector' || nombre === 'contribuyente',
});

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const sobre = (operacion, cuerpo) => `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="${NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:${operacion}>${cuerpo}</ser:${operacion}>
  </soapenv:Body>
</soapenv:Envelope>`;

/** Texto SUNAT -> código interno */
const codigo = (texto) => (texto ? String(texto).trim().toUpperCase().replace(/\s+/g, '_') : null);
const entero = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
};

function leerXml(texto) {
  try {
    return parser.parse(texto);
  } catch (e) {
    throw new ErrorIntegracion(SERVICIO, 'La SUNAT respondió un XML inválido', { transitorio: false });
  }
}

/** Si la respuesta es un SOAP Fault devuelve { codigo: 'Client'|'Server', mensaje } */
function leerFault(texto) {
  if (!texto || !/Fault/.test(texto)) return null;
  try {
    const f = parser.parse(texto)?.Envelope?.Body?.Fault;
    if (!f) return null;
    return { codigo: String(f.faultcode || '').replace(/^.*:/, ''), mensaje: String(f.faultstring || 'SOAP Fault') };
  } catch (e) {
    return null;
  }
}

/** Contrato interno de un contribuyente */
function normalizarContribuyente(c) {
  const ciiu = c.ddp_ciiu ? String(c.ddp_ciiu) : null;
  return {
    ruc: String(c.ddp_numruc),
    razonSocial: c.ddp_nombre || null,
    tipoContribuyente: c.desc_tpoemp || null,
    nombreComercial: c.ddp_nomcomer && c.ddp_nomcomer !== '-' ? c.ddp_nomcomer : null,
    estado: codigo(c.desc_estado),
    condicion: codigo(c.desc_flag22),
    ciiu,
    actividadEconomica: c.desc_ciiu || null,
    seccionCiiu: seccionDeCiiu(ciiu),
    ubigeo: c.ddp_ubigeo ? String(c.ddp_ubigeo) : null,
    departamento: c.desc_dep || null,
    provincia: c.desc_prov || null,
    distrito: c.desc_dist || null,
    direccion: c.ddp_domicilio || null,
    fechaInscripcion: /^\d{4}-\d{2}-\d{2}$/.test(c.ddp_fecalt || '') ? c.ddp_fecalt : null,
  };
}

/** División CIIU Rev.4 (2 primeros dígitos) -> sección (letra) */
function seccionDeCiiu(ciiu) {
  if (!ciiu) return null;
  const d = parseInt(String(ciiu).slice(0, 2), 10);
  const rangos = [[3, 'A'], [9, 'B'], [33, 'C'], [35, 'D'], [39, 'E'], [43, 'F'], [47, 'G'], [53, 'H'], [56, 'I'], [63, 'J'],
    [66, 'K'], [68, 'L'], [75, 'M'], [82, 'N'], [84, 'O'], [85, 'P'], [88, 'Q'], [93, 'R'], [96, 'S'], [98, 'T'], [99, 'U']];
  const r = rangos.find(([max]) => d <= max);
  return r ? r[1] : null;
}

async function llamar(operacion, cuerpo, parametro) {
  const url = config.integracion.sunatUrl;
  const r = await invocar({
    servicio: SERVICIO,
    operacion,
    protocolo: 'SOAP',
    url,
    parametro,
    peticion: {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=UTF-8', SOAPAction: `"${operacion}"`, Accept: 'text/xml' },
      body: sobre(operacion, cuerpo),
    },
    evaluar: (status, texto) => {
      const fault = leerFault(texto);
      if (status >= 200 && status < 300 && !fault) return { ok: true };
      if (fault) {
        //-- soap:Client = el pedido está mal (RUC inválido, ubigeo inexistente): no tiene sentido reintentar
        const cliente = fault.codigo === 'Client';
        return { ok: false, transitorio: !cliente, noEncontrado: cliente, mensaje: `SOAP Fault ${fault.codigo}: ${fault.mensaje}` };
      }
      return { ok: false, transitorio: status === 408 || status === 429 || status >= 500, mensaje: `HTTP ${status}` };
    },
  });
  const body = leerXml(r.texto)?.Envelope?.Body;
  const respuesta = body && body[`${operacion}Response`];
  if (!respuesta || !respuesta.return) {
    throw new ErrorIntegracion(SERVICIO, `Respuesta SOAP sin ${operacion}Response`, { transitorio: false });
  }
  return { ret: respuesta.return, intentos: r.intentos, tiempoMs: r.tiempoMs };
}

/** getDatosPrincipales(numruc) */
async function consultarRuc(ruc) {
  const r = await llamar('getDatosPrincipales', `<numruc>${esc(ruc)}</numruc>`, ruc);
  return { datos: normalizarContribuyente(r.ret), intentos: r.intentos, tiempoMs: r.tiempoMs };
}

/** getResumenPorUbigeo(ubigeo, tamanioMuestra) */
async function resumenPorUbigeo(ubigeo, tamanioMuestra) {
  const r = await llamar('getResumenPorUbigeo', `<ubigeo>${esc(ubigeo)}</ubigeo><tamanioMuestra>${Number(tamanioMuestra) || 0}</tamanioMuestra>`, ubigeo);
  const ret = r.ret;
  const sectores = (ret.sectores?.sector || []).map((s) => ({
    seccionCiiu: String(s.seccion), cantidad: entero(s.cantidad), activas: entero(s.activos),
  }));
  const muestra = (ret.muestra?.contribuyente || []).map(normalizarContribuyente);
  return {
    datos: {
      ubigeo: String(ret.ubigeo || ubigeo),
      totalEmpresas: entero(ret.totalContribuyentes),
      empresasActivas: entero(ret.activos),
      empresasHabidas: entero(ret.habidos),
      empresasBaja: entero(ret.bajas),
      sectores,
      muestra,
    },
    intentos: r.intentos,
    tiempoMs: r.tiempoMs,
  };
}

/** Ping rápido (pide el WSDL) para el panel de estado */
async function salud() {
  const url = config.integracion.sunatUrl;
  const inicio = Date.now();
  try {
    const res = await fetch(`${url}?wsdl`, { signal: AbortSignal.timeout(3000) });
    const texto = await res.text();
    return { servicio: SERVICIO, protocolo: 'SOAP', url, disponible: res.ok && /definitions/.test(texto), estadoHttp: res.status, tiempoMs: Date.now() - inicio };
  } catch (e) {
    return { servicio: SERVICIO, protocolo: 'SOAP', url, disponible: false, estadoHttp: null, tiempoMs: Date.now() - inicio, mensaje: e.cause?.code || e.message };
  }
}

module.exports = { consultarRuc, resumenPorUbigeo, salud, normalizarContribuyente, seccionDeCiiu, leerFault };
