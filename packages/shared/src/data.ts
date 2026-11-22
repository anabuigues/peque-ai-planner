import neighborhoodsData from './data/madrid-neighborhoods.json';

export interface Neighborhood {
  id: string;
  name: string;
  districtId: string;
  district: string;
  lat: number;
  lng: number;
}

/** 131 barrios oficiales de Madrid (ADR-0012). Pequeño: se puede usar en cliente. */
export const MADRID_NEIGHBORHOODS: Neighborhood[] = neighborhoodsData.items;
export const MADRID_CITY_ID = 'madrid';
export const MADRID_INE_CODE = '28079';

export function findNeighborhood(id: string): Neighborhood | undefined {
  return MADRID_NEIGHBORHOODS.find((n) => n.id === id);
}
