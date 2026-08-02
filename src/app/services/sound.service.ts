import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;
  private shindoAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.shindoAudio = new Audio('/Shindo.mp3');
        this.shindoAudio.preload = 'auto';
        this.shindoAudio.volume = 0.85;
      } catch {
        // ignore
      }

      const unlockAudio = () => {
        if (this.isUnlocked) return;
        const ctx = this.getAudioContext();
        if (ctx) {
          if (ctx.state === 'suspended') {
            ctx.resume().then(() => {
              this.isUnlocked = true;
              this.removeUnlockListeners(unlockAudio);
            }).catch(() => undefined);
          } else if (ctx.state === 'running') {
            this.isUnlocked = true;
            this.removeUnlockListeners(unlockAudio);
          }
          
          // Play a silent buffer to fully unlock iOS Safari
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        }

        if (this.shindoAudio) {
          this.shindoAudio.load();
        }
      };

      document.addEventListener('click', unlockAudio);
      document.addEventListener('touchstart', unlockAudio);
      document.addEventListener('keydown', unlockAudio);
    }
  }

  private removeUnlockListeners(handler: EventListener) {
    document.removeEventListener('click', handler);
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('keydown', handler);
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => undefined);
    }
    return this.audioCtx;
  }

  /**
   * 진도 1~7(및 5弱/5強, 6弱/6強)에 맞춘 고퀄리티 부드러운 알림음 재생
   */
  playIntensitySound(scale: number | string | undefined): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const normalized = this.parseScale(scale);
    const now = ctx.currentTime;

    // 마스터 게인 및 고주파 차단 필터 (자극적인 쏘는 소리 제거)
    const masterGain = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(normalized >= 6 ? 4200 : 3200, now);

    masterGain.connect(lowpass);
    lowpass.connect(ctx.destination);

    // 부드러운 유기적 종소리 톤 (기본음 + 2차 오버톤 배음 조합)
    const playOrganicChime = (
      freq: number,
      startTime: number,
      duration: number,
      vol: number,
      pan = 0
    ) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, startTime); // 2차 배음

      // 아날로그 스타일 엠벨롭 (클릭음 없는 부드러운 어택 + 자연스러운 감쇄)
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.025);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc1.connect(gainNode);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.value = 0.2; // 2차 배음은 20% 볼륨으로 온기 추가
      osc2.connect(harmonicGain);
      harmonicGain.connect(gainNode);

      if ('createStereoPanner' in ctx) {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(pan, startTime);
        gainNode.connect(panner);
        panner.connect(masterGain);
      } else {
        gainNode.connect(masterGain);
      }

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.05);
      osc2.stop(startTime + duration + 0.05);
    };

    // 깊이감을 더하는 서브 베이스 톤
    const playSubBass = (freq: number, startTime: number, duration: number, vol: number) => {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(freq, startTime);

      subGain.gain.setValueAtTime(0, startTime);
      subGain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
      subGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      subOsc.connect(subGain);
      subGain.connect(masterGain);

      subOsc.start(startTime);
      subOsc.stop(startTime + duration + 0.05);
    };

    switch (normalized) {
      case 1:
        // 진도 1: 아주 미세하고 부드러운 단일 크리스탈 핑 (C5)
        playOrganicChime(523.25, now, 0.7, 0.18, 0);
        break;

      case 2:
        // 진도 2: 은은하고 따뜻한 2연속 멜로디 (D5 -> A5)
        playOrganicChime(587.33, now, 0.7, 0.22, -0.2);
        playOrganicChime(880.00, now + 0.12, 0.8, 0.22, 0.2);
        break;

      case 3:
        // 진도 3: 경쾌한 3음 상향 화음 (C5 -> E5 -> G5)
        playOrganicChime(523.25, now, 0.8, 0.25, -0.3);
        playOrganicChime(659.25, now + 0.1, 0.9, 0.25, 0);
        playOrganicChime(783.99, now + 0.2, 1.1, 0.28, 0.3);
        break;

      case 4:
        // 진도 4: 풍부한 4성부 따뜻한 벨 알림음 (F4 - A4 - C5 - F5)
        playOrganicChime(349.23, now, 1.0, 0.20, -0.2);
        playOrganicChime(440.00, now + 0.08, 1.1, 0.25, 0.2);
        playOrganicChime(523.25, now + 0.16, 1.2, 0.28, -0.1);
        playOrganicChime(698.46, now + 0.24, 1.4, 0.32, 0.1);
        break;

      case 5:
        // 진도 5弱 (5-): 주의 환기 4음 화음 + 은은한 베이스 울림 (A4 -> C#5 -> E5 -> A5)
        playSubBass(110.0, now, 1.5, 0.18);
        playOrganicChime(440.00, now, 0.9, 0.28, -0.3);
        playOrganicChime(554.37, now + 0.1, 1.0, 0.30, 0.1);
        playOrganicChime(659.25, now + 0.2, 1.2, 0.32, -0.1);
        playOrganicChime(880.00, now + 0.3, 1.4, 0.35, 0.3);
        break;

      case 5.5:
        // 진도 5強 (5+): 2연타 더블 차임 경보 (E4 -> G#4 -> B4 -> E5)
        playSubBass(82.41, now, 1.8, 0.22);
        [0, 0.22].forEach((offset) => {
          playOrganicChime(329.63, now + offset, 1.0, 0.28, -0.2);
          playOrganicChime(415.30, now + offset + 0.06, 1.1, 0.30, 0.2);
          playOrganicChime(493.88, now + offset + 0.12, 1.2, 0.32, -0.1);
          playOrganicChime(659.25, now + offset + 0.18, 1.4, 0.35, 0.1);
        });
        break;

      case 6:
        // 진도 6弱 (6-): 울림이 깊은 2회 반복 중강도 경보 (D3 베이스 + D4/F#4/A4/D5)
        playSubBass(73.42, now, 2.2, 0.28);
        [0, 0.28].forEach((offset) => {
          playOrganicChime(293.66, now + offset, 1.1, 0.32, -0.3);
          playOrganicChime(369.99, now + offset + 0.07, 1.2, 0.34, 0.3);
          playOrganicChime(440.00, now + offset + 0.14, 1.3, 0.36, -0.1);
          playOrganicChime(587.33, now + offset + 0.21, 1.5, 0.40, 0.1);
        });
        break;

      case 6.5:
        // 진도 6強 (6+): 3연타 입체적 대형 경보 (C#3 베이스 + C#4/F#4/G#4/C#5 카스케이드)
        playSubBass(68.73, now, 2.5, 0.32);
        [0, 0.25, 0.50].forEach((offset, idx) => {
          const pan = idx % 2 === 0 ? -0.3 : 0.3;
          playOrganicChime(277.18, now + offset, 1.2, 0.35, pan);
          playOrganicChime(369.99, now + offset + 0.06, 1.3, 0.36, -pan);
          playOrganicChime(415.30, now + offset + 0.12, 1.4, 0.38, pan);
          playOrganicChime(554.37, now + offset + 0.18, 1.6, 0.42, 0);
        });
        break;

      case 7:
        // 진도 7: 웅장하고 장엄한 최고단계 차임 퐁 + 잔향 카스케이드 (C2 서브 곤 + C4/G4/C5/E5/G5)
        playSubBass(65.41, now, 3.0, 0.38);
        // 1차 메인 카스케이드
        playOrganicChime(261.63, now, 1.4, 0.35, -0.4);
        playOrganicChime(392.00, now + 0.08, 1.5, 0.38, 0.2);
        playOrganicChime(523.25, now + 0.16, 1.6, 0.40, -0.2);
        playOrganicChime(659.25, now + 0.24, 1.8, 0.43, 0.4);
        playOrganicChime(783.99, now + 0.32, 2.0, 0.46, 0);

        // 2차 잔향 웨이브
        setTimeout(() => {
          const now2 = ctx.currentTime;
          playOrganicChime(261.63, now2, 1.4, 0.32, 0.3);
          playOrganicChime(392.00, now2 + 0.08, 1.5, 0.35, -0.3);
          playOrganicChime(523.25, now2 + 0.16, 1.6, 0.38, 0.1);
          playOrganicChime(783.99, now2 + 0.24, 2.0, 0.42, 0);
        }, 450);
        break;

      default:
        playOrganicChime(523.25, now, 0.8, 0.25, 0);
        break;
    }
  }

  playShindoAudio(scale?: number | string): void {
    if (typeof window === 'undefined') return;
    try {
      const audio = this.shindoAudio || new Audio('/Shindo.mp3');
      audio.currentTime = 0;
      audio.volume = 0.85;
      const playPromise = audio.play();

      if (scale !== undefined) {
        // 진도 알림음도 함께 플레이 (약간의 딜레이로 오버랩)
        setTimeout(() => {
          this.playIntensitySound(scale);
        }, 200);
      }

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Shindo.mp3 playback failed/blocked, fallback to synthetic sound:', err);
          if (scale !== undefined) {
            this.playIntensitySound(scale);
          } else {
            this.playIntensitySound(5);
          }
        });
      }
    } catch (e) {
      console.warn('Shindo.mp3 playback error:', e);
      if (scale !== undefined) {
        this.playIntensitySound(scale);
      } else {
        this.playIntensitySound(5);
      }
    }
  }

  playSyntheticShindoSound(): void {
    this.playIntensitySound(5);
  }

  playDetectionSound(intensity: number | string): void {
    this.playIntensitySound(intensity);
  }

  private parseScale(scale: number | string | undefined): number {
    if (scale === undefined || scale === null) return 3;
    if (typeof scale === 'string') {
      const s = scale.trim();
      if (s === '5-' || s === '5弱' || s === '5a') return 5;
      if (s === '5+' || s === '5強' || s === '5b') return 5.5;
      if (s === '6-' || s === '6弱' || s === '6a') return 6;
      if (s === '6+' || s === '6強' || s === '6b') return 6.5;
      if (s === '7') return 7;
      const num = parseFloat(s);
      if (!isNaN(num)) return this.parseScale(num);
    }
    if (typeof scale === 'number') {
      if (scale === 10) return 1;
      if (scale === 20) return 2;
      if (scale === 30) return 3;
      if (scale === 40) return 4;
      if (scale === 45) return 5;
      if (scale === 46) return 5.5;
      if (scale === 50) return 6;
      if (scale === 55) return 6.5;
      if (scale === 60) return 7;
      if (scale >= 1 && scale <= 7) return scale;
      if (scale > 7) return 7;
    }
    return 3;
  }
}
