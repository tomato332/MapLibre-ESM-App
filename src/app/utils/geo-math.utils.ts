/**
 * Pure mathematical, geographic, and timestamp utility functions
 */

/**
 * Calculates Haversine distance between two coordinates in kilometers
 */
export function haversineDistance(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Creates a GeoJSON Polygon representation of a circle given a center and radius in kilometers
 */
export function createGeoJSONCircle(center: [number, number], radiusInKm: number, points = 64): any {
  if (radiusInKm <= 0) {
    return { type: 'FeatureCollection', features: [] };
  }
  const coords = { latitude: center[1], longitude: center[0] };
  const distanceX = radiusInKm / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
  const distanceY = radiusInKm / 110.574;

  const ret = [];
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [ret]
        },
        properties: {}
      }
    ]
  };
}

/**
 * Parses JST timestamp string or epoch time to Unix millisecond timestamp
 */
export function parseJSTTime(str: any): number {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  if (typeof str === 'string' && !isNaN(Number(str)) && Number(str) > 1000000000000) return Number(str);

  if (typeof str === 'string' && (str.includes('Z') || str.includes('+') || str.includes('T'))) {
    const parsed = Date.parse(str);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  const clean = String(str).replace(/[^\d]/g, '');
  if (clean.length >= 14) {
    const yyyy = parseInt(clean.substring(0, 4), 10);
    const mm = parseInt(clean.substring(4, 6), 10) - 1;
    const dd = parseInt(clean.substring(6, 8), 10);
    const hh = parseInt(clean.substring(8, 10), 10);
    const mi = parseInt(clean.substring(10, 12), 10);
    const ss = parseInt(clean.substring(12, 14), 10);
    return Date.UTC(yyyy, mm, dd, hh - 9, mi, ss);
  } else if (clean.length === 12) {
    const yyyy = parseInt(clean.substring(0, 4), 10);
    const mm = parseInt(clean.substring(4, 6), 10) - 1;
    const dd = parseInt(clean.substring(6, 8), 10);
    const hh = parseInt(clean.substring(8, 10), 10);
    const mi = parseInt(clean.substring(10, 12), 10);
    return Date.UTC(yyyy, mm, dd, hh - 9, mi, 0);
  }
  return 0;
}

/**
 * Checks if an EEW (Earthquake Early Warning) payload is currently active (not cancelled, within valid timeframe)
 */
export function isActiveEEW(eew: any): boolean {
  if (!eew) return false;
  if (eew.isCancel) return false;
  if (eew.isSimulation) {
    const elapsed = (Date.now() - (eew.simulationStartTime || Date.now())) / 1000 + (eew.simulatedElapsed || 5);
    return elapsed >= 0 && elapsed < 180;
  }

  const timeStr = eew.OriginTime || eew.AnnouncedTime || eew.ReportTime;
  if (!timeStr) return false;

  const origin = parseJSTTime(timeStr);
  if (!origin) return false;
  const now = Date.now();
  const elapsedSeconds = (now - origin) / 1000;

  return elapsedSeconds >= -60 && elapsedSeconds < 240;
}

/**
 * Generates a unique deduplication key for a P2P earthquake item
 */
export function getQuakeUniqueKey(item: any): string {
  if (!item) return '';
  const id = item.id;
  const eqTime = item.earthquake?.time || item.time || '';
  const issueType = item.issue?.type || '';
  const maxScale = item.earthquake?.maxScale ?? '';
  const hypName = item.earthquake?.hypocenter?.name || '';
  if (id) return `${id}_${eqTime}_${issueType}`;
  return `${eqTime}_${issueType}_${maxScale}_${hypName}`;
}
