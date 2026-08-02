import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header-nav',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Time Display (Visible in Realtime Tab) -->
    @if (activeTab() === 'realtime') {
      <div class="absolute top-4 left-4 z-20 hidden sm:block">
        <div [class]="'backdrop-blur-md border rounded-xl shadow-xl px-4 py-2 font-mono text-base sm:text-lg flex items-center gap-2.5 transition-colors ' + (isDarkMode() ? 'bg-zinc-900/90 border-zinc-700/80 text-zinc-100' : 'bg-white/90 border-zinc-200/80 text-zinc-800')">
          <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          @if (latestTime()) {
            {{ latestTime() }}
          } @else {
            <span class="text-zinc-400">시간 로딩 중...</span>
          }
        </div>
      </div>
    }

    <!-- Top Center Mode Selector (Tab Bar) -->
    <div class="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center bg-zinc-900/85 dark:bg-zinc-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-700/80 shadow-2xl">
      <button 
        (click)="tabChange.emit('earthquake')"
        [class]="'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ' + (activeTab() === 'earthquake' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-105' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/></svg>
        <span>지진 예보구역 탭</span>
        @if (p2pHistoryCount() > 0) {
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 text-rose-200 font-mono border border-white/10">{{ p2pHistoryCount() }}</span>
        }
      </button>
      <button 
        (click)="tabChange.emit('realtime')"
        [class]="'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ' + (activeTab() === 'realtime' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50')">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>실시간 관측소 모니터</span>
      </button>

      <button 
        (click)="toggleHistory.emit()"
        class="ml-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 cursor-pointer shadow-sm border border-zinc-200/80">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
        <span>이력 ({{ p2pHistoryCount() }})</span>
      </button>
    </div>
  `
})
export class HeaderNavComponent {
  activeTab = input<'earthquake' | 'realtime'>('earthquake');
  p2pHistoryCount = input<number>(0);
  latestTime = input<string>('');
  isDarkMode = input<boolean>(false);

  tabChange = output<'earthquake' | 'realtime'>();
  toggleHistory = output<void>();
}
