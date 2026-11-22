# ADR-0006: Capa de IA con `@google/genai` y caché persistente

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0003, ADR-0010

## Contexto
La IA genera actividades y extrae/enriquece planes desde newsletters, webs y publicaciones. Requisitos: no regenerar nunca lo mismo, poder trabajar en local sin proyecto GCP y usar Vertex AI en producción.

## Opciones consideradas
1. **SDK unificado `@google/genai`** — mismo código para la API de Gemini (clave de AI Studio) y Vertex AI (`vertexai: true`), cambiando solo la configuración.
2. SDK de Vertex AI únicamente — exige proyecto GCP con facturación desde el primer día.

## Decisión
- Paquete `@peque/ai` con una única función pública `generateJson({ task, promptVersion, input, schema, ... })`.
- **Caché persistente** en `aiCache/{sha256(task + promptVersion + model + input normalizado)}`: antes de llamar al modelo se consulta; si existe, se devuelve sin llamada. Se guarda la respuesta validada, modelo, tokens y fecha. Cambiar el prompt exige subir `promptVersion`.
- Salidas estructuradas (JSON Schema derivado de Zod) y validadas con Zod antes de guardar.
- Proveedor por variables de entorno: `AI_PROVIDER=gemini-api` (local, `GEMINI_API_KEY`) o `vertex` (GCP, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`). Modelo por defecto `gemini-2.5-flash` (`AI_MODEL`).
- Además de la caché de llamadas, la ingesta registra cada elemento de origen procesado (`sourceItems`) y la generación registra lotes (`generationBatches`) — ver spec de ingesta.

## Consecuencias
- Repetir un job no consume tokens.
- La caché crece con el tiempo; es barata en Firestore y sirve de auditoría.
- Ningún código llama al SDK de Google directamente fuera de `@peque/ai`.

## Errata (2026-11-22)
`gemini-2.5-flash` ya no está disponible para cuentas nuevas de la API de Gemini. El modelo por defecto pasa a ser `gemini-3.8-flash` (el que recomienda la propia API), configurable con `AI_MODEL`. Como el modelo forma parte de la clave de caché, cambiarlo invalida la caché de forma natural.

## Errata 2 (2026-11-22)
En pruebas reales, `gemini-3.8-flash` devolvió repetidamente 503 (saturado) y rechazó esquemas con muchas restricciones. La capa añade: reintentos con espera ante errores temporales, un **modelo de reserva** (`AI_FALLBACK_MODEL`, por defecto `gemini-3.6-flash`) y el envío de un esquema simplificado al modelo, validando las restricciones con Zod después. La decisión del ADR no cambia.
