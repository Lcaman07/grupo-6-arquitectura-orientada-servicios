/**
 * Servicio EXTERNO simulado de la SUNAT — SOAP 1.1 / XML
 * ----------------------------------------------------------------------------
 *   GET  {SUNAT_URL}?wsdl                 contrato WSDL
 *   POST {SUNAT_URL}                      SOAPAction: getDatosPrincipales | getResumenPorUbigeo
 *
 * Los nombres de los campos se inspiran en el antiguo servicio de consulta RUC de la SUNAT
 * (ddp_numruc, ddp_nombre, desc_estado, desc_flag22 = condición, ddp_ciiu...).
 * Errores: SOAP Fault (HTTP 500). faultcode soap:Client = error del que llama (no se reintenta),
 * soap:Server = falla del servicio (sí se reintenta).
 */
const express = require('express');
const datos = require('./datos');
const simulacion = require('./simulacion');

const NS = 'http://ws.consultaruc.sunat.mock.marketdata.pe/';
const router = express.Router();

const esc = (v) => String(v === null || v === undefined ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sobre = (cuerpo) => `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="${NS}">
  <soap:Body>
${cuerpo}
  </soap:Body>
</soap:Envelope>`;

function fault(res, codigo, mensaje, http = 500) {
  res.status(http).type('text/xml').send(sobre(`    <soap:Fault>
      <faultcode>soap:${codigo}</faultcode>
      <faultstring>${esc(mensaje)}</faultstring>
    </soap:Fault>`));
}

const xmlContribuyente = (c, tag = 'return') => `      <${tag}>
        <ddp_numruc>${c.ruc}</ddp_numruc>
        <ddp_nombre>${esc(c.razonSocial)}</ddp_nombre>
        <desc_tpoemp>${esc(c.tipo)}</desc_tpoemp>
        <ddp_nomcomer>${esc(c.nombreComercial)}</ddp_nomcomer>
        <desc_estado>${esc(c.estado)}</desc_estado>
        <desc_flag22>${esc(c.condicion)}</desc_flag22>
        <ddp_ciiu>${c.ciiu}</ddp_ciiu>
        <desc_ciiu>${esc(c.actividad)}</desc_ciiu>
        <ddp_ubigeo>${c.ubigeo}</ddp_ubigeo>
        <desc_dep>${esc(c.departamento)}</desc_dep>
        <desc_prov>${esc(c.provincia)}</desc_prov>
        <desc_dist>${esc(c.distrito)}</desc_dist>
        <ddp_domicilio>${esc(c.direccion)}</ddp_domicilio>
        <ddp_fecalt>${c.fechaInscripcion}</ddp_fecalt>
      </${tag}>`;

/** Lee el valor de una etiqueta del request (sin importar el prefijo del namespace) */
function campo(xml, nombre) {
  const m = new RegExp(`<(?:\\w+:)?${nombre}>\\s*([^<]*?)\\s*</(?:\\w+:)?${nombre}>`).exec(xml || '');
  return m ? m[1] : null;
}

router.use(express.text({ type: ['text/xml', 'application/soap+xml', 'application/xml'], limit: '64kb' }));
router.use(simulacion.middleware('SUNAT', (res, mensaje) => fault(res, 'Server', mensaje, 503)));

router.get('/', (req, res) => {
  if (!('wsdl' in req.query)) return res.type('text/plain').send('Servicio SOAP ConsultaRuc (simulado). Use ?wsdl para ver el contrato.');
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
  return res.type('text/xml').send(wsdl(url));
});

router.post('/', (req, res) => {
  const xml = typeof req.body === 'string' ? req.body : '';
  const accion = String(req.get('SOAPAction') || '').replace(/"/g, '') || (/getResumenPorUbigeo/.test(xml) ? 'getResumenPorUbigeo' : 'getDatosPrincipales');

  if (/getDatosPrincipales$/.test(accion)) {
    const ruc = campo(xml, 'numruc');
    if (!ruc || !/^\d{11}$/.test(ruc)) return fault(res, 'Client', 'El número de RUC debe tener 11 dígitos');
    if (!datos.rucValido(ruc)) return fault(res, 'Client', `El número de RUC ${ruc} no es válido (dígito verificador)`);
    return res.type('text/xml').send(sobre(`    <ns2:getDatosPrincipalesResponse>
${xmlContribuyente(datos.datosRuc(ruc))}
    </ns2:getDatosPrincipalesResponse>`));
  }

  if (/getResumenPorUbigeo$/.test(accion)) {
    const ubigeo = campo(xml, 'ubigeo');
    const tam = Math.min(50, Math.max(0, parseInt(campo(xml, 'tamanioMuestra') || '10', 10) || 0));
    if (!ubigeo || !/^(\d{2}|\d{4}|\d{6})$/.test(ubigeo)) return fault(res, 'Client', 'El ubigeo debe tener 2, 4 o 6 dígitos');
    const r = datos.resumenZona(ubigeo);
    if (!r) return fault(res, 'Client', `No existe el ubigeo ${ubigeo}`);
    const sectores = Object.entries(r.sectores)
      .map(([k, v]) => `          <sector><seccion>${k}</seccion><cantidad>${v.cantidad}</cantidad><activos>${v.activos}</activos></sector>`)
      .join('\n');
    const muestra = datos.muestraZona(ubigeo, tam).map((c) => xmlContribuyente(c, 'contribuyente')).join('\n');
    return res.type('text/xml').send(sobre(`    <ns2:getResumenPorUbigeoResponse>
      <return>
        <ubigeo>${ubigeo}</ubigeo>
        <totalContribuyentes>${r.total}</totalContribuyentes>
        <activos>${r.activos}</activos>
        <habidos>${r.habidos}</habidos>
        <bajas>${r.bajas}</bajas>
        <sectores>
${sectores}
        </sectores>
        <muestra>
${muestra}
        </muestra>
      </return>
    </ns2:getResumenPorUbigeoResponse>`));
  }

  return fault(res, 'Client', `Operación no soportada: ${accion}`);
});

function wsdl(url) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="ConsultaRuc" targetNamespace="${NS}" xmlns:tns="${NS}"
  xmlns="http://schemas.xmlsoap.org/wsdl/" xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <types>
    <xsd:schema targetNamespace="${NS}">
      <xsd:complexType name="beanDdp">
        <xsd:sequence>
          <xsd:element name="ddp_numruc" type="xsd:string"/><xsd:element name="ddp_nombre" type="xsd:string"/>
          <xsd:element name="desc_tpoemp" type="xsd:string"/><xsd:element name="ddp_nomcomer" type="xsd:string"/>
          <xsd:element name="desc_estado" type="xsd:string"/><xsd:element name="desc_flag22" type="xsd:string"/>
          <xsd:element name="ddp_ciiu" type="xsd:string"/><xsd:element name="desc_ciiu" type="xsd:string"/>
          <xsd:element name="ddp_ubigeo" type="xsd:string"/><xsd:element name="desc_dep" type="xsd:string"/>
          <xsd:element name="desc_prov" type="xsd:string"/><xsd:element name="desc_dist" type="xsd:string"/>
          <xsd:element name="ddp_domicilio" type="xsd:string"/><xsd:element name="ddp_fecalt" type="xsd:date"/>
        </xsd:sequence>
      </xsd:complexType>
      <xsd:complexType name="sector">
        <xsd:sequence><xsd:element name="seccion" type="xsd:string"/><xsd:element name="cantidad" type="xsd:int"/><xsd:element name="activos" type="xsd:int"/></xsd:sequence>
      </xsd:complexType>
      <xsd:complexType name="resumenUbigeo">
        <xsd:sequence>
          <xsd:element name="ubigeo" type="xsd:string"/><xsd:element name="totalContribuyentes" type="xsd:int"/>
          <xsd:element name="activos" type="xsd:int"/><xsd:element name="habidos" type="xsd:int"/><xsd:element name="bajas" type="xsd:int"/>
          <xsd:element name="sectores"><xsd:complexType><xsd:sequence><xsd:element name="sector" type="tns:sector" maxOccurs="unbounded"/></xsd:sequence></xsd:complexType></xsd:element>
          <xsd:element name="muestra"><xsd:complexType><xsd:sequence><xsd:element name="contribuyente" type="tns:beanDdp" minOccurs="0" maxOccurs="unbounded"/></xsd:sequence></xsd:complexType></xsd:element>
        </xsd:sequence>
      </xsd:complexType>
      <xsd:element name="getDatosPrincipales"><xsd:complexType><xsd:sequence><xsd:element name="numruc" type="xsd:string"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="getDatosPrincipalesResponse"><xsd:complexType><xsd:sequence><xsd:element name="return" type="tns:beanDdp"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="getResumenPorUbigeo"><xsd:complexType><xsd:sequence><xsd:element name="ubigeo" type="xsd:string"/><xsd:element name="tamanioMuestra" type="xsd:int"/></xsd:sequence></xsd:complexType></xsd:element>
      <xsd:element name="getResumenPorUbigeoResponse"><xsd:complexType><xsd:sequence><xsd:element name="return" type="tns:resumenUbigeo"/></xsd:sequence></xsd:complexType></xsd:element>
    </xsd:schema>
  </types>
  <message name="getDatosPrincipales"><part name="parameters" element="tns:getDatosPrincipales"/></message>
  <message name="getDatosPrincipalesResponse"><part name="parameters" element="tns:getDatosPrincipalesResponse"/></message>
  <message name="getResumenPorUbigeo"><part name="parameters" element="tns:getResumenPorUbigeo"/></message>
  <message name="getResumenPorUbigeoResponse"><part name="parameters" element="tns:getResumenPorUbigeoResponse"/></message>
  <portType name="ConsultaRucPortType">
    <operation name="getDatosPrincipales"><input message="tns:getDatosPrincipales"/><output message="tns:getDatosPrincipalesResponse"/></operation>
    <operation name="getResumenPorUbigeo"><input message="tns:getResumenPorUbigeo"/><output message="tns:getResumenPorUbigeoResponse"/></operation>
  </portType>
  <binding name="ConsultaRucBinding" type="tns:ConsultaRucPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="getDatosPrincipales"><soap:operation soapAction="getDatosPrincipales"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
    <operation name="getResumenPorUbigeo"><soap:operation soapAction="getResumenPorUbigeo"/><input><soap:body use="literal"/></input><output><soap:body use="literal"/></output></operation>
  </binding>
  <service name="ConsultaRucService">
    <port name="ConsultaRucPort" binding="tns:ConsultaRucBinding"><soap:address location="${esc(url)}"/></port>
  </service>
</definitions>`;
}

module.exports = { router, NS };
