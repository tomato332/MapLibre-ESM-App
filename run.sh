#!/bin/bash

if [ -d "node_modules" ]; then
    echo "📦 node_modules 폴더가 이미 존재합니다. 패키지 설치를 건너뜁니다."
else
    echo "📦 패키지 설치를 시작합니다 (npm install)..."
    npm install
    
    if [ $? -eq 0 ]; then
        echo "✅ 설치 완료!"
    else
        echo "❌ 패키지 설치 중 오류가 발생했습니다."
        exit 1
    fi
fi

echo "🛠️ 개발 서버를 시작합니다 (npm run dev)..."
npm run dev