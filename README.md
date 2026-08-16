# 일본 지진 & EEW 실시간 모니터링 시스템

Angular 21과 MapLibre GL을 기반으로 제작한 일본 지진 및 실시간 지진 조기경보(EEW) 모니터링 웹 애플리케이션입니다.

일본 기상청(JMA) 관련 지진 정보를 지도 위에 시각화하고, P2PQuake 및 Wolfx EEW 등의 실시간 데이터를 활용하여 지진 발생 상황과 지진파 전파를 모니터링할 수 있습니다.

---

## 주요 기능

### 🗺️ 실시간 지도

- MapLibre GL 기반 일본 지도
- JMA 예보구역 및 관측점 표시
- 지진 발생 위치 및 진도 시각화
- 지도 이동 및 위치 포커싱
- 지도 테마 변경
- 지진 진도별 색상 표시

### 🚨 지진 조기경보 (EEW)

- Wolfx EEW 실시간 데이터 연동
- P2PQuake WebSocket 연동
- EEW 발생 시 지도 위 P파 / S파 전파 애니메이션
- 예상 도달 시간 및 파동 전파 상태 표시
- 실시간 음성 및 알림음

### 📊 지진 정보

- 최근 지진 발생 내역
- 지진 규모 및 진도 정보
- 지진 발생 위치 및 시각
- P2PQuake 데이터를 활용한 지진 이력 관리
- 지진 발생 내역 그룹화 및 표시

### 📡 실시간 지진파 모니터

- 실시간 지진파 관측 이미지 모니터링
- 관측소별 데이터 처리
- 이미지 픽셀 분석을 통한 흔들림 감지
- 노이즈 필터링
- 감지된 지진 이벤트 처리

### 🎨 사용자 인터페이스

- 다크 모드 / 라이트 모드
- 지도 뷰 리셋
- 파동 링 표시 설정
- 탭 기반 정보 화면
- 지진 및 EEW 관련 알림

---

## 기술 스택

### Frontend

- Angular 21
- Standalone Components
- Zoneless
- Angular Signals
- RxJS
- TypeScript

### Map & Visualization

- MapLibre GL
- D3.js
- Proj4
- TopoJSON

### Realtime & Data

- WebSocket
- P2PQuake API
- Wolfx EEW API
- 일본 기상청(JMA) 관련 데이터

### Styling

- Tailwind CSS v4
- Angular Material
- Motion

### Server

- Express
- Angular SSR

---

## 프로젝트 구조

```text
src/app/
├── components/
│   └── UI 및 화면 구성 요소
│
├── services/
│   ├── map.service.ts
│   ├── quake-data.service.ts
│   ├── quake-detect.service.ts
│   ├── quake-history.service.ts
│   ├── wave-physics.service.ts
│   └── ...
│
├── models/
│   └── 데이터 모델 및 타입
│
├── utils/
│   └── 공통 유틸리티
│
└── app.ts
```

### `app.ts`

`app.ts`는 애플리케이션의 모든 세부 기능을 직접 처리하지 않고, 각 기능을 담당하는 서비스와 UI 상태를 조정하는 역할을 중심으로 합니다.

주요 책임은 다음과 같습니다.

- Angular Component lifecycle 관리
- UI 상태 관리
- 사용자 인터랙션 처리
- 여러 서비스 간 작업 조정
- 지도 및 지진 기능의 전체 흐름 제어

세부적인 기능은 각각의 서비스로 분리하여 관리합니다.

### 주요 서비스

#### `MapService`

MapLibre 지도 생성 및 지도 관련 기능을 담당합니다.

- 지도 초기화
- 지도 레이어 및 Source 관리
- 지도 스타일 관리
- 지도 위치 이동 및 포커싱

#### `QuakeDataService`

지진 및 관측 관련 데이터를 처리합니다.

- 지진 데이터 조회
- 관측소 데이터 처리
- 지도에 표시할 데이터 변환

#### `QuakeDetectService`

실시간 지진 감지와 관련된 처리를 담당합니다.

- 관측소 데이터 분석
- 흔들림 감지
- 노이즈 필터링
- 지진 이벤트 생성 및 처리

