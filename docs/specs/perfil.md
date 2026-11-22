# Spec: Mi perfil (hogares, peques y adultos)

- **Estado**: Implementada (2026-11-22)
- **Fase**: 1
- **ADRs relacionados**: ADR-0005, ADR-0009, ADR-0011, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0016

## Objetivo
Conocer a la familia lo justo para recomendar bien: dónde está cada casa (aproximadamente), qué edad e intereses tienen los peques y qué prefieren los adultos. Un adulto puede pertenecer a varios hogares (su casa, la casa del pueblo, la de los abuelos) y en cada uno comparte peques y calendario con otros adultos. Todo con el mínimo de datos y los datos de menores cifrados.

## Historias de usuario
1. Como madre que entra por primera vez, quiero un alta guiada de 3–4 pasos para empezar a usar la app en menos de 2 minutos.
2. Como madre, quiero añadir a mis peques con un alias, su mes y año de nacimiento y lo que les gusta.
3. Como padre, quiero indicar mi barrio (o mi ubicación) para ver la distancia a los planes, sin dar mi dirección.
4. Como madre, quiero crear un segundo hogar ("Casa del pueblo") copiando a mis peques, con su propia ubicación.
5. Como abuela, quiero crear el hogar "Casa de los abuelos" e invitar a mis hijos para tener ahí a todos los nietos.
6. Como adulto que está en varios hogares, quiero cambiar de hogar activo desde el menú y que planes, actividades y calendario se adapten a ese hogar.
7. Como titular, quiero invitar a otros adultos con un enlace para que compartan peques y calendario.
8. Como adulto invitado, quiero aceptar la invitación al entrar con mi cuenta de Google, aunque ya tenga otro hogar.
9. Como adulto, quiero editar o borrar a un peque y cambiar las preferencias de cada hogar.
10. Como adulto, quiero descargar todos mis datos y poder salir de un hogar o borrar mi cuenta.

## Reglas de negocio
### Hogares (ADR-0015)
- Un hogar agrupa **adultos, peques, ubicación, preferencias, guardados y calendario**. Los hogares son independientes entre sí.
- Un usuario puede pertenecer a **varios hogares** (máximo 10). Uno de ellos es su **hogar activo**, que se elige con un selector en la barra lateral y determina qué peques, ubicación y preferencias usan Planes, Actividades y Calendario.
- Quien crea un hogar es su **titular**; el resto son **miembros**. Titular y miembros gestionan peques, preferencias, guardados y calendario. **Solo el titular** puede expulsar a un miembro, revocar invitaciones ajenas, transferir la titularidad y borrar el hogar.
- Máximo 8 adultos y 12 peques por hogar (límite de abuso, ampliable).
- Al crear un hogar se puede **copiar peques** de otro hogar del usuario: se crean como peques nuevos del hogar destino, re-cifrados con su clave. Después cada copia es independiente (editar uno no cambia el otro).
- El titular no puede abandonar un hogar con otros miembros: primero transfiere la titularidad o lo borra.
- La fuente de verdad de la pertenencia es `households/{id}.memberUids`; `users/{uid}.householdIds` es un índice que se mantiene en la misma transacción.

### Peques
- Campos: **alias** (1–30 caracteres; se sugiere no usar el nombre real), **mes y año de nacimiento** (`AAAA-MM`, no futuro, máximo 17 años), **intereses** (de la lista cerrada `CHILD_INTERESTS`, 0–6) y **notas** opcionales (máx. 280 caracteres).
- El campo de notas muestra el aviso: *"No incluyas datos de salud (alergias, diagnósticos…)."* (ADR-0011).
- Sin fotos. Avatar con la inicial y un color.
- La edad se calcula en el servidor tras descifrar (`ageInMonths`).

