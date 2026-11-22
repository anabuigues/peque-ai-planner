# ADR-0016: Ubicación fuera de Madrid por municipio

- **Estado**: Aceptado
- **Fecha**: 2026-11-22
- **Modifica**: ADR-0012 (amplía la ubicación a hogares fuera de Madrid)
- **Relacionado con**: ADR-0015

## Contexto
Con varios hogares por usuario (ADR-0015) aparecen hogares fuera de Madrid, como la casa del pueblo, donde no existe la lista de barrios de ADR-0012.

## Opciones consideradas
1. **Municipio de una lista oficial + geolocalización opcional** — sin terceros ni coste; precisión suficiente en municipios pequeños.
2. Solo geolocalización del navegador — obliga a estar físicamente allí para configurarlo.
3. Dirección + geocodificación externa — descartada por los mismos motivos que en ADR-0012.

## Decisión
Opción 1. Lista estática de municipios de España (código INE, nombre, provincia, coordenadas) generada desde el Nomenclátor Geográfico de Municipios del IGN/CNIG (CC BY 4.0), guardada en `packages/shared` y consultada desde el servidor. Se mantiene la geolocalización opcional cifrada y la prohibición de pedir direcciones.

## Consecuencias
- Cualquier hogar de España puede tener ubicación sin enviar datos a terceros.
- En municipios grandes distintos de Madrid la precisión es baja; si se añaden más ciudades al catálogo de planes, se generará su lista de barrios como en ADR-0012.
- El catálogo de planes sigue siendo solo de Madrid en el MVP.

## Errata (2026-11-22)
El Nomenclátor del CNIG solo se distribuye en formatos `.mdb`/`.odb` mediante formulario. Los municipios se toman de la **Base de Datos de Líneas Límite del IGN (BDLJE)**, publicada con la misma licencia CC BY 4.0 en el conjunto `georef-spain-municipio` de Opendatasoft, con un punto interior por municipio. La decisión no cambia; solo la fuente concreta. Generador: `jobs/src/geo/build-geo-data.ts`.
