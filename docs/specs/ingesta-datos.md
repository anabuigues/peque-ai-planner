# Spec: Carga de datos del catálogo (administración)

- **Estado**: Aprobada (2026-11-22) — parte de **actividades** (fase 2). La parte de **planes** (datos abiertos, newsletters, webs, redes) se añadirá en la fase 3 reutilizando las fuentes y el rastreo de esta spec.
- **ADRs relacionados**: ADR-0006, ADR-0007, ADR-0010, ADR-0017, ADR-0018, ADR-0019, ADR-0020

## Objetivo
Construir un catálogo grande de actividades a partir de webs de referencia, con el mínimo trabajo manual: el sistema rastrea, extrae, redacta con palabras propias, valida y deduplica; la IA genera solo para cubrir huecos; la administradora decide qué se publica.

## Principios
1. **Solo admin** (ADR-0007): pantallas y acciones de esta spec exigen el claim `admin`.
2. **Nunca repetir trabajo** (ADR-0006): toda llamada a IA pasa por `aiCache`; cada URL rastreada queda en `sourceItems` con el hash de su contenido; cada enlace comprobado, en `linkChecks`; lo descartado se conserva como `archived`.
3. **Respeto a las fuentes** (ADR-0019): `robots.txt`, condiciones de uso, ritmo moderado, sin copiar textos ni imágenes y con atribución.
4. **Sin datos personales** (ADR-0010): rastreo y generación de admin solo usan contenido público.

## 1. Fuentes (`/admin/fuentes`)
- La admin añade fuentes: nombre, web, tipo de descubrimiento (**RSS**, **sitemap** o **lista de URLs**), filtro opcional de rutas (p. ej. solo `/actividades/`), contenido (`activities`; en la fase 3 también `plans`) y una nota sobre sus condiciones de uso.
- Al guardar, el sistema comprueba `robots.txt` y muestra si se puede rastrear. Una fuente que lo prohíba no se rastrea.
- Estados: activa, en pausa, **bloqueada**. Bloquear una fuente archiva todas sus actividades no publicadas y permite retirar las publicadas en bloque (por si un autor lo pide).

```
sources/{id}   name, homepage, discovery { kind: "rss"|"sitemap"|"urls", url?, urls?[] }, pathFilter?,
               content: ["activities"], termsNote?, robotsAllowed, status, lastCrawlAt, stats { pages, activities }
```

## 2. Rastreo y extracción de actividades (ADR-0019)
Job `ingest-activities-web` (botón "Rastrear" por fuente en el panel, en segundo plano; CLI `npm run ingest:activities -- --source <id>`):
1. **Descubrir** URLs de la fuente (RSS, sitemap o lista) y aplicar el filtro de rutas. Máximo de páginas nuevas por ejecución configurable (por defecto 100).
2. **Saltar** las URLs ya procesadas cuyo contenido no haya cambiado (`sourceItems`: URL + hash del texto).
3. **Descargar** la página respetando `robots.txt`, como máximo **1 petición cada 3 s por dominio**, tiempo límite de 10 s y 2 MB, agente `PequePlanBot/1.0`, sin cookies.
4. **Extraer el texto principal** (sin menús ni comentarios) y los vídeos de YouTube incrustados en la página.
5. **IA de extracción** (`activities.extract@1`, cacheada): decide si la página describe una o varias actividades para hacer con niños; si no, se marca como `not_activity`. Si sí, devuelve por actividad: datos estructurados (categorías de nuestra taxonomía, edad, duración, materiales, material especial) y **resumen, pasos y consejos redactados con palabras propias**, breves (máx. 8 pasos, 30 palabras por paso).
6. **Control de copia**: si el texto generado comparte con la fuente alguna secuencia de **8 o más palabras seguidas**, se pide una reescritura (una vez); si persiste, la actividad se descarta con motivo `copy`.
7. **Deduplicación** (sección 5): si equivale a una actividad existente, no se crea otra: se **añade la fuente** a sus `attributions`.
8. **Enlaces** (sección 6): los vídeos incrustados en la página de origen se validan por existencia y relevancia y se añaden como recursos.
9. Se guarda como `draft` con `origin: "web"` y su atribución.
- Nunca se descargan ni guardan imágenes de las fuentes.