### Ubicación (ADR-0012, ADR-0016)
- **En Madrid**: la familia elige su **barrio** de una lista de los 131 barrios oficiales (agrupados por distrito, con buscador). Se usa el centroide del barrio.
- **Fuera de Madrid**: elige su **municipio** de la lista oficial de municipios de España, con buscador. Se usa el punto del municipio.
- En ambos casos, opcional **"Usar mi ubicación"** con la geolocalización del navegador. Las coordenadas exactas se guardan **cifradas**; en claro solo la zona (barrio o municipio) y un geohash de 6 caracteres (~1 km).
- Nunca se pide, guarda ni envía a terceros una dirección postal.
- En el MVP el catálogo de planes es solo de Madrid: en un hogar de fuera, la página de Planes lo explica; las actividades en casa sirven igual.

### Preferencias del hogar
- Distancia máxima (2, 5, 10, 25 km o sin límite), presupuesto por plan (solo gratis, hasta 10 €, hasta 25 €, sin límite), cómo se mueven (a pie, transporte público, coche; varios), tipos de plan preferidos (`PLAN_CATEGORIES`, varios) e interior/exterior (indiferente por defecto).
- Son por hogar (en el pueblo quizá se va en coche y en Madrid a pie). No son datos de menores; se guardan en claro.

### Invitaciones
- El titular o un miembro escribe el email del invitado; la app genera un **enlace** `/invitacion/<token>` para compartir por WhatsApp o correo. La app no envía correos.
- Token aleatorio de 256 bits; en la base de datos solo se guarda su **hash** SHA-256.
- El email se guarda **cifrado** y como **HMAC** (con una clave secreta del servidor) para comprobar que quien abre el enlace entra con ese email.
- Caduca a los **14 días**; un solo uso; el titular puede revocarla.
- Pertenecer ya a otros hogares no impide aceptar. Al aceptar, el nuevo hogar pasa a ser el activo.

### Consentimiento (privacidad-seguridad §1)
- En el alta, antes de añadir peques: aceptar la **política de privacidad** (versión registrada) y declarar ser **madre, padre, tutor legal o tener su autorización** para los peques que se añadan (caso abuelos).
- Se guarda `privacyConsent { version, acceptedAt, guardianDeclaration }` en `users/{uid}`. Si cambia la versión de la política, se vuelve a pedir.

### Exportar y borrar (derechos RGPD)
- **Exportar mis datos**: JSON con el usuario y todos sus hogares (peques descifrados, preferencias, adultos, invitaciones pendientes).
- **Salir de un hogar** (miembro): se elimina de `memberUids` y de su índice; si era el activo, pasa a otro de sus hogares o al alta.
- **Borrar un hogar** (titular): borra el hogar y sus subcolecciones, destruye la DEK (ADR-0013) y desvincula a los miembros.
- **Borrar mi cuenta**: bloqueado mientras sea titular de algún hogar con otros miembros (debe transferir o borrar). Si no, borra los hogares de los que es titular único, sale de los demás, borra `users/{uid}` y el usuario de Firebase Auth.
- Las acciones destructivas piden confirmación escribiendo "BORRAR".

## Modelo de datos
Campos con 🔒 se guardan cifrados con la DEK de su hogar (formato `v1:<iv>:<ciphertext+tag>` en base64, AAD = `ruta-del-documento#campo`).

```
users/{uid}
  email, name, picture                      (de Google, en claro)
  householdIds: string[]                    (índice; máx. 10)
  activeHouseholdId?: string
  privacyConsent?: { version, acceptedAt, guardianDeclaration: true }
  createdAt, lastLoginAt

households/{householdId}
  ownerUid, memberUids[]
  name 🔒                                    ("Casa del pueblo")
  area: { kind: "barrio" | "municipio", id, label, geohash6 }   (en claro, aproximado)
  cityId: "madrid" | <código INE del municipio>
  preciseLocation 🔒 { lat, lng }            (solo si usó "mi ubicación")
  preferences: { maxDistanceKm, budget, transport[], planCategories[], setting }
  wrappedDek, dekVersion                    (DEK envuelta por la KEK)
  createdAt, updatedAt

households/{id}/children/{childId}
  alias 🔒, birthYearMonth 🔒, interests 🔒, notes 🔒
  color, createdAt, updatedAt

invites/{sha256(token)}                     (colección raíz: se busca por token sin índices de grupo)
  householdId, emailHmac, email 🔒 (DEK del hogar), invitedByUid, status (pending|accepted|revoked), expiresAt, createdAt
```

