import { Injectable, signal, WritableSignal } from '@angular/core';
import { getIntensityColor, getJindoString } from '../utils/jma.utils';
import { isActiveEEW } from '../utils/geo-math.utils';

@Injectable({
  providedIn: 'root'
})
export class QuakeDataService {
  areaForecastGeoJSON: any = null;
  stationToAreaCode = new Map<string, string>();
  areaNameToCode = new Map<string, string>();
  stationMap: WritableSignal<Map<string, any>> = signal(new Map());

  async loadAreaAndStationData(): Promise<{ areaForecastGeoJSON: any; stationMap: Map<string, any> }> {
    try {
      const [areaRes, stationRes] = await Promise.all([
        fetch('/area_forecast.json'),
        fetch('/JMAstations.json')
      ]);
      this.areaForecastGeoJSON = await areaRes.json();
      const stations = await stationRes.json();
      const stMap = new Map<string, any>();

      if (Array.isArray(stations)) {
        for (const st of stations) {
          if (st.lat && st.lon) {
            const info = {
              code: st.code,
              name: st.name,
              pref: st.pref?.name,
              city: st.city?.name,
              area: st.area?.name,
              lat: parseFloat(st.lat),
              lon: parseFloat(st.lon),
              affi: st.affi
            };
            if (st.name) stMap.set(st.name, info);
            if (st.pref?.name && st.name) {
              stMap.set(st.pref.name + st.name, info);
            }
          }

          if (st.area?.code) {
            if (st.name) this.stationToAreaCode.set(st.name, st.area.code);
            if (st.city?.name) this.stationToAreaCode.set(st.city.name, st.area.code);
            if (st.area.name) this.areaNameToCode.set(st.area.name, st.area.code);
            if (st.pref?.name && st.area?.name) {
              this.areaNameToCode.set(st.pref.name + st.area.name, st.area.code);
            }
            if (st.pref?.name && st.city?.name) {
              this.stationToAreaCode.set(st.pref.name + st.city.name, st.area.code);
            }
          }
        }
      }
      this.stationMap.set(stMap);

      if (this.areaForecastGeoJSON?.features) {
        for (const f of this.areaForecastGeoJSON.features) {
          if (f.properties?.name && f.properties?.code) {
            this.areaNameToCode.set(f.properties.name, f.properties.code);
          }
        }
      }

      return {
        areaForecastGeoJSON: this.areaForecastGeoJSON,
        stationMap: stMap
      };
    } catch (e) {
      console.warn('Failed to load area forecast or station data:', e);
      return {
        areaForecastGeoJSON: this.areaForecastGeoJSON,
        stationMap: this.stationMap()
      };
    }
  }

