# Registro de actividades de tratamiento (art. 30 RGPD)

**Borrador 2026-11-22** · Responsable: [Nombre, NIF, contacto]

| Campo | Tratamiento 1: Cuentas y hogares | Tratamiento 2: Perfil de los peques |
|---|---|---|
| Finalidad | Acceso, gestión de hogares compartidos, invitaciones | Recomendar planes y actividades por edad e intereses |
| Interesados | Adultos usuarios e invitados | Menores de edad |
| Categorías de datos | Identificativos (email, nombre, foto), zona, ubicación opcional, preferencias | Alias, mes/año de nacimiento, intereses, notas (sin datos de salud) |
| Base jurídica | Art. 6.1.b (servicio), 6.1.a (ubicación), 6.1.f (invitaciones), 6.1.c (registro de consentimiento) | Art. 6.1.a, consentimiento del titular de la patria potestad (LOPDGDD art. 7) |
| Destinatarios | Google Cloud/Firebase como encargado | Google Cloud como encargado (datos cifrados a nivel de campo) |
| Transferencias internacionales | Firebase Auth: DPF UE-EE. UU. + cláusulas contractuales tipo | No (región `europe-southwest1`) |
| Plazos de supresión | Hasta baja; copias ≤7 días; Auth ≤180 días; invitaciones 14 días | Hasta borrado del peque/hogar; copias ≤7 días |
| Medidas de seguridad | TLS, cifrado AES-256 en reposo, cifrado de campo AES-256-GCM con DEK por hogar y KEK en KMS, reglas de acceso solo servidor, sin acceso del administrador | Ídem + prohibición de envío a IA (ADR-0010) |
