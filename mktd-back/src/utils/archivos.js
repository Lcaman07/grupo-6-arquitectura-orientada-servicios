/**
 * Imágenes guardadas en disco (carpeta UPLOAD_DIR del .env), no en la base: en Hostinger la base es chica.
 * Se sirven en GET {contextPath}/archivos/<ruta> (público, con caché larga: el nombre cambia en cada subida).
 * El navegador las achica antes de subirlas; aquí solo se valida tipo y peso.
 */
const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const { MktdTXException } = require('../exceptions');

const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Guarda la imagen y devuelve su ruta relativa (ej. productos/12-1696512345.jpg) */
async function guardarImagen(carpeta, prefijo, file, maxKb) {
  if (!file) throw new MktdTXException('Seleccione la imagen');
  const ext = TIPOS[file.mimetype];
  if (!ext) throw new MktdTXException('La imagen debe ser JPG, PNG o WEBP');
  if (maxKb && file.size > maxKb * 1024) throw new MktdTXException(`La imagen pesa ${Math.round(file.size / 1024)} KB; el máximo es ${maxKb} KB`);
  const dir = path.join(config.upload.dir, carpeta);
  await fs.mkdir(dir, { recursive: true });
  const nombre = `${String(prefijo).replace(/[^A-Za-z0-9_-]/g, '')}-${Date.now()}.${ext}`;
  await fs.writeFile(path.join(dir, nombre), file.buffer);
  return `${carpeta}/${nombre}`;
}

/** Borra una imagen anterior (si ya no existe, no pasa nada) */
async function borrar(rutaRelativa) {
  if (!rutaRelativa || rutaRelativa.includes('..')) return;
  try { await fs.unlink(path.join(config.upload.dir, rutaRelativa)); } catch (e) { /* ya no estaba */ }
}

module.exports = { guardarImagen, borrar };
