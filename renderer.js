// js/renderer.js — 기본 지도/진도맵/마커스타일 (SRP: 핵심 맵 시각화)

import AppState from '../core/app-state.js';
import { INTENSITY_COLORS } from '../core/constants.js';
import { parseP2PScale } from '../core/utils.js';
import { sampleImageData } from '../gif/pixel-sampler.js';
import { updateGridStyles } from './grid-renderer.js';
import { updateCallouts, updateRankingList, updateLiveLog } from './callouts.js';

const state = AppState.getInstance();

export function drawJapanBaseMap() {
  if (!state.japanBaseData) return;
  const isDark = state.theme !== 'google';

  if (state.japanBaseLayer) state.map.removeLayer(state.japanBaseLayer);
  state.japanBaseLayer = L.geoJson(state.japanBaseData, {
    style: { fillColor: isDark ? '#212327' : '#e0e0e0', weight: isDark ? 0.8 : 1, opacity: 1, color: isDark ? '#3f4147' : '#ccc', fillOpacity: 1 },
    interactive: false
  }).addTo(state.map);
  state.japanBaseLayer.bringToBack();

  if (state.okinawaMap && state.japanBaseData) {
    if (window.okiJapanBaseLayer) state.okinawaMap.removeLayer(window.okiJapanBaseLayer);
    window.okiJapanBaseLayer = L.geoJson(state.japanBaseData, {
      style: { fillColor: isDark ? '#212327' : '#e0e0e0', weight: isDark ? 0.8 : 1, opacity: 1, color: isDark ? '#3f4147' : '#ccc', fillOpacity: 1 },
      interactive: false
    }).addTo(state.okinawaMap);
    window.okiJapanBaseLayer.bringToBack();
  }
}

export function drawIntensityMap(points) {
  if (!points || points.length === 0) {
    if (state.intensityLayer) state.map.removeLayer(state.intensityLayer);
    if (state.intensityLabelLayer) state.map.removeLayer(state.intensityLabelLayer);
    return;
  }
  if (state.intensityLayer) state.map.removeLayer(state.intensityLayer);
  if (state.intensityLabelLayer) state.map.removeLayer(state.intensityLabelLayer);
  state.intensityLabelLayer = L.layerGroup().addTo(state.map);

  const valid = points.filter(p => p.scale >= 10);
  if (!valid.length || !state.areaForecastData) return;

  const target = state.areaForecastData;
  const hasJP = typeof AreaName !== 'undefined' && typeof AreaCode !== 'undefined';
  const codeMap = new Map();
  const norm = s => s ? s.replace(/県|府|都|道| /g, '') : '';

  const areaPts = valid.filter(p => p.isArea);
  if (areaPts.length && hasJP) {
    areaPts.forEach(p => { const i = AreaName.indexOf(p.addr); if (i !== -1) { const c = AreaCode[i]; if (!codeMap.has(c) || p.scale > codeMap.get(c).scale) codeMap.set(c, p); } });
  } else if (window.stationToAreaCode?.size) {
    valid.forEach(p => { const c = window.stationToAreaCode.get(p.addr); if (c) { if (!codeMap.has(c) || p.scale > codeMap.get(c).scale) codeMap.set(c, p); } });
  } else {
    valid.forEach(p => { const nk = norm(p.addr); if (!codeMap.has(nk) || p.scale > codeMap.get(nk).scale) codeMap.set(nk, p); });
  }
  if (!codeMap.size) return;
  const rendered = new Set();
  
  // label layer group creation should be conditional or we create it but don't add to map yet
  if (state.intensityLabelLayer) state.map.removeLayer(state.intensityLabelLayer);
  state.intensityLabelLayer = L.layerGroup();
  
  state.intensityLayer = L.geoJson(target, {
    filter: f => hasJP ? codeMap.has(f.properties.code) : codeMap.has(norm(f.properties.nam_ja || f.properties.name || '')),
    style: f => {
      const pt = hasJP ? codeMap.get(f.properties.code) : codeMap.get(norm(f.properties.nam_ja || f.properties.name || ''));
      return { fillColor: pt ? (INTENSITY_COLORS[pt.scale] || '#555') : 'transparent', weight: 0.6, opacity: 0.8, color: '#fff', fillOpacity: 0.7 };
    },
    onEachFeature: (f, layer) => {
      const pt = hasJP ? codeMap.get(f.properties.code) : codeMap.get(norm(f.properties.nam_ja || f.properties.name || ''));
      if (pt && pt.scale >= 10) {
        const c = layer.getBounds().getCenter();
        const key = `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;
        if (!rendered.has(key)) {
          const icon = L.divIcon({ className: 'intensity-label', html: `<div style="background:${INTENSITY_COLORS[pt.scale]||'rgba(0,0,0,0.6)'};padding:2px 6px;border-radius:6px;color:white;font-weight:bold;font-size:14px;border:1px solid #fff;box-shadow:0 0 5px #000;">${parseP2PScale(pt.scale)}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] });
          L.marker(c, { icon, interactive: false }).addTo(state.intensityLabelLayer);
          rendered.add(key);
        }
      }
    }
  });

  if (document.body.getAttribute('data-view-mode') === 'history') {
    state.intensityLayer.addTo(state.map);
    state.intensityLabelLayer.addTo(state.map);
  }
}

