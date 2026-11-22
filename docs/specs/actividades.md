# Spec: Actividades para casa

- **Estado**: Aprobada (2026-11-22)
- **Fase**: 2
- **ADRs relacionados**: ADR-0006, ADR-0007, ADR-0010, ADR-0017, ADR-0018, ADR-0019, ADR-0020
- **Relacionada con**: `docs/specs/ingesta-datos.md` (cómo se llena y revisa el catálogo)

## Objetivo
Que una madre o un padre encuentre en segundos una actividad para hacer en casa con sus peques, adecuada a su edad, con el paso a paso, la fuente original y, si existe, un vídeo donde verla. Si no encuentra lo que busca, que pueda pedir ideas nuevas a la IA. Que pueda guardarlas y, en la fase 4, añadirlas al calendario.

## De dónde salen las actividades
| Origen | Quién lo lanza | Revisión | Visible para |
|---|---|---|---|
| **Web** (principal): fichas propias a partir de blogs y webs que gestiona la admin (ADR-0019) | Admin | Sí, antes de publicar | Todos, una vez publicada |
| **IA (admin)**: lotes para cubrir huecos del catálogo (ADR-0018) | Admin | Sí | Todos, una vez publicada |
| **IA bajo demanda**: cuando una familia no encuentra lo que busca (ADR-0020) | Familia | No antes de mostrarse; la admin puede publicarla después para todos | Solo el hogar que la pidió, con aviso, hasta que la admin la publique |
| **Manual** | Admin | — | Todos |

## Historias de usuario
1. Como madre, quiero ver actividades adecuadas a la edad de mis peques sin tener que filtrar nada.
2. Como padre, quiero filtrar por categoría, duración y "sin material especial", y buscar por palabra.
3. Como madre, quiero el paso a paso, los materiales, un vídeo de ejemplo y el enlace a la web de donde viene la idea.
4. Como padre, si no encuentro nada, quiero pedir a la IA ideas nuevas con los filtros que tengo puestos.
5. Como madre, quiero guardar actividades y verlas en "Guardadas", compartidas con los adultos de mi hogar.
6. Como admin, quiero llenar el catálogo desde webs, completar huecos con IA y publicar las mejores sugerencias que pidan las familias.

## Reglas de negocio
### Catálogo
- Las familias ven las actividades `published` y, además, las sugerencias bajo demanda de **su** hogar activo (ADR-0020).
- Cada actividad tiene: título, resumen, 1–2 categorías, rango de edad en meses, duración, materiales, si requiere **material especial**, pasos numerados, consejos (seguridad o variantes), recursos validados, búsqueda sugerida de YouTube y **atribución** (fuentes web de las que procede la idea).
- Las fichas de origen web están **redactadas con palabras propias** y enlazan de forma destacada a la fuente ("Idea de *Nombre del blog* →"). Nunca se copian textos ni imágenes (ADR-0019).

### Personalización (sin IA, en el servidor)
- "Para quién": chips con cada peque del hogar activo y "Todos". Por defecto, **Todos**: actividades cuyo rango de edad incluye la edad de **al menos un** peque. Si se elige un peque, solo las suyas.
- Sin peques en el hogar, se muestran todas, con una invitación a añadirlos.
- Orden: primero las que encajan con más peques; después, rotación diaria estable.
- Las edades se calculan tras descifrar en el servidor; nada de esto va a la IA.

### Filtros y búsqueda
- Categoría (varias), duración (≤15 min, 15–30 min, >30 min), "Sin material especial", origen ("Todas" / "De la web" / "Sugeridas por IA").
- Búsqueda por texto sobre título, resumen y materiales (normalizada sin acentos, en el servidor, en memoria; se revisará en un ADR si el catálogo supera ~5.000 actividades).
- Los filtros se reflejan en la URL.

### "¿No encuentras lo que buscas?" — sugerencias de la IA (ADR-0020)
- Aparece al final de la lista y siempre que haya menos de 5 resultados.
- La petición usa **solo** los filtros elegidos: categoría, **franja de edad** (no la edad exacta ni el nombre del peque), duración, material especial y, opcionalmente, la palabra buscada (máx. 40 caracteres). Junto al botón se avisa: *"No escribas datos de tus peques"*. Se eliminan de la palabra emails, teléfonos y números largos antes de enviarla.
- Se generan **3 actividades**. La petición corre en segundo plano: la familia ve un indicador ("Pensando ideas… puede tardar 1–3 minutos") y puede seguir navegando; al terminar aparecen en la sección **"Sugeridas para vosotros"**.
- Cada sugerencia lleva la etiqueta **"Sugerida por IA · revisa que sea segura para tus peques"**.
- Límite: **3 peticiones por hogar y día**. Si se repite una petición idéntica (mismos filtros y palabra), se reutiliza el resultado guardado al instante sin consumir el límite (`aiCache`).
- Antes de mostrar, se descartan las que dupliquen actividades del catálogo (ADR-0018) y, en su lugar, se muestra la existente.
- Se guardan como `draft` con origen `ai-on-demand` y el hogar que las pidió; la admin puede publicarlas para todos desde el panel.

