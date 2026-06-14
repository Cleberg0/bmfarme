@echo off
cd /d C:\Users\Cleber\projects\bm-farm-god-mode

echo === Limpando cache git do frontend ===
git rm -r --cached frontend/src/ 2>nul
git rm -r --cached frontend/index.html 2>nul
git rm -r --cached frontend/vite.config.ts 2>nul

echo === Adicionando todos os arquivos ===
git add -A

echo === Status atual ===
git status

echo === Fazendo commit ===
git commit -m "fix: force re-add all frontend files, fix index.html title, add dev proxy"

echo === Enviando para GitHub ===
git push origin main

echo === Concluido! ===
pause