- Esquemas Zod en `packages/shared/src/schemas/household.ts` (forma descifrada). La capa `apps/web/src/server/repos/households.ts` es la única que cifra y descifra.
- `area.label` (nombre del barrio o municipio) va en claro: es una zona, no identifica a la familia, y permite mostrarla sin descifrar.

### Datos geográficos (generados una vez por script, con fuente y licencia en el propio archivo)
- `packages/shared/src/data/madrid-neighborhoods.json`: 131 barrios (id, nombre, distrito, centroide) a partir de la cartografía de barrios de datos.madrid.es.
- `packages/shared/src/data/municipalities-es.json`: municipios de España (código INE, nombre, provincia, coordenadas) a partir de la Base de Datos de Líneas Límite del IGN (CC BY 4.0, vía Opendatasoft). Se busca en el servidor para no enviar la lista completa al navegador.

## Pantallas y flujos
| Ruta | Contenido |
|---|---|
| `/bienvenida` | Alta para usuarios sin hogares: 1) privacidad y declaración, 2) invitaciones pendientes para su email (unirse) y/o crear hogar, 3) nombre y ubicación del hogar, 4) peques ("lo haré luego" posible), 5) preferencias (valores por defecto, se puede saltar). |
| Selector de hogar (barra lateral y menú móvil) | Nombre del hogar activo; desplegable con sus hogares y "Crear otro hogar". |
| `/perfil` | Hogar activo: nombre, zona, adultos, peques (estilo movimientos: avatar, alias, edad, intereses), preferencias. Lista de "Mis hogares". Sección Privacidad (exportar, salir/borrar hogar, borrar cuenta). |
| `/perfil/hogares/nuevo` | Crear hogar: nombre, ubicación y "copiar peques de…" (casillas por peque de sus otros hogares). |
| `/perfil/peques/nuevo`, `/perfil/peques/[id]` | Crear, editar o borrar un peque del hogar activo. |
| `/perfil/ubicacion` | Cambiar barrio/municipio o usar mi ubicación. |
| `/perfil/preferencias` | Editar preferencias del hogar activo. |
| `/perfil/adultos` | Miembros, invitaciones pendientes, crear invitación (enlace con botón copiar), expulsar y transferir titularidad (titular). |
| `/invitacion/[token]` | Sin sesión → login y vuelta. Email coincide → "Únete a «…»" → aceptar. Email distinto, caducada o usada → mensaje claro. |

- Un usuario autenticado sin hogares es redirigido a `/bienvenida`.
- El inicio saluda con los peques del hogar activo ("Planes para Leo y Mía").

## Datos personales y cifrado
| Campo | ¿Personal? | ¿De menor? | Cifrado | Base legal | Retención |
|---|---|---|---|---|---|
| Alias del peque | Sí | Sí | 🔒 | Consentimiento del tutor | Hasta borrar el peque/hogar |
| Mes/año de nacimiento | Sí | Sí | 🔒 | Consentimiento del tutor | Ídem |
| Intereses del peque | Sí | Sí | 🔒 | Consentimiento del tutor | Ídem |
| Notas del peque | Sí | Sí | 🔒 | Consentimiento del tutor | Ídem |
| Nombre del hogar | Sí (puede incluir apellidos) | No | 🔒 | Ejecución del contrato | Ídem |
| Ubicación precisa | Sí | Indirectamente | 🔒 | Consentimiento | Hasta cambiarla o borrar |
| Zona (barrio/municipio) y geohash6 | Bajo | Indirectamente | No (minimizado) | Consentimiento | Ídem |
| Preferencias | No | No | No | Ejecución del contrato | Ídem |
| Pertenencia a hogares (`householdIds`) | Sí | No | No | Ejecución del contrato | Hasta salir/borrar |
| Email del invitado | Sí | No | 🔒 + HMAC | Interés legítimo | 14 días o hasta aceptar/revocar |
| Email, nombre y foto del adulto | Sí | No | No (necesarios para el acceso) | Ejecución del contrato | Hasta borrar la cuenta |
| Registro de consentimiento | Sí | No | No | Obligación legal (art. 7.1 RGPD) | Mientras exista la cuenta |

