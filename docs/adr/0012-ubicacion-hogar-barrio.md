# ADR-0012: Ubicación del hogar por barrio, sin geocodificación externa

- **Estado**: Aceptado · Modificado por ADR-0016 (hogares fuera de Madrid)
- **Fecha**: 2026-11-22
- **Relacionado con**: ADR-0009, ADR-0011, `docs/specs/perfil.md`

## Contexto
Para mostrar la distancia a los planes necesitamos un punto de partida de cada familia. Convertir una dirección postal en coordenadas exige un servicio de geocodificación externo: Google Geocoding tiene coste por uso y Nominatim (OpenStreetMap) recibe la dirección y limita el uso a 1 petición/s. En ambos casos la dirección de una familia con menores sale de nuestro sistema y además habría que guardarla.

## Opciones consideradas
1. Dirección exacta + geocodificación externa — precisa, pero coste o cesión de la dirección a un tercero, y un dato más que proteger.
2. Código postal — sin terceros, pero zonas grandes e irregulares; habría que mantener centroides de los códigos postales.
3. **Barrio oficial + geolocalización opcional del navegador** — los 131 barrios de Madrid tienen cartografía abierta; precisión de ~1 km suficiente para elegir planes; la geolocalización se calcula en el dispositivo sin terceros.

## Decisión
Opción 3. Lista estática de barrios (id, nombre, distrito, centroide) generada desde la cartografía abierta del Ayuntamiento de Madrid y guardada en `packages/shared`. Se guarda en claro el barrio y un geohash de 6 caracteres; las coordenadas de "usar mi ubicación", solo cifradas. Nunca se pide una dirección.

## Consecuencias
- Coste cero y ningún tercero recibe la ubicación.
- La distancia es aproximada (radio de error de ~0,5–1,5 km según el barrio), aceptable para planificar ocio.
- Al añadir otras ciudades habrá que generar su lista de barrios equivalente.
