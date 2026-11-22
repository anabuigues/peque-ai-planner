# ADR-0020: Sugerencias de IA bajo demanda para las familias

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0006, ADR-0010, ADR-0018, `docs/specs/actividades.md`

## Contexto
Cuando una familia no encuentra una actividad adecuada en el catálogo, la IA puede proponer ideas nuevas. Es la primera vez que una familia (no la admin) desencadena una llamada a la IA, con contenido que nadie ha revisado y un tiempo de respuesta de 1 a 3 minutos.

## Opciones consideradas
1. **Al momento, con aviso**: se generan en segundo plano y la familia las ve en cuanto terminan, etiquetadas como IA, solo en su hogar.
2. Bajo petición, revisadas: no se muestran hasta que la admin las revise (horas o días).

## Decisión
Opción 1, con estas salvaguardas:
- **Entrada limitada a filtros genéricos**: categoría, franja de edad, duración, material especial y una palabra saneada (máx. 40 caracteres, sin emails, teléfonos ni números largos). Nunca alias, fechas ni notas de los peques. Cumple ADR-0010: no hay datos personales de menores en el prompt.
- **Producción solo por Vertex AI en la UE**, aunque la entrada sea genérica (la palabra libre la escribe una familia).
- Prompt con requisitos de seguridad (riesgo de atragantamiento en menores de 3 años, supervisión adulta, materiales seguros) y etiqueta visible "Sugerida por IA · revisa que sea segura".
- **3 sugerencias por petición, 3 peticiones por hogar y día**; las peticiones idénticas se sirven desde `aiCache` sin contar.
- Las sugerencias solo las ve el hogar que las pidió hasta que la admin las publique para todos.

## Consecuencias
- Mejor experiencia cuando el catálogo no cubre un caso; el catálogo crece con lo que las familias realmente buscan.
- Contenido no revisado visible para un hogar: mitigado con el aviso, el prompt de seguridad y la revisión posterior.
- Coste por uso en producción acotado por el límite diario.