export function renderAllMarkers() {
  Object.values(state.meshGrids).forEach(g => { g.activeFrames = 0; g.active = false; g.lastColor = null; });

  const miniImg = document.getElementById('mini-' + state.defaultType);
  if (!miniImg || !miniImg.src || !miniImg.complete) return;

  const w = miniImg.naturalWidth, h = miniImg.naturalHeight;
  if (w === 0 || h === 0) return;
  const cvs = state.samplingCanvas;
  if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; }
  
  state.samplingCtx.drawImage(miniImg, 0, 0);
  sampleImageData(state.samplingCtx.getImageData(0, 0, w, h).data, w, h);
  updateMarkerStyles();
  updateGridStyles();
  updateCallouts();
  updateRankingList();
  updateLiveLog();
}

export function getMarkerStyle(z, shindoVal, hasSignal, color, baseOpacity) {
  const displayMode = state.appSettings.markerDisplayMode || 'normal';
  const opacityVal = (typeof baseOpacity === 'number' && !isNaN(baseOpacity)) ? baseOpacity : 1.0;

  // 미감지 관측소 흐리게 모드 && 흔들림이 없거나 신호가 없을 때
  if (displayMode === 'dim_inactive' && (!hasSignal || shindoVal < 0.5)) {
    let radius;
    if (z <= 4) radius = 0.6;
    else if (z <= 6) radius = 1.0;
    else radius = 1.5;

    return {
      radius: radius,
      opacity: 0.12 * opacityVal, // 극도로 투명하게 만들어 겹쳐도 지장 없게 함
      weight: 0 // 테두리 제거로 겹침 방지
    };
  }

  // 평상시에도 명확히 보이도록 투명도와 크기를 직관적으로 조정 (조밀하고 눈에 편안한 픽셀 크기 적용)
  let radius;
  if (z <= 4) radius = 1.2;
  else if (z <= 5) radius = 1.8;
  else if (z <= 6) radius = 2.4;
  else if (z <= 7) radius = 3.6;
  else radius = 5.5;

  let opacity = opacityVal;
  let weight = 0.3; // 얇은 테두리로 겹쳐도 경계 식별 가능하게 함

  if (!hasSignal) {
    opacity = 0.4 * opacityVal;
    weight = 0;
  } else if (shindoVal >= 0.5) {
    // 흔들림 감지 시 마커 크기 확장 및 강조
    radius += shindoVal * (z <= 5 ? 0.8 : 1.2);
    opacity = Math.min(1.0, opacityVal * 1.5);
    weight = 0.8;
  }

  return { radius, opacity, weight };
}

export function updateMarkerStyles() {
  if (!state.map || !state.markers) return;
  const z = state.map.getZoom();
  const okiZ = state.okinawaMap ? state.okinawaMap.getZoom() : 5.5;

  for (const e of state.markers) {
    if (!e || !e.marker) continue;
    const shindoVal = e.shindo ? e.shindo.val : 0;
    const hasSignal = e.currentGal > 0 && e.pixelIndex !== undefined;
    const color = hasSignal && e.lastPixelColor ? e.lastPixelColor : '#888';
    
    const style = getMarkerStyle(z, shindoVal, hasSignal, color, state.stationOpacity);
    const radius = style.radius;
    const opacity = style.opacity;
    const weight = style.weight;

    if (e.lastColor !== color || e.lastOpacity !== opacity || e.lastRadius !== radius || e.lastWeight !== weight) {
      e.marker.setStyle({ radius, fillColor: color, color: '#000', fillOpacity: opacity, weight });
    }

    if (e.okinawaMarker) {
      const okiStyle = getMarkerStyle(okiZ, shindoVal, hasSignal, color, state.stationOpacity);
      e.okinawaMarker.setStyle({
        radius: okiStyle.radius,
        fillColor: color,
        color: '#000',
        fillOpacity: okiStyle.opacity,
        weight: okiStyle.weight
      });
    }

    e.lastColor = color; e.lastOpacity = opacity; e.lastRadius = radius; e.lastWeight = weight;
  }
}

window.renderAllMarkers = renderAllMarkers;
window.updateMarkerStyles = updateMarkerStyles;