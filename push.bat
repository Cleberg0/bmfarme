@echo off
cd /d C:\Users\Cleber\projects\bm-farm-god-mode
git rm -r --cached frontend/src/components/
git add frontend/src/components/
git add -A
git status
git commit -m "feat: UX overhaul copy buttons fixed step flow"
git push origin main
pause
