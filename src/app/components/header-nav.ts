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
        (click)="tabChange.emit('est_shindo_region')"
        [class]="'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ' + (activeTab() === 'est_shindo_region' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-105' : 'text-amber-400/80 hover:text-amber-200 hover:bg-zinc-800/50')">
        <span class="px-1 py-0.2 bg-amber-400/20 text-amber-300 text-[10px] rounded font-mono">실험</span>
        <span>예상진도 행정구역</span>
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

      <!-- Notification Toggle Button -->
      <button 
        (click)="toggleNotification.emit()"
        [title]="notificationPermission() === 'granted' ? (notificationEnabled() ? '브라우저 알림 ON (클릭 시 OFF)' : '브라우저 알림 OFF (클릭 시 ON)') : '브라우저 알림 권한 허용 요청'"
        [class]="'ml-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border ' + 
          (notificationPermission() === 'granted' && notificationEnabled() 
            ? 'bg-emerald-600/90 text-white border-emerald-400 hover:bg-emerald-600' 
            : notificationPermission() === 'denied' 
              ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed' 
              : 'bg-amber-500/90 text-white border-amber-300 hover:bg-amber-500 animate-pulse')">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          @if (notificationPermission() === 'granted' && notificationEnabled()) {
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          } @else {
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>
          }
        </svg>
        <span>
          @if (notificationPermission() === 'granted') {
            {{ notificationEnabled() ? '알림 ON' : '알림 OFF' }}
          } @else if (notificationPermission() === 'denied') {
            알림 차단됨
          } @else {
            알림 허용하기
          }
        </span>
      </button>
    </div>
  `
})
export class HeaderNavComponent {
  activeTab = input<'earthquake' | 'realtime' | 'est_shindo_region'>('earthquake');
  p2pHistoryCount = input<number>(0);
  latestTime = input<string>('');
  isDarkMode = input<boolean>(false);
  notificationPermission = input<NotificationPermission>('default');
  notificationEnabled = input<boolean>(true);

  tabChange = output<'earthquake' | 'realtime' | 'est_shindo_region'>();
  toggleHistory = output<void>();
  toggleNotification = output<void>();
}
