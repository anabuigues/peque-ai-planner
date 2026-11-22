import { readFileSync } from 'node:fs';

/** Lector mínimo de shapefiles de polígonos (.shp + .dbf) para generar centroides. */
export function readPolygonCentroids(shpPath: string): { x: number; y: number }[] {
  const buf = readFileSync(shpPath);
  const out: { x: number; y: number }[] = [];
  let pos = 100; // cabecera
  while (pos < buf.length) {
    const contentLength = buf.readInt32BE(pos + 4) * 2;
    const rec = pos + 8;
    const type = buf.readInt32LE(rec);
    if (type !== 5) throw new Error(`Tipo de geometría no soportado: ${type}`);
    const numParts = buf.readInt32LE(rec + 36);
    const numPoints = buf.readInt32LE(rec + 40);
    const partsStart = rec + 44;
    const pointsStart = partsStart + numParts * 4;
    const parts = Array.from({ length: numParts }, (_, i) => buf.readInt32LE(partsStart + i * 4));
    let area = 0, cx = 0, cy = 0;
    for (let p = 0; p < numParts; p++) {
      const start = parts[p]!;
      const end = p + 1 < numParts ? parts[p + 1]! : numPoints;
      for (let i = start; i < end - 1; i++) {
        const x0 = buf.readDoubleLE(pointsStart + i * 16);
        const y0 = buf.readDoubleLE(pointsStart + i * 16 + 8);
        const x1 = buf.readDoubleLE(pointsStart + (i + 1) * 16);
        const y1 = buf.readDoubleLE(pointsStart + (i + 1) * 16 + 8);
        const cross = x0 * y1 - x1 * y0;
        area += cross;
        cx += (x0 + x1) * cross;
        cy += (y0 + y1) * cross;
      }
    }
    area /= 2;
    out.push({ x: cx / (6 * area), y: cy / (6 * area) });
    pos = rec + contentLength;
  }
  return out;
}

export function readDbf(dbfPath: string): Record<string, string>[] {
  const buf = readFileSync(dbfPath);
  const numRecords = buf.readUInt32LE(4);
  const headerLength = buf.readUInt16LE(8);
  const recordLength = buf.readUInt16LE(10);
  const fields: { name: string; length: number }[] = [];
  for (let off = 32; buf[off] !== 0x0d; off += 32) {
    fields.push({
      name: buf.toString('latin1', off, off + 11).replace(/\0.*$/, ''),
      length: buf[off + 16]!,
    });
  }
  const rows: Record<string, string>[] = [];
  for (let r = 0; r < numRecords; r++) {
    let off = headerLength + r * recordLength + 1;
    const row: Record<string, string> = {};
    for (const f of fields) {
      row[f.name] = buf.toString('utf8', off, off + f.length).trim();
      off += f.length;
    }
    rows.push(row);
  }
  return rows;
}
