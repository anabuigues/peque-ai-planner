# ADR-0018: Generación de actividades por lotes, deduplicación y paquete `catalog`

- **Estado**: Aceptado · Modificado por ADR-0019 (la IA pasa a ser complementaria)
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0006, ADR-0007, ADR-0017

## Contexto
El catálogo de actividades se genera con IA y lo revisa la administradora. Hay que evitar duplicados (también de actividades ya descartadas), poder lanzarlo desde el panel y desde la CLI, y no repetir llamadas.

## Decisión
- **Lotes por categoría** (por defecto 10 actividades), registrados en `generationBatches`. La IA recibe los títulos existentes de la categoría, incluidos los descartados.
- **Deduplicación en dos niveles**: huella exacta del título normalizado y similitud coseno ≥ 0,90 entre embeddings (`gemini-embedding-001`) de título + resumen, calculada en memoria sobre la categoría. El volumen previsto (cientos) no justifica una base de datos vectorial.
- **Descartar no borra**: las actividades rechazadas quedan como `archived` y siguen contando para la deduplicación.
- **Paquete `packages/catalog`** con la lógica de generación, validación de enlaces y deduplicación. Recibe Firestore y el cliente de IA por parámetro, de modo que lo usan igual el panel (Server Actions) y la CLI (`jobs`).
- `@peque/ai` añade `embedText()` con la misma caché persistente que `generateJson()`.

## Consecuencias
- Coste y tiempos previsibles; repetir un lote no consume tokens.
- El umbral 0,90 puede necesitar ajuste tras ver resultados reales; se deja como constante configurable.
- Si el catálogo supera unas 2.000 actividades, evaluar búsqueda vectorial de Firestore.
