# ADR-0013: Alcance real del crypto-shredding y retención de copias

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Modifica**: ADR-0009 (apartado "Crypto-shredding")

## Contexto
ADR-0009 afirma que borrar la DEK de un hogar deja sus datos ilegibles "también en backups". Al diseñar la fase 1 se ha visto que no es exacto: la DEK envuelta se guarda en el propio documento del hogar, así que una copia de Firestore (PITR o backup programado) contiene tanto los datos cifrados como su DEK envuelta, y con la KEK de KMS seguiría siendo descifrable mientras exista esa copia.

## Opciones consideradas
1. Una clave de KMS por hogar y destruir su versión al borrar — crypto-shredding real, pero ~0,06 $/mes por hogar y cuotas de KMS.
2. Guardar las DEKs fuera de Firestore (p. ej. Secret Manager) — coste por secreto similar y más complejidad.
3. **DEK envuelta en el hogar + retención corta y conocida de las copias** — al borrar, los datos desaparecen de la base de datos en el momento; en las copias, cuando caduca su retención.

## Decisión
Opción 3 para el MVP:
- Borrar un hogar elimina sus documentos y su DEK envuelta de inmediato.
- Las copias de Firestore en producción tendrán una retención máxima de **7 días** (PITR estándar; sin backups programados de más duración). Pasado ese plazo los datos borrados son irrecuperables.
- La política de privacidad lo indicará: "los datos se eliminan al momento y desaparecen de las copias de seguridad en un máximo de 7 días".
- Reevaluar la opción 1 si el número de hogares lo permite económicamente o si una auditoría lo exige.

## Consecuencias
- Comportamiento honesto y verificable con coste cero.
- La protección frente a lectura de copias depende de la KEK de KMS, cuyo acceso está restringido a la cuenta de servicio de la app y auditado.
