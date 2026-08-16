import { Component, AfterViewInit, OnDestroy, NgZone, ChangeDetectorRef, HostListener, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MapService } from './services/map.service';
import { QuakeDataService } from './services/quake-data.service';
import { QuakeHistoryService } from './services/quake-history.service';
import { P2pQuakeService } from './services/p2p-quake.service';
import { WolfxEewService } from './services/wolfx-eew.service';
import { NotificationService } from './services/notification.service';
import { SoundService } from './services/sound.service';
import { NoiseFilterService } from './services/noise-filter.service';
import { QuakeDetectService } from './services/quake-detect.service';
import { WavePhysicsService } from './services/wave-physics.service';
import { EstShindoMaskService } from './services/est-shindo-mask.service';
import { Quake, EewEvent, P2pQuake, JmaIntensity, Station, ShakeDetectionEvent } from './models/quake.model';
import { getJmaIntensity, getJmaIntensityLabel, normalizeJmaIntensity } from './utils/jma.utils';
import { HeaderNavComponent } from './components/header-nav';
import { ControlsPanelComponent } from './components/controls-panel';
import { EewBannerComponent } from './components/eew-banner';
import { QuakeDetailPanelComponent } from './components/quake-detail-panel';
import { HistoryDrawerComponent } from './components/history-drawer';
import { GifViewPanelComponent } from './components/gif-view-panel';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderNavComponent,
    ControlsPanelComponent,
    EewBannerComponent,
    QuakeDetailPanelComponent,
    HistoryDrawerComponent,
    GifViewPanelComponent,
  ],
  template: `
    <div class="app-shell" [class.dark-mode]="isDarkMode">
      <app-header-nav
        [activeTab]="activeTab"
        [isDarkMode]="isDarkMode"
        (tabChange)="setActiveTab($event)"
        (themeToggle)="toggleDarkMode()"
        (historyToggle)="toggleHistory()"
        (gifToggle)="toggleGifView()"
      />

      <main class="map-container">
        <div #mapContainer class="map"></div>

        <app-controls-panel
          [activeTab]="activeTab"
          [isDetecting]="isDetecting"
          [stationCount]="stations.length"
          [selectedQuake]="selectedQuake"
          [isSimulating]="isSimulating"
          (detectToggle)="toggleDetection()"
          (simulate)="simulateQuake()"
          (resetView)="resetMapView()"
        />

        <app-eew-banner
          [eewEvents]="activeEewEvents"
          (eventSelect)="selectEewEvent($event)"
        />

        <app-quake-detail-panel
          [quake]="selectedQuake"
          [isOpen]="!!selectedQuake"
          (close)="closeQuakeDetail()"
          (focus)="focusQuake($event)"
        />

        <app-history-drawer
          [isOpen]="isHistoryOpen"
          [history]="quakeHistory"
          (close)="isHistoryOpen = false"
          (select)="selectHistoryQuake($event)"
          (clear)="clearHistory()"
        />

        <app-gif-view-panel
          [isOpen]="isGifViewOpen"
          [gifUrl]="currentGifUrl"
          (close)="isGifViewOpen = false"
        />

        <div class="status-bar">
          <span>{{ statusMessage }}</span>
          <span *ngIf="lastUpdate">업데이트: {{ lastUpdate | date:'HH:mm:ss' }}</span>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .app-shell { width: 100%; height: 100%; position: relative; overflow: hidden; }
    .map-container, .map { width: 100%; height: 100%; position: relative; }
    .status-bar { position: absolute; left: 12px; bottom: 12px; z-index: 10; display: flex; gap: 12px; padding: 6px 10px; border-radius: 6px; background: rgba(0,0,0,.65); color: #fff; font-size: 12px; pointer-events: none; }
  `]
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private readonly http = inject(HttpClient);
  private readonly mapService = inject(MapService);
  private readonly quakeDataService = inject(QuakeDataService);
  private readonly quakeHistoryService = inject(QuakeHistoryService);
  private readonly p2pQuakeService = inject(P2pQuakeService);
  private readonly wolfxEewService = inject(WolfxEewService);
  private readonly notificationService = inject(NotificationService);
  private readonly soundService = inject(SoundService);
  private readonly noiseFilterService = inject(NoiseFilterService);
  private readonly quakeDetectService = inject(QuakeDetectService);
  private readonly wavePhysicsService = inject(WavePhysicsService);
  private readonly estShindoMaskService = inject(EstShindoMaskService);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  activeTab: 'live' | 'eew' | 'history' = 'live';
  isDarkMode = false;
  isHistoryOpen = false;
  isGifViewOpen = false;
  isDetecting = false;
  isSimulating = false;
  statusMessage = '초기화 중...';
  lastUpdate: Date | null = null;
  currentGifUrl = '';

  stations: Station[] = [];
  quakeHistory: Quake[] = [];
  selectedQuake: Quake | null = null;
  activeEewEvents: EewEvent[] = [];

  private mapReady = false;
  private map: any = null;
  private realtimeTimer: ReturnType<typeof setInterval> | null = null;
  private eewTimer: ReturnType<typeof setInterval> | null = null;
  private historyTimer: ReturnType<typeof setInterval> | null = null;
  private currentImageUrl = '';
  private previousStationValues = new Map<string, number>();
  private readonly imageCache = new Map<string, ImageData>();
  private readonly detectionEvents: ShakeDetectionEvent[] = [];

  async ngAfterViewInit(): Promise<void> {
    await this.initializeApplication();
  }

  ngOnDestroy(): void {
    this.stopRealtimePolling();
    this.stopEewPolling();
    this.stopHistoryPolling();
    this.destroy$.next();
    this.destroy$.complete();
    this.mapService.destroy();
  }

  private async initializeApplication(): Promise<void> {
    try {
      this.statusMessage = '지도 초기화 중...';
      await this.initializeMap();
      await this.loadInitialData();
      this.restoreApplicationState();
      this.registerRealtimeUpdates();
      this.statusMessage = '준비 완료';
      this.lastUpdate = new Date();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Application initialization failed:', error);
      this.statusMessage = '초기화 실패';
    }
  }

  private async initializeMap(): Promise<void> {
    this.map = await this.mapService.initialize(this.mapContainer.nativeElement, this.isDarkMode);
    this.mapReady = true;
    this.registerMapEvents();
  }

  private async loadInitialData(): Promise<void> {
    const [stations, history] = await Promise.all([
      firstValueFrom(this.quakeDataService.getStations()),
      firstValueFrom(this.quakeHistoryService.loadHistory())
    ]);
    this.stations = stations ?? [];
    this.quakeHistory = history ?? [];
    this.updateMapData();
  }

  private restoreApplicationState(): void {
    try {
      const savedTheme = localStorage.getItem('darkMode');
      if (savedTheme !== null) this.isDarkMode = savedTheme === 'true';
      const savedTab = localStorage.getItem('activeTab');
      if (savedTab === 'live' || savedTab === 'eew' || savedTab === 'history') this.activeTab = savedTab;
    } catch (error) {
      console.warn('Failed to restore application state:', error);
    }
  }

  private registerRealtimeUpdates(): void {
    this.stopRealtimePolling();
    this.realtimeTimer = setInterval(() => {
      void this.updateRealtimeData();
    }, 1000);
    this.startEewPolling();
    this.startHistoryPolling();
  }

  private async updateRealtimeData(): Promise<void> {
    if (!this.mapReady) return;
    try {
      const data = await firstValueFrom(this.quakeDataService.getRealtimeData());
      await this.processRealtimeData(data);
      this.lastUpdate = new Date();
      this.zone.run(() => this.cdr.markForCheck());
    } catch (error) {
      console.error('Realtime update failed:', error);
    }
  }

  private async processRealtimeData(data: any): Promise<void> {
    if (!data) return;
    const stations = this.quakeDataService.normalizeStations(data);
    if (stations.length) {
      this.stations = stations;
      this.updateMapData();
      if (this.isDetecting) await this.detectShaking(stations);
    }
  }

  private async detectShaking(stations: Station[]): Promise<void> {
    const detections = this.quakeDetectService.detect(stations, this.previousStationValues);
    for (const detection of detections) {
      this.detectionEvents.push(detection);
      this.handleShakeDetection(detection);
    }
    this.previousStationValues = new Map(stations.map(station => [station.code, station.value ?? 0]));
  }

  private handleShakeDetection(event: ShakeDetectionEvent): void {
    const filtered = this.noiseFilterService.filter(event);
    if (!filtered) return;
    const quake = this.quakeDetectService.toQuake(filtered);
    if (!quake) return;
    this.mergeQuake(quake);
    this.soundService.play('Shindo');
    this.notificationService.notify(quake);
    if (quake.location) this.focusQuake(quake);
  }

  private mergeQuake(quake: Quake): void {
    const index = this.quakeHistory.findIndex(item => item.id === quake.id);
    if (index >= 0) this.quakeHistory[index] = { ...this.quakeHistory[index], ...quake };
    else this.quakeHistory.unshift(quake);
    this.quakeHistory = this.quakeHistory.slice(0, 100);
    this.quakeHistoryService.saveHistory(this.quakeHistory);
  }

  private startEewPolling(): void {
    this.stopEewPolling();
    this.eewTimer = setInterval(() => void this.updateEew(), 1000);
  }

  private async updateEew(): Promise<void> {
    try {
      const events = await firstValueFrom(this.wolfxEewService.getActiveEvents());
      this.activeEewEvents = events ?? [];
      this.updateEewMap();
    } catch (error) {
      console.error('EEW update failed:', error);
    }
  }

  private startHistoryPolling(): void {
    this.stopHistoryPolling();
    this.historyTimer = setInterval(() => void this.refreshHistory(), 10000);
  }

  private async refreshHistory(): Promise<void> {
    try {
      const history = await firstValueFrom(this.quakeHistoryService.loadHistory());
      this.quakeHistory = history ?? [];
    } catch (error) {
      console.error('History refresh failed:', error);
    }
  }

  private registerMapEvents(): void {
    if (!this.map) return;
    this.mapService.on('click', (event: any) => this.handleMapClick(event));
    this.mapService.on('moveend', () => this.handleMapMoveEnd());
  }

  private handleMapClick(event: any): void {
    const quake = this.mapService.getQuakeAtPoint(event?.point);
    if (quake) this.selectQuake(quake);
  }

  private handleMapMoveEnd(): void {
    this.updateMapPadding();
  }

  private updateMapPadding(): void {
    this.mapService.setPadding({ top: 16, right: 16, bottom: 16, left: 266 });
  }

  private updateMapData(): void {
    if (!this.mapReady) return;
    this.mapService.updateStations(this.stations);
    this.mapService.updateHistory(this.quakeHistory);
  }

  private updateEewMap(): void {
    if (!this.mapReady) return;
    this.mapService.updateEew(this.activeEewEvents);
  }

  setActiveTab(tab: 'live' | 'eew' | 'history'): void {
    this.activeTab = tab;
    localStorage.setItem('activeTab', tab);
    this.cdr.markForCheck();
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', String(this.isDarkMode));
    this.mapService.setTheme(this.isDarkMode);
  }

  toggleHistory(): void {
    this.isHistoryOpen = !this.isHistoryOpen;
  }

  toggleGifView(): void {
    this.isGifViewOpen = !this.isGifViewOpen;
  }

  toggleDetection(): void {
    this.isDetecting = !this.isDetecting;
    if (!this.isDetecting) this.previousStationValues.clear();
    this.statusMessage = this.isDetecting ? '흔들림 감지 활성화' : '흔들림 감지 비활성화';
  }

  simulateQuake(): void {
    if (this.isSimulating) return;
    this.isSimulating = true;
    try {
      const quake = this.quakeDetectService.createSimulation();
      this.mergeQuake(quake);
      this.selectQuake(quake);
      this.soundService.play('Shindo');
      this.notificationService.notify(quake);
    } finally {
      this.isSimulating = false;
    }
  }

  resetMapView(): void {
    this.mapService.resetView();
  }

  selectQuake(quake: Quake): void {
    this.selectedQuake = quake;
    if (quake.location) this.focusQuake(quake);
  }

  closeQuakeDetail(): void {
    this.selectedQuake = null;
  }

  focusQuake(quake: Quake): void {
    if (!quake.location) return;
    this.mapService.focus([quake.location.longitude, quake.location.latitude], 8);
  }

  selectHistoryQuake(quake: Quake): void {
    this.selectQuake(quake);
    this.isHistoryOpen = false;
  }

  clearHistory(): void {
    this.quakeHistory = [];
    this.quakeHistoryService.clearHistory();
    this.updateMapData();
  }

  selectEewEvent(event: EewEvent): void {
    if (event.location) this.mapService.focus([event.location.longitude, event.location.latitude], 7);
  }

  private stopRealtimePolling(): void {
    if (this.realtimeTimer) {
      clearInterval(this.realtimeTimer);
      this.realtimeTimer = null;
    }
  }

  private stopEewPolling(): void {
    if (this.eewTimer) {
      clearInterval(this.eewTimer);
      this.eewTimer = null;
    }
  }

  private stopHistoryPolling(): void {
    if (this.historyTimer) {
      clearInterval(this.historyTimer);
      this.historyTimer = null;
    }
  }

  @HostListener('window:beforeunload')
  handleBeforeUnload(): void {
    this.stopRealtimePolling();
    this.stopEewPolling();
    this.stopHistoryPolling();
  }
}
