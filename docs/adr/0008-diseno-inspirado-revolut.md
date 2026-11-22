# ADR-0008: Sistema de diseño inspirado en Revolut

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: `docs/specs/diseno.md`

## Contexto
La propietaria quiere que la aplicación web se parezca a Revolut: limpia, moderna, con tarjetas y acciones rápidas. No se puede usar su marca ni sus recursos.

## Decisión
- Aplicación web responsive (no app nativa ni PWA) con barra lateral en escritorio y menú compacto en móvil.
- Tailwind CSS v4 con tokens propios (colores, radios, sombras, tipografía) definidos como variables CSS en `apps/web/src/app/globals.css`; componentes propios en `apps/web/src/components/ui`, al estilo shadcn/ui (Radix cuando haga falta accesibilidad compleja).
- Tipografía Inter (vía `next/font`), iconos `lucide-react`.
- Página `/design` como catálogo vivo de tokens y componentes; cualquier componente nuevo se añade ahí.
- Solo se toma el estilo: sin logotipos, nombres, colores de marca exactos ni recursos de Revolut.

## Consecuencias
- Coherencia visual y validación temprana del estilo antes de construir pantallas.
- Modo oscuro soportado desde los tokens.
