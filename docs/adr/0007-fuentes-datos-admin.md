# ADR-0007: Fuentes de datos e ingesta exclusiva del administrador

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0004, ADR-0006

## Contexto
No hay datos de partida de planes ni actividades. Se quieren aprovechar datos abiertos, newsletters, webs/blogs y redes sociales. La carga de datos no debe estar al alcance de las familias.

## Opciones consideradas para redes sociales
1. Scraping automático de Instagram/TikTok/Facebook — contrario a sus condiciones de uso, frágil y con riesgo de bloqueo.
2. APIs oficiales — solo dan acceso a cuentas propias o de empresa gestionadas.
3. **Asistido**: el admin pega enlace, texto o captura y Gemini rellena la ficha.

## Decisión
- Fuentes automáticas: datos abiertos del Ayuntamiento de Madrid, un buzón Gmail dedicado a newsletters (Gmail API, solo lectura) y webs/RSS respetando `robots.txt`.
- Redes sociales: solo de forma asistida (opción 3).
- Todo entra como `draft` y requiere revisión del admin para publicarse.
- **Exclusivo del administrador**: gestión de fuentes, lanzamiento de ingestas, revisión de borradores, historial y caché de IA. Protegido por el claim `admin` en Server Actions y en Security Rules. En GCP, los jobs programados se invocan con una cuenta de servicio, nunca desde el cliente.

## Consecuencias
- Calidad controlada del catálogo a cambio de trabajo de revisión.
- Si se abren aportaciones de usuarios, requerirá flujo de moderación y un ADR propio.
