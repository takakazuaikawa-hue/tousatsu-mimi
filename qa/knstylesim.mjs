// 型の判定の分かれ方を測る（11/23「判定はうまくしないとつまらなくなる」）。遊び方の違う打ち手で勝ち抜き戦を本当に遊ばせ、集めた回数を記録する
// node qa/knstylesim.mjs [打ち手,...] [卓数]  出力 qa/out/knstyle.json
import fs from 'node:fs';
import { openSession, sleep } from './lib/session.mjs';
const PERSONAS = (process.argv[2] || 'maniac,tight,station,bluffer,solid,random').split(',');
const TABLES = +(process.argv[3] || 3);
const ST = ['rico_tutorial', 'polka', 'selina', 'grano', 'velvet'];
const out = fs.existsSync('qa/out/knstyle.json') ? JSON.parse(fs.readFileSync('qa/out/knstyle.json', 'utf8')) : {};
for (const P of PERSONAS) {
  const { page, close } = await openSession({ width: 844, height: 390, mobile: true, speed: 6, seed: 1000 + PERSONAS.indexOf(P) * 77, save: { clearedStages: ST, endingUnlocked: true, introPlayed: true, houseRulesSeen: true, readIntroSeen: true, coins: 30000, readingEnabled: false } });
  const q = (js) => page.eval(js).catch(e => 'ERR ' + e.message.slice(0, 120));
  const runs = [];
  try {
    for (let i = 0; i < 200 && !(await q('typeof knStart==="function"')); i++) await sleep(200);
    await sleep(2000);
    for (let attempt = 0; attempt < TABLES; attempt++) {
      await q(`(() => { document.querySelectorAll('.kn-ov').forEach(e => e.remove()); knStart(true); return 1; })()`);
      const t0 = Date.now();
      while (Date.now() - t0 < 240000) {
        const r = await q(`(() => {
          const vis = (b) => b && b.offsetParent && !b.disabled;
          if (document.querySelector('.kn-end')) return 'end';
          const nx = document.querySelector('.kn-inter [data-kn="next"]'); if (nx) { nx.click(); return 'next'; }
          if (state.screen !== 'battle') return 'wait';
          if (state.isPlayerTurn && state.playerHand.length === 2 && state.handPhase !== 'idle' && state.handPhase !== 'showdown') {
            const need = Math.max(0, state.currentBetOpponent - state.currentBetPlayer);
            const ev = (typeof evaluateHand === 'function' && state.playerHand.length === 2) ? evaluateHand([...state.playerHand, ...state.community]) : { rank: 0 };
            const hi = Math.max(...state.playerHand.map(c => c.rank)), pair = state.playerHand[0].rank === state.playerHand[1].rank;
            const strong = ev.rank >= 2 || (state.community.length === 0 && (pair || hi >= 13)) || (ev.rank === 1 && hi >= 11);
            const R = Math.random(), P = ${JSON.stringify(P)};
            const A = (k) => { const act = { allin: 'player-allin', bet: 'player-bet', call: 'player-call', cc: 'player-checkcall', fold: 'player-fold' }[k]; knStatAct(act === 'player-call' && need === 0 ? 'player-checkcall' : act);
              if (k === 'allin') playerAllIn(); else if (k === 'bet') playerBet('pot_1_2'); else if (k === 'call') (need > 0 ? playerCall() : playerCheckCall()); else if (k === 'cc') playerCheckCall(); else playerFold(); return 'act:' + k; };
            const call = need > 0 ? 'call' : 'cc';
            if (P === 'maniac') return A(R < 0.45 ? 'allin' : R < 0.8 ? 'bet' : call);
            if (P === 'tight') return A(strong ? (R < 0.5 ? 'bet' : call) : (need > 0 ? 'fold' : 'cc'));
            if (P === 'station') return A(call);
            if (P === 'bluffer') return A(!strong ? (R < 0.7 ? 'bet' : (need > 0 ? 'fold' : 'cc')) : call);
            if (P === 'solid') return A(strong ? (R < 0.6 ? 'bet' : call) : (need > 0 ? (R < 0.35 ? 'call' : 'fold') : 'cc'));
            return A(['allin', 'bet', call, call, 'fold', 'bet'][Math.floor(R * 6) % 6]);
          }
          const m = [...document.querySelectorAll('[data-action="start-hand"], .hand-result button, .result-modal button, .coach-layer, .mimi-confirm-actions .btn-primary')].find(vis);
          if (m) { m.click(); return 'adv'; }
          const t = [...document.querySelectorAll('button')].find(b => vis(b) && /次のハンド|対戦開始|対戦結果|^OK|閉じる|次へ|わかった/.test(b.textContent.trim()));
          if (t) { t.click(); return 'adv2'; }
          return 'idle';
        })()`);
        if (r === 'end') break;
        if (Date.now() - t0 > 230000) console.log('stuck', r, await q(`JSON.stringify({scr:state.screen,ph:state.handPhase,n:state.handNo,pc:state.playerChips,oc:state.opponentChips,btns:[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.className.slice(0,30)+':'+b.textContent.trim().slice(0,14)).slice(0,12),ov:[...document.querySelectorAll('body > div, #stage > div')].map(e=>String(e.className).slice(0,30)).filter(Boolean).slice(-6)})`));
        await sleep(120);
      }
      const last = await q(`JSON.stringify((knSave().last) || null)`);
      runs.push(JSON.parse(last));
      console.log(P, attempt, last.slice(0, 260));
    }
  } finally { await close(); }
  out[P] = runs;
  fs.writeFileSync('qa/out/knstyle.json', JSON.stringify(out, null, 1));
}
