# ADR-0019: Catálogo de actividades desde webs, con fichas propias y atribución

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Modifica**: ADR-0018 (la generación con IA pasa a ser complementaria)
- **Relacionado con**: ADR-0007, ADR-0017, `docs/specs/ingesta-datos.md`

## Contexto
La propietaria prefiere un catálogo grande basado en actividades que ya existen en la web (blogs y webs de educación infantil, Montessori…) y usar la IA solo para completar. Los textos, pasos e imágenes de esas webs están protegidos por derechos de autor; las ideas de actividades, no.

## Opciones consideradas
1. Copiar los contenidos — no permitido sin licencia.
2. Solo título, datos y enlace — seguro, pero obliga a salir de la app para hacerla.
3. Solo fuentes con licencia libre — sin dudas legales, pero catálogo pequeño.
4. **Ficha propia + enlace**: extraer los datos y redactar con palabras propias un resumen y pasos breves, sin copiar textos ni imágenes, con atribución y enlace destacado a la fuente.

Para descubrir webs: lista gestionada por la admin (elegida) frente a descubrimiento con búsqueda de Google (cupo gratuito limitado y coste después).

## Decisión
- Opción 4 con **lista de fuentes gestionada por la admin** (RSS, sitemap o lista de URLs).
- Rastreo responsable: `robots.txt`, condiciones de uso anotadas por fuente, 1 petición cada 3 s por dominio, agente identificable, sin imágenes.
- **Control automático de copia**: se rechaza cualquier texto que comparta 8 o más palabras seguidas con la fuente.
- Varias fuentes de la misma idea se fusionan en una actividad con varias atribuciones.
- Bloquear una fuente permite retirar sus actividades en bloque si su autor lo pide.

## Consecuencias
- Catálogo amplio y con valor propio, sin reproducir contenido ajeno, y tráfico de vuelta para los autores.
- Requiere revisión de la admin (como todo el catálogo) y una revisión legal antes de abrir la beta, especialmente de las condiciones de cada fuente.
- El rastreo consume cuota de IA (una extracción por página): la carga se hace **por días** dentro del nivel gratuito, con un presupuesto diario, una cola persistente que continúa al día siguiente y un 20 % reservado para las sugerencias de las familias.
