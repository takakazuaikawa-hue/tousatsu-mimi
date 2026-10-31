// 読みの答え合わせ（本当の手の勝負の、決着の後）
// 読み合いの中では読みを預けるだけにし、答え合わせはその手が終わった後にここで行う（読み合いの中で答えを見せると、卓の判断が要らなくなるため）。
// 本編が MB.mount(host, { gameId: '__verdict', pending, noIntro: true, ... }) で呼ぶ。pending は各遊びが entrust で渡した中身：
// { title, charId, pick:'bluff'|'strong', truth, mimiEq（読んだ時にミミが勝つ見込み 0〜100）, board, mine, her, base, mult, stakes, perfect, notes:[{ label, lean }], extra（読みの下に出す1行。省略可） }
(() => {
  const NAME = { bluff: 'ブラフ', strong: '本物' };
  const MEAN = { bluff: 'ミミの方が強かった', strong: 'ミミより強かった' };
  // p.truthText（容疑者しぼり：相手の役で言う1行）・p.herWeak があればそれを使う（%は出さない）
  // 論理の遊び（kind:'logic'）：読みは「付いていく／降りる」。正解は、読んだ時にミミが勝つ見込みが割に合う線（need）を超えていたか
  const CSS = `
    .vd-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 6px; }
    .vd-title { font-family: var(--mincho); font-weight: 800; font-size: 15px; letter-spacing: .12em; color: var(--gold); }
    .vd-cards { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; justify-content: center; }
    .vd-grp { display: flex; gap: 4px; align-items: center; }
    .vd-tag { font-family: var(--mincho); font-weight: 700; font-size: 14px; color: var(--gold); margin-right: 4px; }
    .vd-truth { font-family: var(--mincho); font-weight: 800; font-size: 24px; line-height: 1.3; color: var(--gold-hi); text-align: center; opacity: 0; transform: scale(1.4); transition: opacity .35s, transform .35s cubic-bezier(.2,1.5,.4,1); }
    .vd-truth.on { opacity: 1; transform: none; }
    .vd-truth small { display: block; font-size: 14px; font-weight: 700; color: var(--gold-pale); }
    .vd-pick { display: flex; align-items: center; gap: 10px; font-family: var(--mincho); font-weight: 800; font-size: 17px; color: var(--text); opacity: 0; transition: opacity .3s; }
    .vd-pick.on { opacity: 1; }
    .vd-pick .mk { font-size: 26px; line-height: 1; }
    .vd-pick .mk.ok { color: var(--gold-hi); } .vd-pick .mk.ng { color: #ff8f9c; }
    .vd-notes { display: flex; flex-wrap: wrap; gap: 6px 10px; justify-content: center; max-width: 640px; }
    .vd-note { font-size: 14px; padding: 2px 8px; border: 1px solid var(--line-dim); background: rgba(19,4,6,.7); color: var(--dim); opacity: 0; transition: opacity .25s; }
    .vd-note.on { opacity: 1; }
    .vd-note.ok { border-color: var(--gold); color: var(--gold-pale); } .vd-note.ng { color: #c9a9ad; border-style: dashed; }
    .vd-note b { font-weight: 800; margin-left: 6px; }
    .vd-extra { font-family: var(--mincho); font-weight: 800; font-size: var(--ty-head, 16px); color: var(--gold-pale); text-align: center; opacity: 0; transition: opacity .3s; }
    .vd-extra.on { opacity: 1; }
    .vd-extra b { color: var(--gold-hi); }
  `;

  async function start({ api }) {
    const p = (api.opts && api.opts.pending) || {};
    api.css('verdict', CSS);
    const jp = api.char.jp;
    const L = p.kind === 'logic';
    const ACT = Object.assign({ call: '付いていく', fold: '降りる' }, p.names || {});
    const truth = p.truth || (L ? 'fold' : 'strong'), pick = p.pick || (L ? 'call' : 'bluff');
    const herWeak = p.herWeak ?? (L ? (p.mimiEq ?? 50) >= 50 : truth === 'bluff');
    const correct = pick === truth;
    api.say('……さあ、めくるよ', 'think'); api.bet('—'); api.coach('');
    const root = api.root;
    root.innerHTML = `<div class="vd-wrap">
        <div class="vd-title">読みの答え合わせ ・ ${p.title || ''}</div>
        <div class="vd-cards">
          <div class="vd-grp"><span class="vd-tag">場札</span>${(p.board || []).map(c => api.cardHTML(c, 'small')).join('')}</div>
          <div class="vd-grp"><span class="vd-tag">ミミ</span>${(p.mine || []).map(c => api.cardHTML(c, 'small')).join('')}</div>
          <div class="vd-grp"><span class="vd-tag">${jp}</span><span class="vd-grp" id="mb-vd-her">${api.backHTML('small')}${api.backHTML('small')}</span></div>
        </div>
        <div class="vd-truth" id="mb-vd-truth">${p.truthText ? p.truthText : L ? `${ACT[truth]}のが正解だった<small>読んだ時、ミミが勝つ見込み ${Math.round(p.mimiEq ?? 50)}%・割に合う線 ${Math.round(p.need ?? 33)}%</small>` : `${jp}は ${NAME[truth]}だった<small>読んだ時、${MEAN[truth]}（ミミが勝つ見込み ${Math.round(p.mimiEq ?? 50)}%）</small>`}</div>
        <div class="vd-pick" id="mb-vd-pick">${L ? 'ミミの判断：' + ACT[pick] : 'ミミの読み：' + NAME[pick]}<span class="mk ${correct ? 'ok' : 'ng'}">${correct ? '○' : '×'}</span></div>
        ${p.extra ? `<div class="vd-extra" id="mb-vd-extra">${p.extra}</div>` : ''}
        <div class="vd-notes">${(p.notes || []).map(n => `<span class="vd-note ${n.lean === truth ? 'ok' : 'ng'}">${n.label}<b>${n.lean === truth ? '当たっていた' : '外れの手がかり'}</b></span>`).join('')}</div>
      </div>`;
    api.mission('相手の札をめくる');
    // ためてから、相手の札を1枚ずつ
    api.sfx.drum(); await api.wait(1000); if (!api.alive()) return;
    const her = p.her || [];
    const box = root.querySelector('#mb-vd-her');
    if (her[0]) { box.innerHTML = api.cardHTML(her[0], 'small flip') + api.backHTML('small'); api.sfx.tap(); }
    await api.wait(800); if (!api.alive()) return;
    if (her[1]) { box.innerHTML = api.cardHTML(her[0], 'small') + api.cardHTML(her[1], 'small flip' + (!herWeak ? ' glow' : '')); api.sfx[!herWeak ? 'whoosh' : 'tap'](); }
    await api.wait(600); if (!api.alive()) return;
    root.querySelector('#mb-vd-truth').classList.add('on');
    api.emote(correct ? 'busted' : 'smug');
    // 相手の一言（各遊びが渡した台詞）：b/s＝本当の手、c/w＝ミミの読みが当たり/外れ
    if (p.endLines) api.say(p.endLines[(herWeak ? 'b' : 's') + (correct ? 'c' : 'w')] || '', correct ? 'busted' : 'smug');
    await api.wait(700); if (!api.alive()) return;
    root.querySelector('#mb-vd-pick').classList.add('on');
    const ex = root.querySelector('#mb-vd-extra'); if (ex) setTimeout(() => ex.classList.add('on'), 250);
    root.querySelectorAll('.vd-note').forEach((n, i) => setTimeout(() => n.classList.add('on'), 200 + i * 180));
    await api.wait(600 + (p.notes || []).length * 180); if (!api.alive()) return;
    api.mult = p.mult || 1; api.lossK = p.stakes || null;
    api.finish({
      correct, base: p.base || 20, perfect: !!(correct && p.perfect),
      detail: p.truthText && L ? `${ACT[truth]}のが正解。${correct ? 'ミミの判断どおり。' : 'ミミの判断は外れ。'}${p.why || ''}` : L ? `${ACT[truth]}のが正解（ミミが勝つ見込み ${Math.round(p.mimiEq ?? 50)}%・線 ${Math.round(p.need ?? 33)}%）。${correct ? 'ミミの判断どおり。' : 'ミミの判断は外れ。'}${p.why || ''}` : `${jp}は${NAME[truth]}（${MEAN[truth]}）。${correct ? 'ミミの読みどおり。' : 'ミミの読みは外れ。'}${p.why || ''}`,
    });
  }

  MB.register({ id: '__verdict', group: 'psych', hidden: true, title: '読みの答え合わせ', chars: ['polka', 'selina', 'velvet', 'grano', 'rico'], start });
})();
