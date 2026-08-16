import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  signal,
  WritableSignal,
  inject
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SoundService } from './services/sound.service';
import { P2pQuakeService } from './services/p2p-quake.service';
import { WolfxEewService } from './services/wolfx-eew.service';
import { MapService } from './services/map.service';
import { EstShindoMaskService } from './services/est-shindo-mask.service';
import { NotificationService } from './services/notification.service';
import { QuakeDataService } from './services/quake-data.service';
import { WavePhysicsService } from './services/wave-physics.service';
import { QuakeHistoryService } from './services/quake-history.service';
import { QuakeDetectService } from './services/quake-detect.service';
import { EEWMessage } from './models/quake.model';
import { getJindoBadgeStyle, getTsunamiText, getJindoString, getIntensityColor } from './utils/jma.utils';
import { parseJSTTime, isActiveEEW, getQuakeUniqueKey } from './utils/geo-math.utils';

import { HeaderNavComponent } from './components/header-nav';
import { EewBannerComponent } from './components/eew-banner';
import { QuakeDetailPanelComponent } from './components/quake-detail-panel';
import { HistoryDrawerComponent } from './components/history-drawer';
import { GifViewPanelComponent } from './components/gif-view-panel';
import { ControlsPanelComponent } from './components/controls-panel';

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
    <div
      [class]="
        'relative w-full h-screen overflow-hidden transition-colors duration-300 ' +
        (isDarkMode() ? 'bg-zinc-900 text-zinc-100' : 'bg-slate-50 text-zinc-800')
      "
    >
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
        (toggleNotification)="toggleNotification()"
      >
      </app-header-nav>

      <!-- EEW Display -->
      @if (eewData(); as eew) {
        @if (isActiveEEW(eew) && !isEewDismissed()) {
          <app-eew-banner
            [eew]="eew"
            [isDarkMode]="isDarkMode()"
            (dismiss)="isEewDismissed.set(true)"
            (focusEew)="focusOnEew()"
            (focusGrid)="focusOnDetectedGrid()"
          >
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
          (focusStation)="onFocusStation($event)"
        >
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
          (loadMore)="loadMoreHistory()"
        >
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
        (testNotification)="testNotification()"
      >
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
          (toggleGifExpanded)="isGifExpanded.set(!isGifExpanded())"
        >
        </app-gif-view-panel>
      }

      <!-- Earthquake Shindo Legend (Visible in Earthquake Tab) -->
      @if (activeTab() === 'earthquake') {
        <div
          class="absolute bottom-4 right-4 z-20 hidden md:flex flex-col gap-1.5 p-3.5 rounded-2xl backdrop-blur-md border border-zinc-700/80 bg-zinc-900/90 text-white shadow-2xl text-xs"
        >
          <div
            class="font-extrabold text-[11px] text-zinc-300 pb-1.5 border-b border-zinc-700/80 flex items-center justify-between gap-3"
          >
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              예보구역 진도 범례 (JMA)
            </span>
            <span class="text-[10px] text-zinc-400 font-mono font-normal">P2PQuake</span>
          </div>
          <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 font-bold pt-1">
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#990099"></span
              ><span>진도 7</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#A00000"></span
              ><span>진도 6강</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#FF0000"></span
              ><span>진도 6약</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#FF5500"></span
              ><span>진도 5강</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#FF9900"></span
              ><span>진도 5약</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#FFE600"></span
              ><span class="text-amber-200">진도 4</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#00BFFF"></span
              ><span>진도 3</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#0055FF"></span
              ><span>진도 2</span>
            </div>
            <div class="flex items-center gap-1.5 col-span-2">
              <span class="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm" style="background:#7F8C8D"></span
              ><span>진도 1</span>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLElement>;

  // Services
  quakeDataService = inject(QuakeDataService);
  wavePhysicsService = inject(WavePhysicsService);
  quakeHistoryService = inject(QuakeHistoryService);
  quakeDetectService = inject(QuakeDetectService);
  soundService = inject(SoundService);
  p2pQuakeService = inject(P2pQuakeService);
  wolfxEewService = inject(WolfxEewService);
  mapService = inject(MapService);
  estShindoMaskService = inject(EstShindoMaskService);
  notificationService = inject(NotificationService);
  http = inject(HttpClient);

  // App UI State
  activeTab = signal<'realtime' | 'earthquake' | 'est_shindo_region'>('earthquake');
  isDarkMode: WritableSignal<boolean> = signal(false);
  isHistoryOpen: WritableSignal<boolean> = signal(false);
  isGifExpanded: WritableSignal<boolean> = signal(false);
  showWaveRings: WritableSignal<boolean> = signal(true);
  intensityDisplayMode: WritableSignal<'areas' | 'stations' | 'both'> = signal('both');

  // Signals delegated to Services
  eewData = this.wolfxEewService.eewData;
  isEewDismissed = this.wolfxEewService.isEewDismissed;
  p2pQuakeData = this.p2pQuakeService.p2pQuakeData;
  p2pHistoryList = this.p2pQuakeService.p2pHistoryList;
  selectedQuake = this.p2pQuakeService.selectedQuake;
  stationMap = this.quakeDataService.stationMap;

  latestTime = this.quakeDetectService.latestTime;
  currentGifUrl = this.quakeDetectService.currentGifUrl;
  acmapGifUrl = this.quakeDetectService.acmapGifUrl;
  estshindoGifUrl = this.quakeDetectService.estshindoGifUrl;
  realtimeDataType = this.quakeDetectService.realtimeDataType;
  hasDetectedGrids = this.quakeDetectService.hasDetectedGrids;

  groupUnknown = this.quakeHistoryService.groupUnknown;
  expandedGroupKeys = this.quakeHistoryService.expandedGroupKeys;
  expandedGroupKeysSet = this.quakeHistoryService.expandedGroupKeysSet;
  processedHistoryList = this.quakeHistoryService.processedHistoryList;

  get areaForecastGeoJSON() {
    return this.quakeDataService.areaForecastGeoJSON;
  }

  // Utilities exported to template
  getJindoBadgeStyle = getJindoBadgeStyle;
  getTsunamiText = getTsunamiText;
  parseJSTTime = parseJSTTime;
  isActiveEEW = isActiveEEW;
  getQuakeUniqueKey = getQuakeUniqueKey;
  getIntensityColor = getIntensityColor;

  private map: any = null;
  private geojson: any = null;
  private waveAnimationId: number | null = null;
  private wavesActive = false;
  private lastWaveRenderTime = 0;
  private lastTimeFetchMs = 0;
  private lastSeenQuakeId = '';
  private historyPollInterval: any = null;

  async ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      try {
        const savedType = localStorage.getItem('realtime_data_type');
        if (savedType === 'jma_s' || savedType === 'jma_b') {
          this.quakeDetectService.realtimeDataType.set(savedType);
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
      this.quakeDetectService.detectEnabled = true;
      this.startFetchingTime();
      this.startP2pQuake();

      this.animateWaves();

      try {
        this.map = await this.mapService.initMap(this.mapContainer.nativeElement, this.isDarkMode());

        try {
          const res = await fetch('/intensity-points-v1.json');
          const points = await res.json();
          this.geojson = this.quakeDetectService.initStations(points);

          this.quakeDetectService.loadSavedDetectedEvents(
            (detectedGeojson) => this.mapService.setSourceData('detected', detectedGeojson),
            () => this.focusOnDetectedGrid()
          );

          this.map.on('load', () => {
            this.mapService.setupSourcesAndLayers(this.areaForecastGeoJSON, this.geojson, this.isDarkMode());

            if (this.p2pQuakeData() || this.selectedQuake()) {
              const current = this.selectedQuake() || this.p2pQuakeData();
              this.updateP2pEpicenterMap(current);
              this.updateAreaIntensityMap(current);
            }

            this.updateDetectedEvents();
            this.updateLayerVisibility();
            this.animateWaves();
          });
        } catch (e) {
          console.warn('Failed to load points:', e);
        }
      } catch (error) {
        console.warn('Failed to initialize map:', error);
      }
    }
  }

  ngOnDestroy() {
    if (this.waveAnimationId !== null && typeof window !== 'undefined') {
      cancelAnimationFrame(this.waveAnimationId);
      this.waveAnimationId = null;
    }
    if (this.historyPollInterval) {
      clearInterval(this.historyPollInterval);
      this.historyPollInterval = null;
    }
  }

  setRealtimeDataType(type: 'jma_s' | 'jma_b') {
    this.quakeDetectService.setRealtimeDataType(type);
    this.fetchTime();
  }

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

  onToggleGroupExpanded(event: { key: string; event: Event }) {
    this.quakeHistoryService.toggleGroupExpanded(event.key, event.event);
  }

  toggleGroupUnknown() {
    this.quakeHistoryService.toggleGroupUnknown();
  }

  toggleGroupExpanded(groupKey: string, event?: Event) {
    this.quakeHistoryService.toggleGroupExpanded(groupKey, event);
  }

  isGroupExpanded(groupKey: string): boolean {
    return this.quakeHistoryService.isGroupExpanded(groupKey);
  }

  isUnknownQuake(item: any): boolean {
    return this.quakeHistoryService.isUnknownQuake(item);
  }

  selectQuakeFromHistory(item: any) {
    this.setTab('earthquake');
    this.selectedQuake.set(item);
    this.updateP2pEpicenterMap(item);
    this.updateAreaIntensityMap(item);
    this.focusOnEarthquake(item);
  }

  loadMoreHistory() {
    this.p2pQuakeService.loadMoreHistory();
  }

  private animateWaves = () => {
    const now = Date.now();

    // 1. K-MONI time polling tick (1000ms)
    if (now - this.lastTimeFetchMs >= 1000) {
      this.lastTimeFetchMs = now;
      this.fetchTime();
    }

    // 2. EEW expiration check
    const currentEew = this.eewData();
    if (currentEew && !this.isActiveEEW(currentEew)) {
      this.wolfxEewService.eewData.set(null);
      this.wolfxEewService.isEewDismissed.set(false);
      this.updateLayerVisibility();
    }

    // 3. Blink detected layer tick (500ms)
    const hasDetectedEvents = Array.from(this.quakeDetectService.stationsState.values()).some((s) => s.event !== null);
    if (hasDetectedEvents) {
      const isVisible = Math.floor(now / 500) % 2 === 0;
      this.mapService.blinkDetectedLayer(isVisible);
    }

    // 4. Station event expiration check
    const { expired, hasActiveEvents } = this.quakeDetectService.checkExpirationTick(now);
    if (expired) {
      this.updateDetectedEvents();
      if (!hasActiveEvents) {
        this.resetMapView();
      }
    }

    // 5. P/S wave physics and animation
    this.updateWaves();

    if (typeof window !== 'undefined') {
      this.waveAnimationId = requestAnimationFrame(this.animateWaves);
    }
  };

  private updateWaves() {
    const eew = this.eewData();
    const waveState = this.wavePhysicsService.calculateWaveState(eew);

    if (!waveState.isActive) {
      if (this.wavesActive) {
        this.wavesActive = false;
        this.mapService.updateWaveLayers(waveState);
      }
      return;
    }

    this.wavesActive = true;
    const now = Date.now();
    if (now - this.lastWaveRenderTime < 33) return;
    this.lastWaveRenderTime = now;

    this.updateP2pEpicenterMap();
    this.mapService.updateWaveLayers(waveState);
  }

  private startFetchingTime() {
    this.fetchTime();
  }

  private fetchTime() {
    this.quakeDetectService.fetchTime((timeStr) => {
      this.fetchAndProcessImage(timeStr);
    });
  }

  private fetchAndProcessImage(time: string) {
    this.quakeDetectService.fetchAndProcessImage(time, {
      onEstShindoMask: () => {
        if (this.activeTab() === 'est_shindo_region') {
          this.updateEstShindoMaskLayer();
        }
      },
      onPointsUpdated: (geojson) => {
        this.mapService.setSourceData('points', geojson);
      },
      onDetectedUpdated: (detectedGeojson) => {
        this.mapService.setSourceData('detected', detectedGeojson);
        this.updateP2pEpicenterMap();
        this.updateLayerVisibility();
      },
      onSoundTriggered: (jindo, jindoStr) => {
        this.soundService.playDetectionSound(jindo);
        this.notificationService.notifyShakingDetection(jindoStr);
      },
      onNewEventDetected: (center) => {
        this.mapService.flyTo({
          center,
          zoom: 6.2,
          speed: 1.2,
          curve: 1.4,
          essential: true
        });
      }
    });
  }

  private updateDetectedEvents() {
    this.quakeDetectService.updateDetectedEvents((geojson) => {
      this.mapService.setSourceData('detected', geojson);
    });
    this.updateP2pEpicenterMap();
    this.updateLayerVisibility();
  }

  private async startP2pQuake() {
    const history = await this.p2pQuakeService.fetchHistory(0);
    if (history.length > 0) {
      const latest = history[0];
      this.lastSeenQuakeId = this.getQuakeUniqueKey(latest);
      this.p2pQuakeService.selectedQuake.set(latest);
      this.updateP2pEpicenterMap(latest);
      this.updateAreaIntensityMap(latest);
    }

    this.wolfxEewService.connectWebSocket((mappedEew) => {
      this.handleEewReceived(mappedEew);
    });

    if (typeof window !== 'undefined') {
      this.historyPollInterval = setInterval(async () => {
        const updatedHistory = await this.p2pQuakeService.fetchHistory(0);
        if (updatedHistory.length > 0) {
          const newest = updatedHistory[0];
          const newKey = this.getQuakeUniqueKey(newest);
          if (newKey && newKey !== this.lastSeenQuakeId) {
            this.lastSeenQuakeId = newKey;
            this.p2pQuakeService.selectedQuake.set(newest);
            this.soundService.playShindoAudio(newest.earthquake?.maxScale);
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

  private handleEewReceived(eew: EEWMessage) {
    this.updateP2pEpicenterMap();
    this.updateLayerVisibility();

    if (eew && typeof eew.Longitude === 'number' && typeof eew.Latitude === 'number') {
      this.mapService.flyTo({
        center: [eew.Longitude, eew.Latitude],
        zoom: 6.2,
        speed: 1.2
      });
    }

    if (eew && eew.MaxIntensity) {
      this.soundService.playShindoAudio(eew.MaxIntensity);
    }
    this.notificationService.notifyEew(eew);
  }

  private updateP2pEpicenterMap(data?: any) {
    const isRealtimeTab = this.activeTab() === 'realtime';
    const targetData = data || this.selectedQuake();
    const geojson = this.quakeDataService.buildEpicenterGeoJSON(
      targetData,
      this.eewData(),
      isRealtimeTab,
      this.quakeDetectService.estEpi
    );
    this.mapService.setSourceData('p2p-epicenter', geojson);
  }

  toggleDarkMode() {
    this.isDarkMode.set(!this.isDarkMode());
    this.mapService.updateMapTheme(this.isDarkMode());
  }

  fetchSeismicData() {
    this.wavePhysicsService.fetchSeismicData();
  }

  resetMapView() {
    this.mapService.resetMapView();
  }

  focusOnDetectedGrid() {
    const activeStations = Array.from(this.quakeDetectService.stationsState.values()).filter(
      (s) => s.event && s.lonlat
    );
    if (activeStations.length > 0) {
      this.mapService.focusOnDetectedGrid(activeStations);
    } else {
      this.quakeDetectService.loadSavedDetectedEvents(
        (detectedGeojson) => this.mapService.setSourceData('detected', detectedGeojson),
        () => this.focusOnDetectedGrid()
      );
    }
  }

  focusOnEew() {
    const eew = this.eewData();
    if (eew && typeof eew.Longitude === 'number' && typeof eew.Latitude === 'number') {
      this.mapService.flyTo({
        center: [eew.Longitude, eew.Latitude],
        zoom: 6.2,
        speed: 1.2
      });
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

    const originTimeStr = `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
    const reportTimeStr = originTimeStr;

    const mockEew: EEWMessage = {
      Title: '모의 긴급지진속보 (경보)',
      Hypocenter: '지바현 북서부 (모의 훈련)',
      Longitude: 140.0,
      Latitude: 35.5,
      Depth: 30,
      Magunitude: 6.8,
      MaxIntensity: '5+',
      OriginTime: originTimeStr,
      AnnouncedTime: reportTimeStr,
      ReportTime: reportTimeStr,
      ReportNum: 3,
      isFinal: false,
      isWarn: true,
      isCancel: false,
      isSimulation: true,
      simulationStartTime: Date.now(),
      simulatedElapsed: 5,
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
    this.soundService.playShindoAudio('5+');
    this.notificationService.notifyEew(mockEew);

    this.mapService.flyTo({
      center: [140.0, 35.5],
      zoom: 6.8,
      speed: 1.2,
      duration: 1200
    });
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

  private async loadAreaAndStationData() {
    try {
      const { areaForecastGeoJSON } = await this.quakeDataService.loadAreaAndStationData();
      if (areaForecastGeoJSON) {
        this.mapService.setSourceData('area-forecast', areaForecastGeoJSON);
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
      this.mapService.flyTo({
        center: [137.5, 36.5],
        zoom: 5.2,
        pitch: 0,
        bearing: 0,
        duration: 1000
      });
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
      this.mapService.flyTo({
        center: [137.5, 36.5],
        zoom: 4.8,
        pitch: 0,
        bearing: 0,
        duration: 1000
      });
    }
  }

  async updateEstShindoMaskLayer() {
    const gifUrl = this.estshindoGifUrl();
    if (!gifUrl) return;
    try {
      const maskedGeoJSON = await this.estShindoMaskService.getMaskedGeoJSON(gifUrl);
      if (maskedGeoJSON) {
        this.mapService.setSourceData('est-shindo-mask-area', maskedGeoJSON);
      }
    } catch (err) {
      console.warn('Failed to update EstShindo mask layer:', err);
    }
  }

  focusOnEarthquake(item: any) {
    if (!item) return;
    const hyp = item?.earthquake?.hypocenter;
    const isValidHyp =
      hyp &&
      typeof hyp.latitude === 'number' &&
      typeof hyp.longitude === 'number' &&
      hyp.latitude > 0 &&
      hyp.longitude > 0 &&
      hyp.latitude >= 20 &&
      hyp.latitude <= 55 &&
      hyp.longitude >= 120 &&
      hyp.longitude <= 155;
    if (isValidHyp) {
      this.mapService.flyTo({
        center: [hyp.longitude, hyp.latitude],
        zoom: 6.8,
        speed: 1.2,
        duration: 1200
      });
      return;
    }

    if (this.areaForecastGeoJSON?.features) {
      let minLon = 180,
        maxLon = -180,
        minLat = 90,
        maxLat = -90;
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
        this.mapService.fitBounds(
          [
            [minLon, minLat],
            [maxLon, maxLat]
          ],
          {
            padding: 80,
            maxZoom: 8,
            duration: 1200
          }
        );
        return;
      }
    }

    this.mapService.flyTo({
      center: [137.5, 36.5],
      zoom: 5.2,
      duration: 1000
    });
  }

  toggleWaveRings() {
    this.showWaveRings.update((v) => !v);
    this.updateLayerVisibility();
  }

  setIntensityDisplayMode(mode: 'areas' | 'stations' | 'both') {
    this.intensityDisplayMode.set(mode);
    this.updateLayerVisibility();
  }

  updateLayerVisibility() {
    const eew = this.eewData();
    const isEewActive = !!(eew && this.isActiveEEW(eew));
    const hasDetectedGrids = Array.from(this.quakeDetectService.stationsState.values()).some((s) => s.event !== null);

    this.mapService.updateLayerVisibility(
      this.activeTab(),
      this.intensityDisplayMode(),
      this.showWaveRings(),
      isEewActive,
      this.quakeDetectService.estEpi !== null,
      hasDetectedGrids
    );
  }

  updateAreaIntensityMap(quakeData: any) {
    const isEarthquakeTab = this.activeTab() === 'earthquake';
    const { areaForecastGeoJSON, stationFeatures } = this.quakeDataService.buildAreaIntensityGeoJSON(
      quakeData,
      isEarthquakeTab
    );

    if (areaForecastGeoJSON) {
      this.mapService.setSourceData('area-forecast', areaForecastGeoJSON);
    }

    this.mapService.setSourceData('quake-stations', {
      type: 'FeatureCollection',
      features: stationFeatures
    });
  }

  onFocusStation(st: { lat: number; lon: number; name: string; pref?: string; scale?: number }) {
    if (!st) return;
    const jindoStr = getJindoString(st.scale);
    const color = this.getIntensityColor(st.scale || 0);
    this.mapService.highlightStation(st, jindoStr, color);
  }
}
