/**
 * Genera los datos geográficos estáticos de packages/shared/src/data (ADR-0012, ADR-0016).
 * Se ejecuta a mano y solo cuando cambian las fuentes:
 *
 *   npm run build:geo -w @peque/jobs -- <dir-con-descargas>
 *
 * El directorio debe contener:
 *  - shp/BARRIOS.shp y shp/BARRIOS.dbf  ← https://geoportal.madrid.es/fsdescargas/IDEAM_WBGEOPORTAL/LIMITES_ADMINISTRATIVOS/Barrios/Barrios.zip
 *  - municipios.json ← https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-spain-municipio/exports/json?select=mun_code,mun_name,prov_name,geo_point_2d
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readDbf, readPolygonCentroids } from './shapefile';
import { utmToLatLng } from './utm';

const dir = process.argv[2];
if (!dir) {
  console.error('Uso: npm run build:geo -w @peque/jobs -- <dir-con-descargas>');
  process.exit(1);
}
const outDir = resolve(import.meta.dirname, '../../../packages/shared/src/data');
const round = (n: number) => Math.round(n * 1e5) / 1e5;
const generatedAt = new Date().toISOString().slice(0, 10);

// --- Barrios de Madrid ---
const centroids = readPolygonCentroids(join(dir, 'shp/BARRIOS.shp'));
const rows = readDbf(join(dir, 'shp/BARRIOS.dbf'));
if (centroids.length !== rows.length) throw new Error('shp y dbf no coinciden');
const neighborhoods = rows
  .map((row, i) => {
    const { lat, lng } = utmToLatLng(centroids[i]!.x, centroids[i]!.y, 30);
    return {
      id: `mad-${row.COD_BAR}`,
      name: row.NOMBRE!,
      districtId: row.CODDIS!.padStart(2, '0'),
      district: row.NOMDIS!,
      lat: round(lat),
      lng: round(lng),
    };
  })
  .sort((a, b) => a.district.localeCompare(b.district, 'es') || a.name.localeCompare(b.name, 'es'));

writeFileSync(
  join(outDir, 'madrid-neighborhoods.json'),
  JSON.stringify(
    {
      source: 'Ayuntamiento de Madrid, Geoportal — Barrios municipales (centroides calculados del polígono)',
      sourceUrl: 'https://datos.gob.es/es/catalogo/l01280796-barrios-municipales-de-madrid1',
      license: 'Datos abiertos del Ayuntamiento de Madrid (reutilización con atribución)',
      generatedAt,
      items: neighborhoods,
    },
    null,
    1,
  ) + '\n',
);

// --- Municipios de España ---
type RawMun = { mun_code: string; mun_name: string; prov_name: string; geo_point_2d: { lat: number; lon: number } | null };
const raw = JSON.parse(readFileSync(join(dir, 'municipios.json'), 'utf8')) as RawMun[];
const byCode = new Map<string, { code: string; name: string; province: string; lat: number; lng: number }>();
for (const m of raw) {
  if (!m.geo_point_2d || !/^\d{5}$/.test(m.mun_code)) continue;
  byCode.set(m.mun_code, {
    code: m.mun_code,
    name: m.mun_name,
    province: m.prov_name,
    lat: round(m.geo_point_2d.lat),
    lng: round(m.geo_point_2d.lon),
  });
}
const municipalities = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
writeFileSync(
  join(outDir, 'municipalities-es.json'),
  JSON.stringify({
    source: 'IGN — Base de Datos de Líneas Límite (BDLJE), vía Opendatasoft "georef-spain-municipio"',
    sourceUrl: 'https://public.opendatasoft.com/explore/dataset/georef-spain-municipio/',
    license: 'CC BY 4.0 — © Instituto Geográfico Nacional',
    generatedAt,
    items: municipalities,
  }) + '\n',
);

console.log(`Barrios: ${neighborhoods.length} · Municipios: ${municipalities.length}`);
