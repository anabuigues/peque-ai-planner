# ADR-0015: Varios hogares por usuario

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Modifica**: ADR-0005 (regla "un hogar por usuario en el MVP")
- **Relacionado con**: `docs/specs/perfil.md`

## Contexto
ADR-0005 limitaba a un hogar por usuario. En la revisión de la spec de perfil, la propietaria señala casos reales: la casa de los abuelos (abuelos, hijos y todos los nietos), la casa del pueblo (la misma familia en otro lugar) o familias separadas.

## Opciones consideradas
1. **Hogares independientes y usuario miembro de varios** — un solo concepto; cada hogar tiene sus adultos, peques, ubicación, preferencias y calendario. Los peques pueden quedar duplicados entre hogares.
2. Familia (personas) + varias casas (ubicaciones) — sin duplicar peques, pero dos conceptos, y no resuelve bien la casa de los abuelos (otras personas, otros peques).

## Decisión
Opción 1:
- `users/{uid}.householdIds[]` (índice, máximo 10) y `activeHouseholdId`. La pertenencia real está en `households/{id}.memberUids` y ambos se actualizan en la misma transacción.
- Selector de hogar activo en la interfaz; los módulos trabajan siempre sobre el hogar activo, y el servidor comprueba la pertenencia al hogar concreto en cada acción.
- Al crear un hogar se pueden copiar peques de otro hogar propio, re-cifrándolos con la clave del destino. Las copias son independientes.
- Cada hogar conserva su propia DEK (ADR-0009): los datos de un hogar no se pueden descifrar con la clave de otro.

## Consecuencias
- Cubre abuelos, segunda residencia y familias separadas con el mismo modelo.
- Duplicación de peques entre hogares: si cambia un interés hay que editarlo en cada hogar. Si se vuelve molesto, se evaluará "peques enlazados" en un ADR nuevo.
- El calendario es por hogar; una vista combinada se valorará en la fase 4.
