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

export function getJindoFromColor(r: number, g: number, b: number): number {
  if (r < 15 && g < 15 && b < 15) return -3;

  // kmoni PGA 80-color exact scale lookup table (from 0.01 gal to 1000+ gal)
  const hexPalette: [string, number][] = [
    // Row 1: PGA 0.01 ~ 0.05 (Dark Blue) - JMA Jindo < -2.0
    ['#0003CF', -3.0], ['#000BD4', -2.9], ['#0010D7', -2.8], ['#0014DA', -2.7], ['#001ADD', -2.6],
    ['#0022E2', -2.5], ['#002CE9', -2.4], ['#0033ED', -2.3], ['#003CF2', -2.2], ['#0041F6', -2.1],
    // Row 2: PGA 0.05 ~ 0.2 (Cyan / Teal) - JMA Jindo -2.0 ~ -1.0
    ['#004BF8', -2.0], ['#005BEA', -1.9], ['#0068E0', -1.8], ['#0071D8', -1.7], ['#0082CA', -1.6],
    ['#008CC2', -1.5], ['#009EB4', -1.4], ['#00ACA9', -1.3], ['#00B3A2', -1.2], ['#00C495', -1.1],
    // Row 3: PGA 0.2 ~ 0.5 (Green-Cyan) - JMA Jindo -1.0 ~ 0.0
    ['#02D189', -1.0], ['#08D580', -0.9], ['#0CD87A', -0.8], ['#12DC72', -0.7], ['#19E069', -0.6],
    ['#22E65D', -0.5], ['#27EA56', -0.4], ['#2DEE4D', -0.3], ['#34F244', -0.2], ['#3AF73D', -0.1],
    // Row 4: PGA 0.5 ~ 2 (Green / Lime) - JMA Jindo 0.0 ~ 1.0
    ['#44FA34', 0.0],  ['#50FB30', 0.1],  ['#5BFB2C', 0.2],  ['#64FB2A', 0.3],  ['#74FC24', 0.4],
    ['#82FD20', 0.5],  ['#8CFD1C', 0.6],  ['#9DFE17', 0.7],  ['#A3FE14', 0.8],  ['#B2FF10', 0.9],
    // Row 5: PGA 2 ~ 10 (Yellow-Green / Light Yellow) - JMA Jindo 1.0 ~ 2.0
    ['#BBFF0D', 1.0],  ['#C3FF0A', 1.1],  ['#CCFF09', 1.2],  ['#D3FF08', 1.3],  ['#DBFF06', 1.4],
    ['#DBFF06', 1.5],  ['#E3FF05', 1.6],  ['#EBFF03', 1.7],  ['#F2FF02', 1.8],  ['#FDFC00', 1.9],
    // Row 6: PGA 10 ~ 20 (Yellow) - JMA Jindo 2.0 ~ 3.0
    ['#FDFC00', 2.0],  ['#FDFC00', 2.1],  ['#FDFC00', 2.2],  ['#FFF500', 2.3],  ['#FFF200', 2.4],
    ['#FFED00', 2.5],  ['#FFE900', 2.6],  ['#FFE500', 2.7],  ['#FFE200', 2.8],  ['#FFDE00', 2.9],
    // Row 7: PGA 20 ~ 100 (Orange) - JMA Jindo 3.0 ~ 4.5
    ['#FFD900', 3.0],  ['#FFD200', 3.2],  ['#FFCE00', 3.4],  ['#FFC500', 3.6],  ['#FFBD00', 3.8],
    ['#FFB200', 4.0],  ['#FFAD00', 4.1],  ['#FFA600', 4.2],  ['#FF9E00', 4.3],  ['#FF9600', 4.4],
    // Row 8: PGA 100 ~ 200 (Deep Orange / Red) - JMA Jindo 4.5 ~ 5.5 (5弱 ~ 5強)
    ['#FF8D00', 4.5],  ['#FF8500', 4.6],  ['#FF7E00', 4.7],  ['#FF7900', 4.8],  ['#FF6D00', 4.9],
    ['#FF6600', 5.0],  ['#FF5D00', 5.1],  ['#FF5900', 5.2],  ['#FF5100', 5.3],  ['#FF4900', 5.4],
    // Row 9: PGA 200 ~ 500 (Red / Dark Red) - JMA Jindo 5.5 ~ 6.5 (6弱 ~ 6強)
    ['#FF4100', 5.5],  ['#FD3900', 5.6],  ['#FD3500', 5.7],  ['#FC2E00', 5.8],  ['#FB2500', 5.9],
    ['#FA1E00', 6.0],  ['#F91900', 6.1],  ['#F81100', 6.2],  ['#F80D00', 6.3],  ['#F70500', 6.4],
    // Row 10: PGA 500 ~ 1000+ (Deep Crimson / Purple-Red) - JMA Jindo 6.5 ~ 7.0
    ['#F10000', 6.5],  ['#E90000', 6.6],  ['#E50000', 6.7],  ['#DD0000', 6.8],  ['#D60000', 6.9],
    ['#CC0000', 7.0],  ['#C50000', 7.0],  ['#BD0000', 7.0],  ['#B50000', 7.0],  ['#AF0000', 7.0]
  ];

  let minDistance = Infinity;
  let matchedJindo = -3;

  for (const [hex, jindo] of hexPalette) {
    const pr = parseInt(hex.slice(1, 3), 16);
    const pg = parseInt(hex.slice(3, 5), 16);
    const pb = parseInt(hex.slice(5, 7), 16);

    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const dist = dr * dr + dg * dg + db * db;

    if (dist < minDistance) {
      minDistance = dist;
      matchedJindo = jindo;
    }
  }

  return matchedJindo;
}
