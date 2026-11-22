# ADR-0005: Modelo de datos en Firestore con hogar compartido

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0002, ADR-0009

## Contexto
Varios adultos (padre, madre, cuidadores) comparten hijos, guardados y calendario. El catálogo (actividades, planes) es global y lo gestiona el administrador.

## Decisión
- Entidad **hogar** (`households/{id}`) con `memberUids[]`. Hijos, invitaciones, guardados y calendario son subcolecciones del hogar. `users/{uid}` apunta a su `householdId` (un hogar por usuario en el MVP).
- Catálogo global: `activities`, `plans`, `cities`. Visible para usuarios autenticados solo con `status == "published"`.
- Colecciones de operación solo para admin: `sources`, `sourceItems`, `ingestionRuns`, `aiCache`, `generationBatches`.
- Las entradas del calendario guardan un `snapshot` (título, tipo) del plan o actividad para mostrarse aunque el original cambie o se despublique.
- Esquemas definidos con Zod en `packages/shared`; toda escritura pasa por ellos.
- Acceso desde el servidor con Admin SDK; las Security Rules aplican igualmente el aislamiento por hogar como defensa en profundidad para cualquier acceso desde cliente.

## Consecuencias
- Aislamiento sencillo por hogar en las reglas (`request.auth.uid in household.memberUids`).
- Un usuario no puede pertenecer a dos hogares en el MVP (p. ej. familias separadas); se revisará con un ADR si hace falta.
