# ADR-0003: Desarrollo local primero con emuladores; GCP al final

- **Estado**: Aceptado
- **Fecha**: 2026-11-22

## Contexto
Desplegar y mantener recursos en GCP cuesta dinero. La propietaria quiere validar el MVP completo en local, con datos reales del catálogo cuando haga falta, antes de pagar infraestructura.

## Opciones consideradas
1. **Firebase Emulator Suite en local** (Auth, Firestore, Storage) con persistencia en disco; proyecto demo `demo-peque-plan` que no requiere cuenta de GCP.
2. Proyecto de GCP de desarrollo desde el día 1 — más parecido a producción, pero con coste y gestión de credenciales desde el principio.

## Decisión
Se usa la opción 1. El proyecto `demo-peque-plan` (prefijo `demo-` = solo emuladores, no puede tocar recursos reales). Los datos persisten en `.firebase-data/` (ignorado en git) mediante `--import/--export-on-exit`. Los únicos servicios reales en local son las fuentes públicas de datos y la API de Gemini (ADR-0006). El despliegue en GCP es la última fase del MVP.

## Consecuencias
- Coste cero durante el desarrollo; cualquiera puede arrancar el proyecto sin credenciales.
- Los emuladores requieren Java (JDK) instalado.
- Los emuladores no cifran en reposo: en local solo hay datos de familia sintéticos (ADR-0009).
- Al pasar a GCP, los datos de catálogo ya revisados se exportan del emulador a Firestore real para no repetir trabajo de IA.
