# ADR-0011: Minimización de datos de menores

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0009, ADR-0010

## Contexto
RGPD art. 5.1.c (minimización) y art. 25 (privacidad por defecto); considerando 38 (protección específica de menores). Los datos de salud son categoría especial (art. 9).

## Decisión
- De cada hijo se pide: alias o nombre (se recomienda alias), **mes y año** de nacimiento (no día) e intereses de una lista cerrada. Notas libres opcionales con aviso de no incluir datos de salud.
- **Sin datos de salud** (alergias, discapacidad, necesidades especiales) ni **fotos de menores** en el MVP. Incorporarlos requerirá consentimiento explícito, EIPD actualizada y un ADR nuevo.
- La dirección de casa es opcional; basta con un punto aproximado para calcular distancias.
- Exportar datos y borrar cuenta disponibles desde el perfil.

## Consecuencias
- Menor riesgo e impacto ante brechas; edad calculada con precisión de mes, suficiente para filtrar planes.
