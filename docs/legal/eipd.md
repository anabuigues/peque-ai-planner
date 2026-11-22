# Evaluación de impacto en protección de datos (EIPD) — ligera

**Borrador 2026-11-22** · Debe completarse antes de abrir la beta y revisarse con el módulo de Asesoramiento.

## 1. Necesidad
Según la lista de la AEPD (art. 35.4 RGPD), concurren al menos dos criterios: datos de **menores de 14 años** (sujetos vulnerables) y **perfilado** para recomendaciones; además se trata una **ubicación** aproximada del hogar.

## 2. Descripción
Aplicación web que permite a adultos registrar hogares y peques para recibir planes y actividades adecuados. Ver `docs/specs/arquitectura.md` y `docs/specs/perfil.md`.

## 3. Necesidad y proporcionalidad
- Minimización: alias en lugar de nombre, mes/año en lugar de fecha completa, intereses de lista cerrada, zona en lugar de dirección, sin fotos ni salud (ADR-0011, ADR-0012).
- Transparencia: resumen claro en el alta y política específica.
- Derechos: exportación y borrado de autoservicio.

## 4. Riesgos y medidas
| Riesgo | Probabilidad | Impacto | Medidas | Riesgo residual |
|---|---|---|---|---|
| Acceso no autorizado a datos de menores (fallo de reglas, acceso a consola, exportación) | Media | Alto | Cifrado de campo con DEK por hogar y KEK en KMS; acceso solo desde servidor; tests de reglas | Bajo |
| Reidentificación por ubicación | Baja | Medio | Solo zona/geohash de ~1 km en claro; ubicación precisa cifrada y opcional | Bajo |
| Envío de datos de menores a la IA o a terceros | Baja | Alto | Prohibición (ADR-0010) con bloqueo técnico en `@peque/ai` y tests | Muy bajo |
| Inclusión de datos de salud en notas | Media | Alto | Aviso visible; campo cifrado; límite de 280 caracteres | Medio-bajo |
| Invitación aceptada por una persona no prevista | Baja | Medio | Enlace de un solo uso, 14 días, ligado al email (HMAC); revocable | Bajo |
| Conservación excesiva | Baja | Medio | Borrado de autoservicio; copias ≤7 días | Bajo |

## 5. Conclusión provisional
Con las medidas previstas el riesgo residual es aceptable para una beta privada. Pendiente: revisión experta, aceptación del DPA de Google y validación de la retención de copias en producción (fase 5).
