# Spec: Arquitectura general

- **Estado**: Aprobada (2026-11-22)
- **ADRs relacionados**: 0001–0011

## Objetivo
Peque Plan ayuda a las familias a encontrar planes (fuera de casa, en su ciudad) y actividades (en casa) adaptados a sus hijos, y a organizarlos en un calendario compartido.

## Módulos
| Módulo | MVP | Descripción |
|---|---|---|
| Mi perfil | Sí (fase 1) | Hogar, adultos, hijos, preferencias, ubicación |
| Actividades | Sí (fase 2) | Catálogo por categoría y edad con paso a paso y recursos |
| Planes | Sí (fase 3) | Catálogo de planes en Madrid con filtros y distancia |
| Mi planificación | Sí (fase 4) | Calendario con planes y actividades asignados a hijos |
| Administración de datos | Sí (fases 2–3) | Fuentes, ingesta, revisión y publicación (solo admin) |
| Asesoramiento | No | Recomendaciones y avisos según perfil |
| Viajes | No | Itinerarios por ciudades con planes en ruta |

Relaciones: Actividades → Planificación, Planes → Planificación, Planes → Ciudades.

## Vista de componentes
```
Navegador ──► Next.js (App Hosting / Cloud Run)
               ├─ Server Components + Server Actions ──► Firebase Admin SDK ──► Firestore / Storage
               ├─ /api/session (cookie de sesión)    ──► Firebase Auth
               └─ /admin (claim admin)
Jobs (CLI local / Cloud Run Jobs + Scheduler)
               ├─ ingest-madrid, ingest-newsletters, ingest-web
               └─ generate-activities ──► @peque/ai ──► Gemini API (local) / Vertex AI (GCP)
                                             └─ aiCache (Firestore)
Cloud KMS (KEK) ──► DEK por hogar ──► cifrado de campos sensibles
```

## Entornos
| Entorno | Datos | Auth | IA | Coste |
|---|---|---|---|---|
| Local | Emuladores (`demo-peque-plan`), familias sintéticas, catálogo real | Emulador de Auth | Gemini API (solo datos públicos) | 0 € |
| Producción (fase 5) | Firestore `europe-southwest1` | Firebase Auth | Vertex AI UE | Pago por uso, alerta de presupuesto |

## Modelo de datos
Ver ADR-0005 y los esquemas Zod en `packages/shared/src/schemas`.
