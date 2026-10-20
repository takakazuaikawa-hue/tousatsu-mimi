// 心理：手がかり探偵
// 相手の言葉・顔・賭け額・流れの手がかりを調べ、「強い」「ブラフ」の天秤に載せて読む。
// 手がかりは相手の本当の手から、性格ごとの「出やすさ」で作る（読めば得をするが、外れることもある）。
MB.register({
  id: 'detective', group: 'psych', order: 1, title: '手がかり探偵', sub: '心理・基本',
  chars: ['polka', 'selina'],
  async start({ api }) {
    const P = {
      polka: {
        prior: .65, speechLeak: .8, faceLeak: .8, sizeNote: 'ポルカは、弱い時ほど大きく賭ける', sizeLean: 'bluff',
        speech: { bluff: ['うわー、ボク絶対勝てる手だわー（棒）', 'ミミちゃん、降りた方がいいって！ ほんとに！'], strong: ['……えへへ、どうしよっかな。', 'ん。ちょっとだけ、ね。'] },
        face: { bluff: '目が泳いで、汗をかいている', strong: '口の端が上がって、落ち着いている' },
        panyu: { bluff: 'チップを置く指先が、小さく震えていた', strong: 'チップを置く手つきが、やけに丁寧だった' },
      },
      selina: {
        prior: .25, speechLeak: 0, faceLeak: .35, sizeNote: 'セリナは、強い時ほど大きく賭ける', sizeLean: 'strong',
        speech: { bluff: ['……ポット。'], strong: ['……ポット。'] },
        face: { bluff: '表情は変わらない。……が、まばたきが一度増えた', strong: '表情は変わらない' },
        panyu: { bluff: '賭けた後、場札のマークをちらっと二度見した', strong: '賭けた後、一度も場札を見なかった' },
      },
    };
    const who = api.charId in P ? api.charId : 'polka';
    const ch = P[who];
    const truth = Math.random() < ch.prior ? 'bluff' : 'strong';
    const opp = (t) => (t === 'bluff' ? 'strong' : 'bluff');
    const leak = (p) => Math.random() < p;
    const X = api.pick(api.SUITS); const others = api.SUITS.filter(s => s !== X);
    const board = [{ r: 12, s: X }, { r: 8, s: X }, { r: 3, s: X }, { r: 10, s: others[0] }];
    const mine = [{ r: 12, s: others[1] }, { r: 14, s: others[2] }];
    const her = truth === 'strong' ? api.shuffle([2, 4, 5, 6, 7, 9, 11, 13, 14].map(r => ({ r, s: X }))).slice(0, 2) : [{ r: 5, s: others[1] }, { r: 4, s: others[0] }];
    const speech = ch.speechLeak === 0 ? { text: `「${api.pick(ch.speech[truth])}」`, lean: 'none' }
      : leak(ch.speechLeak) ? { text: `「${api.pick(ch.speech[truth])}」`, lean: truth } : { text: `「${api.pick(ch.speech[opp(truth)])}」`, lean: opp(truth) };
    const face = leak(ch.faceLeak) ? { text: ch.face[truth], lean: (who === 'selina' && truth === 'strong') ? 'none' : truth } : { text: who === 'selina' ? ch.face.strong : '特に変わった様子はない', lean: 'none' };
    const size = { text: `ポットと同じ額。${ch.sizeNote}`, lean: ch.sizeLean };
    const flowS = 'フロップから毎回、同じ大きさで賭け続けている', flowB = 'フロップはチェックしたのに、今になって急に大きく';
    const flow = leak(.6) ? { text: truth === 'bluff' ? flowB : flowS, lean: truth } : { text: truth === 'bluff' ? flowS : flowB, lean: opp(truth) };
    const clues = [{ kind: '言葉', ...speech, open: true }, { kind: '顔', ...face }, { kind: '賭け額', ...size }, { kind: '流れ', ...flow }];
    const hidden = { kind: 'ミミの勘', text: ch.panyu[truth], lean: truth };

    // 手がかりの種類の図柄（線の絵。色は文字と同じ）
    const IC = (d) => `<svg class="dt-ico" viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
    const ICON = {
      '言葉': IC('<path d="M2 3h12v8H7l-3 3v-3H2z"/>'),
      '顔': IC('<path d="M1 8c3-5 11-5 14 0-3 5-11 5-14 0z"/><circle cx="8" cy="8" r="2.2"/>'),
      '賭け額': IC('<ellipse cx="8" cy="12" rx="6" ry="2.6"/><ellipse cx="8" cy="8" rx="6" ry="2.6"/><ellipse cx="8" cy="4" rx="6" ry="2.6"/>'),
      '流れ': IC('<path d="M1 12l4-5 3 3 6-7"/><path d="M10 3h4v4"/>'),
      'ミミの勘': IC('<path d="M5 14C3 11 3 6 5 2c2 4 2 9 0 12zM11 14c-2-3-2-8 0-12 2 4 2 9 0 12z"/>'),
      'ぱにゅ': IC('<path d="M5 14C3 11 3 6 5 2c2 4 2 9 0 12zM11 14c-2-3-2-8 0-12 2 4 2 9 0 12z"/>'),
    };
    api.say(speech.text.replace(/[「」]/g, ''), who === 'polka' ? 'smug' : 'think'); api.bet(400);
    api.css('detective', `
      /* 天秤：深紅（強い手）↔ 金（ブラフ）。針は淡い金 */
      .dt-scale { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; max-width: 560px; width: 100%; margin: 0 auto; font-family: var(--mincho); font-size: 13px; font-weight: 800; }
      .dt-scale .l { color: var(--red-hi); } .dt-scale .r { color: var(--gold-hi); }
      .dt-beam { position: relative; height: 10px; background: linear-gradient(90deg, rgba(200,37,58,.6), rgba(217,178,105,.14) 50%, rgba(239,205,130,.6)); border: 1px solid var(--line-dim); }
      .dt-beam i { position: absolute; top: -9px; left: 50%; width: 4px; height: 28px; margin-left: -2px; background: var(--gold-pale); box-shadow: 0 0 0 1px #130406, 0 0 10px rgba(244,228,189,.7); transition: left .5s cubic-bezier(.2,1.3,.4,1); }
      .dt-clues { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
      /* 付箋：羊皮紙＋金の鋲（.mb-parchment .is-pinned）。傾けない。ぱにゅの付箋は深紅の札（.mb-crimson）。面・線・影は core.css の部品が描く */
      .dt-clue { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; transform: none; }
      .dt-kind { font-family: var(--mincho); font-weight: 700; letter-spacing: .12em; color: var(--crimson); font-size: 15px; }
      .dt-text { font-weight: 800; font-size: 14px; min-height: 2.8em; }
      .dt-clue:not(.open) .dt-text { color: #7b6a55; }
      .dt-acts { display: flex; flex-wrap: wrap; gap: 6px; }
      /* 押す所（調べる／強い手／ブラフ／関係なし／ぱにゅぱにゅで探る）は .mb-key（四角・黒檀に金文字。選んだ物は深紅に金の下線） */
      .dt-acts button { font-size: 13px; padding: 5px 10px; }
      .dt-clue:not(.open) .lean { display: none; } .dt-clue.open .open-btn { display: none; }
      .dt-clue.hidden-clue .dt-kind { color: var(--gold-hi); }
      .dt-clue.hidden-clue .dt-text { color: var(--text); }
      .dt-ico { width: 16px; height: 16px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; vertical-align: -3px; margin-right: 4px; }
      .dt-kind { white-space: nowrap; }
      /* 賭けの大きさ：チップの積み＋「ポット同額」の札。問いは「強い？ ブラフ？」だけ */
      .dt-ask { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
      .dt-bet { display: inline-flex; align-items: center; gap: 8px; padding: 2px 12px 2px 8px; background: rgba(19,4,6,.84); border: 1px solid var(--gold); }
      .dt-bet b { font-family: var(--mincho); font-weight: 800; font-size: 15px; color: var(--gold-pale); white-space: nowrap; }
      .dt-stk { position: relative; width: 28px; height: 26px; flex: 0 0 auto; }
      .dt-stk i { position: absolute; left: 0; width: 28px; height: 11px; border-radius: 50%; background: repeating-linear-gradient(90deg, #e3b964 0 5px, #8a1a22 5px 9px); border: 1.5px solid #4a2c08; box-shadow: 0 2px 0 #4a2c08; }
      .dt-stk i:nth-child(1) { bottom: 0; } .dt-stk i:nth-child(2) { bottom: 5px; } .dt-stk i:nth-child(3) { bottom: 10px; } .dt-stk i:nth-child(4) { bottom: 15px; }
      .dt-q { font-family: var(--mincho); font-weight: 800; font-size: 17px; color: var(--text); }
      .dt-mine .formula { text-align: left; }
      /* 答え合わせ：決め手＝金の二重線、ひっかけ＝赤の線（太さと内側へ寄せる指定はスマホ横の read-compact.css が持つ） */
      .dt-clue.key { outline: 3px double var(--gold-hi); outline-offset: 2px; } .dt-clue.trap { outline: 3px solid var(--red-hi); outline-offset: 2px; }
      .dt-verdict { font-size: 12px; font-weight: 900; color: #5e430b; } .dt-clue.trap .dt-verdict { color: var(--crimson); }
      .dt-clue.hidden-clue .dt-verdict { color: var(--gold-hi); } .dt-clue.hidden-clue.trap .dt-verdict { color: #f0b4aa; }
    `);
    const root = api.root;
    root.innerHTML = `
      ${api.steps(['手がかりを調べる', '天秤に載せる', '読みを賭ける', '答え合わせ'], 0)}
      <div class="row dt-board">${board.map(c => api.cardHTML(c, 'big' + (c.s === X ? ' hot' : ''))).join('')}${api.backHTML('big')}${api.threat(`<span class="${X === 'h' || X === 'd' ? 'rd' : ''}">${api.SYM[X]}</span><span class="${X === 'h' || X === 'd' ? 'rd' : ''}">${api.SYM[X]}</span><span class="q">?</span>`, 'フラッシュの危険')}</div>
      <div class="row dt-mine">${mine.map(c => api.cardHTML(c, 'big')).join('')}<span class="formula">${api.handTag('Qのワンペア')}</span></div>
      <div class="prompt dt-ask" aria-label="${api.char.jp}がポットと同じ額を賭けてきた。強い？ ブラフ？"><span class="dt-bet"><span class="dt-stk"><i></i><i></i><i></i><i></i></span><b>ポット同額</b></span><span class="dt-q">強い？ ブラフ？</span></div>
      <div class="dt-scale"><span class="l">強い手</span><div class="dt-beam"><i id="mb-dt-needle"></i></div><span class="r">ブラフ</span></div>
      <div class="dt-clues" id="mb-dt-clues"></div>
      <div class="actions" id="mb-dt-decide" hidden>
        <button class="btn" id="mb-dt-call">ブラフと読む<small>コールして勝負</small></button>
        <button class="btn quiet" id="mb-dt-fold">強い手と読む<small>降りて守る</small></button>
      </div>`;
    const placed = {};
    const clueBox = root.querySelector('#mb-dt-clues');
    const drawClue = (c, i) => {
      return `<div class="dt-clue ${i === 'p' ? 'hidden-clue mb-crimson' : 'mb-parchment is-pinned'} ${c.open ? 'open' : ''}" data-i="${i}">
        <div class="dt-kind">${ICON[c.kind] || ''}${c.kind}</div><div class="dt-text">${c.open ? c.text : '？？？'}</div>
        <div class="dt-acts"><button class="open-btn mb-key">調べる</button>
          <button class="lean mb-key" data-lean="strong">強い手</button><button class="lean mb-key" data-lean="bluff">ブラフ</button><button class="lean mb-key" data-lean="none">関係なし</button></div></div>`;
    };
    clueBox.innerHTML = clues.map(drawClue).join('') + `<div class="dt-clue hidden-clue mb-crimson" data-i="gacha"><div class="dt-kind">${ICON['ぱにゅ']}ぱにゅ</div><div class="dt-text">ミミにしか見えない手がかりを1つ探せる</div><div class="dt-acts"><button id="mb-dt-panyu" class="mb-key is-gold">ぱにゅぱにゅで探る</button></div></div>`;
    api.tipOnce('detective', who === 'polka' ? '手がかりを<b>めくって</b>天秤へ' : '<b>変わったもの</b>を探そ');
    api.mission('手がかりを調べて、天秤に載せる');
    const refresh = () => {
      const sc = Object.values(placed).reduce((a, v) => a + (v === 'bluff' ? 1 : v === 'strong' ? -1 : 0), 0);
      root.querySelector('#mb-dt-needle').style.left = (50 + Math.max(-3, Math.min(3, sc)) * 14) + '%';
      if (Object.keys(placed).length >= 3 && !decided) { root.querySelector('#mb-dt-decide').hidden = false; api.mission('ブラフか強い手か、読みを決める'); }
    };
    clueBox.addEventListener('click', (e) => {
      const box = e.target.closest('.dt-clue'); if (!box) return;
      if (e.target.closest('#mb-dt-panyu')) {
        api.sfx.jackpot();
        box.outerHTML = drawClue({ ...hidden, open: true }, 'p');
        api.coach('ミミの勘が働いた', 'win');
        return;
      }
      const i = box.dataset.i; const c = i === 'p' ? hidden : clues[+i];
      if (e.target.classList.contains('open-btn')) {
        api.sfx.tap(); c.open = true; box.classList.add('open'); box.querySelector('.dt-text').textContent = c.text;
        if (c.kind === '顔') {
          const base = who === 'polka' ? 'smug' : 'think';
          if (c.lean === 'bluff') { api.emote('panic'); api.coach('今の顔、見た？', 'smug'); setTimeout(() => api.alive() && api.emote(base), who === 'selina' ? 450 : 1400); }
          else api.emote(base);
        }
        return;
      }
      if (e.target.dataset.lean) {
        api.sfx.good(); placed[i] = e.target.dataset.lean;
        box.querySelectorAll('.lean').forEach(b => b.classList.toggle('on', b === e.target));
        refresh();
      }
    });
    let decided = false; // 決めた後は手がかりを動かしても決めるボタンを出し直さない
    const decide = await new Promise(res => {
      root.querySelector('#mb-dt-call').onclick = () => res('bluff');
      root.querySelector('#mb-dt-fold').onclick = () => res('strong');
    });
    if (!api.alive()) return;
    root.querySelector('#mb-dt-decide').hidden = true;
    decided = true; root.querySelector('#mb-dt-clues') && (root.querySelector('#mb-dt-clues').style.pointerEvents = 'none');
    await api.wager({ question: `「${decide === 'bluff' ? 'ブラフ' : '強い手'}」と読んだ。自信は？`, base: 30 });
    if (!api.alive()) return;
    api.coach(''); api.sfx.drum();
    await api.wait(900);
    root.querySelector('.row').insertAdjacentHTML('afterend', `<div class="row dt-her"><span class="formula">${api.char.jp}の手札</span>${her.map(c => api.cardHTML(c, 'big flip')).join('')}</div>`);
    let hits = 0, total = 0;
    [...clues.map((c, i) => [c, String(i)]), ...(placed.p ? [[hidden, 'p']] : [])].forEach(([c, i]) => {
      const box = clueBox.querySelector(`.dt-clue[data-i="${i}"]`); if (!box) return;
      total++; const ok = placed[i] && placed[i] === c.lean; if (ok) hits++;
      box.classList.add(c.lean === truth ? 'key' : c.lean === 'none' ? 'plain' : 'trap');
      box.insertAdjacentHTML('beforeend', `<div class="dt-verdict">${c.lean === truth ? '決め手' : c.lean === 'none' ? '手がかりにならない' : 'ひっかけ'}${ok ? ' ○' : ''}</div>`);
    });
    await api.wait(700);
    const correct = decide === truth;
    api.say(truth === 'bluff' ? (correct ? 'うそ、見抜かれた……！' : 'ふふっ、降りちゃった') : (correct ? '……賢明ね' : '残念、本物だよ'), truth === 'bluff' ? (correct ? 'busted' : 'smug') : (correct ? 'panic' : 'win'));
    api.finish({
      correct, perfect: correct && hits === total && api.mult === 3, base: 30,
      detail: `${api.char.jp}は${truth === 'bluff' ? 'ブラフ' : '本当に強い手（フラッシュ）'}だった。手がかりの読み ${hits}/${total}`,
    });
  },
});
