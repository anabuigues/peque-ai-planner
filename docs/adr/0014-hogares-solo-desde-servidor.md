# ADR-0014: Los datos del hogar solo se acceden desde el servidor

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0005, ADR-0009

## Contexto
Las reglas de la fase 0 permiten a los miembros leer y escribir su hogar desde el cliente. Con el cifrado de campo (ADR-0009), el cifrado y descifrado solo puede ocurrir en el servidor, que es quien tiene acceso a la KEK. Una escritura desde el cliente guardaría datos sin cifrar y una lectura solo obtendría texto cifrado.

## Decisión
- Toda lectura y escritura de `households/**` pasa por Server Actions o Route Handlers con el Admin SDK, que validan la sesión, la pertenencia al hogar y los esquemas Zod, y cifran/descifran en la capa de repositorio.
- Las Security Rules **deniegan todo acceso de cliente** a `households/**`. Los tests de reglas lo verifican.
- `users/{uid}` sigue siendo legible por su dueño desde el cliente, pero solo escribible desde el servidor (para proteger `householdId` y el registro de consentimiento).

## Consecuencias
- Un único punto donde se aplican cifrado, permisos y validación.
- Sin actualizaciones en tiempo real desde el cliente para estos datos (no se necesitan en el MVP).
