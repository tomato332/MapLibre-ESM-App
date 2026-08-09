import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  permission: WritableSignal<NotificationPermission> = signal('default');
  isEnabled: WritableSignal<boolean> = signal(true);

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission.set(Notification.permission);
      try {
        const savedEnabled = localStorage.getItem('browser_notifications_enabled');
        if (savedEnabled !== null) {
          this.isEnabled.set(savedEnabled === 'true');
        }
      } catch {
        // ignore storage errors
      }
    } else {
      this.permission.set('denied');
      this.isEnabled.set(false);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const res = await Notification.requestPermission();
      this.permission.set(res);
      if (res === 'granted') {
        this.setEnabled(true);
        this.sendNotification('🔔 지진 알림이 활성화되었습니다', {
          body: '흔들림 감지, 지진 정보 및 EEW(긴급지진속보) 발생 시 브라우저 알림을 받게 됩니다.',
          tag: 'notification-test'
        });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
      return false;
    }
  }

  toggleEnabled(): void {
    const next = !this.isEnabled();
    if (next && this.permission() !== 'granted') {
      this.requestPermission();
    } else {
      this.setEnabled(next);
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled.set(enabled);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('browser_notifications_enabled', String(enabled));
      } catch {
        // ignore
      }
    }
  }

  sendNotification(title: string, options?: NotificationOptions): Notification | null {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }

    if (!this.isEnabled() || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const initOpts: NotificationOptions = {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      };
      const notification = new Notification(title, initOpts);

      notification.onclick = () => {
        if (typeof window !== 'undefined') {
          window.focus();
        }
        notification.close();
      };

      return notification;
    } catch (e) {
      console.warn('Failed to trigger browser notification:', e);
      return null;
    }
  }

  // 1. EEW (긴급지진속보) 알림
  notifyEew(eew: any): void {
    if (!eew) return;
    const isSim = eew.isSimulation ? '[모의] ' : '';
    const title = `🚨 ${isSim}EEW 긴급지진속보`;
    const location = eew.Hypocenter || '지진 발생';
    const mag = eew.Magunitude ? `M${eew.Magunitude}` : '규모 미상';
    const maxInt = eew.MaxIntensity ? `최대진도 ${eew.MaxIntensity}` : '';
    const body = `진원지: ${location} | ${mag} | ${maxInt}\n즉시 안전한 장소로 대피하십시오.`;

    this.sendNotification(title, {
      body,
      tag: `eew-${eew.OriginTime || eew.AnnouncedTime || Date.now()}`,
      requireInteraction: true
    });
  }

  // 2. 지진 정보 (P2PQuake / Earthquake Info) 알림
  notifyQuake(quake: any): void {
    if (!quake) return;
    const name = quake.earthquake?.hypocenter?.name || '지진 정보';
    const mag = quake.earthquake?.hypocenter?.magnitude;
    const magStr = mag !== undefined && mag !== -1 ? `M${mag}` : '';
    const depth = quake.earthquake?.hypocenter?.depth;
    const depthStr = depth !== undefined && depth !== -1 ? `깊이 ${depth}km` : '';
    const maxScale = quake.earthquake?.maxScale;
    const maxScaleStr = maxScale !== undefined ? `최대진도` : '';

    const title = `📢 신규 지진 정보`;
    const details = [name, magStr, depthStr, maxScaleStr].filter(Boolean).join(' | ');
    const body = details ? details : '새로운 지진 정보가 수신되었습니다.';

    this.sendNotification(title, {
      body,
      tag: `quake-${quake.id || quake.earthquake?.time || Date.now()}`
    });
  }

  // 3. 흔들림 감지 (Shaking Detection) 알림
  notifyShakingDetection(intensity: number | string, locationCount?: number): void {
    const title = `⚡ 실시간 지진 흔들림 감지`;
    const body = `관측망에서 진도 ${intensity} 수준의 주요 흔들림이 감지되었습니다.`;

    this.sendNotification(title, {
      body,
      tag: `shaking-${Math.floor(Date.now() / 15000)}` // 15초 이내 중복 방지
    });
  }
}
