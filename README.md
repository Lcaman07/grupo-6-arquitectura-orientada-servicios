# grupo-6-arquitectura-orientada-servicios
Proyecto del Grupo 6 - Curso de Arquitectura Orientada a Servicios

**MarketData Perú**: plataforma de análisis territorial y empresarial que integra servicios del INEI (REST/JSON) y de la SUNAT (SOAP/XML).

| Carpeta | Contenido | Tecnología |
|---|---|---|
| [`mktd-back`](mktd-back) | API REST (marketdata-api) | Node.js 18+, Express, Sequelize, MySQL 8 |
| [`mktd-front`](mktd-front) | Interfaz web | HTML + jQuery sobre AdminLTE 3 |

Detalle de la arquitectura y de los endpoints: [`mktd-back/README.md`](mktd-back/README.md).

---

## Guía de instalación local (Windows)

### Requisitos

- [Node.js](https://nodejs.org) 18 o superior (versión LTS)
- MySQL 8 + MySQL Workbench (o DBeaver)
- [XAMPP](https://www.apachefriends.org) (solo se usa **Apache** para servir el front)

### 1. Base de datos

1. Abre MySQL Workbench y conéctate a tu instancia local.
2. **File → Open SQL Script…** y elige `mktd-back/db/marketdata_db.sql`.
3. Ejecuta **todo** el script con el rayo ⚡ sin cursor (`Ctrl + Shift + Enter`).
   El script **borra y vuelve a crear** la base `marketdata_db`.
4. Refresca el panel *Schemas*: debe aparecer `marketdata_db`.

> No guardes el script desde Workbench (`Ctrl + S`): si la pestaña quedó vacía se sobrescribe el archivo.
> Si pasa, recupéralo con `git restore mktd-back/db/marketdata_db.sql`.

### 2. Backend (`mktd-back`)

1. Copia la plantilla de configuración:
   ```bash
   cd mktd-back
   copy .env.example .env
   ```
2. Edita `.env` (el archivo **no** se sube a Git):

   | Variable | Valor |
   |---|---|
   | `DB_HOST` | `localhost` (no `%`: eso es un comodín de usuarios de MySQL, no un host) |
   | `DB_USERNAME` / `DB_PASSWORD` | El usuario y la contraseña con los que entras a MySQL |
   | `JWT_SECRET` | **Obligatoria.** Cualquier texto largo y aleatorio |
   | `MAIL_ENABLED` | `false` si no vas a probar el envío de correos |

3. Instala dependencias y arranca:
   ```bash
   npm install
   npm run dev
   ```
4. Comprueba: <http://localhost:8081/marketdata-api/actuator/health> → `{"status":"UP"}`

Pruebas unitarias (no necesitan base de datos):
```bash
npm test
```

### 3. Frontend (`mktd-front`) con XAMPP

1. Copia la carpeta `mktd-front` a `C:\xampp\htdocs` y renómbrala a **`gwu-front`**
   (coincide con `FRONT_URL` del `.env`, que se usa en el correo de recuperar contraseña).
2. Verifica que `dist/js/config.json` apunte al back:
   ```json
   { "URL_BACK": "http://localhost:8081/marketdata-api" }
   ```
3. En el XAMPP Control Panel inicia **solo Apache**. No inicies el MySQL de XAMPP: choca con MySQL 8 en el puerto 3306.
4. Abre <http://localhost/gwu-front/pages/seguridad/login.html>

Usuario de prueba: `analista` / `Analista2026` (rol ANALISTA DE MERCADO).

> La copia en `htdocs` no está conectada a Git: después de un `git pull` vuelve a copiarla,
> y haz tus cambios siempre en `mktd-front` del repositorio.

---

## Problemas frecuentes

| Error | Causa | Solución |
|---|---|---|
| `npm.ps1 no se puede cargar ... la ejecución de scripts está deshabilitada` | Política de ejecución de PowerShell | Usa `npm.cmd install` / `npm.cmd run dev`, o abre la terminal **Command Prompt** |
| `"cross-env" no se reconoce como un comando` | Las dependencias no se instalaron | Ejecuta `npm install` dentro de `mktd-back` y verifica que exista `node_modules` |
| `No se pudo conectar a la base de datos: getaddrinfo ENOTFOUND` | `DB_HOST` mal escrito en `.env` | Usa `DB_HOST=localhost` |
| `Access denied for user` | Usuario o contraseña de MySQL incorrectos | Revisa `DB_USERNAME` y `DB_PASSWORD` en `.env` |
| `Falta la variable JWT_SECRET` | `JWT_SECRET` vacío | Coloca un valor en `.env` |
| Apache no inicia en XAMPP | Otro programa usa el puerto 80 | Cierra ese programa o cambia el puerto de Apache |
| El login se ve sin estilos | Falta la carpeta `dist` en la copia de `htdocs` | Vuelve a copiar `mktd-front` completo |
Integrante: Xavier Alexander.
Integrante: Edward Anibal Vilca Monje
