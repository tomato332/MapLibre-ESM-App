#!/bin/bash

# 에러 발생 시 스크립트 중단
set -e

echo "🚀 [run.sh v2] 지진 정보 & EEW 감지 시스템 가동 스크립트 v2"
echo "=========================================================="

# 1. 패키지 매니저 확인
if command -v pnpm &> /dev/null; then
  PKG_CMD="pnpm"
else
  PKG_CMD="npm"
fi

echo "📦 패키지 동기화 확인중 ($PKG_CMD install)..."
$PKG_CMD install

# 2. Electron 메인 파일(main.js) 존재 여부 확인 및 생성
if [ ! -f "main.js" ]; then
  echo "📄 Electron main.js 파일 생성..."
  cat << 'EOF' > main.js
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    title: '실시간 지진 정보 & EEW 감지 시스템',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  win.loadURL(devUrl);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
EOF
fi

# 3. 실행 모드 처리
echo ""
echo "🛠️ 실행 옵션 선택:"
echo " 1) Web 개발 서버 실행 (기본값, http://localhost:3000)"
echo " 2) Electron 데스크톱 앱 + Angular 개발 서버 동시 실행"
echo ""

if [ -t 0 ]; then
  read -t 5 -p "원하는 번호를 입력하세요 (5초 후 1번 자동 선택): " CHOICE || CHOICE=1
else
  CHOICE=1
fi

case "$CHOICE" in
  2)
    echo "⚡ Electron + Angular Dev Server를 시작합니다..."
    if command -v npx &> /dev/null; then
      npx concurrently -k "pnpm dev" "npx wait-on http://localhost:3000 && npx electron ."
    else
      $PKG_CMD dev
    fi
    ;;
  *)
    echo "🌐 Angular Web 개발 서버를 시작합니다 ($PKG_CMD dev)..."
    $PKG_CMD dev
    ;;
esac
