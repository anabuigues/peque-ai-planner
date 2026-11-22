# ADR-0002: Next.js + Firebase sobre GCP

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0003, ADR-0005

## Contexto
Se requiere despliegue en GCP, autenticación con Google, uso eventual de Vertex AI y una primera versión rápida para familia y conocidos. La aplicación es web.

## Opciones consideradas
1. **Next.js + Firebase (Firestore, Auth, App Hosting)** — serverless, capa gratuita generosa, emuladores locales completos, integración nativa con Google Sign-In.
2. Next.js + Cloud SQL Postgres/PostGIS — consultas relacionales y geoespaciales potentes, pero Cloud SQL tiene coste fijo mensual y más operación.
3. Front + API FastAPI separada — más separación, más piezas para un MVP.

## Decisión
Next.js (App Router, TypeScript, Server Actions) desplegado en Firebase App Hosting (Cloud Run por debajo), Firestore como base de datos, Firebase Auth para identidad, Cloud Storage para imágenes, Cloud Run Jobs + Cloud Scheduler para procesos batch, Vertex AI para IA en producción. Región `europe-southwest1` (Madrid) donde el servicio lo permita.

## Consecuencias
- Coste casi cero con poco uso; sin servidores que mantener.
- Firestore no tiene consultas geoespaciales ni texto completo: distancia con geohash y filtrado en servidor (aceptable para una ciudad). Si se necesita búsqueda de texto avanzada, evaluar un índice externo en un ADR nuevo.
- Lock-in moderado con Firebase; los accesos a datos se encapsulan en repositorios en `apps/web/src/server` para facilitar una migración.
