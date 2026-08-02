# 일본 지진 & EEW 실시간 모니터링 시스템 (JMA Earthquake & EEW Monitor)

Angular 21 및 SSR(Express) 기반으로 구현된 일본 지진 정보 및 실시간 조기경보(EEW) 모니터링 웹 애플리케이션입니다.

---

## 🚀 주요 기능

- 🗺️ **실시간 지도 시각화**: MapLibre GL 기반으로 일본 전역의 기상청(JMA) 예보구역, 관측점, 진원지 위치 시각화
- 🚨 **지진 조기 경보 (EEW) & 파동 추정**:
  - Wolfx EEW 및 P2PQuake WebSocket 실시간 연동
  - EEW 발령 시 P파/S파 실시간 전파 애니메이션 지도 표시
  - 실시간 음성 경보 및 알림음 재생
- 📊 **지진 내역 및 진도 정보**:
  - P2PQuake API 연동을 통한 최근 지진 발생 내역 및 상세 진도 정보 제공
  - JMA 기준 진도 등급(진도 1 ~ 7) 색상 범례 및 단계별 필터링
- 📡 **강진 모니터 (Realtime GIF)**: Realtime 실시간 지진파 관측 모니터 제공
- 🌙 **사용자 편의 기능**: 다크 모드/라이트 모드 지원, 지도 뷰 리셋, 파동 링 표시 토글

---

## 🛠️ 기술 스택

- **Frontend**: Angular 21 (Zoneless, Standalone Components, Signals), RxJS
- **Backend / SSR**: Express (Server-Side Rendering & API Proxy)
- **Map & GeoData**: MapLibre GL, D3.js, Proj4, TopoJSON
- **Realtime / Data**: WebSocket (`ws`), P2PQuake API, Wolfx EEW API
- **Styling**: Tailwind CSS v4, Angular Material, Motion

---

## ⚙️ 사전 요구 사항

- **Node.js**: v20 이상 권장
- **npm**: v10 이상 권장

---

## 📦 설치 및 실행 방법

### 1. 의존성 설치

```bash
npm install
```

> **주의**: `npm install --production`을 실행하면 Angular CLI(`@angular/cli`)가 제외되므로 반드시 일반 `npm install`을 실행하세요.

### 2. 개발 서버 실행

개발 모드로 애플리케이션을 실행합니다. (기본 포트: `http://localhost:3000`)

```bash
npm run dev
```

### 3. 프로덕션 빌드 및 SSR 실행

```bash
# 프로덕션 빌드
npm run build

# SSR 서버 실행
npm start
```

---

## 📝 환경 변수 설정

필요시 `.env.example`을 참고하여 `.env` 파일을 작성할 수 있습니다.

```env
# GEMINI_API_KEY=your_api_key_here
```
