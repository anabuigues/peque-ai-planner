# Architecture Decision Records

Formato MADR simplificado (`_plantilla.md`). Un ADR aceptado no se edita salvo erratas: si la decisión cambia se crea uno nuevo que lo sustituye.

| Nº | Decisión | Estado | Fecha |
|---|---|---|---|
| [0001](0001-monorepo-npm-workspaces.md) | Monorepo con npm workspaces | Aceptado | 2026-11-22 |
| [0002](0002-nextjs-firebase-gcp.md) | Next.js + Firebase sobre GCP | Aceptado | 2026-11-22 |
| [0003](0003-local-primero-emuladores.md) | Desarrollo local primero con emuladores; GCP al final | Aceptado | 2026-11-22 |
| [0004](0004-autenticacion-google-firebase.md) | Autenticación con Google vía Firebase Auth y rol admin por custom claim | Aceptado | 2026-11-22 |
| [0005](0005-modelo-datos-firestore-hogar.md) | Modelo de datos en Firestore con hogar compartido | Aceptado · Modificado por 0015 | 2026-11-22 |
| [0006](0006-capa-ia-genai-cache.md) | Capa de IA con `@google/genai` y caché persistente | Aceptado | 2026-11-22 |
| [0007](0007-fuentes-datos-admin.md) | Fuentes de datos e ingesta exclusiva del administrador | Aceptado | 2026-11-22 |
| [0008](0008-diseno-inspirado-revolut.md) | Sistema de diseño inspirado en Revolut | Aceptado | 2026-11-22 |
| [0009](0009-cifrado-campo-tink-kms.md) | Cifrado de campo con Tink + Cloud KMS | Aceptado · Modificado por 0013 | 2026-11-22 |
| [0010](0010-ia-sin-datos-menores.md) | IA sin datos personales de menores | Aceptado | 2026-11-22 |
| [0011](0011-minimizacion-datos-menores.md) | Minimización de datos de menores | Aceptado | 2026-11-22 |
| [0012](0012-ubicacion-hogar-barrio.md) | Ubicación del hogar por barrio, sin geocodificación externa | Aceptado · Modificado por 0016 | 2026-11-22 |
| [0013](0013-alcance-crypto-shredding.md) | Alcance real del crypto-shredding y retención de copias | Aceptado | 2026-11-22 |
| [0014](0014-hogares-solo-desde-servidor.md) | Los datos del hogar solo se acceden desde el servidor | Aceptado | 2026-11-22 |
| [0015](0015-varios-hogares-por-usuario.md) | Varios hogares por usuario | Aceptado | 2026-11-22 |
| [0016](0016-ubicacion-fuera-madrid-municipio.md) | Ubicación fuera de Madrid por municipio | Aceptado | 2026-11-22 |
| [0017](0017-validacion-automatica-enlaces.md) | Validación automática de enlaces de recursos | Aceptado | 2026-11-22 |
| [0018](0018-generacion-por-lotes-y-deduplicacion.md) | Generación por lotes, deduplicación y paquete `catalog` | Aceptado · Modificado por 0019 | 2026-11-22 |
| [0019](0019-catalogo-actividades-desde-web.md) | Catálogo de actividades desde webs, con fichas propias y atribución | Aceptado | 2026-11-22 |
| [0020](0020-sugerencias-ia-bajo-demanda.md) | Sugerencias de IA bajo demanda para las familias | Aceptado | 2026-11-22 |
