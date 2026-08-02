import { Component, ChangeDetectionStrategy, input, output, signal, OnInit } from '@angular/core';

export interface WidgetSettings {
  showResetMap: boolean;
  showFocusGrid: boolean;
  showEewSim: boolean;
  showWaveRingsToggle: boolean;
  showDarkModeToggle: boolean;
  showIntensityMode: boolean;
  showSoundPreview: boolean;
}

@Component({
  selector: 'app-controls-panel',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      [style.transform]="'translate(' + position().x + 'px, ' + position().y + 'px)'"
      class="absolute top-20 left-4 z-20 flex flex-col gap-2 select-none touch-none transition-shadow">

      <!-- Draggable Header Bar -->
      <div 
        (mousedown)="startDrag($event)"
        (touchstart)="startDrag($event)"
        [class]="'backdrop-blur-md border rounded-xl shadow-lg px-3 py-1.5 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-all ' + (isDarkMode() ? 'bg-zinc-800/90 border-zinc-700 text-zinc-200' : 'bg-white/90 border-zinc-200 text-zinc-800')">
        <div class="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
          <span class="text-base leading-none cursor-grab active:cursor-grabbing text-zinc-400">⋮⋮</span>
          <span>지도 도구</span>
        </div>

        <div class="flex items-center gap-1">
          <!-- Position Reset Button (when moved) -->
          @if (position().x !== 0 || position().y !== 0) {
            <button 
              (click)="resetPosition($event)" 
              title="위치 초기화"
              class="p-1 rounded-md text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 cursor-pointer">
              ↺
            </button>
          }
          <!-- Settings Button -->
          <button 
            (click)="toggleSettingsModal($event)" 
            title="UI 커스터마이징"
            class="p-1 rounded-md text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <!-- Minimize Toggle Button -->
          <button 
            (click)="toggleCollapsed($event)" 
            title="접기 / 펼치기"
            class="p-1 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              @if (isCollapsed()) {
                <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
              } @else {
                <path d="M18 15l-6-6-6 6"/>
              }
            </svg>
          </button>
        </div>
      </div>

      <!-- Control Items List (when expanded) -->
      @if (!isCollapsed()) {
        <div class="flex flex-col gap-2">
          <!-- Reset Map View Button -->
          @if (widgets().showResetMap) {
            <button 
              (click)="resetMapView.emit()"
              [class]="'backdrop-blur-md border rounded-xl shadow-lg px-4 py-2 font-bold transition-all flex items-center gap-2 text-sm cursor-pointer ' + (isDarkMode() ? 'bg-zinc-800/90 border-zinc-700 text-zinc-200 hover:bg-zinc-700' : 'bg-white/90 border-zinc-200 text-zinc-800 hover:bg-zinc-100')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0"></path><path d="M21 21l-6-6"></path><path d="M10 7v6"></path><path d="M7 10h6"></path></svg>
              전체 보기
            </button>
          }

          <!-- Focus Detected Grid Button -->
          @if (widgets().showFocusGrid) {
            <button 
              (click)="focusDetectedGrid.emit()"
              [class]="'backdrop-blur-md border rounded-xl shadow-lg px-3.5 py-2 font-bold transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer ' + (hasDetectedGrids() ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-900/40 animate-pulse' : (isDarkMode() ? 'bg-zinc-800/90 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white/90 border-zinc-200 text-zinc-700 hover:bg-zinc-100'))">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="7"/></svg>
              <span>감지 격자로 이동</span>
            </button>
          }

          <!-- EEW P/S Wave Simulation Button -->
          @if (widgets().showEewSim) {
            <button 
              (click)="triggerEewSimulation.emit()"
              [class]="'backdrop-blur-md border rounded-xl shadow-lg px-3 py-2 font-bold transition-all flex items-center gap-1.5 text-xs cursor-pointer ' + (isDarkMode() ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30' : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100')">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/></svg>
              P/S파 모의 시뮬레이션
            </button>
          }

          <!-- Toggle P/S Waves Button -->
          @if (widgets().showWaveRingsToggle) {
            <button 
              (click)="toggleWaveRings.emit()"
              [class]="'backdrop-blur-md border rounded-xl shadow-lg px-3 py-2 font-bold transition-all flex items-center gap-1.5 text-xs cursor-pointer ' + (showWaveRings() ? (isDarkMode() ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 hover:bg-blue-500/30' : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100') : (isDarkMode() ? 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-300 text-zinc-500 hover:bg-zinc-200'))">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9" stroke-dasharray="2 2" />
                <circle cx="12" cy="12" r="5" />
              </svg>
              P/S파 {{ showWaveRings() ? '표시 ON' : '표시 OFF' }}
            </button>
          }

          <!-- Toggle Dark Mode Button -->
          @if (widgets().showDarkModeToggle) {
            <button 
              (click)="toggleDarkMode.emit()"
              [class]="'backdrop-blur-md border rounded-xl shadow-lg px-4 py-2 font-bold transition-all flex items-center gap-2 text-sm cursor-pointer ' + (isDarkMode() ? 'bg-zinc-800/90 border-zinc-700 text-zinc-200 hover:bg-zinc-700' : 'bg-white/90 border-zinc-200 text-zinc-800 hover:bg-zinc-100')">
              @if (isDarkMode()) {
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
                라이트 모드
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
                다크 모드
              }
            </button>
          }

          <!-- Intensity Map Display Mode Toggle (Earthquake Tab) -->
          @if (activeTab() === 'earthquake' && widgets().showIntensityMode) {
            <div [class]="'backdrop-blur-md border rounded-xl shadow-lg p-2 flex flex-col gap-1.5 transition-all w-52 ' + (isDarkMode() ? 'bg-zinc-800/90 border-zinc-700' : 'bg-white/90 border-zinc-200')">
              <div [class]="'text-[11px] font-bold flex items-center justify-between px-1 ' + (isDarkMode() ? 'text-zinc-300' : 'text-zinc-600')">
                <span>지도 진도 표시</span>
                <span class="text-[10px] text-zinc-400 font-normal">토글 선택</span>
              </div>
              <div class="grid grid-cols-3 gap-1 text-[11px] font-bold">
                <button 
                  (click)="setIntensityDisplayMode.emit('areas')"
                  [title]="'지역별 면적 색상 채우기만 표시'"
                  [class]="'py-1.5 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ' + (intensityDisplayMode() === 'areas' ? 'bg-indigo-600 text-white font-black shadow-sm' : (isDarkMode() ? 'bg-zinc-700/60 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'))">
                  <span>🗺️</span>
                  <span>지역</span>
                </button>
                <button 
                  (click)="setIntensityDisplayMode.emit('stations')"
                  [title]="'관측소 개별 점 진도만 표시'"
                  [class]="'py-1.5 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ' + (intensityDisplayMode() === 'stations' ? 'bg-indigo-600 text-white font-black shadow-sm' : (isDarkMode() ? 'bg-zinc-700/60 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'))">
                  <span>📍</span>
                  <span>관측소</span>
                </button>
                <button 
                  (click)="setIntensityDisplayMode.emit('both')"
                  [title]="'지역 색상과 관측소 점 둘 다 표시'"
                  [class]="'py-1.5 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ' + (intensityDisplayMode() === 'both' ? 'bg-indigo-600 text-white font-black shadow-sm' : (isDarkMode() ? 'bg-zinc-700/60 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'))">
                  <span>✨</span>
                  <span>둘 다</span>
                </button>
              </div>
            </div>
          }

          <!-- Sound Preview -->
          @if (widgets().showSoundPreview) {
            <div [class]="'backdrop-blur-md border rounded-xl shadow-lg p-3 flex flex-col gap-2 transition-all max-w-[200px] ' + (isDarkMode() ? 'bg-zinc-800/90 border-zinc-700' : 'bg-white/90 border-zinc-200')">
              <span [class]="'text-xs font-bold flex items-center gap-1.5 ' + (isDarkMode() ? 'text-zinc-300' : 'text-zinc-600')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                알림음 미리듣기
              </span>
              <button 
                (click)="playShindoAudio.emit()" 
                class="w-full py-1.5 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                신규 지진 알림음 듣기
              </button>
              <div class="grid grid-cols-3 gap-1">
                <button (click)="playDetectionSound.emit(1)" class="px-1.5 py-1 text-[11px] rounded-md font-bold transition-all cursor-pointer bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/30">진도 1</button>
                <button (click)="playDetectionSound.emit(2)" class="px-1.5 py-1 text-[11px] rounded-md font-bold transition-all cursor-pointer bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30">진도 2</button>
                <button (click)="playDetectionSound.emit(3)" class="px-1.5 py-1 text-[11px] rounded-md font-bold transition-all cursor-pointer bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/30">진도 3</button>
                <button (click)="playDetectionSound.emit(4)" class="px-1.5 py-1 text-[11px] rounded-md font-bold transition-all cursor-pointer bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30">진도 4</button>
                <button (click)="playDetectionSound.emit('5-')" class="px-1.5 py-1 text-[11px] rounded-md font-bold transition-all cursor-pointer bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/30">진도 5-</button>
                <button (click)="playDetectionSound.emit('5+')" class="px-1.5 py-1 text-[11px] rounded-md font-bold transition-all cursor-pointer bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/30">진도 5+</button>
                <button (click)="playDetectionSound.emit('6-')" class="px-1.5 py-1 text-[11px] rounded-md font-bold transition-all cursor-pointer bg-red-600/20 text-red-600 dark:text-red-400 hover:bg-red-600/30">진도 6-</button>
                <button (click)="playDetectionSound.emit('6+')" class="px-1.5 py-1 text-[11px] rounded-md font-bold transition-all cursor-pointer bg-red-700/20 text-red-700 dark:text-red-300 hover:bg-red-700/30">진도 6+</button>
                <button (click)="playDetectionSound.emit(7)" class="px-1.5 py-1 text-[11px] rounded-md font-bold transition-all cursor-pointer bg-purple-600/20 text-purple-600 dark:text-purple-400 hover:bg-purple-600/30">진도 7</button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- UI Customizer Modal -->
    @if (showSettingsModal()) {
      <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div [class]="'w-full max-w-sm rounded-2xl shadow-2xl border p-5 flex flex-col gap-4 animate-in fade-in zoom-in duration-150 ' + (isDarkMode() ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800')">
          <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div class="flex items-center gap-2">
              <span class="text-xl">⚙️</span>
              <h3 class="font-bold text-base">지도 도구 커스터마이징</h3>
            </div>
            <button 
              (click)="showSettingsModal.set(false)"
              class="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
              ✕
            </button>
          </div>

          <p class="text-xs text-zinc-500 dark:text-zinc-400">
            원하는 지도 제어 버튼 항목만 켜고 끌 수 있습니다. 패널 헤더를 마우스로 드래그하면 위치도 변경할 수 있습니다.
          </p>

          <div class="flex flex-col gap-2.5 text-xs font-semibold">
            <label class="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer">
              <span>🔍 전체 보기 버튼</span>
              <input type="checkbox" [checked]="widgets().showResetMap" (change)="toggleWidget('showResetMap')" class="accent-indigo-600 w-4 h-4 cursor-pointer" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer">
              <span>🎯 감지 격자로 이동 버튼</span>
              <input type="checkbox" [checked]="widgets().showFocusGrid" (change)="toggleWidget('showFocusGrid')" class="accent-indigo-600 w-4 h-4 cursor-pointer" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer">
              <span>🌊 P/S파 모의 시뮬레이션</span>
              <input type="checkbox" [checked]="widgets().showEewSim" (change)="toggleWidget('showEewSim')" class="accent-indigo-600 w-4 h-4 cursor-pointer" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer">
              <span>◎ P/S파 표시 토글</span>
              <input type="checkbox" [checked]="widgets().showWaveRingsToggle" (change)="toggleWidget('showWaveRingsToggle')" class="accent-indigo-600 w-4 h-4 cursor-pointer" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer">
              <span>☀️ 다크 / 라이트 모드 토글</span>
              <input type="checkbox" [checked]="widgets().showDarkModeToggle" (change)="toggleWidget('showDarkModeToggle')" class="accent-indigo-600 w-4 h-4 cursor-pointer" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer">
              <span>🗺️ 지도 진도 표시 모드 (지역/관측소)</span>
              <input type="checkbox" [checked]="widgets().showIntensityMode" (change)="toggleWidget('showIntensityMode')" class="accent-indigo-600 w-4 h-4 cursor-pointer" />
            </label>

            <label class="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer">
              <span>🔊 알림음 미리듣기 패널</span>
              <input type="checkbox" [checked]="widgets().showSoundPreview" (change)="toggleWidget('showSoundPreview')" class="accent-indigo-600 w-4 h-4 cursor-pointer" />
            </label>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button 
              (click)="resetAllWidgets()"
              class="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer font-bold">
              전체 초기화
            </button>
            <button 
              (click)="showSettingsModal.set(false)"
              class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer">
              완료
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ControlsPanelComponent implements OnInit {
  activeTab = input<'earthquake' | 'realtime'>('earthquake');
  hasDetectedGrids = input<boolean>(false);
  showWaveRings = input<boolean>(true);
  isDarkMode = input<boolean>(false);
  intensityDisplayMode = input<'areas' | 'stations' | 'both'>('both');

  resetMapView = output<void>();
  focusDetectedGrid = output<void>();
  triggerEewSimulation = output<void>();
  toggleWaveRings = output<void>();
  toggleDarkMode = output<void>();
  setIntensityDisplayMode = output<'areas' | 'stations' | 'both'>();
  playDetectionSound = output<number | string>();
  playShindoAudio = output<void>();

  isCollapsed = signal<boolean>(false);
  showSettingsModal = signal<boolean>(false);

  position = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private initialPos = { x: 0, y: 0 };

  widgets = signal<WidgetSettings>({
    showResetMap: true,
    showFocusGrid: true,
    showEewSim: true,
    showWaveRingsToggle: true,
    showDarkModeToggle: true,
    showIntensityMode: true,
    showSoundPreview: true
  });

  ngOnInit() {
    this.loadSavedState();
  }

  toggleCollapsed(e: Event) {
    e.stopPropagation();
    this.isCollapsed.update(v => !v);
  }

  toggleSettingsModal(e: Event) {
    e.stopPropagation();
    this.showSettingsModal.update(v => !v);
  }

  toggleWidget(key: keyof WidgetSettings) {
    this.widgets.update(w => {
      const updated = { ...w, [key]: !w[key] };
      try {
        localStorage.setItem('quake_widget_settings', JSON.stringify(updated));
      } catch {
        // ignore storage quota / sandbox error
      }
      return updated;
    });
  }

  resetAllWidgets() {
    const def: WidgetSettings = {
      showResetMap: true,
      showFocusGrid: true,
      showEewSim: true,
      showWaveRingsToggle: true,
      showDarkModeToggle: true,
      showIntensityMode: true,
      showSoundPreview: true
    };
    this.widgets.set(def);
    try {
      localStorage.removeItem('quake_widget_settings');
    } catch {
      // ignore
    }
  }

  resetPosition(e: Event) {
    e.stopPropagation();
    this.position.set({ x: 0, y: 0 });
    try {
      localStorage.removeItem('quake_panel_pos');
    } catch {
      // ignore
    }
  }

  startDrag(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    this.isDragging = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    this.dragStart = { x: clientX, y: clientY };
    this.initialPos = { ...this.position() };

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      const curX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const dx = curX - this.dragStart.x;
      const dy = curY - this.dragStart.y;

      this.position.set({
        x: this.initialPos.x + dx,
        y: this.initialPos.y + dy
      });
    };

    const onEnd = () => {
      if (this.isDragging) {
        this.isDragging = false;
        try {
          localStorage.setItem('quake_panel_pos', JSON.stringify(this.position()));
        } catch {
          // ignore
        }
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }

  private loadSavedState() {
    try {
      const posStr = localStorage.getItem('quake_panel_pos');
      if (posStr) {
        const parsed = JSON.parse(posStr);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          this.position.set(parsed);
        }
      }

      const widgetStr = localStorage.getItem('quake_widget_settings');
      if (widgetStr) {
        const parsed = JSON.parse(widgetStr);
        this.widgets.update(w => ({ ...w, ...parsed }));
      }
    } catch {
      // ignore
    }
  }
}
