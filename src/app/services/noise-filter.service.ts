import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NoiseFilterService {
  /**
   * 미디언 필터(Median Filter) 알고리즘 적용.
   * 일시적인 1~2프레임의 이미지 노이즈(글리치)로 인해 
   * 단일 관측소의 진도가 튀는 현상을 획기적으로 제거합니다.
   * 
   * @param stn 관측소 상태 객체
   * @param rawJindo 원본 진도 값
   * @returns 노이즈가 제거된 진도 값
   */
  public applyMedianFilter(stn: any, rawJindo: number): number {
    if (!stn.rawJindoHistory) {
      stn.rawJindoHistory = [];
    }
    
    stn.rawJindoHistory.unshift(rawJindo);
    
    // 최근 3개의 프레임을 통해 순간적인 노이즈 스파이크 제거
    if (stn.rawJindoHistory.length > 3) {
      stn.rawJindoHistory.pop();
    }
    
    const sorted = [...stn.rawJindoHistory].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
}
