# ADR-0017: Validación automática de enlaces de recursos

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0006, `docs/specs/ingesta-datos.md`

## Contexto
Cada actividad debe poder enlazar un vídeo o página donde verla. Los modelos de lenguaje suelen inventar URLs (vídeos de YouTube con identificadores que no existen, páginas que nunca existieron). Revisar cada enlace a mano no es viable para la administradora.

## Opciones consideradas
1. Revisión manual de todos los enlaces — inviable a escala.
2. YouTube Data API — vídeos reales por búsqueda, pero exige proyecto de GCP y clave desde ya, con cuota diaria.
3. Búsqueda con *grounding* de Google Search en Gemini — URLs reales, pero con coste por consulta fuera del nivel gratuito y enlaces de redirección a resolver.
4. **La IA propone candidatos y el sistema los valida**: existencia por oEmbed (YouTube) o petición HTTP (resto), y relevancia comparando el título real con la actividad mediante una llamada barata y cacheada a la IA.

## Decisión
Opción 4, con caché de resultados en `linkChecks` (30 días) y de llamadas en `aiCache`. Solo se guardan enlaces que existen, son públicos o incrustables y son relevantes; siempre se ofrece además una búsqueda de YouTube como alternativa. Los vídeos se incrustan con `youtube-nocookie.com` y se cargan solo al pulsarlos.

## Consecuencias
- Sin trabajo manual ni APIs de pago; los enlaces que llegan a las familias existen.
- Algunas actividades quedarán sin vídeo si la IA no acierta con candidatos reales: se cubre con el botón de búsqueda y se puede añadir uno a mano en la revisión.
- Si la proporción de actividades sin vídeo es alta, valorar la opción 2 o 3 en un ADR nuevo.
- Los enlaces se pudren con el tiempo: revalidación mensual en producción.
