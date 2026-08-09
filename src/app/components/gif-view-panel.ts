import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import type { EEWMessage } from '../models/quake.model';

@Component({
  selector: 'app-gif-view-panel',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="absolute top-20 right-4 z-20 flex flex-col items-end gap-2 max-w-[360px] sm:max-w-[400px] max-h-[calc(100vh-6rem)]">
      @if (currentGifUrl()) {
        <div 
          [class]="'border rounded-xl shadow-xl overflow-y-auto transition-all duration-300 origin-top-right flex flex-col custom-scrollbar ' + (isDarkMode() ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-white') + (isGifExpanded() ? ' w-[360px] sm:w-[400px]' : ' w-48')"
        >
          <div 
            [class]="'px-2.5 py-1 text-xs font-semibold border-b flex justify-between items-center transition-colors cursor-pointer ' + (isDarkMode() ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200')"
            (click)="toggleGifExpanded.emit()"
          >
            <span>실시간 강진 모니터 (진도)</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              @if (isGifExpanded()) {
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
              } @else {
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
              }
            </svg>
          </div>
          
          <div class="relative w-full">
            <img [src]="currentGifUrl()" alt="Realtime Earthquake Monitor GIF" class="w-full h-auto bg-slate-900 cursor-pointer" (click)="toggleGifExpanded.emit()" referrerpolicy="no-referrer" />
            @if (estshindoGifUrl()) {
              <img [src]="estshindoGifUrl()" alt="EEW Overlay" class="absolute top-0 left-0 w-full h-auto pointer-events-none" referrerpolicy="no-referrer" />
            }
          </div>
          
          @if (acmapGifUrl()) {
            <div 
              [class]="'px-2.5 py-1 text-xs font-semibold border-y flex justify-between items-center transition-colors cursor-pointer ' + (isDarkMode() ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200')"
              (click)="toggleGifExpanded.emit()"
            >
              <span>실시간 강진 모니터 (가속도)</span>
            </div>
            <img [src]="acmapGifUrl()" alt="PGA Monitor GIF" class="w-full h-auto bg-slate-900 cursor-pointer" (click)="toggleGifExpanded.emit()" referrerpolicy="no-referrer" />
          }
        </div>
      }

      <!-- Small EEW Card under GIF when EEW is active -->
      @if (eew(); as eewData) {
        @if (isActiveEEW(eewData)) {
          <div [class]="'w-full border rounded-xl shadow-lg p-2.5 sm:p-3 transition-all flex flex-col gap-1.5 ' + (eewData.isWarn ? 'bg-red-950/90 border-red-500 text-white animate-pulse' : (isDarkMode() ? 'bg-zinc-900/95 border-amber-500/80 text-zinc-100' : 'bg-white/95 border-amber-500 text-zinc-800'))">
            <div class="flex items-center justify-between gap-2 border-b pb-1 border-white/10 dark:border-white/10">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span class="font-extrabold text-xs sm:text-sm text-red-500">{{ eewData.Title || '緊急地震速報' }}</span>
              </div>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-black/30 text-zinc-200 font-mono font-bold">{{ eewData.Issue?.Status || '속보' }}</span>
            </div>
            <div class="flex flex-col text-xs gap-0.5">
              <div class="font-bold text-amber-400 dark:text-amber-300 truncate">
                📍 {{ eewData.Hypocenter || '진원지 미상' }} <span class="text-[11px] font-normal text-zinc-300">(깊이: {{ eewData.Depth }}km)</span>
              </div>
              <div class="flex items-center justify-between mt-1 pt-1 border-t border-black/10 dark:border-white/10 font-mono">
                <span>규모: <strong class="text-red-500 font-extrabold text-sm">M{{ eewData.Magunitude }}</strong></span>
                <span>최대진도: <strong class="text-orange-400 font-extrabold text-sm">{{ eewData.MaxIntensity }}</strong></span>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class GifViewPanelComponent {
  currentGifUrl = input<string | null>(null);
  acmapGifUrl = input<string | null>(null);
  estshindoGifUrl = input<string | null>(null);
  isGifExpanded = input<boolean>(false);
  eew = input<EEWMessage | null>(null);
  isDarkMode = input<boolean>(false);

  toggleGifExpanded = output<void>();
  
  gifType = signal<'jma' | 'acmap'>('jma');
  
  displayUrl = computed(() => {
    return this.gifType() === 'jma' ? this.currentGifUrl() : (this.acmapGifUrl() || this.currentGifUrl());
  });

  isActiveEEW(eew: EEWMessage | null): boolean {
    if (!eew) return false;
    if (eew.isCancel) return false;
    const timeStr = eew.OriginTime || eew.AnnouncedTime || eew.ReportTime;
    if (!timeStr) return true;
    const clean = String(timeStr).replace(/[^\d]/g, '');
    if (clean.length >= 12) {
      const yyyy = parseInt(clean.substring(0, 4), 10);
      const mm = parseInt(clean.substring(4, 6), 10) - 1;
      const dd = parseInt(clean.substring(6, 8), 10);
      const hh = parseInt(clean.substring(8, 10), 10);
      const mi = parseInt(clean.substring(10, 12), 10);
      const ss = clean.length >= 14 ? parseInt(clean.substring(12, 14), 10) : 0;
      const origin = Date.UTC(yyyy, mm, dd, hh - 9, mi, ss);
      const elapsed = (Date.now() - origin) / 1000;
      if (elapsed >= 240) return false;
    }
    return true;
  }
}
