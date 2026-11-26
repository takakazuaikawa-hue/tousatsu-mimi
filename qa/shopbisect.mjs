// 交換所のどの部品が GPU のメモリを食うかを切り分ける（11/23）。部品を1つずつ消して、描画の係＋GPU の係の実メモリの減り方を見る
import { execFileSync } from 'node:child_process';
import { openSession, sleep } from './lib/session.mjs';
const ST = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const { page, browser, close } = await openSession({ width: 844, height: 390, mobile: true, save: { clearedStages: ST, endingUnlocked: true, introPlayed: true, coins: 99999 } });
const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 100));
const mem = () => {
  const out = execFileSync('powershell', ['-NoProfile', '-Command', `$r=0;$g=0; Get-CimInstance Win32_Process -Filter "Name='msedge.exe' or Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${browser.profile}*' } | ForEach-Object { $p = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue; if ($p) { if ($_.CommandLine -match 'gpu-process') { $g += $p.PrivateMemorySize64 } elseif ($_.CommandLine -match 'renderer') { $r += $p.PrivateMemorySize64 } } }; "$([int]($r/1MB)) $([int]($g/1MB))"`], { encoding: 'utf8' }).trim().split(' ').map(Number);
  return { r: out[0], g: out[1] };
};
const show = async (label) => { await sleep(3500); const m = mem(); console.log(label.padEnd(26), 'renderer', m.r, 'gpu', m.g); return m; };
try {
  for (let i = 0; i < 200 && !(await q('typeof render==="function" && !!document.querySelector(".title-screen")')); i++) await sleep(200);
  await sleep(2000); await q(`(() => { state.screen = 'lobby'; render(); return 1; })()`); await sleep(8000);
  await show('home');
  await q(`document.querySelector('[data-action="open-shop"]').click()`); await sleep(6000);
  await show('shop');
  const parts = ['.sh3-row', '.sh3-model', '.sh3-grano', '.sh3-fg', '.sh3-buy, .sh3-info', '.shop-screen'];
  for (const p of parts) { await q(`document.querySelectorAll(${JSON.stringify(p)}).forEach(e => e.style.display = 'none')`); await show('hide ' + p); }
  await q(`(() => { const s = document.querySelector('.shop-screen'); return s ? getComputedStyle(s).backgroundImage.slice(0, 300) : 'none'; })()`).then(v => console.log('bg', v));
  await q(`(() => { const out = []; document.querySelectorAll('.shop-screen *').forEach(e => { const c = getComputedStyle(e); if (c.backgroundImage.includes('url(') || c.filter !== 'none' || c.backdropFilter && c.backdropFilter !== 'none' || c.mixBlendMode !== 'normal') out.push(e.className.toString().slice(0, 30) + ' | ' + (c.filter !== 'none' ? 'filter ' + c.filter.slice(0, 40) : '') + (c.backdropFilter && c.backdropFilter !== 'none' ? ' backdrop ' + c.backdropFilter : '') + (c.mixBlendMode !== 'normal' ? ' blend ' + c.mixBlendMode : '')); }); return out.slice(0, 30).join('\\n'); })()`).then(console.log);
} finally { await close(); }
