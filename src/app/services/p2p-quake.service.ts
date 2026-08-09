import { Injectable, signal, WritableSignal } from '@angular/core';
import { P2PQuakeItem } from '../models/quake.model';

@Injectable({
  providedIn: 'root'
})
export class P2pQuakeService {
  p2pQuakeData: WritableSignal<P2PQuakeItem | null> = signal(null);
  p2pHistoryList: WritableSignal<P2PQuakeItem[]> = signal([]);
  selectedQuake: WritableSignal<P2PQuakeItem | null> = signal(null);

  private p2pWs: WebSocket | null = null;
  private isIntentionalDisconnect = false;
  private reconnectAttempt = 0;
  private maxReconnectDelay = 30000;

  private sortHistory(list: P2PQuakeItem[]): P2PQuakeItem[] {
    return [...list].sort((a, b) => {
      const timeA = a.earthquake?.time || a.time || '';
      const timeB = b.earthquake?.time || b.time || '';
      return timeB.localeCompare(timeA);
    });
  }

  async fetchHistory(offset = 0): Promise<P2PQuakeItem[]> {
    try {
      const res = await fetch(`https://api.p2pquake.net/v2/history?codes=551&limit=100&offset=${offset}`);
      if (res.ok) {
        const data: P2PQuakeItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const sortedData = this.sortHistory(data);
          if (offset === 0) {
            this.p2pHistoryList.update(existingList => {
              if (!existingList || existingList.length === 0) {
                return sortedData;
              }
              const restIds = new Set(sortedData.map(d => d.id).filter(Boolean));
              const restTimes = new Set(sortedData.map(d => d.time).filter(Boolean));
              
              const realtimeOnly = existingList.filter(item => {
                if (item.id && restIds.has(item.id)) return false;
                if (item.time && restTimes.has(item.time)) return false;
                return true;
              });

              return this.sortHistory([...realtimeOnly, ...sortedData]).slice(0, 100);
            });

            const currentList = this.p2pHistoryList();
            if (currentList.length > 0 && !this.selectedQuake()) {
              this.p2pQuakeData.set(currentList[0]);
              this.selectedQuake.set(currentList[0]);
            }
          } else {
            this.p2pHistoryList.update(list => {
              const existingIds = new Set(list.map(i => i.id).filter(Boolean));
              const newItems = sortedData.filter(d => !d.id || !existingIds.has(d.id));
              return this.sortHistory([...list, ...newItems]);
            });
          }
          return sortedData;
        }
      }
    } catch (e) {
      console.warn('P2PQuake history fetch error', e);
    }
    return [];
  }

  connectWebSocket(
    onNewQuake: (data: P2PQuakeItem) => void,
    onEewReceived: (mappedEew: any) => void
  ) {
    if (typeof WebSocket === 'undefined') return;
    this.isIntentionalDisconnect = false;
    this.p2pWs = new WebSocket('wss://api.p2pquake.net/v2/ws');

    this.p2pWs.onopen = () => {
      this.reconnectAttempt = 0;
      console.log('P2P WebSocket connected successfully');
    };

    this.p2pWs.onerror = (err) => {
      console.warn('P2P WebSocket error occurred:', err);
      if (this.p2pWs) {
        this.p2pWs.close();
      }
    };

    this.p2pWs.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.code === 551) {
          this.p2pQuakeData.set(data);
          this.selectedQuake.set(data);
          
          this.p2pHistoryList.update(list => {
            const filtered = list.filter(item => {
              if (data.id && item.id === data.id) return false;
              if (data.time && item.time === data.time) return false;
              if (data.earthquake?.time && item.earthquake?.time === data.earthquake?.time && item.issue?.type === data.issue?.type) return false;
              return true;
            });
            return this.sortHistory([data, ...filtered]).slice(0, 100);
          });

          onNewQuake(data);

          setTimeout(() => {
            if (this.p2pQuakeData()?.id === data.id) {
              this.p2pQuakeData.set(null);
            }
          }, 3 * 60 * 1000);
        } else if (data.code === 556) {
          const maxScaleFrom = Math.max(...(data.areas?.map((a: any) => a.scaleFrom) || [0]));
          
          const mappedEew = {
            Title: "緊急地震速報 (P2P)",
            Issue: { Status: "通常" },
            AnnouncedTime: data.time,
            OriginTime: data.earthquake?.originTime,
            Hypocenter: data.earthquake?.hypocenter?.name || "不明",
            Latitude: data.earthquake?.hypocenter?.latitude || 0,
            Longitude: data.earthquake?.hypocenter?.longitude || 0,
            Depth: data.earthquake?.hypocenter?.depth || 0,
            Magunitude: data.earthquake?.hypocenter?.magnitude || 0,
            MaxIntensity: this.scaleToJmaString(maxScaleFrom),
            isWarn: false,
            isCancel: false
          };

          onEewReceived(mappedEew);
        }
      } catch (e) {
        console.warn('P2P WebSocket parse error', e);
      }
    };

    this.p2pWs.onclose = () => {
      if (!this.isIntentionalDisconnect) {
        const delay = Math.min(5000 * Math.pow(1.5, this.reconnectAttempt), this.maxReconnectDelay);
        this.reconnectAttempt++;
        console.log(`P2P WebSocket disconnected. Reconnecting in ${Math.round(delay / 1000)}s...`);

        const reconnectTime = Date.now() + delay;
        const checkReconnect = () => {
          if (this.isIntentionalDisconnect) return;
          if (Date.now() >= reconnectTime) {
            this.connectWebSocket(onNewQuake, onEewReceived);
          } else if (typeof window !== 'undefined') {
            requestAnimationFrame(checkReconnect);
          }
        };
        if (typeof window !== 'undefined') {
          requestAnimationFrame(checkReconnect);
        }
      }
    };
  }

  disconnect() {
    this.isIntentionalDisconnect = true;
    if (this.p2pWs) {
      this.p2pWs.close();
      this.p2pWs = null;
    }
  }

  private scaleToJmaString(scale: number): string {
    if (scale >= 60) return '7';
    if (scale >= 55) return '6強';
    if (scale >= 50) return '6弱';
    if (scale >= 46) return '5強';
    if (scale >= 45) return '5弱';
    if (scale >= 40) return '4';
    if (scale >= 30) return '3';
    if (scale >= 20) return '2';
    if (scale >= 10) return '1';
    return '0';
  }
}
