# ADR-0009: Cifrado de campo con Tink + Cloud KMS

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0005, ADR-0011, `docs/specs/privacidad-seguridad.md`

## Contexto
Se guardan datos de menores (nombre, fecha de nacimiento, intereses) y la dirección de casa de las familias. El RGPD (art. 32) exige medidas apropiadas al riesgo y cita el cifrado; el art. 34.3.a exime de comunicar una brecha a los interesados si los datos son ininteligibles. Firestore ya cifra en reposo con AES-256 y claves de Google, pero cualquier acceso con permisos de lectura (consola, export, error de reglas) ve los datos en claro.

## Opciones consideradas
1. Solo cifrado por defecto de Google — insuficiente para el nivel de riesgo de datos de menores.
2. Firestore CMEK — claves propias para toda la base de datos; GA pero bajo lista de acceso, solo al crear la BD y no protege frente a lecturas autorizadas.
3. **Cifrado a nivel de aplicación (envelope encryption)** — AES-256-GCM por campo, una DEK por hogar envuelta por una KEK en Cloud KMS.

## Decisión
Opción 3:
- Campos cifrados: de cada hijo `name`, `birthDate`, `interests`, `notes`; del hogar `home.address`, `home.lat`, `home.lng`; de invitaciones `email` (con un hash HMAC para buscar).
- Algoritmo AES-256-GCM con *associated data* = ruta del documento + nombre del campo (evita mover cifrados entre documentos).
- DEK aleatoria de 256 bits por hogar, guardada envuelta en `households/{id}.encryptedDek`.
- KEK: en GCP, Cloud KMS en `europe-southwest1` con rotación anual, permiso `cryptoKeyEncrypterDecrypter` solo para la cuenta de servicio de la app; en local, KEK de desarrollo en `.env.local` (misma interfaz `KeyWrapper`).
- Implementación con `node:crypto` (AES-256-GCM) detrás de una interfaz `FieldCipher`; Tink o el cliente de KMS se conectan en la capa `KeyWrapper`.
- **Crypto-shredding**: borrar un hogar destruye su DEK, dejando ilegibles sus datos también en backups.
- En claro solo lo necesario para buscar: geohash de precisión 6 (~1 km) para distancias.
- CMEK se descarta por ahora; reevaluar si una auditoría lo exige.

## Consecuencias
- Los campos cifrados no se pueden filtrar en consultas de Firestore; el filtrado por edad o intereses se hace en servidor tras descifrar (volumen pequeño por hogar).
- Coste KMS mínimo (céntimos/mes) gracias a cachear la DEK descifrada en memoria por petición.
- Si se pierde la KEK, los datos son irrecuperables: KMS impide borrado inmediato (periodo de destrucción programada).
