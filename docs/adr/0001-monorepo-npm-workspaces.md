# ADR-0001: Monorepo con npm workspaces

- **Estado**: Aceptado
- **Fecha**: 2026-11-22

## Contexto
La plataforma tiene una web (Next.js), procesos batch de ingesta y generación con IA, y tipos/taxonomías que ambos deben compartir (categorías de actividades, rangos de edad, esquemas de planes). Es un proyecto de una sola persona con ayuda de agentes, en un único repo de GitHub.

## Opciones consideradas
1. **Monorepo con npm workspaces** — sin herramientas extra, Node 22 ya incluye npm; suficiente para 4–5 paquetes.
2. Monorepo con pnpm + Turborepo — builds más rápidos y caché, pero más piezas que instalar y mantener.
3. Repos separados — duplicación de tipos y versiones desalineadas.

## Decisión
npm workspaces con `apps/web`, `packages/shared`, `packages/ai` y `jobs`. TypeScript en todo. Los paquetes internos se consumen como código fuente TS (`transpilePackages` en Next.js, `tsx` en jobs), sin paso de build propio.

## Consecuencias
- Un solo `npm install`, un solo lockfile, tipos compartidos sin publicar paquetes.
- Si crecen los tiempos de CI, se puede añadir Turborepo sin cambiar la estructura.
