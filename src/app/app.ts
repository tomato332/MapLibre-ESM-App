import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, WritableSignal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NoiseFilterService } from './services/noise-filter.service';
import { SoundService } from './services/sound.service';
import { P2pQuakeService } from './services/p2p-quake.service';
import { WolfxEewService } from './services/wolfx-eew.service';
import { MapService } from './services/map.service';
import { EstShindoMaskService } from './services/est-shindo-mask.service';
import { NotificationService } from './services/notification.service';
import { getJindoBadgeStyle, getTsunamiText, getJindoString, getIntensityColor, getJindoFromColor } from './utils/jma.utils';

import { HeaderNavComponent } from './components/header-nav';
import { EewBannerComponent } from './components/eew-banner';
import { QuakeDetailPanelComponent } from './components/quake-detail-panel';
import { HistoryDrawerComponent } from './components/history-drawer';
import { GifViewPanelComponent } from './components/gif-view-panel';
import { ControlsPanelComponent } from './components/controls-panel';

declare const mapboxgl: any;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    HeaderNavComponent,
    EewBannerComponent,
    QuakeDetailPanelComponent,
    HistoryDrawerComponent,
    GifViewPanelComponent,
    ControlsPanelComponent
  ],
  template: `
    <div [class]="'relative w-full h-screen overflow-hidden transition-colors duration-300 ' + (isDarkMode() ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-zinc-800')">
      <div #mapContainer class="w-full h-full"></div>

      <!-- Header Nav -->
      <app-header-nav
        [activeTab]="activeTab()"
        [p2pHistoryCount]="p2pHistoryList().length"
        [latestTime]="latestTime()"
        [isDarkMode]="isDarkMode()"
        [notificationPermission]="notificationService.permission()"
        [notificationEnabled]="notificationService.isEnabled()"
        (tabChange)="setTab($event)"
        (toggleHistory)="isHistoryOpen.set(!isHistoryOpen())"
        (toggleNotification)="toggleNotification()">
      </app-header-nav>

      <!-- EEW Display -->
      @if (eewData(); as eew) {
        @if (isActiveEEW(eew) && !isEewDismissed()) {
          <app-eew-banner
            [eew]="eew"
            [isDarkMode]="isDarkMode()"
            (dismiss)="isEewDismissed.set(true)"
            (focusEew)="focusOnEew()"
            (focusGrid)="focusOnDetectedGrid()">
          </app-eew-banner>
        }
      }

      <!-- Selected Earthquake Panel (Visible in Earthquake Tab) -->
      @if (activeTab() === 'earthquake') {
        <app-quake-detail-panel
          [quake]="selectedQuake()"
          [isDarkMode]="isDarkMode()"
          [stationMap]="stationMap()"
          (focusEpicenter)="selectQuakeFromHistory($event)"
          (focusStation)="onFocusStation($event)">
        </app-quake-detail-panel>
      }

      <!-- History Drawer -->
      @if (isHistoryOpen()) {
        <app-history-drawer
          [historyList]="p2pHistoryList()"
          [processedList]="processedHistoryList()"
          [selectedQuake]="selectedQuake()"
          [groupUnknown]="groupUnknown()"
          [isDarkMode]="isDarkMode()"
          [expandedGroupKeys]="expandedGroupKeysSet()"
          (selectQuake)="selectQuakeFromHistory($event)"
          (toggleGroupUnknown)="toggleGroupUnknown()"
          (toggleGroup)="onToggleGroupExpanded($event)"
          (closeDrawer)="isHistoryOpen.set(false)"
          (loadMore)="loadMoreHistory()">
        </app-history-drawer>
      }

      <!-- Controls Panel -->
      <app-controls-panel
        [activeTab]="activeTab()"
        [hasDetectedGrids]="hasDetectedGrids()"
        [showWaveRings]="showWaveRings()"
        [isDarkMode]="isDarkMode()"
        [intensityDisplayMode]="intensityDisplayMode()"
        [realtimeDataType]="realtimeDataType()"
        (resetMapView)="resetMapView()"
        (focusDetectedGrid)="focusOnDetectedGrid()"
        (triggerEewSimulation)="triggerEewSimulation()"
        (toggleWaveRings)="toggleWaveRings()"
        (toggleDarkMode)="toggleDarkMode()"
        (setIntensityDisplayMode)="setIntensityDisplayMode($event)"
        (setRealtimeDataType)="setRealtimeDataType($event)"
        (playDetectionSound)="playDetectionSound($event)"
        (playShindoAudio)="playShindoAudio()"
        (testNotification)="testNotification()">
      </app-controls-panel>

      <!-- Realtime GIF Box & EEW Display under GIF (Visible in Realtime Tab) -->
      @if (activeTab() === 'realtime') {
        <app-gif-view-panel
          [currentGifUrl]="currentGifUrl()"
          [acmapGifUrl]="acmapGifUrl()"
          [estshindoGifUrl]="estshindoGifUrl()"
          [isGifExpanded]="isGifExpanded()"
          [eew]="eewData()"
          [isDarkMode]="isDarkMode()"
          (toggleGifExpanded)="isGifExpanded.set(!isGifExpanded())">
        </app-gif-view-panel>
      }

      <!-- Earthquake Shindo Legend (Visible in Earthquake Tab) -->
      @if (activeTab() === 'earthquake') {
        <div class="absolute bottom-4 right-4 z-20 hidden md:flex flex-col gap-1.5 p-3.5 rounded-2xl backdrop-blur-md border border-zinc-700/80 bg-zinc-900/90 text-white shadow-2xl text-xs">
          <div class="font-extrabold text-[11px] text-zinc-300 pb-1.5 border-b border-zinc-700/80 flex items-center justify-between gap-3">
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              예보구역 진도 범례 (JMA)
            </span>
            <span class="text-[10px] text-zinc-400 font-mono font-normal">P2PQuake</span>
          </div>
          <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 font-bold pt-1">
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#990099"></span><span>진도 7</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#A00000"></span><span>진도 6강</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#FF0000"></span><span>진도 6약</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#FF5500"></span><span>진도 5강</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#FF9900"></span><span>진도 5약</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#FFE600"></span><span class="text-amber-200">진도 4</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#00BFFF"></span><span>진도 3</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#0055FF"></span><span>진도 2</span></div>
            <div class="flex items-center gap-1.5 col-span-2"><span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#7F8C8D"></span><span>진도 1</span></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLElement>;
  
  activeTab = signal<'realtime' | 'earthquake' | 'est_shindo_region'>('earthquake');

  private map: any;
  private geojson: any = null;
  private tjmaData: any = null;
  
  private areaForecastGeoJSON: any = null;
  private stationToAreaCode = new Map<string, string>();
  private areaNameToCode = new Map<string, string>();
  
  http = inject(HttpClient);
  noiseFilter = inject(NoiseFilterService);
  soundService = inject(SoundService);
  p2pQuakeService = inject(P2pQuakeService);
  wolfxEewService = inject(WolfxEewService);
  mapService = inject(MapService);
  estShindoMaskService = inject(EstShindoMaskService);
  notificationService = inject(NotificationService);

  toggleNotification() {
    this.notificationService.toggleEnabled();
  }

  testNotification() {
    if (this.notificationService.permission() !== 'granted') {
      this.notificationService.requestPermission();
    } else {
      this.notificationService.sendNotification('🔔 [테스트] 브라우저 알림 테스트', {
        body: '흔들림 감지, 지진 정보 및 EEW(긴급지진속보) 수신 시 브라우저 알림이 정상적으로 전송됩니다.',
        tag: 'test-notification'
      });
    }
  }

  seismicData: Record<string, { distance: number, pTime: number, sTime: number }[]> = {};
  
  stationsState = new Map<string, any>();
  detectEnabled = false;
  estEpi: [number, number] | null = null;
  estOrigin: number | null = null;
  private blinkInterval: any;
  private isBlinkVisible = true;

  getJindoFromColor = getJindoFromColor;
  
  isDarkMode: WritableSignal<boolean> = signal(false);
  stationMap: WritableSignal<Map<string, any>> = signal(new Map());
  private stationMarker: any = null;
  isGifExpanded: WritableSignal<boolean> = signal(false);
  currentGifUrl: WritableSignal<string> = signal('');
  acmapGifUrl: WritableSignal<string> = signal('');
  estshindoGifUrl: WritableSignal<string> = signal('');

  latestTime: WritableSignal<string> = signal('');
  private timeInterval: any;
  
  eewData = this.wolfxEewService.eewData;
  isEewDismissed = this.wolfxEewService.isEewDismissed;
  hasDetectedGrids: WritableSignal<boolean> = signal(false);
  showWaveRings: WritableSignal<boolean> = signal(true);
  intensityDisplayMode: WritableSignal<'areas' | 'stations' | 'both'> = signal('both');
  realtimeDataType: WritableSignal<'jma_s' | 'jma_b'> = signal('jma_s');

  setRealtimeDataType(type: 'jma_s' | 'jma_b') {
    this.realtimeDataType.set(type);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('realtime_data_type', type);
      } catch {
        // ignore
      }
    }
    this.fetchTime();
  }
  p2pQuakeData = this.p2pQuakeService.p2pQuakeData;
  p2pHistoryList = this.p2pQuakeService.p2pHistoryList;
  selectedQuake = this.p2pQuakeService.selectedQuake;
  isHistoryOpen: WritableSignal<boolean> = signal(false);

  focusOnDetectedGrid() {
    if (!this.map) return;
    const activeStations: any[] = [];
    for (const stn of this.stationsState.values()) {
      if (stn.event && stn.lonlat) {
        activeStations.push(stn);
      }
    }

    if (activeStations.length > 0) {
      let totalLon = 0;
      let totalLat = 0;
      let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;

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
          zoom: 6.2,
          speed: 1.2
        });
      } else {
        this.map.fitBounds([
          [minLon - 0.8, minLat - 0.8],
          [maxLon + 0.8, maxLat + 0.8]
        ], {
          padding: 60,
          maxZoom: 6.5,
          duration: 1000
        });
      }
    } else {
      this.loadSavedDetectedEvents();
    }
  }

  focusOnEew() {
    const eew = this.eewData();
    if (this.map && eew && typeof eew.Longitude === 'number' && typeof eew.Latitude === 'number') {
      this.map.flyTo({
        center: [eew.Longitude, eew.Latitude],
        zoom: 6.2,
        speed: 1.2
      });
    }
  }

  groupUnknown: WritableSignal<boolean> = signal(true);
  expandedGroupKeys: WritableSignal<Record<string, boolean>> = signal({});

  expandedGroupKeysSet = computed(() => {
    const map = this.expandedGroupKeys();
    const set = new Set<string>();
    for (const k of Object.keys(map)) {
      if (map[k]) set.add(k);
    }
    return set;
  });

  onToggleGroupExpanded(event: { key: string, event: Event }) {
    this.toggleGroupExpanded(event.key, event.event);
  }

  toggleGroupUnknown() {
    this.groupUnknown.update(v => !v);
  }

  toggleGroupExpanded(groupKey: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.expandedGroupKeys.update(map => ({
      ...map,
      [groupKey]: !map[groupKey]
    }));
  }

  isGroupExpanded(groupKey: string): boolean {
    return !!this.expandedGroupKeys()[groupKey];
  }

  isUnknownQuake(item: any): boolean {
    if (!item) return false;
    const name = item.earthquake?.hypocenter?.name;
    const mag = item.earthquake?.hypocenter?.magnitude;
    const issueType = item.issue?.type;

    const isUnknownName = !name || name === '진원지 미상' || name === '진원지 정보 없음' || name === '不明' || name.includes('미상');
    const isUnknownMag = mag === -1 || mag === undefined || mag === 0;

    return isUnknownName || isUnknownMag || issueType === 'ScalePrompt';
  }

  processedHistoryList = computed(() => {
    const list = this.p2pHistoryList();
    if (!this.groupUnknown() || !list || list.length === 0) {
      return list.map(item => ({ isGroup: false, item }));
    }

    const result: any[] = [];
    let currentGroup: any[] = [];

    const createGroupEntry = (group: any[]) => {
      if (group.length === 1) {
        return { isGroup: false, item: group[0] };
      }
      const maxScale = Math.max(...group.map(g => g.earthquake?.maxScale ?? -1));
      const informativeItem = group.find(g => !this.isUnknownQuake(g)) || group[0];
      const primaryItem = group[0];
      const groupKey = `group-${primaryItem.id || primaryItem.earthquake?.time || primaryItem.time || Math.random()}`;
      return {
        isGroup: true,
        groupKey,
        items: [...group],
        latestItem: informativeItem,
        maxScale
      };
    };

    for (const item of list) {
      const itemTime = item.earthquake?.time || item.time;
      if (!itemTime) {
        if (currentGroup.length > 0) {
          result.push(createGroupEntry(currentGroup));
          currentGroup = [];
        }
        result.push({ isGroup: false, item });
        continue;
      }

      if (currentGroup.length === 0) {
        currentGroup.push(item);
      } else {
        const groupTime = currentGroup[0].earthquake?.time || currentGroup[0].time;
        if (itemTime === groupTime) {
          currentGroup.push(item);
        } else {
          result.push(createGroupEntry(currentGroup));
          currentGroup = [item];
        }
      }
    }

    if (currentGroup.length > 0) {
      result.push(createGroupEntry(currentGroup));
    }

    return result;
  });

  private waveAnimationId: number | null = null;

  getJindoBadgeStyle = getJindoBadgeStyle;
  getTsunamiText = getTsunamiText;

  selectQuakeFromHistory(item: any) {
    this.setTab('earthquake');
    this.selectedQuake.set(item);
    this.updateP2pEpicenterMap(item);
    this.updateAreaIntensityMap(item);
    this.focusOnEarthquake(item);
  }

  parseJSTTime(str: any): number {
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

  isActiveEEW(eew: any): boolean {
    if (!eew) return false;
    if (eew.isCancel) return false;
    if (eew.isSimulation) {
      const elapsed = (Date.now() - (eew.simulationStartTime || Date.now())) / 1000 + (eew.simulatedElapsed || 5);
      return elapsed >= 0 && elapsed < 180;
    }
    
    const timeStr = eew.OriginTime || eew.AnnouncedTime || eew.ReportTime;
    if (!timeStr) return false;

    const origin = this.parseJSTTime(timeStr);
    if (!origin) return false;
    const now = Date.now();
    const elapsedSeconds = (now - origin) / 1000;
    
    return elapsedSeconds >= -60 && elapsedSeconds < 240;
  }

  async ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      try {
        const savedType = localStorage.getItem('realtime_data_type');
        if (savedType === 'jma_s' || savedType === 'jma_b') {
          this.realtimeDataType.set(savedType);
        }
      } catch {
        // ignore
      }

      this.loadAreaAndStationData();
      this.fetchSeismicData();
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.has('detect')) {
        urlParams.set('detect', 'true');
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
      }
      this.detectEnabled = true;
      this.startFetchingTime();
      this.startP2pQuake();
      
      if (typeof window !== 'undefined') {
        this.animateWaves();
      }
      try {
        // esbuild 등의 번들러가 URL import를 해석하려다 실패하는 것을 방지하기 위해 
        // 네이티브 동적 import를 사용합니다.
        const maplibreModule = await new Function("return import('https://esm.sh/maplibre-gl@3')")();
        
        // esm.sh CDN에서 제공하는 기본(default) export와 네임드(named) export를 모두 확인하여 사용합니다.
        const { Map } = maplibreModule;

        this.map = new Map({
          container: this.mapContainer.nativeElement,
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
                  'background-color': '#ffffff'
                }
              },
              {
                id: 'world-fill',
                type: 'fill',
                source: 'world',
                filter: ['!=', ['get', 'name'], 'Japan'],
                paint: {
                  'fill-color': '#e4e4e7',
                }
              },
              {
                id: 'world-outline',
                type: 'line',
                source: 'world',
                filter: ['!=', ['get', 'name'], 'Japan'],
                paint: {
                  'line-color': '#a1a1aa',
                  'line-width': 0.5
                }
              },
              {
                id: 'japan-fill',
                type: 'fill',
                source: 'japan',
                paint: {
                  'fill-color': '#e4e4e7',
                }
              },
              {
                id: 'japan-outline',
                type: 'line',
                source: 'japan',
                paint: {
                  'line-color': '#a1a1aa',
                  'line-width': 0.5
                }
              }
            ]
          },
          center: [137.5, 36.5],
          zoom: 4.5,
          attributionControl: false // UI 제거 요구사항 반영
        });

    // fetch points and add to maps
    try {
      const res = await fetch('/intensity-points-v1.json');
      const points = await res.json();
      
      const stnArray: any[] = [];
      const features = points.filter((p: any) => p.Location && !p.IsSuspended && p.Point).map((p: any) => {
        const lon = p.Location.longitude;
        const lat = p.Location.latitude;
        const stn = {
          code: p.Code,
          lonlat: [lon, lat],
          jindo: null as number | null,
          near: [] as any[],
          delta: [] as number[],
          deltaSum: 0,
          event: null as any,
          expireTime: null as number | null,
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
        const nearDists: { stn: any; dist: number }[] = [];
        for (let j = 0; j < stnArray.length; j++) {
          if (i === j) continue;
          const lon1 = stnArray[i].lonlat[0];
          const lat1 = stnArray[i].lonlat[1];
          const lon2 = stnArray[j].lonlat[0];
          const lat2 = stnArray[j].lonlat[1];
          
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const dist = R * c;
          
          if (dist <= 30) {
            nearDists.push({ stn: stnArray[j], dist });
          }
        }
        nearDists.sort((a, b) => a.dist - b.dist);
        stnArray[i].near = nearDists.filter((item, idx) => item.dist <= 20 || idx < 3).map(item => item.stn);
      }

      this.geojson = {
        type: 'FeatureCollection',
        features
      };

      this.loadSavedDetectedEvents();

      const addPoints = (mapInstance: any) => {
        mapInstance.on('load', () => {
          mapInstance.addSource('area-forecast', {
            type: 'geojson',
            data: this.areaForecastGeoJSON || { type: 'FeatureCollection', features: [] }
          });

          mapInstance.addSource('points', {
            type: 'geojson',
            data: this.geojson
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

          // Area forecast layers (below waves and points)
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
              'line-color': this.isDarkMode() ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
              'line-width': 0.7
            }
          });

          // Experimental EstShindo Mask area layers
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
              'line-color': this.isDarkMode() ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
              'line-width': 0.7
            }
          });

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
          
          const layerConfig: any = {
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
          };

          mapInstance.addLayer(layerConfig);

          // Render detected squares on top of the station points
          mapInstance.addLayer({
            id: 'detected-layer',
            type: 'line',
            source: 'detected',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 3
            }
          });

          // Epicenter layers on topmost layer to be always clearly visible
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

          // Station Intensity layers on map
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

            if (typeof mapboxgl !== 'undefined') {
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
          
          if (this.p2pQuakeData() || this.selectedQuake()) {
            const current = this.selectedQuake() || this.p2pQuakeData();
            this.updateP2pEpicenterMap(current);
            this.updateAreaIntensityMap(current);
          }

          this.updateDetectedEvents();
          this.updateLayerVisibility();
          this.animateWaves();
        });
      };

      addPoints(this.map);
    } catch (e) {
      console.warn('Failed to load points:', e);
    }

      } catch (error) {
        console.warn('Failed to load maplibre-gl from esm.sh:', error);
      }
    }
  }

  private createGeoJSONCircle(center: [number, number], radiusInKm: number, points = 64) {
    if (radiusInKm <= 0) {
      return { type: 'FeatureCollection', features: [] };
    }
    const coords = { latitude: center[1], longitude: center[0] };
    const distanceX = radiusInKm / (111.320 * Math.cos(coords.latitude * Math.PI / 180));
    const distanceY = radiusInKm / 110.574;

    const ret = [];
    for(let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
              type: 'Polygon',
              coordinates: [ret]
          },
          properties: {}
        }]
    };
  }

  private getRadiusFromTjma(elapsedTime: number, depth: number, type: 'p' | 's'): number {
    if (!this.seismicData || Object.keys(this.seismicData).length === 0) return 0;
    
    const depths = Object.keys(this.seismicData).map(Number).sort((a,b)=>a-b);
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
           const prev = table[i-1];
           const prevTime = type === 'p' ? prev.pTime : prev.sTime;
           const fraction = (elapsedTime - prevTime) / (time - prevTime);
           return prev.distance + fraction * (point.distance - prev.distance);
        }
        break;
      }
    }
    
    return closestDist;
  }

  private wavesActive = false;
  private lastWaveRenderTime = 0;

  private updateWaves() {
    const eew = this.eewData();
    const eewActive = eew && this.isActiveEEW(eew);
    const active = eewActive;

    if (!active) {
      if (this.wavesActive) {
        this.wavesActive = false;
        const emptyGeoJSON = { type: 'FeatureCollection', features: [] };
        if (this.map && this.map.getSource('p-wave')) {
          this.map.getSource('p-wave').setData(emptyGeoJSON);
          this.map.getSource('s-wave').setData(emptyGeoJSON);
        }
      }
      return;
    }

    this.wavesActive = true;
    const now = Date.now();
    if (now - this.lastWaveRenderTime < 33) return;
    this.lastWaveRenderTime = now;

    if (eewActive) {
      this.updateP2pEpicenterMap();
    }

    let pWaveGeoJSON: any = { type: 'FeatureCollection', features: [] };
    let sWaveGeoJSON: any = { type: 'FeatureCollection', features: [] };

    let elapsedSeconds = 0;
    let depth = 10;
    let center: [number, number] = [0, 0];
    let maxSRadius = 500;

    if (eewActive) {
      if (eew.isSimulation) {
        elapsedSeconds = (now - (eew.simulationStartTime || now)) / 1000 + (eew.simulatedElapsed || 5);
      } else {
        const origin = this.parseJSTTime(eew.OriginTime || eew.AnnouncedTime);
        elapsedSeconds = (now - origin) / 1000;
      }
      depth = (typeof eew.Depth === 'number' && eew.Depth > 0) ? eew.Depth : 10;
      center = [eew.Longitude || 0, eew.Latitude || 0];
      const mag = (typeof eew.Magunitude === 'number' && eew.Magunitude > 0) ? eew.Magunitude : 6.0;
      if (mag < 4.5) maxSRadius = 300;
      else if (mag < 6.0) maxSRadius = 450;
      else if (mag < 7.0) maxSRadius = 600;
      else maxSRadius = 750;
    }
    
    if (elapsedSeconds > 0) {
      let pRadius = 0;
      let sRadius = 0;
      
      if (eewActive && Object.keys(this.seismicData).length > 0) {
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

      if (pRadius < maxPRadius && pFade > 0.01) {
        pWaveGeoJSON = this.createGeoJSONCircle(center, pRadius, 36);
      }
      if (sRadius < maxSRadius && sFade > 0.01) {
        sWaveGeoJSON = this.createGeoJSONCircle(center, sRadius, 36);
      }

      if (this.map) {
        if (this.map.getLayer('p-wave-fill-layer')) {
          this.map.setPaintProperty('p-wave-fill-layer', 'fill-opacity', 0.12 * pFade);
          this.map.setPaintProperty('p-wave-layer', 'line-opacity', 0.85 * pFade);
        }
        if (this.map.getLayer('s-wave-fill-layer')) {
          this.map.setPaintProperty('s-wave-fill-layer', 'fill-opacity', 0.18 * sFade);
          this.map.setPaintProperty('s-wave-layer', 'line-opacity', 0.9 * sFade);
        }
      }
    }

    if (this.map && this.map.getSource('p-wave')) {
      this.map.getSource('p-wave').setData(pWaveGeoJSON);
      this.map.getSource('s-wave').setData(sWaveGeoJSON);
    }
  }

  private lastTimeFetchMs = 0;

  private animateWaves = () => {
    const now = Date.now();

    // 1. time update tick (1000ms)
    if (now - this.lastTimeFetchMs >= 1000) {
      this.lastTimeFetchMs = now;
      this.fetchTime();
    }

    // EEW expiration check: clear stale EEW
    const currentEew = this.eewData();
    if (currentEew && !this.isActiveEEW(currentEew)) {
      this.wolfxEewService.eewData.set(null);
      this.wolfxEewService.isEewDismissed.set(false);
      this.updateLayerVisibility();
    }

    // 2. blink detected layer tick (500ms)
    const hasDetectedEvents = Array.from(this.stationsState.values()).some(s => s.event !== null);
    if (hasDetectedEvents && this.map && this.map.getLayer('detected-layer')) {
      const isVisible = Math.floor(now / 500) % 2 === 0;
      this.map.setPaintProperty('detected-layer', 'line-opacity', isVisible ? 1 : 0.2);
    }

    // 3. station event expiration check
    let expired = false;
    for (const stn of this.stationsState.values()) {
      if (stn.event && stn.expireTime && now >= stn.expireTime) {
        stn.event = null;
        stn.expireTime = null;
        expired = true;
      }
    }
    if (expired) {
      this.updateDetectedEvents();
      const hasActiveEvents = Array.from(this.stationsState.values()).some(s => s.event !== null);
      if (!hasActiveEvents) {
        this.resetMapView();
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('eq_detected_stations');
        }
      }
    }

    // 4. wave animation
    this.updateWaves();

    if (typeof window !== 'undefined') {
      this.waveAnimationId = requestAnimationFrame(this.animateWaves);
    }
  }

  ngOnDestroy() {
    if (this.waveAnimationId && typeof window !== 'undefined') {
      cancelAnimationFrame(this.waveAnimationId);
    }
    this.p2pQuakeService.disconnect();
    this.wolfxEewService.disconnect();
    if (this.map) {
      this.map.remove();
    }
  }

  async loadMoreHistory() {
    const nextOffset = this.historyOffset() + 100;
    this.historyOffset.set(nextOffset);
    await this.p2pQuakeService.fetchHistory(nextOffset);
  }

  getJindoString = getJindoString;

  historyOffset = signal(0);

  private lastSeenQuakeId: string | null = null;
  private lastEewKey: string | null = null;
  private lastEewTime = 0;

  private getQuakeUniqueKey(item: any): string {
    if (!item) return '';
    const id = item.id;
    const eqTime = item.earthquake?.time || item.time || '';
    const issueType = item.issue?.type || '';
    const maxScale = item.earthquake?.maxScale ?? '';
    const hypName = item.earthquake?.hypocenter?.name || '';
    if (id) return `${id}_${eqTime}_${issueType}`;
    return `${eqTime}_${issueType}_${maxScale}_${hypName}`;
  }

  private handleEewReceived(mappedEew: any) {
    if (!mappedEew) return;
    const eewKey = `${mappedEew.AnnouncedTime || ''}_${mappedEew.OriginTime || ''}_${mappedEew.Hypocenter || ''}_${mappedEew.MaxIntensity || ''}`;
    const now = Date.now();

    this.wolfxEewService.eewData.set(mappedEew);
    this.wolfxEewService.isEewDismissed.set(false);
    this.updateP2pEpicenterMap();
    this.updateAreaIntensityMap(mappedEew);
    this.updateLayerVisibility();

    if (eewKey !== this.lastEewKey || (now - this.lastEewTime > 10000)) {
      this.lastEewKey = eewKey;
      this.lastEewTime = now;
      this.playShindoAudio(mappedEew.MaxIntensity);
      this.notificationService.notifyEew(mappedEew);
    }
  }

  private async startP2pQuake() {
    this.historyOffset.set(0);
    const history = await this.p2pQuakeService.fetchHistory(0);
    if (history.length > 0) {
      const latest = history[0];
      this.lastSeenQuakeId = this.getQuakeUniqueKey(latest);
      this.p2pQuakeService.selectedQuake.set(latest);
      this.updateP2pEpicenterMap(latest);
      this.updateAreaIntensityMap(latest);
      this.setTab('earthquake');
    }

    this.p2pQuakeService.connectWebSocket(
      (data) => {
        const newKey = this.getQuakeUniqueKey(data);
        if (newKey && newKey !== this.lastSeenQuakeId) {
          this.lastSeenQuakeId = newKey;
          this.p2pQuakeService.selectedQuake.set(data);
          this.playShindoAudio(data.earthquake?.maxScale);
          this.notificationService.notifyQuake(data);
          this.setTab('earthquake');
          this.updateP2pEpicenterMap(data);
          this.updateAreaIntensityMap(data);
          this.focusOnEarthquake(data);
        }
      },
      (mappedEew) => {
        this.handleEewReceived(mappedEew);
      }
    );

    this.wolfxEewService.connectWebSocket((_mappedEew) => {
      this.handleEewReceived(_mappedEew);
    });

    if (typeof window !== 'undefined') {
      setInterval(async () => {
        const updatedHistory = await this.p2pQuakeService.fetchHistory(0);
        if (updatedHistory.length > 0) {
          const newest = updatedHistory[0];
          const newKey = this.getQuakeUniqueKey(newest);
          if (newKey && newKey !== this.lastSeenQuakeId) {
            this.lastSeenQuakeId = newKey;
            this.p2pQuakeService.selectedQuake.set(newest);
            this.playShindoAudio(newest.earthquake?.maxScale);
            this.notificationService.notifyQuake(newest);
            this.setTab('earthquake');
            this.updateP2pEpicenterMap(newest);
            this.updateAreaIntensityMap(newest);
            this.focusOnEarthquake(newest);
          }
        }
      }, 20000);
    }
  }

  private updateP2pEpicenterMap(data?: any) {
    if (!this.map || !this.map.getSource('p2p-epicenter')) return;
    
    const geojson: any = { type: 'FeatureCollection', features: [] };
    const isRealtimeTab = this.activeTab() === 'realtime';
    
    const eew = this.eewData();
    if (eew && this.isActiveEEW(eew) && typeof eew.Longitude === 'number' && typeof eew.Latitude === 'number' && eew.Longitude !== 0 && eew.Latitude !== 0) {
      geojson.features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [eew.Longitude, eew.Latitude]
        },
        properties: { isEEW: true }
      });
    } else if (isRealtimeTab) {
      if (this.estEpi !== null && Array.isArray(this.estEpi) && this.estEpi.length === 2) {
        geojson.features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: this.estEpi
          },
          properties: { isEst: true }
        });
      }
    } else {
      const targetData = data || this.selectedQuake();
      if (targetData) {
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

        if (lon !== null && lat !== null && typeof lon === 'number' && typeof lat === 'number' && lon > 0 && lat > 0 && lon >= 120 && lon <= 155 && lat >= 20 && lat <= 55) {
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
    }
    
    this.map.getSource('p2p-epicenter').setData(geojson);
  }

  toggleDarkMode() {
    this.isDarkMode.set(!this.isDarkMode());
    this.updateMapTheme();
  }

  private updateMapTheme() {
    const isDark = this.isDarkMode();
    if (this.map) {
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
  }

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

  resetMapView() {
    if (this.map) {
      this.map.flyTo({
        center: [137.5, 36.5],
        zoom: 4.5,
        duration: 800
      });
    }
  }

  private startFetchingTime() {
    this.fetchTime(); // Initial fetch
  }

  private async fetchTime() {
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
              
              this.fetchAndProcessImage(timeStr);
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

  private updateDetectedEvents() {
    const originLon = 120;
    const originLat = 20;
    const latStep = 90 / 111.32; // ~0.808 deg per ~90km

    const activeGrids = new Map<string, { color: string, maxJindo: number, gridX: number, gridY: number }>();

    for (const stn of this.stationsState.values()) {
      if (stn.event) {
        const lat = stn.lonlat[1];
        const lon = stn.lonlat[0];
        const gridY = Math.floor((lat - originLat) / latStep);
        const cellLat = originLat + (gridY + 0.5) * latStep;
        const lonStepAtLat = 90 / (111.32 * Math.cos(cellLat * Math.PI / 180));
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
      const lonStepAtLat = 90 / (111.32 * Math.cos(cellLat * Math.PI / 180));
      const minLon = originLon + gridX * lonStepAtLat;
      const maxLon = originLon + (gridX + 1) * lonStepAtLat;

      detectedFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [minLon, minLat],
            [maxLon, minLat],
            [maxLon, maxLat],
            [minLon, maxLat],
            [minLon, minLat]
          ]]
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
    if (this.map && this.map.getSource('detected')) {
      this.map.getSource('detected').setData(detectedGeojson);
    }

    this.estEpi = null;
    this.estOrigin = null;

    this.hasDetectedGrids.set(activeGrids.size > 0);
    this.updateP2pEpicenterMap();
    this.updateLayerVisibility();
    this.saveDetectedEventsToStorage();
  }

  private saveDetectedEventsToStorage() {
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
      localStorage.setItem('eq_detected_stations', JSON.stringify({
        timestamp: now,
        stations: activeStations
      }));
    } else {
      localStorage.removeItem('eq_detected_stations');
    }
  }

  private loadSavedDetectedEvents() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('eq_detected_stations');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !data.timestamp || !Array.isArray(data.stations)) return;

      const now = Date.now();
      const elapsed = now - data.timestamp;
      // 5분(300,000ms) 이내의 저장 데이터만 유효
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
        this.updateDetectedEvents();

        if (restoredCount > 0) {
          const focusOnRestored = () => {
            this.focusOnDetectedGrid();
          };

          if (this.map) {
            focusOnRestored();
          }
          if (typeof window !== 'undefined') {
            requestAnimationFrame(() => {
              focusOnRestored();
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load saved detected events', e);
    }
  }

  triggerEewSimulation() {
    const nowMs = Date.now();
    const nowJST = new Date(nowMs + 9 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = nowJST.getUTCFullYear();
    const mm = pad(nowJST.getUTCMonth() + 1);
    const dd = pad(nowJST.getUTCDate());
    const hh = pad(nowJST.getUTCHours());
    const mi = pad(nowJST.getUTCMinutes());
    const ss = pad(nowJST.getUTCSeconds());

    const originTime = `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`;

    const mockEew = {
      Title: '緊急地震速報 (모의 테스트)',
      Issue: { Status: 'テスト' },
      AnnouncedTime: originTime,
      OriginTime: originTime,
      Hypocenter: '도쿄 근해 (P/S파 모의 시뮬레이션)',
      Latitude: 35.5,
      Longitude: 140.0,
      Magunitude: 6.5,
      Depth: 20,
      MaxIntensity: '5+',
      isWarn: true,
      isCancel: false,
      isSimulation: true,
      simulationStartTime: nowMs,
      simulatedElapsed: 10,
      areas: [
        { name: '東京都２３区', scaleFrom: 40 },
        { name: '東京都多摩東部', scaleFrom: 30 },
        { name: '千葉県北西部', scaleFrom: 45 },
        { name: '神奈川県東部', scaleFrom: 46 },
        { name: '埼玉県南部', scaleFrom: 30 },
        { name: '茨城県南部', scaleFrom: 30 }
      ]
    };

    if (this.activeTab() !== 'earthquake') {
      this.setTab('earthquake');
    }

    this.isEewDismissed.set(false);
    this.eewData.set(mockEew);
    this.updateP2pEpicenterMap({
      earthquake: {
        hypocenter: {
          latitude: 35.5,
          longitude: 140.0
        }
      }
    });
    this.updateAreaIntensityMap(mockEew);
    this.updateLayerVisibility();
    this.playShindoAudio('5+');
    this.notificationService.notifyEew(mockEew);
    
    if (this.map) {
      this.map.flyTo({
        center: [140.0, 35.5],
        zoom: 6.8,
        speed: 1.2,
        duration: 1200
      });
    }
  }

  playShindoAudio(scale?: number | string) {
    this.soundService.playShindoAudio(scale);
  }

  playSyntheticShindoSound() {
    this.soundService.playSyntheticShindoSound();
  }

  playDetectionSound(intensity: number | string) {
    this.soundService.playDetectionSound(intensity);
  }

  private fetchAndProcessImage(time: string) {
    if (!this.geojson) return;

    const dataType = this.realtimeDataType();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `/api/realtime-img?time=${time}&type=${dataType}`;
    this.currentGifUrl.set(img.src);
    this.acmapGifUrl.set(`/api/acmap-img?time=${time}&type=${dataType}`);
    this.estshindoGifUrl.set(`/api/estshindo-img?time=${time}`);

    if (this.activeTab() === 'est_shindo_region') {
      this.updateEstShindoMaskLayer();
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
          
          let newColor = 'transparent'; // default transparent
          let jindo: number | null = null;
          if (a > 0) {
            newColor = `rgba(${r},${g},${b},${a/255})`;
            jindo = this.getJindoFromColor(r, g, b);
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
                // 노이즈 필터 적용 (SRP 분리: 3프레임 미디언 필터로 글리치 완전 제거)
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
        
        // Qiita logic: Weaker(1), Weak(2), Medium(3), Strong(4), Stronger(5)
        const getLevel = (jindo: number | null) => {
          if (jindo === null) return 0;
          if (jindo < -1.0) return 1;
          if (jindo < 1.0) return 2;
          if (jindo < 3.0) return 3;
          if (jindo < 4.5) return 4;
          return 5;
        };

        const nowTick = Date.now();
        let soundJindoToPlay = -3;

        for (const stn of stations) {
          // 異常値(이상치) 필터링: 흔들림 감지 중이 아님 & 최근 데이터 있음 & 10초간 변화량 0.8 미만 & 진도 3(도서는 5약) 이상
          const isIsland = stn.near.length === 0;
          const isAnomaly = !stn.event && stn.deltaSum < 0.8 && stn.jindo !== null && stn.jindo >= (isIsland ? 4.5 : 3.0);
          
          if (isAnomaly) continue;

          // 흔들림 감지 알고리즘 강화 (노이즈 방지)
          if (stn.deltaSum > 1.2) {
            const u = stn.near;
            let targetEvent = stn.event;

            if (!targetEvent) {
              // 주변에 이미 이벤트가 있다면 병합
              const neighborWithEvent = u.find((r: any) => r.event);
              if (neighborWithEvent) {
                targetEvent = neighborWithEvent.event;
              } else {
                // 주변 관측점도 상승했는지 확인 (임계값 0.8)
                let rCount = 0;
                for (const neighbor of u) {
                  if (neighbor.deltaSum > 0.8) rCount++;
                }
                
                // 도서지역 강진 예외
                const isIslandAndStrong = isIsland && stn.jindo !== null && stn.jindo >= 4.2;
                
                // 주변 관측점 확인 (비율 60% 이상 및 조건 충족)
                const neighborRatio = u.length > 0 ? (rCount / u.length) : 0;
                const hasEnoughNeighbors = u.length > 0 && (rCount >= 2 || rCount === u.length) && neighborRatio >= 0.6;
                
                // 최소 진도 기준 (-0.5 이상)
                const isFelt = stn.jindo !== null && stn.jindo >= -0.5;

                // 조건 만족 시 이벤트 생성
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
              // 진행 중인 이벤트가 주변 이벤트와 만나면 병합 (더 오래된 이벤트로)
              const otherEventStn = u.find((r: any) => r.event && r.event.id !== targetEvent.id);
              if (otherEventStn && otherEventStn.event.startTime < targetEvent.startTime) {
                targetEvent = otherEventStn.event;
              }
            }

            if (targetEvent) {
              stn.event = targetEvent;
              
              // 현재 진도를 바탕으로 이벤트 레벨 업데이트 및 소리 재생 예약
              const currentLevel = getLevel(stn.jindo);
              if (currentLevel > targetEvent.maxLevel) {
                targetEvent.maxLevel = currentLevel;
                if (stn.jindo !== null && stn.jindo > soundJindoToPlay) {
                  soundJindoToPlay = stn.jindo;
                }
              }
              
              // 검출 종료 시간 갱신 (진도에 따라 유동적으로 연장)
              stn.expireTime = Date.now() + 10000;
              detectedUpdated = true;
            }
          } else if (stn.event && stn.jindo !== null && stn.jindo >= -0.5) {
            // 이미 감지된 이벤트가 존재하고 흔들림이 계속 지속되는 경우 격자 계속 유지
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
        
        if (soundJindoToPlay > -3) {
          this.playDetectionSound(soundJindoToPlay);
          this.notificationService.notifyShakingDetection(getJindoString(soundJindoToPlay) || soundJindoToPlay);
        }
      }

      if (newEventDetected) {
        const newlyTriggered = Array.from(this.stationsState.values()).filter(s => s.event !== null);
        if (newlyTriggered.length > 0) {
          const sumLon = newlyTriggered.reduce((acc, s) => acc + s.lonlat[0], 0);
          const sumLat = newlyTriggered.reduce((acc, s) => acc + s.lonlat[1], 0);
          detectedCenter = [sumLon / newlyTriggered.length, sumLat / newlyTriggered.length];
        }
        if (this.map && detectedCenter) {
          this.map.flyTo({
            center: detectedCenter,
            zoom: 6.2,
            speed: 1.2,
            curve: 1.4,
            essential: true
          });
        }
      }

      if (updated) {
        if (this.map && this.map.getSource('points')) {
          this.map.getSource('points').setData(this.geojson);
        }
      }
      
      if (detectedUpdated) {
        this.updateDetectedEvents();
      }
    };
  }

  private async loadAreaAndStationData() {
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

      if (this.map && this.map.getSource('area-forecast')) {
        this.map.getSource('area-forecast').setData(this.areaForecastGeoJSON);
        if (this.selectedQuake()) {
          this.updateAreaIntensityMap(this.selectedQuake());
        }
      }
    } catch (e) {
      console.warn('Failed to load area forecast or station data:', e);
    }
  }

  setTab(tab: 'realtime' | 'earthquake' | 'est_shindo_region') {
    this.activeTab.set(tab);
    this.updateLayerVisibility();
    if (tab === 'est_shindo_region') {
      this.updateEstShindoMaskLayer();
      if (this.map) {
        this.map.flyTo({
          center: [137.5, 36.5],
          zoom: 5.2,
          pitch: 0,
          bearing: 0,
          duration: 1000
        });
      }
    } else if (tab === 'earthquake') {
      if (!this.selectedQuake() && this.p2pHistoryList().length > 0) {
        this.selectedQuake.set(this.p2pHistoryList()[0]);
      }
      const quake = this.selectedQuake();
      if (quake) {
        this.updateAreaIntensityMap(quake);
        this.updateP2pEpicenterMap(quake);
        this.focusOnEarthquake(quake);
      }
    } else if (tab === 'realtime') {
      if (this.map) {
        this.map.flyTo({
          center: [137.5, 36.5],
          zoom: 4.8,
          pitch: 0,
          bearing: 0,
          duration: 1000
        });
      }
    }
  }

  async updateEstShindoMaskLayer() {
    const gifUrl = this.estshindoGifUrl();
    if (!gifUrl || !this.map) return;
    try {
      const maskedGeoJSON = await this.estShindoMaskService.getMaskedGeoJSON(gifUrl);
      if (maskedGeoJSON && this.map.getSource('est-shindo-mask-area')) {
        this.map.getSource('est-shindo-mask-area').setData(maskedGeoJSON);
      }
    } catch (err) {
      console.warn('Failed to update EstShindo mask layer:', err);
    }
  }

  focusOnEarthquake(item: any) {
    if (!this.map || !item) return;
    const hyp = item?.earthquake?.hypocenter;
    const isValidHyp = hyp && typeof hyp.latitude === 'number' && typeof hyp.longitude === 'number' &&
                       hyp.latitude > 0 && hyp.longitude > 0 &&
                       hyp.latitude >= 20 && hyp.latitude <= 55 &&
                       hyp.longitude >= 120 && hyp.longitude <= 155;
    if (isValidHyp) {
      this.map.flyTo({
        center: [hyp.longitude, hyp.latitude],
        zoom: 6.8,
        speed: 1.2,
        duration: 1200
      });
      return;
    }

    if (this.areaForecastGeoJSON?.features) {
      let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
      let hasValidColor = false;
      for (const f of this.areaForecastGeoJSON.features) {
        if (f.properties?.color && f.properties.color !== 'transparent') {
          const geom = f.geometry;
          if (geom && geom.coordinates) {
            const checkCoords = (coords: any) => {
              if (typeof coords[0] === 'number') {
                const [lon, lat] = coords;
                if (lon < minLon) minLon = lon;
                if (lon > maxLon) maxLon = lon;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                hasValidColor = true;
              } else if (Array.isArray(coords)) {
                for (const c of coords) checkCoords(c);
              }
            };
            checkCoords(geom.coordinates);
          }
        }
      }
      if (hasValidColor && minLon < maxLon && minLat < maxLat) {
        this.map.fitBounds([[minLon, minLat], [maxLon, maxLat]], {
          padding: 80,
          maxZoom: 8,
          duration: 1200
        });
        return;
      }
    }

    this.map.flyTo({
      center: [137.5, 36.5],
      zoom: 5.2,
      duration: 1000
    });
  }

  toggleWaveRings() {
    this.showWaveRings.update(v => !v);
    this.updateLayerVisibility();
  }

  setIntensityDisplayMode(mode: 'areas' | 'stations' | 'both') {
    this.intensityDisplayMode.set(mode);
    this.updateLayerVisibility();
  }

  updateLayerVisibility() {
    if (!this.map) return;
    const currentTab = this.activeTab();
    const isEarthquakeTab = currentTab === 'earthquake';
    const isEstShindoTab = currentTab === 'est_shindo_region';
    const mode = this.intensityDisplayMode();

    const eew = this.eewData();
    const isEewActive = !!(eew && this.isActiveEEW(eew));

    // 지역 진도 면적 색상 레이어 (area-forecast-fill, area-forecast-line)
    const showAreas = isEarthquakeTab && (mode === 'areas' || mode === 'both');
    const eqVis = showAreas ? 'visible' : 'none';

    const eqLayers = ['area-forecast-fill', 'area-forecast-line'];
    const waveLayers = ['p-wave-fill-layer', 'p-wave-layer', 's-wave-fill-layer', 's-wave-layer'];
    const epicenterLayers = ['p2p-epicenter-halo', 'p2p-epicenter-layer'];

    for (const id of eqLayers) {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, 'visibility', eqVis);
      }
    }

    // 실험적 예상진도 행정구역 마스킹 레이어 (est-shindo-mask-fill, est-shindo-mask-line)
    const estShindoVis = isEstShindoTab ? 'visible' : 'none';
    if (this.map.getLayer('est-shindo-mask-fill')) {
      this.map.setLayoutProperty('est-shindo-mask-fill', 'visibility', estShindoVis);
    }
    if (this.map.getLayer('est-shindo-mask-line')) {
      this.map.setLayoutProperty('est-shindo-mask-line', 'visibility', estShindoVis);
    }

    // 관측점 레이어 (points-layer) : 실시간 탭 및 예상진도 탭에서 표시하되, 예상진도 탭에서는 파란색/관측소 점들을 매우 흐리게(0.1) 처리
    if (this.map.getLayer('points-layer')) {
      this.map.setLayoutProperty('points-layer', 'visibility', isEarthquakeTab ? 'none' : 'visible');
      if (isEstShindoTab) {
        this.map.setPaintProperty('points-layer', 'circle-opacity', 0.1);
      } else {
        this.map.setPaintProperty('points-layer', 'circle-opacity', 1.0);
      }
    }

    // 흔들림 격자 레이어 (detected-layer) : 실시간 탭이거나, 흔들림 격자가 존재하는 경우 지진 예보구역 탭에서도 표시
    const hasDetectedGrids = Array.from(this.stationsState.values()).some(s => s.event !== null);
    const detectedVis = (!isEarthquakeTab || hasDetectedGrids) ? 'visible' : 'none';
    if (this.map.getLayer('detected-layer')) {
      this.map.setLayoutProperty('detected-layer', 'visibility', detectedVis);
    }

    // P파 / S파 레이어는 showWaveRings가 true이고, (실시간 탭이거나 EEW/추정진원 활성화) 되어 있을 때만 표시
    const waveVis = (this.showWaveRings() && (!isEarthquakeTab || isEewActive || this.estEpi !== null)) ? 'visible' : 'none';
    for (const id of waveLayers) {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, 'visibility', waveVis);
      }
    }

    // 진원지 마커 레이어는 지진정보 탭이거나 EEW/추정진원이 활성화되어 있으면 항상 보임
    const epiVis = (isEarthquakeTab || isEewActive || this.estEpi !== null) ? 'visible' : 'none';
    for (const id of epicenterLayers) {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, 'visibility', epiVis);
      }
    }

    // 관측소 개별 진도 점 레이어 (quake-stations) : 지진 정보 탭 + (stations 모드 또는 both 모드)일 때 표시
    const showStations = isEarthquakeTab && (mode === 'stations' || mode === 'both');
    const stationVis = showStations ? 'visible' : 'none';

    const quakeStationLayers = ['quake-stations-halo', 'quake-stations-circle'];
    for (const id of quakeStationLayers) {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, 'visibility', stationVis);
      }
    }
  }

  getIntensityColor = getIntensityColor;

  updateAreaIntensityMap(quakeData: any) {
    if (!this.map || !this.map.getSource('area-forecast') || !this.areaForecastGeoJSON) return;

    const points = quakeData?.points || quakeData?.earthquake?.points;
    const areas = quakeData?.areas;
    const areaScaleMap = new Map<string, number>();

    const norm = (s: string) => s ? s.replace(/県|府|都|道| /g, '') : '';

    // 1. 관측지점 기반 진도 (P2PQuake 551 등)
    if (Array.isArray(points) && points.length > 0) {
      for (const p of points) {
        // 예상/관측 진도가 1 이상 (scale >= 10)일 때만 색칠
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
        // 예상 진도 1 이상 (scale >= 10)일 때만 색칠
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

    const isEarthquakeTab = this.activeTab() === 'earthquake';

    for (const f of this.areaForecastGeoJSON.features) {
      const code = f.properties?.code;
      const scale = areaScaleMap.get(code);
      if (scale && scale >= 10) {
        f.properties.color = this.getIntensityColor(scale);
        f.properties.opacity = isEarthquakeTab ? 0.88 : 0.65;
      } else {
        f.properties.color = 'transparent';
        f.properties.opacity = 0;
      }
    }

    this.map.getSource('area-forecast').setData({
      type: 'FeatureCollection',
      features: [...this.areaForecastGeoJSON.features]
    });

    // 3. 관측소 개별 지점 마커 데이터 업데이트
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
              color: this.getIntensityColor(pt.scale),
              affi: st.affi || '기상청',
              lat: st.lat,
              lon: st.lon
            }
          });
        }
      }
    }

    if (this.map.getSource('quake-stations')) {
      this.map.getSource('quake-stations').setData({
        type: 'FeatureCollection',
        features: stationFeatures
      });
    }
  }

  onFocusStation(st: { lat: number; lon: number; name: string; pref?: string; scale?: number }) {
    if (!this.map || !st) return;
    this.map.flyTo({
      center: [st.lon, st.lat],
      zoom: 10.5,
      speed: 1.2,
      essential: true
    });

    const jindoStr = getJindoString(st.scale);
    const color = this.getIntensityColor(st.scale || 0);

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
