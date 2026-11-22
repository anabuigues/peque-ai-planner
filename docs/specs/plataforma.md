# Spec: Plataforma base (Fase 0)

- **Estado**: Implementada
- **Fase**: 0
- **ADRs relacionados**: 0001, 0002, 0003, 0004, 0006, 0008

## Objetivo
Dejar un esqueleto funcional en local sobre el que construir los módulos: monorepo, emuladores, login con Google, layout con el sistema de diseño, capa de IA con caché y CI.

## Historias de usuario
- Como desarrolladora, quiero arrancar todo en local con dos comandos y sin cuenta de GCP.
- Como usuaria, quiero entrar con mi cuenta de Google y ver la página de inicio.
- Como admin, quiero que mi cuenta tenga el rol admin en local.

## Alcance
1. Monorepo npm workspaces: `apps/web`, `packages/shared`, `packages/ai`, `jobs`.
2. Emuladores Auth, Firestore y Storage con proyecto `demo-peque-plan` y persistencia en `.firebase-data/`.
3. Login con Google (emulador) → cookie de sesión → rutas protegidas. Páginas: `/login`, `/` (inicio), `/design`, y marcadores para Planes, Actividades, Calendario, Perfil.
4. Rol admin: emails de `ADMIN_EMAILS` reciben el claim `admin` al iniciar sesión en local; script `set-admin`.
5. Security Rules iniciales (deny by default + catálogo publicado + hogar + admin) con tests.
6. `@peque/ai`: `generateJson` con caché `aiCache`, validación Zod y bloqueo de claves personales; tests con proveedor simulado.
7. Taxonomías compartidas: categorías de actividad y franjas de edad.
8. Seed: ciudad Madrid y 6 actividades publicadas escritas a mano. Los hogares se crean desde el alta guiada (fase 1); los tests de integración usan un proyecto de emulador aparte.
9. CI en GitHub Actions: lint, typecheck, tests unitarios y tests de reglas con emulador.
10. Cabeceras de seguridad en Next.js.

## Datos personales y cifrado
En esta fase solo hay datos sintéticos. El cifrado de campo se implementa en la fase 1 (perfil), que es cuando se guardan datos de hijos.

## Permisos
| Colección | Familia | Admin |
|---|---|---|
| `users/{uid}` | lee/escribe el suyo | — |
| `households/**` | si es miembro | no (salvo que sea miembro) |
| `activities`, `plans`, `cities` | lectura si `published` | lectura y escritura |
| `sources`, `sourceItems`, `ingestionRuns`, `aiCache`, `generationBatches` | no | lectura y escritura |

## Criterios de aceptación
- [x] `npm run emulators` + `npm run dev` levantan la app en `http://localhost:3000`.
- [x] Login con Google contra el emulador y logout funcionan; las rutas privadas redirigen a `/login`.
- [x] `/design` muestra tokens y componentes.
- [x] `npm test` pasa (shared, ai, reglas).
- [x] Repetir `generateJson` con la misma entrada no llama al modelo.
