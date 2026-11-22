# ADR-0010: IA sin datos personales de menores

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0006, `docs/specs/privacidad-seguridad.md`

## Contexto
En el nivel gratuito de la API de Gemini, Google puede usar entradas y salidas para mejorar sus productos y someterlas a revisión humana; sus condiciones también restringen ofrecer aplicaciones a usuarios del EEE con el nivel gratuito. En Vertex AI (de pago) Google no usa los datos para entrenar y se puede fijar región de la UE.

## Decisión
- **Nunca** se envían a la IA nombres, fechas de nacimiento, direcciones, emails ni notas de hijos o adultos. Como máximo, franjas de edad (p. ej. "3-5 años") e intereses genéricos, sin identificador.
- La API gratuita de Gemini se usa **solo en desarrollo local y solo con datos públicos** (catálogo, newsletters, webs).
- Cualquier llamada con contexto de una familia (recomendaciones, módulo de Asesoramiento) se hará exclusivamente por Vertex AI en región UE.
- `@peque/ai` rechaza entradas que contengan campos marcados como personales (lista negra de claves) y hay test que lo verifica.

## Consecuencias
- Las recomendaciones personalizadas se basan en datos agregados y anónimos; el filtrado fino se hace en nuestro servidor.
- Antes de desplegar en producción con usuarios reales, `AI_PROVIDER` debe ser `vertex`.
