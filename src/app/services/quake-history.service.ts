import { Injectable, inject, signal, computed, WritableSignal } from '@angular/core';
import { P2pQuakeService } from './p2p-quake.service';

export interface ProcessedHistoryItem {
  isGroup: boolean;
  item?: any;
  groupKey?: string;
  items?: any[];
  latestItem?: any;
  maxScale?: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuakeHistoryService {
  private p2pQuakeService = inject(P2pQuakeService);

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

  toggleGroupUnknown() {
    this.groupUnknown.update((v) => !v);
  }

  toggleGroupExpanded(groupKey: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.expandedGroupKeys.update((map) => ({
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

  processedHistoryList = computed<ProcessedHistoryItem[]>(() => {
    const list = this.p2pQuakeService.p2pHistoryList();
    if (!this.groupUnknown() || !list || list.length === 0) {
      return list.map((item: any) => ({ isGroup: false, item }));
    }

    const result: ProcessedHistoryItem[] = [];
    let currentGroup: any[] = [];

    const createGroupEntry = (group: any[]): ProcessedHistoryItem => {
      if (group.length === 1) {
        return { isGroup: false, item: group[0] };
      }
      const maxScale = Math.max(...group.map((g) => g.earthquake?.maxScale ?? -1));
      const informativeItem = group.find((g) => !this.isUnknownQuake(g)) || group[0];
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
}