#### `QuakeHistoryService`

지진 발생 이력과 관련된 상태 및 데이터 처리를 담당합니다.

- 지진 이력 관리
- 지진 이벤트 그룹화
- 과거 지진 데이터 처리

#### `WavePhysicsService`

지진 발생 위치를 기준으로 P파와 S파의 전파를 계산합니다.

- P파 전파 계산
- S파 전파 계산
- 예상 도달 시간 계산
- 파동 애니메이션에 필요한 물리 계산

---

## 아키텍처 방향

이 프로젝트는 하나의 컴포넌트에 여러 책임이 집중되는 문제를 줄이고, 각 기능의 책임을 분리하는 방향으로 리팩터링하고 있습니다.

특히 `app.ts`에서 다음과 같은 책임을 분리하는 것을 목표로 합니다.

```text
                    App
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
      MapService  QuakeData  QuakeDetect
          │          │          │
          │          │          │
          ▼          ▼          ▼
      MapLibre    지진 데이터   지진 감지
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
 QuakeHistoryService      WavePhysicsService
          │                     │
     지진 이력 관리          P/S Wave 계산
```

이러한 구조를 통해 각 기능의 변경 범위를 줄이고, 유지보수성과 테스트 가능성을 높이는 것을 목표로 합니다.

> 단순히 파일을 작게 나누는 것이 아니라, 각 모듈이 명확한 책임을 갖도록 분리하는 것을 목표로 합니다.

---

## 데이터 흐름

전체적인 데이터 흐름은 다음과 같습니다.

```text
외부 데이터
   │
   ├── P2PQuake
   ├── Wolfx EEW
   └── JMA 관련 데이터
          │
          ▼
      Services
          │
          ├── 지진 데이터 처리
          ├── 지진 감지
          ├── 지진 이력
          └── EEW / Wave Physics
          │
          ▼
        App
          │
          ├── UI 상태
          └── 기능 간 조정
          │
          ▼
     Components / MapLibre
```

---

## 시작하기

### 요구 사항

- Node.js v20 이상 권장
- npm v10 이상 권장

### 1. 저장소 가져오기

```bash
git clone https://github.com/tomato332/MapLibre-ESM-App.git
cd MapLibre-ESM-App
```

### 2. 의존성 설치

```bash
npm install
```

> `npm install --production`을 사용하면 Angular CLI 등의 개발 의존성이 설치되지 않을 수 있으므로 개발 환경에서는 일반 `npm install`을 사용하세요.

### 3. 개발 서버 실행

```bash
npm run dev
```

개발 서버의 기본 주소:

```text
http://localhost:3000
```

### 4. 프로덕션 빌드

```bash
npm run build
```

### 5. SSR 서버 실행

```bash
npm start
```

---

## 환경 변수

필요한 환경 변수는 `.env.example`을 참고하여 설정합니다.

```env
GEMINI_API_KEY=your_api_key_here
```

환경 변수의 실제 값은 저장소에 커밋하지 않습니다.

---

## 개발 브랜치

기능 개발이나 구조 변경은 `main`에 직접 작업하지 않고 별도의 브랜치에서 진행합니다.

예:

```text
main
│
└── refactor/app-ts-solid
```

리팩터링이나 기능 개발이 완료되면 Pull Request를 통해 `main`에 반영합니다.

---

## 프로젝트 개발 방향

이 프로젝트는 다음 방향을 중요하게 생각합니다.

- 기능별 책임 분리
- 명확한 모듈 경계
- 기존 서비스의 재사용
- 불필요한 추상화 최소화
- 유지보수하기 쉬운 구조
- 실시간 데이터 처리의 안정성
- 지도 렌더링과 데이터 처리의 분리

특히 SOLID 원칙을 적용할 때도 단순히 파일 수를 늘리는 것이 아니라 **실제 책임과 의존성을 기준으로 구조를 설계하는 것**을 우선합니다.

---

## License

이 프로젝트의 라이선스 정보는 저장소의 `LICENSE` 파일을 참고하세요.
