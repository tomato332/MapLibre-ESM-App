import { Injectable, signal, WritableSignal } from '@angular/core';
import { EEWMessage } from '../models/quake.model';

@Injectable({
  providedIn: 'root'
})
export class WolfxEewService {
  eewData: WritableSignal<EEWMessage | null> = signal(null);
  isEewDismissed: WritableSignal<boolean> = signal(false);

  private wolfxWs: WebSocket | null = null;
  private isIntentionalDisconnect = false;

  connectWebSocket(onEewUpdate?: (eew: EEWMessage) => void) {
    if (typeof WebSocket === 'undefined') return;
    this.isIntentionalDisconnect = false;
    try {
      this.wolfxWs = new WebSocket('wss://ws-api.wolfx.jp/jma_eew');

      this.wolfxWs.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && (data.type === 'jma_eew' || data.Title || data.Hypocenter || data.CodeType === 'EEW')) {
            const mappedEew: EEWMessage = {
              Title: data.Title || (data.isWarn ? "緊急地震速報 (警報)" : "緊急地震速報 (予報)"),
              Issue: { Status: data.Issue?.Status || (data.isFinal ? "最終報" : (data.Serial ? `第${data.Serial}報` : "속보")) },
              OriginTime: data.OriginTime || data.AnnouncedTime,
              ReportTime: data.ReportTime || new Date().toISOString(),
              ReportNum: data.Serial || 1,
              isFinal: !!data.isFinal,
              Hypocenter: data.Hypocenter || "不明",
              Latitude: typeof data.Latitude === 'number' ? data.Latitude : parseFloat(data.Latitude || 0),
              Longitude: typeof data.Longitude === 'number' ? data.Longitude : parseFloat(data.Longitude || 0),
              Magunitude: data.Magunitude || data.Magnitude || 0,
              Depth: typeof data.Depth === 'number' ? data.Depth : parseInt(String(data.Depth || 0).replace(/[^\d]/g, ''), 10),
              MaxIntensity: data.MaxIntensity || "不明",
              isWarn: !!data.isWarn,
              isCancel: !!data.isCancel
            };

            const current = this.eewData();
            if (!(current && (current as any).isSimulation && Date.now() - ((current as any).simulationStartTime || 0) < 120000)) {
              this.eewData.set(mappedEew);
              this.isEewDismissed.set(false);
              if (onEewUpdate) {
                onEewUpdate(mappedEew);
              }
            }
          }
        } catch (e) {
          console.warn('WolfX EEW WS parse error', e);
        }
      };

      this.wolfxWs.onclose = () => {
        if (!this.isIntentionalDisconnect) {
          const reconnectTime = Date.now() + 5000;
          const checkReconnect = () => {
            if (this.isIntentionalDisconnect) return;
            if (Date.now() >= reconnectTime) {
              this.connectWebSocket(onEewUpdate);
            } else if (typeof window !== 'undefined') {
              requestAnimationFrame(checkReconnect);
            }
          };
          if (typeof window !== 'undefined') {
            requestAnimationFrame(checkReconnect);
          }
        }
      };

      this.wolfxWs.onerror = () => {
        // Silently handle error; onclose will handle reconnection automatically
      };
    } catch (e) {
      console.warn('Failed to connect WolfX WS', e);
    }
  }

  disconnect() {
    this.isIntentionalDisconnect = true;
    if (this.wolfxWs) {
      this.wolfxWs.close();
      this.wolfxWs = null;
    }
  }
}