### Recursos (ADR-0017)
- Solo se muestran recursos **validados automáticamente** (existen, son públicos y relevantes).
- Vídeos de YouTube incrustados con `youtube-nocookie.com` y **cargados solo al pulsar**.
- Siempre hay un botón "Ver ejemplos en YouTube" con la búsqueda sugerida.

### Guardadas
- Son del hogar activo: todos sus adultos las ven. Se pueden guardar también las sugerencias de IA del hogar.
- Si una actividad guardada se despublica o archiva, desaparece de "Guardadas" sin errores.

## Modelo de datos
```
activities/{id}
  title, summary, categories[], age { minMonths, maxMonths }, durationMinutes,
  materials[], specialMaterials, steps[{order, text}], tips[],
  resources[{ type: "video"|"article", url, title, provider, validatedAt }],
  youtubeSearchQuery,
  origin: "web" | "ai-admin" | "ai-on-demand" | "manual",
  attributions[{ sourceId, sourceName, url, retrievedAt }],     (origen web; puede haber varias)
  requestedByHouseholdId?                                        (solo ai-on-demand)
  status: "draft" | "published" | "archived",
  fingerprint, embedding[], generation?{...}, createdAt, updatedAt, publishedAt?

households/{hid}/saved/{activityId}        type: "activity", savedAt, savedByUid
households/{hid}/aiRequests/{id}           filters { category?, ageBand?, duration?, noSpecialMaterials?, keyword? },
                                           status (queued|generating|done|error), activityIds[], createdAt, finishedAt
```
- `requestedByHouseholdId` y `aiRequests` vinculan una petición a un hogar; no contienen datos de menores (solo filtros). Van por el servidor (ADR-0014).

## Pantallas
| Ruta | Contenido |
|---|---|
| `/actividades` | Cabecera con contador, chips "Para quién", categorías con su color, filtros, buscador. Sección "Sugeridas para vosotros" (si hay). Lista de tarjetas con origen ("De *blog*" / "IA"). Pestaña "Guardadas". Bloque "¿No encuentras lo que buscas?" con el botón "Pedir ideas a la IA" y el estado de la petición en curso. |
| `/actividades/[id]` | Cabecera con el color de la categoría, título, edad y duración. Materiales, pasos, consejos, vídeo (clic para cargar), "Ver ejemplos en YouTube", **"Idea de *fuente* →"** para las de la web, aviso de IA para las sugeridas, Guardar. "Añadir al calendario" desactivado ("Muy pronto", fase 4). |
| Inicio | "Ideas para hoy": 5 actividades publicadas personalizadas para el hogar activo. |

## Datos personales y cifrado
| Campo | ¿Personal? | ¿De menor? | Cifrado | Base legal | Retención |
|---|---|---|---|---|---|
| Catálogo de actividades | No | No | No | — | Indefinida |
| Guardadas | Bajo (qué adulto guardó qué) | No | No | Ejecución del contrato | Hasta quitarla o borrar el hogar |
| Peticiones a la IA (`aiRequests`) | Bajo (filtros y palabra de un hogar) | No | No | Ejecución del contrato | 90 días |
| Edad de los peques (para filtrar) | Sí | Sí | Solo se descifra en memoria | Consentimiento del tutor | — |

- **IA**: las sugerencias bajo demanda envían a la IA solo filtros genéricos (categoría, franja de edad, duración, material, palabra saneada). En producción, únicamente por **Vertex AI en la UE** (ADR-0010, ADR-0020).
- **Terceros**: YouTube solo recibe una petición cuando el usuario pulsa el vídeo o la búsqueda; la web de origen, cuando pulsa su enlace.

## Permisos
- Lectura: catálogo publicado para cualquier usuario con hogar; sugerencias `ai-on-demand` solo para el hogar que las pidió.
- Guardar y pedir ideas a la IA: miembros del hogar activo (servidor), con límite diario por hogar.
- Crear, editar, publicar, gestionar fuentes: solo admin (`ingesta-datos.md`).

## Criterios de aceptación
- [ ] Con un peque de 3 años y otro de 8 meses, "Todos" muestra solo actividades cuyo rango incluye alguna de esas edades; al elegir uno, solo las suyas.
- [ ] Filtros, búsqueda sin acentos y origen funcionan combinados y se reflejan en la URL.
- [ ] Una actividad de origen web muestra "Idea de …" con enlace a la fuente y su texto no reproduce frases de la fuente (comprobación automática, `ingesta-datos.md`).
- [ ] El vídeo no hace ninguna petición a YouTube hasta pulsarlo.
- [ ] "Pedir ideas a la IA" genera 3 sugerencias en segundo plano con la etiqueta de IA, visibles solo para ese hogar; la cuarta petición del día se rechaza con un mensaje claro; repetir la misma petición devuelve el resultado guardado sin contar.
- [ ] La petición a la IA no contiene alias, fechas ni ningún dato de los peques (test).
- [ ] Guardar en un hogar lo ve otro adulto del mismo hogar y no lo ve otro hogar del mismo usuario.
- [ ] Un borrador, una archivada o una sugerencia de otro hogar nunca aparece, tampoco por URL directa (404).
- [ ] El inicio muestra 5 ideas personalizadas.

## Fuera de alcance
- Añadir al calendario (fase 4), valoraciones y comentarios, marcar como hecha, imágenes (ni copiadas ni generadas), recomendaciones proactivas con IA (Asesoramiento).
