// 見つめ合いを本当の手で開き、右の枠と手順の帯の寸法と、折り返しを決めている CSS の規則を出す（調べ用）。
// QA_SIZE=WxH node qa/stareprobe.mjs
import { openSession, sleep } from './lib/session.mjs';
const [w, h] = (process.env.QA_SIZE || '667x375').split('x').map(Number);
const session = await openSession({ width: w, height: h, speed: 1, save: { clearedStages: ['rico_tutorial', 'polka', 'selina', 'grano'], introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 500 } });
const { page } = session;
const MEASURE = String.raw`(() => {
  const q = (s) => document.querySelector('.read-battle-host ' + s);
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), wrap: cs.flexWrap, sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight }; };
  const el = q('.rb-top .steps'); const hits = [];
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch (e) { continue; }
    const walk = (rs) => { for (const x of rs) { if (x.cssRules && !x.selectorText) { if (!x.media || matchMedia(x.media.mediaText).matches) walk(x.cssRules); continue; } try { if (x.selectorText && x.style && x.style.flexWrap && el && el.matches(x.selectorText)) hits.push((sh.href || 'inline').split('/').pop() + ' :: ' + x.selectorText.slice(0, 160) + ' => ' + x.style.flexWrap); } catch (e) {} } };
    walk(rules);
  }
  return JSON.stringify({ steps: r(el), mission: r(q('.rb-top .mb-mission')), info: r(q('.rb-info')), sit: r(q('.stare-sit')), scale: r(q('.st-scale')), clues: r(q('.stare-clues')), wrapRules: hits });
})()`;
try {
  for (let i = 0; i < 60 && !(await page.eval('typeof startBattle === "function"').catch(() => false)); i++) await sleep(500);
  await sleep(1500);
  await page.eval(`startBattle('polka'); true`); await sleep(2500);
  for (let i = 0; i < 6; i++) { await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /開始|対戦開始/.test(b.textContent)); if (b) b.click(); return true; })()`); await sleep(900); }
  await page.eval(`(() => { if ((state.community || []).length < 3) { state.community = [state.deck.pop(), state.deck.pop(), state.deck.pop()]; state.handPhase = 'flop'; render(); } READ_BATTLE_POOLS.polka.psych = ['stare']; state.psychPending = true; startReadBattle('psych'); return true; })()`);
  await sleep(4500);
  for (const sel of [".st-choice small.ok", ".st-odds small", ".rb-info .card.small i", ".stare-meter .lbl"]) console.log(await page.eval(String.raw`(() => { const el = document.querySelector(".read-battle-host " + ${JSON.stringify("SEL")}.replace("SEL", "${sel}")); if (!el) return "なし"; const hits = []; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } const walk = (rs, m) => { for (const x of rs) { if (x.cssRules && !x.selectorText) { if (!x.media || matchMedia(x.media.mediaText).matches) walk(x.cssRules, x.media ? x.media.mediaText : m); continue; } try { if (x.selectorText && x.style && x.style.fontSize && el.matches(x.selectorText)) hits.push(((sh.href || sh.ownerNode && sh.ownerNode.id || "inline") + "").split("/").pop().split("?")[0] + " :: " + x.selectorText.slice(0, 120) + " => " + x.style.fontSize); } catch (e) {} } }; walk(rules, ""); } return "${sel} 計算 " + getComputedStyle(el).fontSize + " || " + hits.join(" || "); })()`));
  await page.screenshot('qa/out/stareprobe.png');
} finally { await session.close(); }