- **Copiar peques** entre hogares descifra con la DEK de origen y cifra con la de destino en el servidor; requiere ser miembro de ambos.
- **IA**: este módulo no envía nada a la IA.
- **Logs**: nunca se registran valores descifrados ni tokens; solo ids.
- **Claves**: en local, KEK de desarrollo `DATA_KEK` y clave HMAC `INVITE_HMAC_KEY` en `.env.local` (generadas por `npm run setup:keys`); en GCP, KEK en Cloud KMS y clave HMAC en Secret Manager (fase 5).

## Permisos
- Todo acceso a `households/**` e `invites/**` se hace **desde el servidor** (Server Actions con Admin SDK), que comprueba sesión y pertenencia al hogar concreto. Las Security Rules **deniegan cualquier acceso de cliente** a hogares (ADR-0014).
- `users/{uid}`: lectura del propio usuario desde el cliente; escritura solo desde el servidor.
- Acciones de titular comprueban `ownerUid`.
- El administrador de la plataforma no tiene ningún acceso a hogares.

## Criterios de aceptación
- [x] Un usuario nuevo completa el alta (privacidad → hogar y zona → 1 peque → preferencias) y llega al inicio.
- [x] Un usuario sin hogares es redirigido a `/bienvenida` desde cualquier página de la app.
- [x] Un usuario crea un segundo hogar fuera de Madrid eligiendo municipio, copia dos peques y cambia entre hogares desde el selector; el inicio y el perfil muestran los peques del hogar activo.
- [x] Editar un peque copiado no cambia el original.
- [x] En Firestore, los campos 🔒 no contienen ningún valor en claro (test contra el emulador).
- [x] Copiar un valor cifrado a otro documento, campo u hogar hace fallar el descifrado.
- [x] Un adulto que ya tiene hogar acepta una invitación con el email correcto y ve los peques del nuevo hogar; con otro email, caducada o reutilizada, se rechaza.
- [x] Un miembro no puede expulsar, transferir ni borrar el hogar; el titular sí.
- [x] No se puede superar el máximo de 10 hogares por usuario.
- [x] Exportar descarga un JSON con los datos descifrados de todos los hogares del usuario.
- [x] Borrar un hogar elimina sus documentos y su DEK; un valor cifrado guardado antes ya no se puede descifrar. Los miembros dejan de tenerlo en su lista.
- [x] Borrar la cuenta queda bloqueado si es titular de un hogar con más miembros; si no, elimina el usuario de Auth y su documento.
- [x] Las reglas de Firestore deniegan cualquier acceso de cliente a `households/**` y la escritura de cliente en `users/**`.
- [ ] Ningún log de servidor contiene alias, fechas de nacimiento ni emails de invitación.

## Verificación
- Tests de integración contra el emulador: `apps/web/src/server/repos/households.int.test.ts` (`npm run test:integration`).
- Tests de reglas: `firebase/tests/firestore.rules.test.ts` (`npm run test:rules`).
- Tests unitarios del cifrado: `apps/web/src/server/crypto/field-cipher.test.ts`.
- Recorrido completo en Chrome (alta → segundo hogar en Cuenca copiando un peque → cambio de hogar → invitación aceptada por otro adulto → enlace reutilizado rechazado).
- El criterio de logs se cumple por diseño (las acciones solo registran el tipo de error); no tiene test automático.

## Fuera de alcance
- Peques compartidos entre hogares (un mismo peque enlazado en varios), fotos, datos de salud, catálogo de planes fuera de Madrid, envío de emails, calendario combinado de todos los hogares (se valorará en la fase 4).
