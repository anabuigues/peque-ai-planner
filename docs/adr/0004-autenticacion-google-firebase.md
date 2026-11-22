# ADR-0004: Autenticación con Google vía Firebase Auth y rol admin por custom claim

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0007

## Contexto
Los usuarios deben entrar con su cuenta de Google. El requisito inicial hablaba de "IAM", pero Cloud IAM gestiona permisos sobre recursos de GCP, no usuarios finales de una aplicación.

## Opciones consideradas
1. **Firebase Auth con proveedor Google** — gratuito hasta 50k usuarios activos/mes, emulador local, SDK cliente y Admin.
2. Identity Platform — misma tecnología con funciones empresariales (SAML, multi-tenant) innecesarias aquí.
3. Auth.js/NextAuth con OAuth de Google — sin dependencia de Firebase, pero perdemos la integración con Security Rules.

## Decisión
- Firebase Auth con Google Sign-In en el cliente (`signInWithPopup`).
- El ID token se intercambia en `/api/session` por una **cookie de sesión** de Firebase (`httpOnly`, `secure`, `sameSite=lax`, 5 días) que el servidor verifica en cada petición (SSR y Server Actions).
- Rol de administrador mediante *custom claim* `admin: true`, asignado por script (`npm run set-admin -- <email>`). Los emails de la variable `ADMIN_EMAILS` reciben el claim al crear su sesión en local.
- Cloud IAM se reserva para cuentas de servicio y para la administración del proyecto GCP.

## Consecuencias
- Firebase Auth no permite elegir región de almacenamiento; guarda solo datos de adultos (email, nombre, foto). Transferencias cubiertas por el DPA de Firebase (ver `docs/specs/privacidad-seguridad.md`).
- Tras cambiar un claim, el usuario debe volver a iniciar sesión para que se refleje.
