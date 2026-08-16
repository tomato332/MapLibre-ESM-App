import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { NoiseFilterService } from './noise-filter.service';
import { getJindoFromColor, getJindoString } from '../utils/jma.utils';
import { haversineDistance } from '../utils/geo-math.utils';

export interface StationData {
  code: string;
  lonlat: [number, number];
  jindo: number | null;
  near: StationData[];
  delta: number[];
  deltaSum: number;
  event: any | null;
  expireTime: number | null;
  color: string;
  rawJindoHistory?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class QuakeDetectService {
  private noiseFilter = inject(NoiseFilterService);

  stationsState = new Map<string, StationData>();
  geojson: any = null;
  detectEnabled = false;

  latestTime: WritableSignal<string> = signal('');
  currentGifUrl: WritableSignal<string> = signal('');
  acmapGifUrl: WritableSignal<string> = signal('');
  estshindoGifUrl: WritableSignal<string> = signal('');
  realtimeDataType: WritableSignal<'jma_s' | 'jma_b'> = signal('jma_s');
  hasDetectedGrids: WritableSignal<boolean> = signal(false);

  estEpi: [number, number] | null = null;
  estOrigin: number | null = null;

  setRealtimeDataType(type: 'jma_s' | 'jma_b') {
    this.realtimeDataType.set(type);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('realtime_data_type', type);
      } catch {
        // ignore
      }
    }
  }

  initStations(points: any[]): any {
    const stnArray: StationData[] = [];
    const features = points
      .filter((p: any) => p.Location && !p.IsSuspended && p.Point)
      .map((p: any) => {
        const lon = p.Location.longitude;
        const lat = p.Location.latitude;
        const stn: StationData = {
          code: p.Code,
          lonlat: [lon, lat],
          jindo: null,
          near: [],
          delta: [],
          deltaSum: 0,
          event: null,
          expireTime: null,
          color: 'transparent'
        };
        this.stationsState.set(p.Code, stn);
        stnArray.push(stn);

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          properties: {
            name: p.Name,
            code: p.Code,
            region: p.Region,
            px: p.Point.x,
            py: p.Point.y,
            color: 'transparent'
          }
        };
      });

    // Calculate neighbors (adaptive 20km~30km for rural & island stations)
    for (let i = 0; i < stnArray.length; i++) {
      const nearDists: { stn: StationData; dist: number }[] = [];
      for (let j = 0; j < stnArray.length; j++) {
        if (i === j) continue;
        const lon1 = stnArray[i].lonlat[0];
        const lat1 = stnArray[i].lonlat[1];
        const lon2 = stnArray[j].lonlat[0];
        const lat2 = stnArray[j].lonlat[1];

        const dist = haversineDistance(lon1, lat1, lon2, lat2);

        if (dist <= 30) {
          nearDists.push({ stn: stnArray[j], dist });
        }
      }
      nearDists.sort((a, b) => a.dist - b.dist);
      stnArray[i].near = nearDists.filter((item, idx) => item.dist <= 20 || idx < 3).map((item) => item.stn);
    }

    this.geojson = {
      type: 'FeatureCollection',
      features
    };

    return this.geojson;
  }

  async fetchTime(onImageTimeReady?: (timeStr: string) => void) {
    try {
      const response = await fetch('/api/latest-time');
      if (response.ok) {
        const text = await response.text();
        const trimmed = text ? text.trim() : '';
        if (trimmed && trimmed.startsWith('{')) {
          try {
            const data = JSON.parse(trimmed);
            if (data && data.latest_time) {
              this.latestTime.set(data.latest_time);

              // 강진 모니터 데이터 지연 대응: 타임스탬프에서 2초를 뺍니다.
              const dateObj = new Date(data.latest_time.replace(/\//g, '-'));
              dateObj.setSeconds(dateObj.getSeconds() - 2);

              const pad = (n: number) => n.toString().padStart(2, '0');
              const timeStr = `${dateObj.getFullYear()}${pad(dateObj.getMonth() + 1)}${pad(dateObj.getDate())}${pad(dateObj.getHours())}${pad(dateObj.getMinutes())}${pad(dateObj.getSeconds())}`;

              if (onImageTimeReady) {
                onImageTimeReady(timeStr);
              } else {
                this.fetchAndProcessImage(timeStr);
              }
            }
          } catch {
            // Ignore malformed JSON gracefully
          }
        }
      }
    } catch {
      // Ignore network errors gracefully
    }
  }

  fetchAndProcessImage(
    time: string,
    callbacks?: {
      onPointsUpdated?: (geojson: any) => void;
      onDetectedUpdated?: (detectedGeojson: any) => void;
      onNewEventDetected?: (center: [number, number]) => void;
      onSoundTriggered?: (jindo: number, jindoStr: string) => void;
      onEstShindoMask?: () => void;
    }
  ) {
    if (!this.geojson) return;

    const dataType = this.realtimeDataType();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `/api/realtime-img?time=${time}&type=${dataType}`;
    this.currentGifUrl.set(img.src);
    this.acmapGifUrl.set(`/api/acmap-img?time=${time}&type=${dataType}`);
    this.estshindoGifUrl.set(`/api/estshindo-img?time=${time}`);

    if (callbacks?.onEstShindoMask) {
      callbacks.onEstShindoMask();
    }

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const imageData = imgDataObj.data;

      let updated = false;
      let detectedUpdated = false;
      let newEventDetected = false;
      let detectedCenter: [number, number] | null = null;

      for (const feature of this.geojson.features) {
        const px = feature.properties.px;
        const py = feature.properties.py;
        if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
          const idx = (py * canvas.width + px) * 4;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];
          const a = imageData[idx + 3];

          let newColor = 'transparent';
          let jindo: number | null = null;
          if (a > 0) {
            newColor = `rgba(${r},${g},${b},${a / 255})`;
            jindo = getJindoFromColor(r, g, b);
          }
          if (feature.properties.color !== newColor) {
            feature.properties.color = newColor;
            updated = true;
          }

          if (this.detectEnabled) {
            const stn = this.stationsState.get(feature.properties.code);
            if (stn) {
              stn.color = newColor;
              if (jindo !== null) {
                const filteredJindo = this.noiseFilter.applyMedianFilter(stn, jindo);

                let delta = 0;
                if (stn.jindo !== null) {
                  delta = filteredJindo - stn.jindo;
                }
                stn.jindo = filteredJindo;
                stn.delta.unshift(delta);
                if (stn.delta.length > 10) stn.delta.pop();

                stn.deltaSum = stn.delta.reduce((acc: number, val: number) => acc + val, 0);
              } else {
                stn.jindo = null;
                stn.delta = [];
                stn.deltaSum = 0;
              }
            }
          }
        }
      }

      if (this.detectEnabled) {
        const stations = Array.from(this.stationsState.values());

        const getLevel = (jVal: number | null) => {
          if (jVal === null) return 0;
          if (jVal < -1.0) return 1;
          if (jVal < 1.0) return 2;
          if (jVal < 3.0) return 3;
          if (jVal < 4.5) return 4;
          return 5;
        };

        const nowTick = Date.now();
        let soundJindoToPlay = -3;

        for (const stn of stations) {
          const isIsland = stn.near.length === 0;
          const isAnomaly = !stn.event && stn.deltaSum < 0.8 && stn.jindo !== null && stn.jindo >= (isIsland ? 4.5 : 3.0);

          if (isAnomaly) continue;

          if (stn.deltaSum > 1.2) {
            const u = stn.near;
            let targetEvent = stn.event;

            if (!targetEvent) {
              const neighborWithEvent = u.find((r: any) => r.event);
              if (neighborWithEvent) {
                targetEvent = neighborWithEvent.event;
              } else {
                let rCount = 0;
                for (const neighbor of u) {
                  if (neighbor.deltaSum > 0.8) rCount++;
                }

                const isIslandAndStrong = isIsland && stn.jindo !== null && stn.jindo >= 4.2;
                const neighborRatio = u.length > 0 ? rCount / u.length : 0;
                const hasEnoughNeighbors = u.length > 0 && (rCount >= 2 || rCount === u.length) && neighborRatio >= 0.6;
                const isFelt = stn.jindo !== null && stn.jindo >= -0.5;

                if (isFelt && (isIslandAndStrong || hasEnoughNeighbors)) {
                  targetEvent = {
                    id: Math.random(),
                    startTime: nowTick,
                    maxLevel: 0
                  };
                  newEventDetected = true;
                  detectedCenter = stn.lonlat;
                }
              }
            } else {
              const otherEventStn = u.find((r: any) => r.event && r.event.id !== targetEvent.id);
              if (otherEventStn && otherEventStn.event.startTime < targetEvent.startTime) {
                targetEvent = otherEventStn.event;
              }
            }

            if (targetEvent) {
              stn.event = targetEvent;

              const currentLevel = getLevel(stn.jindo);
              if (currentLevel > targetEvent.maxLevel) {
                targetEvent.maxLevel = currentLevel;
                if (stn.jindo !== null && stn.jindo > soundJindoToPlay) {
                  soundJindoToPlay = stn.jindo;
                }
              }

              stn.expireTime = Date.now() + 10000;
              detectedUpdated = true;
            }
          } else if (stn.event && stn.jindo !== null && stn.jindo >= -0.5) {
            const currentLevel = getLevel(stn.jindo);
            if (currentLevel > stn.event.maxLevel) {
              stn.event.maxLevel = currentLevel;
              if (stn.jindo !== null && stn.jindo > soundJindoToPlay) {
                soundJindoToPlay = stn.jindo;
              }
            }

            stn.expireTime = Date.now() + 10000;
            detectedUpdated = true;
          }
        }

        if (soundJindoToPlay > -3 && callbacks?.onSoundTriggered) {
          callbacks.onSoundTriggered(soundJindoToPlay, getJindoString(soundJindoToPlay) || `${soundJindoToPlay}`);
        }
      }

      if (newEventDetected && callbacks?.onNewEventDetected) {
        const newlyTriggered = Array.from(this.stationsState.values()).filter((s) => s.event !== null);
        if (newlyTriggered.length > 0) {
          const sumLon = newlyTriggered.reduce((acc, s) => acc + s.lonlat[0], 0);
          const sumLat = newlyTriggered.reduce((acc, s) => acc + s.lonlat[1], 0);
          detectedCenter = [sumLon / newlyTriggered.length, sumLat / newlyTriggered.length];
        }
        if (detectedCenter) {
          callbacks.onNewEventDetected(detectedCenter);
        }
      }

      if (updated && callbacks?.onPointsUpdated) {
        callbacks.onPointsUpdated(this.geojson);
      }

      if (detectedUpdated) {
        this.updateDetectedEvents(callbacks?.onDetectedUpdated);
      }
    };
  }

  updateDetectedEvents(onGeoJSONUpdated?: (geojson: any) => void): any {
    const originLon = 120;
    const originLat = 20;
    const latStep = 90 / 111.32; // ~0.808 deg per ~90km

    const activeGrids = new Map<string, { color: string; maxJindo: number; gridX: number; gridY: number }>();

    for (const stn of this.stationsState.values()) {
      if (stn.event) {
        const lat = stn.lonlat[1];
        const lon = stn.lonlat[0];
        const gridY = Math.floor((lat - originLat) / latStep);
        const cellLat = originLat + (gridY + 0.5) * latStep;
        const lonStepAtLat = 90 / (111.32 * Math.cos((cellLat * Math.PI) / 180));
        const gridX = Math.floor((lon - originLon) / lonStepAtLat);
        const cellId = `${gridX}-${gridY}`;

        const current = activeGrids.get(cellId);
        const stnJindo = stn.jindo !== null ? stn.jindo : -3;

        if (!current || stnJindo > current.maxJindo) {
          activeGrids.set(cellId, { color: stn.color, maxJindo: stnJindo, gridX, gridY });
        }
      }
    }

    const detectedFeatures: any[] = [];
    for (const [, data] of activeGrids.entries()) {
      const { gridX, gridY } = data;
      const minLat = originLat + gridY * latStep;
      const maxLat = originLat + (gridY + 1) * latStep;
      const cellLat = originLat + (gridY + 0.5) * latStep;
      const lonStepAtLat = 90 / (111.32 * Math.cos((cellLat * Math.PI) / 180));
      const minLon = originLon + gridX * lonStepAtLat;
      const maxLon = originLon + (gridX + 1) * lonStepAtLat;

      detectedFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [minLon, minLat],
              [maxLon, minLat],
              [maxLon, maxLat],
              [minLon, maxLat],
              [minLon, minLat]
            ]
          ]
        },
        properties: {
          color: data.color
        }
      });
    }

    const detectedGeojson = {
      type: 'FeatureCollection',
      features: detectedFeatures
    };

    if (onGeoJSONUpdated) {
      onGeoJSONUpdated(detectedGeojson);
    }

    this.estEpi = null;
    this.estOrigin = null;

    this.hasDetectedGrids.set(activeGrids.size > 0);
    this.saveDetectedEventsToStorage();

    return detectedGeojson;
  }

  saveDetectedEventsToStorage() {
    if (typeof localStorage === 'undefined') return;
    const activeStations: any[] = [];
    const now = Date.now();
    for (const stn of this.stationsState.values()) {
      if (stn.event) {
        activeStations.push({
          code: stn.code,
          jindo: stn.jindo,
          color: stn.color,
          event: stn.event
        });
      }
    }

    if (activeStations.length > 0) {
      localStorage.setItem(
        'eq_detected_stations',
        JSON.stringify({
          timestamp: now,
          stations: activeStations
        })
      );
    } else {
      localStorage.removeItem('eq_detected_stations');
    }
  }

  loadSavedDetectedEvents(onDetectedUpdated?: (detectedGeojson: any) => void, onRestoredFocus?: () => void) {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('eq_detected_stations');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !data.timestamp || !Array.isArray(data.stations)) return;

      const now = Date.now();
      const elapsed = now - data.timestamp;
      if (elapsed > 300000) {
        localStorage.removeItem('eq_detected_stations');
        return;
      }

      const remainingTimeout = Math.max(3000, 15000 - elapsed);
      let restoredAny = false;
      let restoredCount = 0;

      for (const saved of data.stations) {
        const stn = this.stationsState.get(saved.code);
        if (stn) {
          stn.jindo = saved.jindo;
          stn.color = saved.color || '#f59e0b';
          stn.event = saved.event;
          restoredAny = true;

          if (stn.lonlat) {
            restoredCount++;
          }

          stn.expireTime = Date.now() + remainingTimeout;
        }
      }

      if (restoredAny) {
        this.updateDetectedEvents(onDetectedUpdated);
        if (restoredCount > 0 && onRestoredFocus) {
          onRestoredFocus();
        }
      }
    } catch (e) {
      console.warn('Failed to load saved detected events', e);
    }
  }

  checkExpirationTick(now: number): { expired: boolean; hasActiveEvents: boolean } {
    let expired = false;
    for (const stn of this.stationsState.values()) {
      if (stn.event && stn.expireTime && now >= stn.expireTime) {
        stn.event = null;
        stn.expireTime = null;
        expired = true;
      }
    }

    const hasActiveEvents = Array.from(this.stationsState.values()).some((s) => s.event !== null);
    if (expired && !hasActiveEvents) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('eq_detected_stations');
      }
    }

    return { expired, hasActiveEvents };
  }
}
