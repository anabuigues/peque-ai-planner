# Peque Plan — guía para agentes y colaboradores

Peque Plan es una **aplicación web** que ayuda a las familias a buscar planes y actividades para sus hijos y a organizarlos en un calendario. Idioma del producto y de la documentación: español.

## Normas obligatorias

1. **Especificaciones y ADRs siempre al día.**
   - Antes de implementar una fase o funcionalidad, escribe o actualiza su spec en `docs/specs/` (usa `docs/specs/_plantilla.md`).
   - Cada decisión de arquitectura nueva se registra en `docs/adr/` con el siguiente número libre (formato MADR, `docs/adr/_plantilla.md`) y se añade al índice `docs/adr/README.md`.
   - Un ADR aceptado **no se reescribe**: si la decisión cambia, crea uno nuevo y marca el anterior como `Sustituido por ADR-XXXX`.
   - Specs y ADRs van en el mismo PR que el código que los implementa.
2. **Local primero.** Todo se desarrolla y prueba con los emuladores de Firebase. No crees ni uses recursos de GCP que cuesten dinero sin confirmación explícita (ADR-0003).
3. **La IA nunca repite trabajo.** Toda llamada a Gemini pasa por `@peque/ai` (`generateJson`), que guarda el resultado en `aiCache`. No llames al SDK directamente (ADR-0006).
4. **Datos de menores.** Los campos sensibles de hijos y hogar se cifran a nivel de campo; nunca se envían datos personales de menores a la IA; no se recogen datos de salud ni fotos de menores (ADR-0009, 0010, 0011, `docs/specs/privacidad-seguridad.md`). Cada spec de módulo incluye la sección "Datos personales y cifrado".
5. **Ingesta solo para admin.** Fuentes, ingestas, borradores, `aiCache` e historial son exclusivos del administrador (ADR-0007).
6. **Diseño.** Seguir los tokens y componentes de `docs/specs/diseno.md` (estilo inspirado en Revolut, sin usar su marca).

## Estructura

```
apps/web/          Next.js (App Router) — UI y Server Actions
packages/shared/   Tipos, esquemas Zod y taxonomías compartidas
packages/ai/       Capa de IA (Gemini API / Vertex) con caché persistente
jobs/              Scripts de ingesta, generación y seed (CLI en local; Cloud Run Jobs en GCP)
firebase/          Reglas, índices y configuración de emuladores
docs/              specs/, adr/, legal/
```

## Comandos

```bash
npm install
npm run emulators      # Emuladores de Firebase (Auth, Firestore, Storage) con persistencia en .firebase-data/
npm run dev            # Next.js en http://localhost:3000
npm run seed           # Datos sintéticos en el emulador
npm test               # Vitest en todos los paquetes
npm run lint && npm run typecheck
```