```
sourceItems/{sha256(url)}  sourceId, url, contentHash, status (pending|activity|not_activity|copy|error|duplicate),
                           activityIds[], processedAt
ingestionRuns/{id}         job, sourceId, status (running|paused_quota|done|error), counters { discovered, skipped, fetched, activities, duplicates, rejected },
                           startedByUid, startedAt, finishedAt, error?
```

## 3. Generación con IA por la admin (ADR-0018)
Para cubrir huecos (categorías o edades con pocas actividades), no como fuente principal:
- **Lote** = categoría + número (por defecto 10) + franja opcional. Entrada: taxonomía y los títulos existentes de la categoría (también descartados) para no repetirlos.
- Salida estructurada con pasos, consejos de seguridad, `youtubeSearchQuery` y hasta 3 `videoCandidates`.
- Modelo `gemini-3.8-flash` (`AI_MODEL`) con reserva `gemini-3.6-flash` (`AI_FALLBACK_MODEL`) si el principal está saturado; temperatura 0,8, `promptVersion` `activities.generate@1`.
- Al modelo se le envía un esquema JSON solo con la estructura (sin longitudes ni límites, que lo hacen demasiado complejo); las restricciones se aplican al recibir la respuesta, recortando lo que se pase de largo.
- El panel muestra una **tabla de cobertura** (actividades publicadas por categoría × franja de edad) para ver dónde faltan.

```
generationBatches/{id}     status (queued|generating|validating|done|error), category, ageBand?, requested, created,
                           duplicates, links { valid, rejected }, usage { inputTokens, outputTokens },
                           startedByUid, startedAt, finishedAt, error?
```

## 4. Sugerencias bajo demanda de las familias (ADR-0020)
- Mismo pipeline que el punto 3 (3 actividades, deduplicación y validación de enlaces), lanzado desde `/actividades` por una familia, con entrada limitada a filtros genéricos y `origin: "ai-on-demand"`.
- En el panel aparecen en una pestaña propia, con cuántos hogares las han guardado, para publicarlas para todos si son buenas.

## 5. Deduplicación (ADR-0018)
1. **Huella exacta** del título normalizado contra todo el catálogo, incluidas las descartadas.
2. **Similitud semántica**: embedding de `título + resumen` (`gemini-embedding-001`, cacheado) y coseno contra la misma categoría; **≥ 0,90 → duplicada**.

## 6. Validación automática de enlaces (ADR-0017)
1. **Formato**: solo `https`, sin IPs ni puertos raros ni acortadores; YouTube normalizado a `https://www.youtube.com/watch?v=<id>`.
2. **Existencia**: YouTube por oEmbed (200 = existe, es público e incrustable; obtiene título y canal); otras webs con `GET` (5 s, 1 MB, 3 redirecciones, `text/html`, respetando `robots.txt`).
3. **Relevancia**: IA (`links.relevance@1`, cacheada) compara el título real con la actividad; se acepta con `relevant = true` y puntuación ≥ 0,6.
4. Caché en `linkChecks/{sha256(url)}` 30 días (`status`, `title`, `provider`, `checkedAt`). Máximo 2 recursos por actividad.
5. Revalidación mensual de publicadas en producción (fase 5).

## 7. Revisión y publicación (`/admin/actividades`)
- Pestañas: **Pendientes** (filtros por origen, fuente, categoría y lote), **Sugeridas por familias**, **Publicadas**, **Descartadas**.
- Selección múltiple con **Publicar** y **Descartar** en bloque. **Editar** con el formulario completo; un recurso añadido a mano pasa la validación de existencia.
- Estados: `draft` → `published` | `archived`; `published` → `draft` | `archived`. Nunca se borra físicamente.

