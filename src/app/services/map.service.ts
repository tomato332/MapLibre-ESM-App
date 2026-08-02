import { Injectable } from '@angular/core';

declare const mapboxgl: any;

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map: any = null;
  private p2pEpicenterMarker: any = null;

  initMap(container: HTMLElement, isDarkMode: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        mapboxgl.accessToken = 'pk.eyJ1Ijoic2VhbjEwMDExMDAxMCIsImEiOiJjbTlsNmhpcmowNDdmMmpxdXN0MzY2ZWQ3In0.Jk_o_Lw6130C-pC4x1b4BA';

        this.map = new mapboxgl.Map({
          container: container,
          style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
          center: [138.2529, 36.2048],
          zoom: 4.8,
          pitch: 0,
          bearing: 0
        });

        this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

        this.map.on('load', () => {
          resolve(this.map);
        });

        this.map.on('error', (e: any) => {
          console.error('Mapbox error:', e);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  getMap(): any {
    return this.map;
  }

  setDarkModeStyle(isDarkMode: boolean) {
    if (!this.map) return;
    this.map.setStyle(isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');
  }

  resetMapView() {
    if (!this.map) return;
    this.map.flyTo({
      center: [138.2529, 36.2048],
      zoom: 4.8,
      pitch: 0,
      bearing: 0,
      speed: 1.2
    });
  }

  flyTo(center: [number, number], zoom = 6.2, speed = 1.2) {
    if (!this.map) return;
    this.map.flyTo({ center, zoom, speed });
  }

  fitBounds(bounds: [[number, number], [number, number]], options: any = {}) {
    if (!this.map) return;
    this.map.fitBounds(bounds, options);
  }

  updateP2pEpicenterMarker(coords: [number, number] | null, _name?: string) {
    if (!this.map) return;

    if (!coords) {
      if (this.p2pEpicenterMarker) {
        this.p2pEpicenterMarker.remove();
        this.p2pEpicenterMarker = null;
      }
      return;
    }

    if (this.p2pEpicenterMarker) {
      this.p2pEpicenterMarker.setLngLat(coords);
    } else {
      const el = document.createElement('div');
      el.className = 'p2p-epicenter-marker';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-rose-500 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-6 w-6 bg-rose-600 border-2 border-white shadow-lg items-center justify-center text-[10px] font-black text-white">✕</span>
        </div>
      `;
      this.p2pEpicenterMarker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coords)
        .addTo(this.map);
    }
  }

  removeEpicenterMarker() {
    if (this.p2pEpicenterMarker) {
      this.p2pEpicenterMarker.remove();
      this.p2pEpicenterMarker = null;
    }
  }
}
