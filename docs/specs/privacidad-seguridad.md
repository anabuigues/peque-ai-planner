# Spec: Privacidad y seguridad

- **Estado**: Aprobada (2026-11-22)
- **ADRs relacionados**: ADR-0004, ADR-0009, ADR-0010, ADR-0011

> Orientación técnica, no asesoría legal. Antes de abrir la beta a familias fuera del círculo cercano, debe revisarla una persona experta en protección de datos.

## 1. Marco normativo aplicable
| Norma | Qué implica para Peque Plan |
|---|---|
| RGPD art. 5.1.c y 5.1.f | Minimización; integridad y confidencialidad |
| RGPD art. 25 | Protección de datos desde el diseño y por defecto |
| RGPD art. 32 | Medidas técnicas apropiadas al riesgo: cita cifrado y seudonimización. No fija un algoritmo concreto |
| RGPD art. 34.3.a | No es obligatorio comunicar una brecha a cada interesado si los datos eran ininteligibles (cifrados) |
| RGPD art. 35 + lista AEPD | EIPD obligatoria cuando concurren ≥2 criterios. Aquí: datos de menores de 14 (sujetos vulnerables) + perfilado para recomendaciones + ubicación |
| RGPD art. 8, considerando 38; LOPDGDD art. 7 | Protección específica de menores; por debajo de 14 años consiente quien ejerce la patria potestad |
| RGPD art. 9 | Datos de salud = categoría especial. **No se recogen en el MVP** |
| RGPD art. 28 | Google actúa como encargado: aceptar el DPA de Google Cloud y de Firebase |
| RGPD cap. V | Transferencias internacionales: Data Privacy Framework UE-EE. UU. + cláusulas contractuales tipo |
| ENS | No aplica (no es sector público); se siguen sus recomendaciones criptográficas junto con las de ENISA |

## 2. Inventario de datos personales
| Dato | Titular | Dónde | Cifrado de campo | Base legal |
|---|---|---|---|---|
| Email, nombre, foto de Google | Adulto | Firebase Auth, `users` | No (necesario para login) | Ejecución del contrato |
| Nombre/alias del hijo | Menor | `households/*/children` | **Sí** | Consentimiento del progenitor |
| Mes/año de nacimiento | Menor | `children` | **Sí** | Consentimiento del progenitor |
| Intereses del hijo | Menor | `children` | **Sí** | Consentimiento del progenitor |
| Notas del hijo (sin salud) | Menor | `children` | **Sí** | Consentimiento del progenitor |
| Coordenadas de "usar mi ubicación" (opcional) | Hogar | `households` | **Sí** | Consentimiento |
| Barrio y geohash aproximado (~1 km) | Hogar | `households` | No (minimizado) | Consentimiento |
| Nombre del hogar | Hogar | `households` | **Sí** | Ejecución del contrato |
| Email de invitado | Adulto invitado | `households/*/invites` | **Sí** + HMAC para búsqueda | Interés legítimo |
| Calendario (qué plan y qué hijo) | Hogar/menor | `households/*/planner` | Ids de hijo en claro (seudónimos), notas cifradas | Ejecución del contrato |

## 3. Medidas de cifrado
1. **En tránsito**: HTTPS obligatorio (TLS 1.2+, 1.3 preferido), HSTS, cookies `secure`/`httpOnly`/`sameSite=lax`.
2. **En reposo (base)**: AES-256 por defecto de Google en Firestore, Storage y backups.
3. **De campo (reforzado)**: AES-256-GCM, DEK de 256 bits por hogar envuelta por KEK en Cloud KMS (`europe-southwest1`). *Associated data* = ruta del documento + campo. Ver ADR-0009.
4. **Crypto-shredding** al borrar un hogar: los datos desaparecen de la base de datos al momento y de las copias en un máximo de 7 días (ADR-0013).
5. **Local**: KEK de desarrollo en `.env.local`; solo datos sintéticos de familias.
6. **Sin direcciones**: la ubicación es un barrio o, opcionalmente, la geolocalización del navegador (ADR-0012).

## 4. Control de acceso
- Security Rules: un usuario solo lee/escribe su hogar; el catálogo publicado es de solo lectura; las colecciones de operación son solo de admin.
- **El admin no tiene acceso a datos de hogares** desde la aplicación.
- Descifrado en KMS solo para la cuenta de servicio de la app; logs de auditoría de acceso a datos activados en KMS.
- Cabeceras de seguridad: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

## 5. IA
- Nunca se envían datos personales a la IA (ADR-0010). `@peque/ai` bloquea claves personales conocidas.
- API gratuita de Gemini: solo local y solo datos públicos. Producción: Vertex AI en UE.

## 6. Derechos de los interesados
- Acceso/portabilidad: "Exportar mis datos" (JSON descifrado) desde el perfil.
- Supresión: "Borrar mi cuenta" → borra documentos, destruye DEK, elimina usuario de Auth. Copias de Firestore: ≤7 días (ADR-0013); copias de Auth gestionadas por Google: ≤180 días.
- Rectificación: edición desde el perfil.

## 7. Retención
- Cuenta activa: mientras el hogar exista.
- Invitaciones no aceptadas: 14 días.
- Logs de aplicación: 30 días, sin datos personales en claro.

## 8. Entregables legales (borradores en `docs/legal/`, fase 1)
- Política de privacidad específica (lenguaje claro, mención a menores).
- Registro de actividades de tratamiento.
- EIPD ligera, a completar antes de la beta y a actualizar con el módulo de Asesoramiento.

## 9. Evaluación del stack
| Pieza | ¿Cumple? | Notas |
|---|---|---|
| Firestore / Storage / Cloud Run / KMS | Sí | Región Madrid, AES-256 por defecto, DPA de Google Cloud |
| Firestore CMEK | No necesario | GA bajo lista de acceso y solo al crear la BD; cubierto por cifrado de campo |
| Firebase Auth | Aceptable | Solo datos de adultos; sin elección de región; DPF + SCC |
| Vertex AI | Sí | Región UE, sin entrenamiento con nuestros datos |
| Gemini API gratuita | Solo local con datos públicos | Puede usar entradas para mejorar productos |
| Next.js / App Hosting | Sí | HTTPS gestionado + cabeceras de seguridad |

## Criterios de aceptación (verificados en tests)
- [ ] Un documento de hijo en Firestore no contiene ningún valor sensible en claro.
- [ ] Tras borrar un hogar, sus campos cifrados no se pueden descifrar.
- [ ] Ningún prompt enviado a la IA contiene claves personales.
- [ ] Un usuario no puede leer otro hogar; un no-admin no accede a colecciones de operación; el admin no lee hogares ajenos.
