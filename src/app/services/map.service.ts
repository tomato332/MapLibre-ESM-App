import { Injectable } from '@angular/core';

declare const mapboxgl: any;

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map: any = null;
  private stationMarker: any = null;

  getMap(): any {
    return this.map;
  }

  setMap(mapInstance: any) {
    this.map = mapInstance;
  }

  async initMap(container: HTMLElement, isDarkMode: boolean): Promise<any> {
    try {
      const maplibreModule = await new Function("return import('https://esm.sh/maplibre-gl@3')")();
      const { Map } = maplibreModule;

      const map = new Map({
        container,
        renderWorldCopies: false,
        style: {
          version: 8,
          sources: {
            world: {
              type: 'geojson',
              data: '/world.json'
            },
            japan: {
              type: 'geojson',
              data: '/japan.json'
            }
          },
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: {
                'background-color': isDarkMode ? '#18181b' : '#ffffff'
              }
            },
            {
              id: 'world-fill',
              type: 'fill',
              source: 'world',
              filter: ['!=', ['get', 'name'], 'Japan'],
              paint: {
                'fill-color': isDarkMode ? '#27272a' : '#e4e4e7'
              }
            },
            {
              id: 'world-outline',
              type: 'line',
              source: 'world',
              filter: ['!=', ['get', 'name'], 'Japan'],
              paint: {
                'line-color': isDarkMode ? '#3f3f46' : '#a1a1aa',
                'line-width': 0.5
              }
            },
            {
              id: 'japan-fill',
              type: 'fill',
              source: 'japan',
              paint: {
                'fill-color': isDarkMode ? '#27272a' : '#e4e4e7'
              }
            },
            {
              id: 'japan-outline',
              type: 'line',
              source: 'japan',
              paint: {
                'line-color': isDarkMode ? '#3f3f46' : '#a1a1aa',
                'line-width': 0.5
              }
            }
          ]
        },
        center: [137.5, 36.5],
        zoom: 4.5,
        attributionControl: false
      });

      this.map = map;
      return map;
    } catch (err) {
      console.warn('Failed to load maplibre-gl from esm.sh:', err);
      throw err;
    }
  }

  setupSourcesAndLayers(
    areaForecastGeoJSON: any,
    geojson: any,
    isDarkMode: boolean,
    onStationClick?: (feature: any) => void
  ) {
    if (!this.map) return;
    const mapInstance = this.map;

    mapInstance.addSource('area-forecast', {
      type: 'geojson',
      data: areaForecastGeoJSON || { type: 'FeatureCollection', features: [] }
    });

    mapInstance.addSource('points', {
      type: 'geojson',
      data: geojson
    });

    mapInstance.addSource('detected', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    mapInstance.addSource('p-wave', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    mapInstance.addSource('s-wave', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    mapInstance.addSource('p2p-epicenter', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    mapInstance.addSource('quake-stations', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
    mapInstance.addSource('est-shindo-mask-area', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    // Area forecast layers
    mapInstance.addLayer({
      id: 'area-forecast-fill',
      type: 'fill',
      source: 'area-forecast',
      paint: {
        'fill-color': ['coalesce', ['get', 'color'], 'transparent'],
        'fill-opacity': ['coalesce', ['get', 'opacity'], 0.75]
      }
    });

    mapInstance.addLayer({
      id: 'area-forecast-line',
      type: 'line',
      source: 'area-forecast',
      paint: {
        'line-color': isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
        'line-width': 0.7
      }
    });

    // EstShindo Mask area layers
    mapInstance.addLayer({
      id: 'est-shindo-mask-fill',
      type: 'fill',
      source: 'est-shindo-mask-area',
      paint: {
        'fill-color': ['coalesce', ['get', 'color'], 'transparent'],
        'fill-opacity': ['coalesce', ['get', 'opacity'], 0.75]
      }
    });

    mapInstance.addLayer({
      id: 'est-shindo-mask-line',
      type: 'line',
      source: 'est-shindo-mask-area',
      paint: {
        'line-color': isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
        'line-width': 0.7
      }
    });

    // P-Wave layers
    mapInstance.addLayer({
      id: 'p-wave-fill-layer',
      type: 'fill',
      source: 'p-wave',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.12
      }
    });

    mapInstance.addLayer({
      id: 'p-wave-layer',
      type: 'line',
      source: 'p-wave',
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2.5,
        'line-opacity': 0.85
      }
    });

    // S-Wave layers
    mapInstance.addLayer({
      id: 's-wave-fill-layer',
      type: 'fill',
      source: 's-wave',
      paint: {
        'fill-color': '#ef4444',
        'fill-opacity': 0.18
      }
    });

    mapInstance.addLayer({
      id: 's-wave-layer',
      type: 'line',
      source: 's-wave',
      paint: {
        'line-color': '#ef4444',
        'line-width': 2.5,
        'line-opacity': 0.9
      }
    });

    // Realtime points layer
    mapInstance.addLayer({
      id: 'points-layer',
      type: 'circle',
      source: 'points',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 3,
          8, 6,
          12, 10,
          16, 16
        ],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 0
      }
    });

    // Detected layer
    mapInstance.addLayer({
      id: 'detected-layer',
      type: 'line',
      source: 'detected',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3
      }
    });

    // Epicenter layers
    mapInstance.addLayer({
      id: 'p2p-epicenter-halo',
      type: 'circle',
      source: 'p2p-epicenter',
      paint: {
        'circle-radius': 18,
        'circle-color': '#dc2626',
        'circle-opacity': 0.45,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    mapInstance.addLayer({
      id: 'p2p-epicenter-layer',
      type: 'circle',
      source: 'p2p-epicenter',
      paint: {
        'circle-radius': 7,
        'circle-color': '#ef4444',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Quake station intensity layers
    mapInstance.addLayer({
      id: 'quake-stations-halo',
      type: 'circle',
      source: 'quake-stations',
      filter: ['>=', ['get', 'scale'], 40],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 8, 8, 14, 12, 20],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.35,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff'
      }
    });

    mapInstance.addLayer({
      id: 'quake-stations-circle',
      type: 'circle',
      source: 'quake-stations',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 8, 7, 12, 10],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff'
      }
    });

    mapInstance.on('click', 'quake-stations-circle', (e: any) => {
      if (!e.features || e.features.length === 0) return;
      const feat = e.features[0];
      const props = feat.properties;
      const coords = feat.geometry.coordinates.slice();

      if (onStationClick) {
        onStationClick(feat);
      } else if (typeof mapboxgl !== 'undefined') {
        new mapboxgl.Popup({ closeButton: true, className: 'station-popup' })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: sans-serif; padding: 4px; font-size: 12px; color: #1f2937;">
              <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span>📍 ${props.pref || ''} ${props.name}</span>
                <span style="background-color: ${props.color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">진도 ${props.jindoStr}</span>
              </div>
              <div style="color: #6b7280; font-size: 11px; line-height: 1.4;">
                <div>소속: <strong>${props.affi || '기상청'}</strong></div>
                <div>위도/경도: ${Number(props.lat)?.toFixed(2)}°, ${Number(props.lon)?.toFixed(2)}°</div>
              </div>
            </div>
          `)
          .addTo(mapInstance);
      }
    });

    mapInstance.on('mouseenter', 'quake-stations-circle', () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    });
    mapInstance.on('mouseleave', 'quake-stations-circle', () => {
      mapInstance.getCanvas().style.cursor = '';
    });
  }

  setSourceData(sourceId: string, data: any) {
    if (!this.map) return;
    const source = this.map.getSource(sourceId);
    if (source) {
      source.setData(data);
    }
  }

  updateMapTheme(isDark: boolean) {
    if (!this.map) return;
    this.map.setPaintProperty('background', 'background-color', isDark ? '#18181b' : '#ffffff');
    this.map.setPaintProperty('world-fill', 'fill-color', isDark ? '#27272a' : '#e4e4e7');
    this.map.setPaintProperty('world-outline', 'line-color', isDark ? '#3f3f46' : '#a1a1aa');
    this.map.setPaintProperty('japan-fill', 'fill-color', isDark ? '#27272a' : '#e4e4e7');
    this.map.setPaintProperty('japan-outline', 'line-color', isDark ? '#3f3f46' : '#a1a1aa');
    if (this.map.getLayer('area-forecast-line')) {
      this.map.setPaintProperty('area-forecast-line', 'line-color', isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)');
    }
    if (this.map.getLayer('est-shindo-mask-line')) {
      this.map.setPaintProperty('est-shindo-mask-line', 'line-color', isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)');
    }
  }

  updateLayerVisibility(
    currentTab: 'realtime' | 'earthquake' | 'est_shindo_region',
    intensityDisplayMode: 'areas' | 'stations' | 'both',
    showWaveRings: boolean,
    isEewActive: boolean,
    hasEstEpi: boolean,
    hasDetectedGrids: boolean
  ) {
    if (!this.map) return;
    const isEarthquakeTab = currentTab === 'earthquake';
    const isEstShindoTab = currentTab === 'est_shindo_region';

    // 1. Area forecast layers
    const showAreas = isEarthquakeTab && (intensityDisplayMode === 'areas' || intensityDisplayMode === 'both');
    const eqVis = showAreas ? 'visible' : 'none';
    const eqLayers = ['area-forecast-fill', 'area-forecast-line'];
    for (const id of eqLayers) {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, 'visibility', eqVis);
      }
    }

    // 2. EstShindo Mask layers
    const estShindoVis = isEstShindoTab ? 'visible' : 'none';
    if (this.map.getLayer('est-shindo-mask-fill')) {
      this.map.setLayoutProperty('est-shindo-mask-fill', 'visibility', estShindoVis);
    }
    if (this.map.getLayer('est-shindo-mask-line')) {
      this.map.setLayoutProperty('est-shindo-mask-line', 'visibility', estShindoVis);
    }

    // 3. Points layer
    if (this.map.getLayer('points-layer')) {
      this.map.setLayoutProperty('points-layer', 'visibility', isEarthquakeTab ? 'none' : 'visible');
      if (isEstShindoTab) {
        this.map.setPaintProperty('points-layer', 'circle-opacity', 0.1);
      } else {
        this.map.setPaintProperty('points-layer', 'circle-opacity', 1.0);
      }
    }

    // 4. Detected layer
    const detectedVis = (!isEarthquakeTab || hasDetectedGrids) ? 'visible' : 'none';
    if (this.map.getLayer('detected-layer')) {
      this.map.setLayoutProperty('detected-layer', 'visibility', detectedVis);
    }

    // 5. P/S Wave layers
    const waveVis = (showWaveRings && (!isEarthquakeTab || isEewActive || hasEstEpi)) ? 'visible' : 'none';
    const waveLayers = ['p-wave-fill-layer', 'p-wave-layer', 's-wave-fill-layer', 's-wave-layer'];
    for (const id of waveLayers) {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, 'visibility', waveVis);
      }
    }

    // 6. Epicenter layers
    const epiVis = (isEarthquakeTab || isEewActive || hasEstEpi) ? 'visible' : 'none';
    const epicenterLayers = ['p2p-epicenter-halo', 'p2p-epicenter-layer'];
    for (const id of epicenterLayers) {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, 'visibility', epiVis);
      }
    }

    // 7. Station intensity layers
    const showStations = isEarthquakeTab && (intensityDisplayMode === 'stations' || intensityDisplayMode === 'both');
    const stationVis = showStations ? 'visible' : 'none';
    const quakeStationLayers = ['quake-stations-halo', 'quake-stations-circle'];
    for (const id of quakeStationLayers) {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, 'visibility', stationVis);
      }
    }
  }

  updateWaveLayers(waveState: any) {
    if (!this.map) return;
    if (!waveState.isActive) {
      const emptyGeoJSON = { type: 'FeatureCollection', features: [] };
      if (this.map.getSource('p-wave')) {
        this.map.getSource('p-wave').setData(emptyGeoJSON);
      }
      if (this.map.getSource('s-wave')) {
        this.map.getSource('s-wave').setData(emptyGeoJSON);
      }
      return;
    }

    if (this.map.getLayer('p-wave-fill-layer')) {
      this.map.setPaintProperty('p-wave-fill-layer', 'fill-opacity', 0.12 * waveState.pFade);
      this.map.setPaintProperty('p-wave-layer', 'line-opacity', 0.85 * waveState.pFade);
    }
    if (this.map.getLayer('s-wave-fill-layer')) {
      this.map.setPaintProperty('s-wave-fill-layer', 'fill-opacity', 0.18 * waveState.sFade);
      this.map.setPaintProperty('s-wave-layer', 'line-opacity', 0.9 * waveState.sFade);
    }
    if (this.map.getSource('p-wave')) {
      this.map.getSource('p-wave').setData(waveState.pWaveGeoJSON);
    }
    if (this.map.getSource('s-wave')) {
      this.map.getSource('s-wave').setData(waveState.sWaveGeoJSON);
    }
  }

  blinkDetectedLayer(isVisible: boolean) {
    if (this.map && this.map.getLayer('detected-layer')) {
      this.map.setPaintProperty('detected-layer', 'line-opacity', isVisible ? 1 : 0.2);
    }
  }

  focusOnDetectedGrid(activeStations: any[]) {
    if (!this.map || activeStations.length === 0) return;
    let totalLon = 0;
    let totalLat = 0;
    let minLon = 180,
      maxLon = -180,
      minLat = 90,
      maxLat = -90;

    for (const stn of activeStations) {
      const [lon, lat] = stn.lonlat;
      totalLon += lon;
      totalLat += lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    if (activeStations.length === 1 || (maxLon - minLon < 0.2 && maxLat - minLat < 0.2)) {
      this.map.flyTo({
        center: [totalLon / activeStations.length, totalLat / activeStations.length],
        zoom: 7.5,
        speed: 1.2
      });
    } else {
      this.map.fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat]
        ],
        {
          padding: 80,
          maxZoom: 6.5,
          duration: 1000
        }
      );
    }
  }

  resetMapView() {
    if (this.map) {
      this.map.flyTo({
        center: [137.5, 36.5],
        zoom: 4.5,
        duration: 800
      });
    }
  }

  flyTo(options: any) {
    if (this.map) {
      this.map.flyTo(options);
    }
  }

  fitBounds(bounds: [[number, number], [number, number]], options: any = {}) {
    if (this.map) {
      this.map.fitBounds(bounds, options);
    }
  }

  highlightStation(st: { lat: number; lon: number; name: string; pref?: string; scale?: number }, jindoStr: string, color: string) {
    if (!this.map || !st) return;
    this.map.flyTo({
      center: [st.lon, st.lat],
      zoom: 10.5,
      speed: 1.2,
      essential: true
    });

    if (this.stationMarker) {
      this.stationMarker.remove();
      this.stationMarker = null;
    }

    if (typeof mapboxgl !== 'undefined') {
      const el = document.createElement('div');
      el.className = 'station-highlight-marker';
      el.innerHTML = `
        <div class="relative flex items-center justify-center pointer-events-none">
          <span class="animate-ping absolute inline-flex h-12 w-12 rounded-full opacity-75" style="background-color: ${color}"></span>
          <span class="relative inline-flex rounded-full px-3 py-1 border-2 border-white shadow-2xl items-center justify-center text-xs font-black text-white" style="background-color: ${color}">
            📍 ${st.pref ? st.pref + ' ' : ''}${st.name} (진도 ${jindoStr})
          </span>
        </div>
      `;

      this.stationMarker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([st.lon, st.lat])
        .addTo(this.map);

      setTimeout(() => {
        if (this.stationMarker) {
          this.stationMarker.remove();
          this.stationMarker = null;
        }
      }, 7000);
    }
  }
}
