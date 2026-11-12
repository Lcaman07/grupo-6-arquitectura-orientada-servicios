/**
 * Arma la carpeta que se sube a Hostinger SOLO con lo que usa el sistema
 * (AdminLTE trae ejemplos, documentación y ~60 librerías que no se usan).
 *
 * Uso (desde la carpeta gwu-front):   node herramientas/preparar-hostinger.js
 * Resultado: ../marketdata-front-hostinger  -> subir su CONTENIDO a public_html (o a la carpeta del subdominio)
 *
 * Si agregas una librería nueva en plugins/, súmala a PLUGINS.
 */
const fs = require('fs');
const path = require('path');

const ORIGEN = path.resolve(__dirname, '..');
const DESTINO = path.resolve(ORIGEN, '..', 'marketdata-front-hostinger');

//-- de chart.js (gráficos del panel) basta el .min.js: la carpeta completa pesa 1.4 MB
const ARCHIVOS = ['index.html', '.htaccess', 'plugins/.htaccess', 'plugins/chart.js/Chart.min.js'];
const CARPETAS = [
  'pages/seguridad', 'pages/recuperar', 'pages/maestros', 'pages/cuenta', 'pages/marketdata',
  'dist/img',
  'dist/js/pages/common', 'dist/js/pages/seguridad', 'dist/js/pages/recuperar', 'dist/js/pages/maestros', 'dist/js/pages/cuenta', 'dist/js/pages/marketdata',
];
const ARCHIVOS_DIST = ['dist/css/adminlte.min.css', 'dist/css/gwu-theme.css', 'dist/js/adminlte.min.js', 'dist/js/config.json'];
const PLUGINS = [
  'bootstrap', 'datatables', 'datatables-bs4', 'datatables-responsive', 'fontawesome-free', 'hummingbird-treeview-master',
  'icheck-bootstrap', 'jquery', 'jquery-validation', 'select2', 'select2-bootstrap4-theme', 'sweetalert2',
  'sweetalert2-theme-bootstrap-4',
];
//-- dentro de las carpetas copiadas no hacen falta mapas de depuración ni fuentes sin minificar de las librerías
const OMITIR = (archivo) => /\.map$/i.test(archivo) || /\.(md|txt|ts|scss|less)$/i.test(archivo);

let total = 0;
let cantidad = 0;
function copiar(rel) {
  const de = path.join(ORIGEN, rel);
  if (!fs.existsSync(de)) { console.warn(`  (no existe, se omite) ${rel}`); return; }
  const st = fs.statSync(de);
  if (st.isDirectory()) {
    fs.readdirSync(de).forEach((h) => copiar(path.join(rel, h)));
    return;
  }
  if (OMITIR(rel) && !/LICENSE/i.test(rel)) return;
  const a = path.join(DESTINO, rel);
  fs.mkdirSync(path.dirname(a), { recursive: true });
  fs.copyFileSync(de, a);
  total += st.size;
  cantidad++;
}

fs.rmSync(DESTINO, { recursive: true, force: true });
[...ARCHIVOS, ...ARCHIVOS_DIST, ...CARPETAS, ...PLUGINS.map((p) => `plugins/${p}`)].forEach(copiar);
console.log(`Listo: ${cantidad} archivos, ${(total / 1024 / 1024).toFixed(1)} MB en ${DESTINO}`);
console.log('Antes de subir: revisa dist/js/config.json (URL_BACK con https y el dominio del back).');