  buildAreaIntensityGeoJSON(quakeData: any, isEarthquakeTab: boolean): { areaForecastGeoJSON: any; stationFeatures: any[] } {
    if (!this.areaForecastGeoJSON) {
      return { areaForecastGeoJSON: null, stationFeatures: [] };
    }

    const points = quakeData?.points || quakeData?.earthquake?.points;
    const areas = quakeData?.areas;
    const areaScaleMap = new Map<string, number>();

    const norm = (s: string) => (s ? s.replace(/県|府|都|道| /g, '') : '');

    // 1. 관측지점 기반 진도 (P2PQuake 551 등)
    if (Array.isArray(points) && points.length > 0) {
      for (const p of points) {
        if (!p || typeof p.scale !== 'number' || p.scale < 10) continue;
        const addr = p.addr;
        if (!addr) continue;

        let code = this.areaNameToCode.get(addr) || this.stationToAreaCode.get(addr);
        if (!code) {
          const normAddr = norm(addr);
          for (const [aName, aCode] of this.areaNameToCode.entries()) {
            if (norm(aName) === normAddr || normAddr.includes(norm(aName)) || norm(aName).includes(normAddr)) {
              code = aCode;
              break;
            }
          }
        }

        if (code) {
          const prev = areaScaleMap.get(code) || 0;
          if (p.scale > prev) {
            areaScaleMap.set(code, p.scale);
          }
        }
      }
    }

    // 2. EEW / 긴급지진속보 예보구역 기반 예상 진도 (P2PQuake 556 등)
    if (Array.isArray(areas) && areas.length > 0) {
      for (const a of areas) {
        const scale = a.scaleFrom || a.scaleTo || a.scale || 0;
        if (scale < 10) continue;

        const areaName = a.name || a.prefName;
        if (!areaName) continue;

        let code = this.areaNameToCode.get(areaName) || this.stationToAreaCode.get(areaName);
        if (!code) {
          const normAddr = norm(areaName);
          for (const [aName, aCode] of this.areaNameToCode.entries()) {
            if (norm(aName) === normAddr || normAddr.includes(norm(aName)) || norm(aName).includes(normAddr)) {
              code = aCode;
              break;
            }
          }
        }

        if (code) {
          const prev = areaScaleMap.get(code) || 0;
          if (scale > prev) {
            areaScaleMap.set(code, scale);
          }
        }
      }
    }

    for (const f of this.areaForecastGeoJSON.features) {
      const code = f.properties?.code;
      const scale = areaScaleMap.get(code);
      if (scale && scale >= 10) {
        f.properties.color = getIntensityColor(scale);
        f.properties.opacity = isEarthquakeTab ? 0.88 : 0.65;
      } else {
        f.properties.color = 'transparent';
        f.properties.opacity = 0;
      }
    }

    // 3. 관측소 개별 지점 마커 피처 목록 생성
    const stationFeatures: any[] = [];
    const stMap = this.stationMap();
    if (Array.isArray(points) && points.length > 0 && stMap.size > 0) {
      for (const pt of points) {
        if (!pt || typeof pt.scale !== 'number' || pt.scale < 10) continue;
        const key = (pt.pref || '') + pt.addr;
        const st = stMap.get(key) || stMap.get(pt.addr);
        if (st) {
          stationFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [st.lon, st.lat] },
            properties: {
              name: pt.addr,
              pref: pt.pref || st.pref || '',
              scale: pt.scale,
              jindoStr: getJindoString(pt.scale),
              color: getIntensityColor(pt.scale),
              affi: st.affi || '기상청',
              lat: st.lat,
              lon: st.lon
            }
          });
        }
      }
    }

    return {
      areaForecastGeoJSON: {
        type: 'FeatureCollection',
        features: [...this.areaForecastGeoJSON.features]
      },
      stationFeatures
    };
  }

  buildEpicenterGeoJSON(
    targetData?: any,
    eewData?: any,
    isRealtimeTab?: boolean,
    estEpi?: [number, number] | null
  ): any {
    const geojson: any = { type: 'FeatureCollection', features: [] };

    if (
      eewData &&
      isActiveEEW(eewData) &&
      typeof eewData.Longitude === 'number' &&
      typeof eewData.Latitude === 'number' &&
      eewData.Longitude !== 0 &&
      eewData.Latitude !== 0
    ) {
      geojson.features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [eewData.Longitude, eewData.Latitude]
        },
        properties: { isEEW: true }
      });
    } else if (isRealtimeTab) {
      if (estEpi !== null && Array.isArray(estEpi) && estEpi.length === 2) {
        geojson.features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: estEpi
          },
          properties: { isEst: true }
        });
      }
    } else if (targetData) {
      let lon: number | null = null;
      let lat: number | null = null;

      if (targetData.earthquake?.hypocenter) {
        lon = targetData.earthquake.hypocenter.longitude;
        lat = targetData.earthquake.hypocenter.latitude;
      } else if (typeof targetData.Longitude === 'number' && typeof targetData.Latitude === 'number') {
        lon = targetData.Longitude;
        lat = targetData.Latitude;
      } else if (typeof targetData.longitude === 'number' && typeof targetData.latitude === 'number') {
        lon = targetData.longitude;
        lat = targetData.latitude;
      }

      if (
        lon !== null &&
        lat !== null &&
        typeof lon === 'number' &&
        typeof lat === 'number' &&
        lon > 0 &&
        lat > 0 &&
        lon >= 120 &&
        lon <= 155 &&
        lat >= 20 &&
        lat <= 55
      ) {
        geojson.features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          properties: {}
        });
      }
    }

    return geojson;
  }
}
