import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { P2PQuakeItem } from '../models/quake.model';
import { getJindoBadgeStyle, getTsunamiText, getJindoString } from '../utils/jma.utils';

export interface StationLocation {
  lat: number;
  lon: number;
  name: string;
  pref?: string;
  scale?: number;
}

@Component({
  selector: 'app-quake-detail-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (quake(); as item) {
      <div class="absolute bottom-4 left-4 z-20 w-[calc(100%-2rem)] max-w-md pointer-events-auto">
        <div [class]="'backdrop-blur-md border rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3 transition-colors relative overflow-hidden ' + (isDarkMode() ? 'bg-zinc-900/95 border-zinc-700/80 text-zinc-100' : 'bg-white/95 border-zinc-200/80 text-zinc-800')">
          
          <div class="flex items-start justify-between gap-3">
            <!-- Info Details -->
            <div class="flex flex-col gap-1.5 flex-1 min-w-0">
              <div class="text-xs font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <span>🕒 {{ item.earthquake?.time || item.time }}</span>
              </div>
              
              <h3 class="font-extrabold text-lg sm:text-xl truncate text-zinc-900 dark:text-zinc-100">
                {{ item.earthquake?.hypocenter?.name || '진원지 정보 없음' }}
              </h3>

              <div class="flex items-center gap-3 text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300 mt-1">
                <span class="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                  규모 <strong class="text-rose-500 dark:text-rose-400 font-bold text-sm">M{{ item.earthquake?.hypocenter?.magnitude === -1 ? '불명' : item.earthquake?.hypocenter?.magnitude }}</strong>
                </span>
                <span class="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                  깊이 <strong class="text-zinc-800 dark:text-zinc-200 font-bold">{{ item.earthquake?.hypocenter?.depth === -1 ? '불명' : (item.earthquake?.hypocenter?.depth === 0 ? '매우 얕음' : item.earthquake?.hypocenter?.depth + 'km') }}</strong>
                </span>
              </div>

              <div class="mt-1 text-xs font-semibold flex items-center gap-1.5">
                <span>🌊</span>
                <span [class]="getTsunamiText(item.earthquake?.domesticTsunami).colorClass">
                  {{ getTsunamiText(item.earthquake?.domesticTsunami).text }}
                </span>
              </div>
            </div>

            <!-- JMA Shindo Badge -->
            @let style = getJindoBadgeStyle(item.earthquake?.maxScale);
            <div [class]="'flex flex-col items-center justify-center p-3 rounded-2xl border-2 shadow-lg min-w-[76px] shrink-0 text-center ' + style.bg + ' ' + style.text + ' ' + style.border">
              <span class="text-[10px] font-bold opacity-90 tracking-wider">최대진도</span>
              <span class="text-2xl font-black tracking-tight leading-none my-0.5">{{ style.label.replace('진도 ', '') }}</span>
              <span class="text-[9px] opacity-75 font-medium">{{ style.label }}</span>
            </div>
          </div>

          <!-- Epicenter Move Button -->
          <div class="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs gap-2 flex-wrap">
            <span class="text-zinc-400 dark:text-zinc-500 text-[11px]">정보 출처: JMA / P2PQuake</span>
            <div class="flex items-center gap-2">
              <button
                (click)="showRawData.set(!showRawData())"
                [class]="'px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 border ' + (isDarkMode() ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300')">
                <span>🔬</span>
                <span>자세히 보기 (실험적)</span>
              </button>
              <button 
                (click)="focusEpicenter.emit(item)"
                class="px-3 py-1.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95">
                <span>📍</span>
                <span>진앙지 이동</span>
              </button>
            </div>
          </div>
          
          @if (showRawData()) {
            <div [class]="'mt-2 p-3 rounded-xl border max-h-[42vh] overflow-y-auto custom-scrollbar flex flex-col gap-3 ' + (isDarkMode() ? 'bg-black/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200')">
              
              <!-- 관측소 / 지역 진도 토글 버튼 -->
              <div class="flex items-center p-1 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 border border-zinc-300/80 dark:border-zinc-700/80 text-xs font-bold gap-1">
                <button
                  (click)="viewMode.set('stations')"
                  [class]="'flex-1 py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ' + (viewMode() === 'stations' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200')">
                  <span>📍</span>
                  <span>관측소별 ({{ item.points?.length || 0 }})</span>
                </button>
                <button
                  (click)="viewMode.set('areas')"
                  [class]="'flex-1 py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ' + (viewMode() === 'areas' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200')">
                  <span>🗺️</span>
                  <span>발표 지역별 ({{ item.areas?.length || 0 }})</span>
                </button>
              </div>

              @if (viewMode() === 'stations') {
                @if (item.points && item.points.length > 0) {
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">관측지점 세부 목록</h4>
                    </div>
                    <div class="flex flex-col gap-2">
                      @for (pt of item.points; track (pt.pref || '') + pt.addr) {
                        @let st = getStationInfo(pt);
                        <div [class]="'flex flex-col gap-1.5 p-2.5 rounded-lg border transition-all ' + (isDarkMode() ? 'bg-zinc-800/80 border-zinc-700 hover:border-zinc-600' : 'bg-white border-zinc-200 hover:border-zinc-300')">
                          <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                              <span class="text-xs font-bold text-zinc-500 dark:text-zinc-400 shrink-0">{{ pt.pref }}</span>
                              <span class="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{{ pt.addr }}</span>
                              @if (pt.isArea) {
                                <span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 shrink-0">구역</span>
                              }
                            </div>
                            <div [class]="'px-2 py-0.5 rounded-md text-xs font-bold shadow-sm shrink-0 ' + getJindoBadgeStyle(pt.scale).bg + ' ' + getJindoBadgeStyle(pt.scale).text">
                              진도 {{ getJindoString(pt.scale) }}
                            </div>
                          </div>

                          @if (st) {
                            <div class="flex items-center justify-between pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50 text-[11px] text-zinc-500 dark:text-zinc-400 gap-2">
                              <div class="flex items-center gap-2 truncate">
                                <span class="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">{{ st.affi || '기상청' }}</span>
                                <span class="font-mono text-[10px] text-zinc-400 truncate">위도 {{ st.lat?.toFixed(2) }}° / 경도 {{ st.lon?.toFixed(2) }}°</span>
                              </div>
                              <button
                                (click)="focusStation.emit({ lat: st.lat, lon: st.lon, name: pt.addr || '', pref: pt.pref, scale: pt.scale })"
                                class="px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold cursor-pointer transition-colors shrink-0 flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
                                <span>📍</span>
                                <span>위치 보기</span>
                              </button>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="text-center py-6 text-xs text-zinc-400 dark:text-zinc-500 font-semibold">
                    이 지진 데이터에는 세부 관측소 지점(points) 정보가 포함되어 있지 않습니다.
                  </div>
                }
              }

              @if (viewMode() === 'areas') {
                @if (item.areas && item.areas.length > 0) {
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">발표 지역 목록</h4>
                    </div>
                    <div class="flex flex-col gap-1.5">
                      @for (area of item.areas; track area.name) {
                        <div [class]="'flex items-center justify-between p-2.5 rounded-lg border ' + (isDarkMode() ? 'bg-zinc-800/80 border-zinc-700' : 'bg-white border-zinc-200')">
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-zinc-500 dark:text-zinc-400">{{ area.prefName }}</span>
                            <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{{ area.name }}</span>
                          </div>
                          <div [class]="'px-2 py-1 rounded-md text-xs font-bold shadow-sm ' + getJindoBadgeStyle(area.scale || area.scaleFrom).bg + ' ' + getJindoBadgeStyle(area.scale || area.scaleFrom).text">
                            진도 {{ getJindoString(area.scale || area.scaleFrom) }}
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="text-center py-6 text-xs text-zinc-400 dark:text-zinc-500 font-semibold">
                    이 지진 데이터에는 지역별(areas) 진도 정보가 포함되어 있지 않습니다.
                  </div>
                }
              }
              
              <details class="mt-1">
                <summary class="text-[11px] font-bold cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 outline-none">원본 JSON 데이터 보기</summary>
                <div class="mt-2 text-[10px] sm:text-xs font-mono overflow-x-auto p-2 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <pre><code>{{ getRawData(item) }}</code></pre>
                </div>
              </details>

            </div>
          }

        </div>
      </div>
    }
  `
})
export class QuakeDetailPanelComponent {
  quake = input<P2PQuakeItem | null>(null);
  isDarkMode = input<boolean>(false);
  stationMap = input<Map<string, any>>(new Map());

  focusEpicenter = output<P2PQuakeItem>();
  focusStation = output<StationLocation>();

  showRawData = signal<boolean>(false);
  viewMode = signal<'stations' | 'areas'>('stations');

  getJindoBadgeStyle = getJindoBadgeStyle;
  getTsunamiText = getTsunamiText;
  getJindoString = getJindoString;
  
  getStationInfo(pt: any) {
    if (!pt) return null;
    const map = this.stationMap();
    if (!map || map.size === 0) return null;
    const key = (pt.pref || '') + pt.addr;
    return map.get(key) || map.get(pt.addr) || null;
  }

  getRawData(item: P2PQuakeItem): string {
    return JSON.stringify(item, null, 2);
  }
}


