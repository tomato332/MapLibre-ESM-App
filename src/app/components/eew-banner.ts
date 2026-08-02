import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import type { EEWMessage } from '../models/quake.model';

@Component({
  selector: 'app-eew-banner',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (eew(); as data) {
      <div class="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[92%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
        <div [class]="'backdrop-blur-md border-2 rounded-2xl shadow-2xl p-3.5 sm:p-4 flex flex-col gap-2.5 transition-colors relative ' + (data.isWarn ? 'bg-red-950/95 border-red-500 text-white shadow-red-900/40' : (isDarkMode() ? 'bg-zinc-900/95 border-amber-500 text-zinc-100 shadow-amber-900/20' : 'bg-white/95 border-amber-500 text-zinc-800 shadow-amber-500/10'))">
          
          <button 
            (click)="dismiss.emit()"
            class="absolute top-3 right-3 p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="닫기">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div class="flex items-center justify-between gap-3 pr-7">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
              <span class="font-extrabold text-base sm:text-lg tracking-tight text-red-500">{{ data.Title }}</span>
            </div>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-black/20 dark:bg-black/40 font-bold border border-black/10 dark:border-white/10 shrink-0">{{ data.Issue?.Status }}</span>
          </div>
          <div class="text-xs sm:text-sm flex flex-col gap-1">
            <p class="text-[11px] opacity-80">발생시각: <span class="font-mono font-semibold">{{ data.OriginTime }}</span></p>
            <p class="font-bold text-sm sm:text-base text-amber-400 dark:text-amber-300 truncate">📍 {{ data.Hypocenter }} <span class="text-xs font-normal text-zinc-300">(깊이: {{ data.Depth }}km)</span></p>
            <div class="flex items-center justify-between gap-4 pt-1.5 border-t border-black/10 dark:border-white/10">
              <div class="flex items-center gap-4">
                <p class="text-xs sm:text-sm">규모: <span class="font-black text-xl sm:text-2xl text-red-500">M{{ data.Magunitude }}</span></p>
                <p class="text-xs sm:text-sm">최대진도: <span class="font-black text-xl sm:text-2xl text-orange-500">{{ data.MaxIntensity }}</span></p>
              </div>
              <div class="flex items-center gap-1.5">
                <button 
                  (click)="focusEew.emit()" 
                  class="px-2.5 py-1 text-xs rounded-lg font-bold bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer flex items-center gap-1 shadow">
                  📍 EEW 진앙
                </button>
                <button 
                  (click)="focusGrid.emit()" 
                  class="px-2.5 py-1 text-xs rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center gap-1 shadow">
                  🎯 격자 이동
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class EewBannerComponent {
  eew = input<EEWMessage | null>(null);
  isDarkMode = input<boolean>(false);

  dismiss = output<void>();
  focusEew = output<void>();
  focusGrid = output<void>();
}