## Carga por días y rendimiento
La carga se hace **por días para no salir del nivel gratuito** de la API de Gemini:
- **Presupuesto diario de llamadas a la IA** configurable (`AI_DAILY_REQUEST_BUDGET`, por defecto 200), contado en `aiUsage/{AAAA-MM-DD}` (solo las llamadas reales; los aciertos de caché no cuentan).
- **Reserva para las familias**: el 20 % del presupuesto queda reservado para las sugerencias bajo demanda (ADR-0020); el rastreo y los lotes de la admin usan el resto.
- **Cola persistente**: el rastreo descubre todas las URLs de una fuente y las deja en `sourceItems` con estado `pending`. Cada ejecución procesa pendientes hasta agotar el presupuesto del día y se detiene con estado `paused_quota`; al día siguiente continúa donde lo dejó. Si la API responde con error de cuota (429), se pausa igual aunque no se haya llegado al presupuesto.
- **Continuar cada día**: en local, botón "Continuar carga" en el panel o `npm run ingest:activities -- --resume`; en GCP (fase 5), Cloud Scheduler lo lanza a diario automáticamente.
- El panel muestra **cuota de hoy** (usadas/presupuesto), **páginas en cola** y una **estimación de días** para terminar.
- El modelo tarda de 1 a 3 minutos por llamada: rastreo, lotes y sugerencias se ejecutan **en segundo plano** (`after()` de Next.js en local; Cloud Run Jobs en GCP) y el panel muestra su estado leyendo `ingestionRuns` y `generationBatches`. Concurrencia limitada a 3 llamadas simultáneas.
- Si falta `GEMINI_API_KEY`, panel y CLI lo explican.

```
aiUsage/{AAAA-MM-DD}       requests, byPurpose { extract, relevance, embed, generate, onDemand }, updatedAt
```

## Datos personales y cifrado
Ningún dato personal en el rastreo ni en la generación de admin. Las sugerencias bajo demanda solo reciben filtros genéricos (ver `actividades.md`). `startedByUid`/`reviewedByUid` identifican a la admin. Todas las colecciones de esta spec son solo de admin en las reglas (se añade `linkChecks`).

## Coste estimado
Cero mientras se respete el presupuesto diario del nivel gratuito. Rastrear 1.000 páginas (~1 extracción + 1 embedding + hasta 2 comprobaciones de relevancia por página) lleva varios días con el presupuesto por defecto. Repetir no vuelve a llamar a la IA (caché y `sourceItems`). Si más adelante se quiere ir más rápido, basta con activar facturación y subir `AI_DAILY_REQUEST_BUDGET`.

## Criterios de aceptación
- [ ] Añadir una fuente comprueba `robots.txt`; una fuente que lo prohíbe no se rastrea.
- [ ] Rastrear una fuente crea borradores con atribución, salta las páginas sin cambios en la siguiente ejecución y respeta el ritmo de 1 petición cada 3 s por dominio.
- [ ] Ninguna actividad de origen web comparte 8 o más palabras seguidas con su fuente (test del control de copia).
- [ ] Una página con una actividad ya existente añade la fuente a esa actividad en lugar de duplicarla.
- [ ] Un lote de IA de admin no duplica títulos existentes ni descartados; repetirlo no hace llamadas nuevas.
- [ ] Un enlace de YouTube inventado se descarta; uno real y relevante se guarda; uno real pero irrelevante se descarta.
- [ ] Publicar y descartar en bloque funcionan; bloquear una fuente archiva sus borradores.
- [ ] Un no-admin no accede al panel ni a sus acciones.
- [ ] Al llegar al presupuesto diario (o ante un error 429) la carga se pausa con `paused_quota` y al día siguiente continúa sin repetir páginas.
- [ ] La reserva del 20 % permite a las familias pedir sugerencias aunque la carga del día haya agotado su parte.
- [ ] Sin `GEMINI_API_KEY`, panel y CLI muestran un mensaje claro.
