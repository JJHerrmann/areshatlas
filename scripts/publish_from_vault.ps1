Set-Location R:\Rookworks\Copilot
powershell -ExecutionPolicy Bypass -File .\scripts\sync_codex_content.ps1 -Source 'R:\RookVault\01_Active\Mindpalace\Authorship\roleplaying\worlds\aresh\codex-content'
npm run build
git add content codex_registry package.json app scripts
git commit -m "sync: publish latest codex content"
git push origin main
