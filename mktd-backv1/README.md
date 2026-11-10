# MarketData API (back)

Plataforma de análisis territorial y empresarial del Perú — **MarketData Perú S.A.C.** (empresa ficticia, proyecto académico).
Backend en **Node.js + Express + Sequelize + MySQL**, con Arquitectura Orientada a Servicios (SOA) y patrón **Controller-Service-Model**.

## Arquitectura (Capítulo 2)

| Capa | Archivos | Función |
|---|---|---|
| Exposición / control | `src/routes/index.js`, `src/controllers/marketdataController.js` | Reciben HTTP y devuelven REST/JSON |
| Orquestación | `src/services/orquestadorService.js` | "Análisis de zona": invoca Territorial y Empresarial **en paralelo**, consolida, calcula el índice y guarda |
| Entidad | `src/services/territorialService.js`, `src/services/empresarialService.js` | Información del INEI y de la SUNAT, con caché en MySQL |
| Utilidad / mediación | `src/integracion/invocador.js`, `ineiRestAdapter.js`, `sunatSoapAdapter.js` | Aíslan protocolos (REST/JSON y SOAP/XML), timeout, reintentos con espera progresiva y bitácora |
| Persistencia | `src/models/*`, `src/repositories/*` | MySQL: caché, histórico de análisis y bitácora |

Servicios externos: como el proyecto es académico (Cap. 1, limitaciones), el back trae **servicios simulados** que se consumen por HTTP igual que uno real:

- INEI (REST/JSON): `GET /marketdata-api/mock/inei/api/v1/ubigeo/{ubigeo}/indicadores` — población por departamento = Censo 2017; reparto distrital simulado.
- SUNAT (SOAP/XML): `POST /marketdata-api/mock/sunat/ws/ConsultaRuc` (WSDL en `?wsdl`) — operaciones `getDatosPrincipales` y `getResumenPorUbigeo`; datos simulados y determinísticos.

Para usar otra fuente basta con cambiar `INEI_URL` / `SUNAT_URL` en el `.env` (el adaptador normaliza el contrato). `MOCKS_HABILITADOS=false` apaga los simulados.

## Cómo levantarlo

1. Base de datos: ejecuta `db/marketdata_db.sql` completo en MySQL 8 (DBeaver: Alt + X). **Borra y vuelve a crear `marketdata_db`.**
2. `npm install`
3. Revisa el `.env` (BD, `JWT_SECRET`, puerto).
4. `npm run dev` → `http://localhost:8081/marketdata-api` (salud: `/actuator/health`).
5. Front: abre `gwu-front/pages/seguridad/login.html` con Live Server. `gwu-front/dist/js/config.json` apunta a `http://localhost:8081/marketdata-api`.

Usuarios: `admin` (se conserva tu usuario y contraseña) y `analista` / `Analista2026` (rol ANALISTA DE MERCADO).

Pruebas unitarias (sin BD): `npm test`.

Docker: `cp env.docker.example .env.docker`, completa las claves y `docker compose up -d --build` (la BD se crea sola con `db/docker/01_marketdata_db.sql`).

## Endpoints de MarketData (todos con token, bajo `/marketdata-api`)

| Método | URL | Servicio |
|---|---|---|
| POST | `/api/v1/analisis/zona` `{ ubigeo, seccionInteres?, forzar? }` | Orquestador "Análisis de zona" |
| GET | `/api/v1/territorial/indicadores/{ubigeo}` | Territorial (INEI) |
| GET | `/api/v1/empresarial/ruc/{ruc}` · `/api/v1/empresarial/zona/{ubigeo}` | Empresarial (SUNAT) |
| GET | `/api/v1/analisis/listados` · `/mostrar/{id}` · `/comparar?ids=1,2` · `/dashboard` | Análisis guardados (sin llamar a INEI/SUNAT) |
| GET | `/api/v1/integracion/bitacora` · `/estado` | Bitácora y estado de las fuentes |
| POST | `/api/v1/integracion/simulacion` `{ servicio, modo }` · `/limpiarCache` | Pruebas de falla (NORMAL, LENTO, INTERMITENTE, CAIDO) |

`forzar=true` (no usar caché) requiere el permiso `ANALISIS_FORZAR`.

## Índice de atractivo (0-100)

`(PESO_DEMANDA·demanda + PESO_COMPETENCIA·competencia + PESO_PODER_ADQUISITIVO·poder) / suma de pesos` — ver `src/utils/indiceAtractivo.js`.
Pesos, referencia de saturación, vigencia de caché, reintentos y timeout se editan en **Maestros > Multitabla > Parámetro General (031)**.
