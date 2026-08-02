import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { P2PQuakeItem, ProcessedHistoryItem } from '../models/quake.model';
import { getJindoBadgeStyle } from '../utils/jma.utils';

@Component({
  selector: 'app-history-drawer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="absolute bottom-24 left-4 z-30 w-[calc(100%-2rem)] max-w-md pointer-events-auto">
      <div [class]="'backdrop-blur-md border rounded-2xl shadow-2xl p-4 flex flex-col gap-3 transition-colors max-h-[65vh] ' + (isDarkMode() ? 'bg-zinc-900/95 border-zinc-700/90 text-zinc-100' : 'bg-white/95 border-zinc-200/90 text-zinc-800')">
        
        <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
            <h2 class="font-extrabold text-base">최근 지진 발생 이력 <span class="text-xs font-normal text-zinc-500 dark:text-zinc-400">(최대 {{ historyList().length }}건)</span></h2>
          </div>
          <div class="flex items-center gap-2">
            <button 
              (click)="toggleGroupUnknown.emit()"
              [class]="'text-[11px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ' + (groupUnknown() ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/50' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-300 dark:border-zinc-700')">
              그룹화 {{ groupUnknown() ? 'ON' : 'OFF' }}
            </button>
            <button 
              (click)="closeDrawer.emit()"
              class="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- List of items with grouping for unknown/prompt quakes -->
        <div class="overflow-y-auto pr-1 flex flex-col gap-2 divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[50vh]">
          @for (entry of processedList(); track entry.isGroup ? entry.groupKey : (entry.item?.id || entry.item?.time || entry.item?.earthquake?.time || $index)) {
            @if (!entry.isGroup && entry.item) {
              @let item = entry.item;
              @let bStyle = getJindoBadgeStyle(item.earthquake?.maxScale);
              @let isSelected = selectedQuake()?.id === item.id;
              <div 
                (click)="selectQuake.emit(item)"
                [class]="'pt-2.5 first:pt-0 pb-2 px-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 border ' + (isSelected ? 'bg-indigo-500/10 border-indigo-500/60 shadow-sm' : 'border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/60')">
                
                <div class="flex flex-col min-w-0 flex-1 gap-0.5">
                  <div class="flex items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    <span>{{ item.earthquake?.time || item.time }}</span>
                    @if (item.earthquake?.domesticTsunami && item.earthquake?.domesticTsunami !== 'None') {
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-bold">해일</span>
                    }
                  </div>
                  <div class="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {{ item.earthquake?.hypocenter?.name || '진원지 미상' }}
                  </div>
                  <div class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span>규모: <strong class="text-rose-500 dark:text-rose-400">M{{ item.earthquake?.hypocenter?.magnitude === -1 ? '불명' : item.earthquake?.hypocenter?.magnitude }}</strong></span>
                    <span>•</span>
                    <span>깊이: {{ item.earthquake?.hypocenter?.depth === -1 ? '불명' : (item.earthquake?.hypocenter?.depth === 0 ? '매우 얕음' : item.earthquake?.hypocenter?.depth + 'km') }}</span>
                  </div>
                </div>

                <!-- Shindo Badge -->
                <div [class]="'px-2.5 py-1 rounded-lg border text-xs font-black shrink-0 ' + bStyle.bg + ' ' + bStyle.text + ' ' + bStyle.border">
                  {{ bStyle.label }}
                </div>
              </div>
            } @else if (entry.isGroup) {
              @let group = entry;
              @let bStyle = getJindoBadgeStyle(group.maxScale);
              @let expanded = isGroupExpanded(group.groupKey || '');

              <div class="pt-2.5 first:pt-0 pb-2 px-2.5 rounded-xl border transition-all bg-indigo-500/5 border-indigo-500/30 flex flex-col gap-2">
                <!-- Group Header Row -->
                <div 
                  (click)="selectQuake.emit(group.latestItem!)"
                  class="flex items-center justify-between gap-3 cursor-pointer">
                  <div class="flex flex-col min-w-0 flex-1 gap-1">
                    <div class="flex items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      <span class="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">이벤트 그룹</span>
                      <span>{{ group.latestItem?.earthquake?.time || group.latestItem?.time }}</span>
                    </div>
                    <div class="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2 truncate">
                      <span class="truncate">{{ group.latestItem?.earthquake?.hypocenter?.name || '진원지 미상' }} / M{{ group.latestItem?.earthquake?.hypocenter?.magnitude === -1 ? '불명' : group.latestItem?.earthquake?.hypocenter?.magnitude }}</span>
                      <span class="text-xs px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono shrink-0">{{ group.items?.length }}건</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <!-- Shindo Badge -->
                    <div [class]="'px-2 py-1 rounded-lg border text-xs font-black shrink-0 ' + bStyle.bg + ' ' + bStyle.text + ' ' + bStyle.border">
                      {{ bStyle.label }}
                    </div>
                    <!-- Toggle Sub-items Button -->
                    <button 
                      (click)="onToggleGroupExpanded(group.groupKey || '', $event)"
                      class="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-bold transition-all cursor-pointer">
                      {{ expanded ? '접기 ▲' : '펼치기 ▼' }}
                    </button>
                  </div>
                </div>

                <!-- Expandable Sub-items -->
                @if (expanded && group.items) {
                  <div class="mt-1 pl-2 border-l-2 border-indigo-500/40 flex flex-col gap-1.5 pt-1">
                    @for (subItem of group.items; track subItem.id || $index) {
                      @let subBStyle = getJindoBadgeStyle(subItem.earthquake?.maxScale);
                      @let subSelected = selectedQuake()?.id === subItem.id;
                      <div 
                        (click)="selectQuake.emit(subItem)"
                        [class]="'p-2 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2 border text-xs ' + (subSelected ? 'bg-indigo-500/20 border-indigo-500' : 'bg-zinc-100/80 dark:bg-zinc-800/80 border-transparent hover:border-indigo-500/40')">
                        <div class="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span class="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{{ subItem.earthquake?.time || subItem.time }}</span>
                          <span class="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {{ subItem.earthquake?.hypocenter?.name || '진원지 미상' }} 
                            @if (subItem.issue?.type === 'ScalePrompt') {
                              <span class="text-[10px] text-amber-500">(진도속보)</span>
                            } @else if (subItem.issue?.type === 'Destination') {
                              <span class="text-[10px] text-emerald-500">(진원정보)</span>
                            }
                          </span>
                        </div>
                        <span [class]="'px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ' + subBStyle.bg + ' ' + subBStyle.text">
                          {{ subBStyle.label }}
                        </span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          }
        </div>
        <div class="mt-4 px-2 pb-4">
          <button
            (click)="loadMore.emit()"
            class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer w-full"
          >
            더 보기
          </button>
        </div>
      </div>
    </div>
  `
})
export class HistoryDrawerComponent {
  historyList = input<P2PQuakeItem[]>([]);
  processedList = input<ProcessedHistoryItem[]>([]);
  selectedQuake = input<P2PQuakeItem | null>(null);
  groupUnknown = input<boolean>(true);
  isDarkMode = input<boolean>(false);
  expandedGroupKeys = input<Set<string>>(new Set<string>());

  selectQuake = output<P2PQuakeItem>();
  toggleGroupUnknown = output<void>();
  toggleGroup = output<{ key: string, event: Event }>();
  closeDrawer = output<void>();
  loadMore = output<void>();

  getJindoBadgeStyle = getJindoBadgeStyle;

  isGroupExpanded(key: string): boolean {
    return this.expandedGroupKeys().has(key);
  }

  onToggleGroupExpanded(key: string, event: Event) {
    event.stopPropagation();
    this.toggleGroup.emit({ key, event });
  }
}
