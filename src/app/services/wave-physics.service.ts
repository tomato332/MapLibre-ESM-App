import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { createGeoJSONCircle, parseJSTTime, isActiveEEW } from '../utils/geo-math.utils';

export interface WaveState {
  isActive: boolean;
  pWaveGeoJSON: any;
  sWaveGeoJSON: any;
  pFade: number;
  sFade: number;
}

@Injectable({
  providedIn: 'root'
})
export class WavePhysicsService {
  private http = inject(HttpClient);
  seismicData: Record<string, { distance: number; pTime: number; sTime: number }[]> = {};

  fetchSeismicData() {
    this.http.get<any>('/api/seismic-data').subscribe({
      next: (data) => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          this.seismicData = data;
        } else {
          this.loadSeismicDataFallback();
        }
      },
      error: (e) => {
        console.warn('Failed to load seismic data from API, trying fallback:', e);
        this.loadSeismicDataFallback();
      }
    });
  }

  private loadSeismicDataFallback() {
    this.http.get<any>('/tjma.json').subscribe({
      next: (data) => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          this.seismicData = data;
          console.log('Successfully loaded seismic data from fallback /tjma.json');
        }
      },
      error: (err) => {
        console.error('Failed to load seismic data fallback /tjma.json', err);
      }
    });
  }

  getRadiusFromTjma(elapsedTime: number, depth: number, type: 'p' | 's'): number {
    if (!this.seismicData || Object.keys(this.seismicData).length === 0) return 0;

    const depths = Object.keys(this.seismicData)
      .map(Number)
      .sort((a, b) => a - b);
    if (depths.length === 0) return 0;

    let closestDepth = depths[0];
    let minDiffDepth = Infinity;
    for (const d of depths) {
      const diff = Math.abs(d - depth);
      if (diff < minDiffDepth) {
        minDiffDepth = diff;
        closestDepth = d;
      }
    }

    const table = this.seismicData[closestDepth.toString()];
    if (!table || table.length === 0) return 0;

    let closestDist = 0;

    for (let i = 0; i < table.length; i++) {
      const point = table[i];
      const time = type === 'p' ? point.pTime : point.sTime;
      if (time <= elapsedTime) {
        closestDist = point.distance;
      } else {
        if (i > 0) {
          const prev = table[i - 1];
          const prevTime = type === 'p' ? prev.pTime : prev.sTime;
          const fraction = (elapsedTime - prevTime) / (time - prevTime);
          return prev.distance + fraction * (point.distance - prev.distance);
        }
        break;
      }
    }

    return closestDist;
  }

  calculateWaveState(eew: any, now: number = Date.now()): WaveState {
    const eewActive = eew && isActiveEEW(eew);
    const emptyGeoJSON = { type: 'FeatureCollection', features: [] };

    if (!eewActive) {
      return {
        isActive: false,
        pWaveGeoJSON: emptyGeoJSON,
        sWaveGeoJSON: emptyGeoJSON,
        pFade: 0,
        sFade: 0
      };
    }

    let elapsedSeconds = 0;
    let depth = 10;
    let center: [number, number] = [0, 0];
    let maxSRadius = 500;

    if (eew.isSimulation) {
      elapsedSeconds = (now - (eew.simulationStartTime || now)) / 1000 + (eew.simulatedElapsed || 5);
    } else {
      const origin = parseJSTTime(eew.OriginTime || eew.AnnouncedTime);
      elapsedSeconds = (now - origin) / 1000;
    }

    depth = typeof eew.Depth === 'number' && eew.Depth > 0 ? eew.Depth : 10;
    center = [eew.Longitude || 0, eew.Latitude || 0];
    const mag = typeof eew.Magunitude === 'number' && eew.Magunitude > 0 ? eew.Magunitude : 6.0;

    if (mag < 4.5) maxSRadius = 300;
    else if (mag < 6.0) maxSRadius = 450;
    else if (mag < 7.0) maxSRadius = 600;
    else maxSRadius = 750;

    if (elapsedSeconds <= 0) {
      return {
        isActive: true,
        pWaveGeoJSON: emptyGeoJSON,
        sWaveGeoJSON: emptyGeoJSON,
        pFade: 0,
        sFade: 0
      };
    }

    let pRadius = 0;
    let sRadius = 0;

    if (Object.keys(this.seismicData).length > 0) {
      pRadius = this.getRadiusFromTjma(elapsedSeconds, depth, 'p');
      sRadius = this.getRadiusFromTjma(elapsedSeconds, depth, 's');
    }

    if (!pRadius || pRadius <= 0) {
      const pVelocity = 6.5;
      const pDistance = pVelocity * elapsedSeconds;
      pRadius = pDistance > depth ? Math.sqrt(pDistance * pDistance - depth * depth) : pDistance;
    }

    if (!sRadius || sRadius <= 0) {
      const sVelocity = 3.5;
      const sDistance = sVelocity * elapsedSeconds;
      sRadius = sDistance > depth ? Math.sqrt(sDistance * sDistance - depth * depth) : sDistance;
    }

    const maxPRadius = maxSRadius * 1.25;
    const pFade = Math.max(0, 1 - Math.pow(pRadius / maxPRadius, 2));
    const sFade = Math.max(0, 1 - Math.pow(sRadius / maxSRadius, 2));

    let pWaveGeoJSON: any = emptyGeoJSON;
    let sWaveGeoJSON: any = emptyGeoJSON;

    if (pRadius < maxPRadius && pFade > 0.01) {
      pWaveGeoJSON = createGeoJSONCircle(center, pRadius, 36);
    }
    if (sRadius < maxSRadius && sFade > 0.01) {
      sWaveGeoJSON = createGeoJSONCircle(center, sRadius, 36);
    }

    return {
      isActive: true,
      pWaveGeoJSON,
      sWaveGeoJSON,
      pFade,
      sFade
    };
  }
}
