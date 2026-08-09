import colorMapData from '../../../KyoshinShindoColorMap.json';

export interface JindoBadgeStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

export function getJindoBadgeStyle(scale: number | undefined): JindoBadgeStyle {
  if (scale === 10) return { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-400', label: '진도 1' };
  if (scale === 20) return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-300', label: '진도 2' };
  if (scale === 30) return { bg: 'bg-cyan-600', text: 'text-white', border: 'border-cyan-400', label: '진도 3' };
  if (scale === 40) return { bg: 'bg-amber-500', text: 'text-zinc-950', border: 'border-amber-300', label: '진도 4' };
  if (scale === 45) return { bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-400', label: '진도 5弱' };
  if (scale === 46) return { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-400', label: '진도 5強' };
  if (scale === 50) return { bg: 'bg-red-600', text: 'text-white', border: 'border-red-400', label: '진도 6弱' };
  if (scale === 55) return { bg: 'bg-red-700', text: 'text-white', border: 'border-red-500', label: '진도 6強' };
  if (scale === 60) return { bg: 'bg-purple-700', text: 'text-white', border: 'border-purple-400', label: '진도 7' };
  return { bg: 'bg-zinc-600', text: 'text-zinc-200', border: 'border-zinc-500', label: '불명' };
}

export function getTsunamiText(domesticTsunami: string | undefined): { text: string; colorClass: string } {
  if (domesticTsunami === 'None') return { text: '해일 영향 없음', colorClass: 'text-emerald-500' };
  if (domesticTsunami === 'Checking') return { text: '해일 영향 조사 중', colorClass: 'text-yellow-500 font-bold' };
  if (domesticTsunami === 'NonEffective') return { text: '약한 해일 변동 (피해 없음)', colorClass: 'text-blue-400' };
  if (domesticTsunami === 'Watch') return { text: '해일 주의보 발령', colorClass: 'text-amber-500 font-bold' };
  if (domesticTsunami === 'Warning') return { text: '해일 경보 발령', colorClass: 'text-red-500 font-bold animate-pulse' };
  return { text: '해일 정보 없음', colorClass: 'text-zinc-400' };
}

export function getJindoString(scale: number | undefined): string {
  if (scale === 10) return '1';
  if (scale === 20) return '2';
  if (scale === 30) return '3';
  if (scale === 40) return '4';
  if (scale === 45) return '5弱';
  if (scale === 46) return '5強';
  if (scale === 50) return '6弱';
  if (scale === 55) return '6強';
  if (scale === 60) return '7';
  return '불명';
}

export function getIntensityColor(scale: number): string {
  if (scale >= 60) return '#990099';
  if (scale >= 55) return '#A00000';
  if (scale >= 50) return '#FF0000';
  if (scale >= 46) return '#FF5500';
  if (scale >= 45) return '#FF9900';
  if (scale >= 40) return '#FFE600';
  if (scale >= 30) return '#00BFFF';
  if (scale >= 20) return '#0055FF';
  if (scale >= 10) return '#7F8C8D';
  return 'transparent';
}

interface ColorMapItem {
  Intensity: number;
  R: number;
  G: number;
  B: number;
}

const colorMap = colorMapData as ColorMapItem[];

export function getJindoFromColor(r: number, g: number, b: number): number {
  if (r < 15 && g < 15 && b < 15) return -3;

  let minDistance = Infinity;
  let matchedJindo = -3;

  for (let i = 0; i < colorMap.length; i++) {
    const item = colorMap[i];
    const dr = r - item.R;
    const dg = g - item.G;
    const db = b - item.B;
    const dist = dr * dr + dg * dg + db * db;

    if (dist < minDistance) {
      minDistance = dist;
      matchedJindo = item.Intensity;
    }
  }

  return matchedJindo;
}
