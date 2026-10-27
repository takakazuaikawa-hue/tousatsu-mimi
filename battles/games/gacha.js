// 心理：心の声ガチャ（ぱにゅぱにゅ）— 2026-10-27 卓の本当の手の版に作り替え
// 卓でいま賭かっている手で、相手の伏せ札が「本物」（ミミより強い）か「ブラフ」（ミミの方が強い）かを読む。
// ぱにゅ（手持ち30）を10使うと、相手の心の声が1つ聞ける（最大3回、3回目は R 以上）。声には確かさがあり（N◆ 6割・R◆◆ 8割・SR◆◆◆ 9割・SSR 本音）、
// 聞くたびに天秤に重りが乗る。引かずに残したぱにゅは、1あたりコイン2枚としてご褒美のもとに足される（80→60→40→20）＝引くか止めるかの駆け引き。
// 試算：どの相手でも「天秤の見込みが70%以上なら引かない」がほぼ一番得。セリナは最初から引かないのが一番得。全部引くのはどの相手でも一番損。
// 読みを預けて卓に戻り、答え合わせは手の決着の後（verdict.js）。単独ページ（卓なし）では架空の場面を配る。
(() => {
  const RAR = {
    N: { p: 55, short: '気分', acc: .6 },
    R: { p: 30, short: 'ヒント', acc: .8 },
    SR: { p: 12, short: '本音', acc: .92 },
    SSR: { p: 3, short: '大当たり', acc: .99 },
  };
  const ORDER = ['N', 'R', 'SR', 'SSR'];
  // 天井（3回目）は R 以上だけを、同じ比率で引き直す
  const CEIL = { R: 30 / 45, SR: 12 / 45, SSR: 3 / 45 };
  const STAKES = [0, 1, 3];
  const NAME = { bluff: 'ブラフ', strong: '本物' };
  // 大きな賭けの記録（見つめ合いと同じ人の癖：ポルカ 65%・グラーノ 50%・ヴェルベット 45%・セリナ 25%）
  const PRIOR = { polka: .65, selina: .25, grano: .5, velvet: .45 };
  const recordOf = (prior, n = 20) => { const k = Math.round(prior * n); const o = [3, 11, 6, 17, 0, 9, 14, 2, 19, 7, 12, 4, 16, 1, 10, 18, 5, 13, 8, 15]; const s = new Set(o.slice(0, k)); return Array.from({ length: n }, (_, i) => s.has(i)); };

  // キャラごとの心の声（口調を変える）。strong＝本物寄りの声、bluff＝ブラフ寄りの声
  const VOICE = {
    polka: {
      N: {
        strong: ['えへへ、早く見せたいな〜♪', 'ふんふーん、今日のボク、ついてる気がする！', 'わくわく……ばれちゃダメだぞ、ボク！'],
        bluff: ['……どきどき。お願い、降りて〜', 'ひ、ひざが勝手にゆれちゃう……', '平気な顔、平気な顔……！'],
      },
      R: {
        strong: ['ボクの札、場札とばっちり噛み合ってるもんね！', '場札がボクの味方してくれてる〜'],
        bluff: ['ボクの札、場札とぜんっぜん噛み合ってないや……', 'あれ、ボクの札、どれとも並ばない……'],
      },
      SR: { strong: ['ミミちゃんの手より、ボクの方が上だもんね〜'], bluff: ['ミミちゃんの方が強いかも……お願い、気づかないで'] },
      SSR: { strong: ['勝ってる。ぜったい勝ってる！'], bluff: ['……ボク、ブラフしてる。バレたら終わりだ'] },
      open: 'ミミちゃん、勝負だよっ！ ボク、本気だからね！',
      end: { bc: 'うわーん、バレてたー！', bw: 'えへへ、ブラフでした〜！', sc: 'ちぇー、降りられちゃった', sw: 'やったー！ 本物だよ！' },
    },
    selina: {
      N: {
        strong: ['……問題ない。', '……静か。いい。', '……勝ち筋、見えた。'],
        bluff: ['……早く、降りて。', '……計算が、合わない。', '……顔には、出さない。'],
      },
      R: {
        strong: ['……私の札、場と、つながってる。', '……この場は、私の形。'],
        bluff: ['……私の札、場と、つながらない。', '……どれとも、組めない。'],
      },
      SR: { strong: ['……ミミより、上。'], bluff: ['……ミミの方が、上。押すしかない。'] },
      SSR: { strong: ['……勝っている。確かめた。'], bluff: ['……これは、ブラフ。'] },
      open: '……ポット。',
      end: { bc: '……読まれた。', bw: '……降りてくれて、ありがとう。', sc: '……賢明。', sw: '……本物。' },
    },
    grano: {
      N: {
        strong: ['ふふ、これは良い取引になりそうですな', '利益の匂いがいたしますぞ', '値切られる前に、しっかり頂きましょう'],
        bluff: ['……損切りの準備はしておきましょうか', '在庫は空っぽ、しかし看板は立派に', 'ここは口八丁で乗り切るしか……'],
      },
      R: {
        strong: ['私の二枚、場札と上々の相性ですな', '場札との商談、まとまっておりますな'],
        bluff: ['私の二枚、場札とは取引不成立でして', '帳簿が、どうにも合いませんな'],
      },
      SR: { strong: ['お嬢さんの手より、こちらの品が上ですな'], bluff: ['お嬢さんの方が上物……ここは口で押すしか'] },
      SSR: { strong: ['本物です。値引きはいたしませんぞ'], bluff: ['……これは、はったり商売ですな'] },
      open: 'ここは強気に参りましょう。さあ、いかがなさいます？',
      end: { bc: 'なんと、見抜かれましたか……', bw: 'ふふ、良い取引でした', sc: '慎重なお方ですな', sw: 'まいど、ありがとうございます' },
    },
    velvet: {
      N: {
        strong: ['ふふん、早くコールしなさいよ♡', 'あたしの勝ち、もう決まってるの♡', 'ざぁこの泣き顔、楽しみなの♡'],
        bluff: ['……は、早く降りなさいよ、ざぁこ', 'こ、こわくなんかないの……！', 'なんでこっち見てるの……？'],
      },
      R: {
        strong: ['あたしの札、場札とお似合いなの♡', '場札があたしに微笑んでるわ♡'],
        bluff: ['あたしの札……場札と、ぜんぜん合ってないの', 'な、なんで一枚も揃わないのよ……'],
      },
      SR: { strong: ['ざぁこの手より、あたしの方が上なの♡'], bluff: ['ざぁこの方が強いの……バレないで……'] },
      SSR: { strong: ['勝ってるわ。本当に。'], bluff: ['……ブラフよ。怖いの。'] },
      open: 'ほら、コールしてみなさいよ。ざぁこ♡',
      end: { bc: 'う、うそ……あたしのブラフが……！', bw: 'ふふっ、降りちゃった♡ ざぁこ♡', sc: '……ちっ。逃げ足だけは速いのね', sw: 'ざぁんねん♡ 本物なの' },
    },
  };
  const WHO = Object.keys(VOICE);
  const TOTAL = { N: WHO.length * 6, R: WHO.length * 4, SR: WHO.length * 2, SSR: WHO.length * 2 };
  const ALL = TOTAL.N + TOTAL.R + TOTAL.SR + TOTAL.SSR;
  // 心の声図鑑（集めた種類）
  const book = new Set();
  try { JSON.parse(localStorage.getItem('mbGachaBook') || '[]').forEach(k => book.add(k)); } catch (e) {}
  const saveBook = () => { try { localStorage.setItem('mbGachaBook', JSON.stringify([...book])); } catch (e) {} };

  MB.register({ id: 'gacha', group: 'psych', order: 5, title: '心の声ガチャ', sub: '心理 · ぱにゅぱにゅ', isNew: true, chars: ['polka', 'selina', 'grano', 'velvet'], start });

  // 単独ページ用の架空の場面：ミミは一番上の数字のワンペア。本物＝フラッシュ、ブラフ＝役なし
  function deal(api, truth) {
    const R = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    for (let t = 0; t < 500; t++) {
      const X = api.pick(api.SUITS); const O = api.shuffle(api.SUITS.filter(s => s !== X));
      const ranks = api.shuffle(R).slice(0, 5);
      const board = ranks.map((r, i) => ({ r, s: i < 3 ? X : O[i - 3] }));
      const used = new Set(board.map(api.key));
      const top = Math.max(...ranks); const topCard = board.find(c => c.r === top);
      const nonX = api.SUITS.filter(s => s !== X);
      const kick = R.slice().reverse().find(r => !ranks.includes(r));
      const mine = [{ r: top, s: api.pick(nonX.filter(s => s !== topCard.s)) }, { r: kick, s: api.pick(nonX) }];
      mine.forEach(c => used.add(api.key(c)));
      const her = truth === 'strong'
        ? api.shuffle(R.filter(r => !ranks.includes(r) && r !== kick)).slice(0, 2).map(r => ({ r, s: X }))
        : api.shuffle(R.filter(r => !ranks.includes(r) && r !== kick && r !== top)).slice(0, 2).map(r => ({ r, s: api.pick(nonX) }));
      if (her.some(c => used.has(api.key(c))) || new Set(her.map(api.key)).size < 2) continue;
      if (api.category(mine.concat(board)) !== 1) continue;
      const a = api.score(her.concat(board)), b = api.score(mine.concat(board));
      if (truth === 'strong' ? a <= b : a >= b) continue;
      return { board: api.shuffle(board), mine, her };
    }
    return null;
  }

  async function start({ api }) {
    const force = (window.MB_FORCE || {}).gacha || {};
    const who = api.charId in VOICE ? api.charId : 'polka';
    const V = VOICE[who];
    const jp = api.char.jp;
    const T = api.table;
    const record = [...recordOf(PRIOR[who]), ...((T && Array.isArray(T.record)) ? T.record : [])].slice(-20);
    // 札：卓の本当の手（本編）か、架空の場面（単独ページ）
    let board, mine, her, truth, mimiEq;
    if (T) {
      board = T.board; mine = T.mine; her = T.her;
      mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
      truth = mimiEq >= 50 ? 'bluff' : 'strong';
    } else {
      truth = force.truth || (Math.random() < PRIOR[who] ? 'bluff' : 'strong');
      const D = deal(api, truth) || { board: [{ r: 13, s: 'h' }, { r: 9, s: 'h' }, { r: 4, s: 'c' }, { r: 2, s: 'h' }, { r: 7, s: 's' }], mine: [{ r: 13, s: 'c' }, { r: 14, s: 'd' }], her: truth === 'strong' ? [{ r: 12, s: 'h' }, { r: 6, s: 'h' }] : [{ r: 6, s: 'd' }, { r: 5, s: 'c' }] };
      ({ board, mine, her } = D);
      mimiEq = Math.round(api.headsUp(mine, her, board) * 100);
    }
    const mimiHandName = api.CAT_NAME[api.category([...mine, ...board])];
    const other = (t) => (t === 'bluff' ? 'strong' : 'bluff');

    api.say(V.open, who === 'selina' ? 'think' : 'smug'); api.bet(T ? (T.toCall || '—') : 500);
    api.css('gacha', CSS);
    const root = api.root;
    const bal = api.balance({ record, name: jp });
    const stepNames = ['心の声を引く', '読む', '賭ける', '答え合わせ'];
    const balls = [['n', 12, 6], ['r', 44, 2], ['n', 78, 8], ['sr', 110, 3], ['n', 140, 6], ['r', 26, 30], ['n', 60, 34], ['ssr', 94, 30], ['n', 126, 32], ['r', 150, 36], ['n', 40, 58], ['sr', 76, 60], ['n', 112, 58]];
    root.classList.add('rb-frame');
    root.innerHTML = `
      <div class="rb-top"><div class="rb-steps" id="mb-gc-steps">${api.steps(stepNames, 0)}</div></div>
      <div class="rb-play gx-play">
        <div class="gc-mach" id="mb-gc-mach" role="button" tabindex="0" aria-label="ガチャのレバーを引く">
          <i class="gc-ear l"></i><i class="gc-ear r"></i>
          <div class="gc-dome"><div class="gc-balls">${balls.map(([k, x, y]) => `<i class="b-${k}" style="left:${x}px;bottom:${y}px"></i>`).join('')}</div></div>
          <i class="gc-bow"></i>
          <div class="gc-body"><div class="gc-plate"><span>ぱにゅぱにゅ</span></div><div class="gc-face"><i></i><b>ω</b><i></i></div><div class="gc-chute"></div></div>
          <div class="gc-lever"><i class="stick"></i><i class="pivot"></i></div>
          <i class="gc-feet"></i>
        </div>
        <div class="gx-side">
          <div class="gx-odds" aria-label="出る確率">${ORDER.map(k => `<div class="gx-or"><span class="gc-rar r-${k}">${k}</span><b>${RAR[k].p}%</b><span class="gx-acc">${k === 'SSR' ? '本音' : api.pips(api.sure(RAR[k].acc))}</span></div>`).join('')}</div>
          <div class="gx-panyu"><span class="h">ぱにゅ</span><span class="gc-segs" id="mb-gc-segs"><i></i><i></i><i></i></span></div>
          <div class="gx-ceil"><span class="gc-ceilg" id="mb-gc-ceilg" aria-label="3回目はR以上"><i></i><i></i><i class="last"></i></span><span class="t">3回目は<br>R以上</span></div>
        </div>
      </div>
      <div class="rb-info">
        <div class="gx-sit"><div class="gx-sit-cap">場札 ／ ミミの手（${mimiHandName}）</div>
          <div class="gx-sit-row">${board.map(c => api.cardHTML(c, 'small')).join('')}<i class="gx-sep"></i>${mine.map(c => api.cardHTML(c, 'small')).join('')}</div></div>
        ${bal.html}
        <div class="gx-voices" id="mb-gc-voices">${[0, 1, 2].map(i => `<div class="gx-voice is-empty" data-i="${i}"><span class="h">心の声${i + 1}</span><span class="gx-lean">まだ聞いていない</span></div>`).join('')}</div>
      </div>
      <div class="rb-act gx-act" id="mb-gc-act"></div>`;
    bal.draw();
    const $ = (s) => root.querySelector(s);
    const mach = $('#mb-gc-mach'), act = $('#mb-gc-act');
    let panyu = 30, pulls = 0, busy = false;
    const got = [];
    const base = () => 20 + panyu * 2;
    const drawPanyu = () => {
      root.querySelectorAll('#mb-gc-ceilg i').forEach((el, i) => el.classList.toggle('on', i < pulls));
      $('#mb-gc-segs').querySelectorAll('i').forEach((el, i) => el.classList.toggle('used', i >= panyu / 10));
    };
    // 選ぶ所：押すと何が起きるかをボタンに書く
    const drawChoice = () => {
      const pb = bal.p(), pNow = Math.round(Math.max(pb, 1 - pb) * 100);
      act.innerHTML = `<div class="gx-choice">
        <button class="btn gold gx-pull" id="mb-gc-pull" type="button"><span>ぱにゅぱにゅ！</span><small>心の声を1つ${pulls === 2 ? '（R以上）' : ''} ${api.coin(base(), base() - 20)}</small></button>
        <button class="btn quiet gx-stop" id="mb-gc-stop" type="button"><span>もう引かない</span><small>${api.coin(base())} で読む・見込み${pNow}%</small></button>
      </div>`;
    };
    drawPanyu();
    await api.rules({
      key: 'gacha', title: '心の声ガチャ',
      goal: `${jp}の伏せ札が<em>本物</em>（ミミより強い）か<em>ブラフ</em>（ミミの方が強い）かを読む。答え合わせはこの手の決着の後`,
      how: `ぱにゅを使うと、${jp}の<em>心の声</em>が1つ聞ける（3回まで）。◆が多い声ほど当たる`,
      risk: '1回引くたびに、ご褒美が20減る（80→60→40→20）。外れの声もまじる',
      look: [['もう1回引くか', '見込み（70%を超えたら引かない）'], ['本物かブラフか', '天秤'], ['自信', '天秤の見込み（％）']],
    });
    if (!api.alive()) return;
    api.tipOnce('gacha', `見込みが<b>70%</b>を超えたら、もう引かなくていい`, 'think');
    api.mission('心の声を聞く？');

    const roll = () => {
      if (force.rolls && force.rolls[pulls - 1]) return force.rolls[pulls - 1];
      if (pulls === 3) { const y = Math.random(); return y < CEIL.SSR ? 'SSR' : y < CEIL.SSR + CEIL.SR ? 'SR' : 'R'; }
      const x = Math.random() * 100;
      return x < 3 ? 'SSR' : x < 15 ? 'SR' : x < 45 ? 'R' : 'N';
    };
    // 声は本当の手から作る：書いてある確かさの割合で本当の側、残りは逆の側
    const voiceOf = (rar) => {
      const lean = Math.random() < RAR[rar].acc ? truth : other(truth);
      const pool = V[rar][lean]; const i = api.rand(pool.length);
      return { rar, lean, acc: RAR[rar].acc, text: pool[i], key: `${who}:${rar}:${lean}:${i}` };
    };

    // 1回引く：レバー → カプセルが落ちて揺れる（ため）→ 開いてレア度の色 → 心の声 → 天秤に重り
    const pull = async () => {
      busy = true; pulls++; panyu -= 10; drawPanyu();
      act.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const rar = roll(); const v = voiceOf(rar);
      api.sfx.tap(); api.coach('');
      mach.classList.remove('is-pull'); void mach.offsetWidth; mach.classList.add('is-pull');
      const R = api.reduce;
      await api.wait(R ? 60 : 480); if (!api.alive()) return;
      const cap = document.createElement('div');
      cap.className = 'gc-cap';
      cap.innerHTML = '<div class="gc-in"><i class="t"></i><i class="b"></i><b class="q">?</b></div>';
      mach.appendChild(cap); api.sfx.tick();
      await api.wait(R ? 60 : 560); if (!api.alive()) return;
      const spot = document.createElement('i'); spot.className = 'gc-spot'; mach.appendChild(spot);
      cap.classList.add('rise'); api.sfx.whoosh();
      await api.wait(R ? 60 : 460); if (!api.alive()) return;
      cap.classList.add('wob');
      const up = async (cls, label, ms) => {
        [cap, spot].forEach(el => { el.classList.remove('g-R', 'g-SR', 'g-SSR'); if (cls) el.classList.add(cls); });
        if (label) { const u = document.createElement('b'); u.className = 'gc-up' + (label === '…おしい' ? ' fizz' : ''); u.textContent = label; mach.appendChild(u); setTimeout(() => u.remove(), 900); if (label === '…おしい') api.sfx.nope(); else api.sfx.good(); }
        else api.sfx.tick();
        await api.wait(R ? 60 : ms);
      };
      // 昇格しそうで、しない（ニアミス）。レア度は引いた時に決まっていて、光り方は見せ方だけ
      const fizz = !R && Math.random() < .3;
      if (rar === 'N') { await api.wait(R ? 60 : 600); if (fizz) { await up('g-R', null, 380); await up(null, '…おしい', 420); } else await api.wait(R ? 0 : 300); }
      else { await up('g-R', null, 800); if (rar === 'R' && fizz) { await up('g-SR', null, 320); await up('g-R', '…おしい', 480); } }
      if (!api.alive()) return;
      if (rar === 'SR' || rar === 'SSR') { await up('g-SR', 'UP!', 750); if (!api.alive()) return; }
      if (rar === 'SSR') { await up('g-SSR', 'UP!!', 850); if (!api.alive()) return; }
      cap.classList.remove('wob'); cap.classList.add('open', 'c-' + rar);
      const burst = document.createElement('i'); burst.className = 'gc-burst c-' + rar; mach.appendChild(burst);
      const badge = document.createElement('b'); badge.className = 'gc-badge r-' + rar; badge.innerHTML = '<span>' + (rar === 'N' ? 'N' : rar + '!') + '</span>'; mach.appendChild(badge);
      spot.classList.add('is-open');
      if (rar === 'SSR') {
        api.sfx.jackpot();
        const r = mach.getBoundingClientRect();
        api.sparkles(r.left + r.width / 2, r.top + r.height * .45, 48);
        setTimeout(() => { if (api.alive()) api.sparkles(r.left + r.width / 2, r.top + r.height * .45, 30); }, 350);
        mach.classList.add('is-ssr');
      } else if (rar === 'SR') { api.sfx.fanfare(); const r = mach.getBoundingClientRect(); api.sparkles(r.left + r.width / 2, r.top + r.height * .45, 22); }
      else if (rar === 'R') api.sfx.good();
      else api.sfx.tap();
      await api.wait(R ? 100 : 650); if (!api.alive()) return;
      // 心の声を欄に書き、天秤に重りを乗せる
      const isNew = !book.has(v.key); book.add(v.key); saveBook(); got.push(v);
      const row = root.querySelector(`.gx-voice[data-i="${pulls - 1}"]`);
      row.className = `gx-voice v-${rar} mb-parchment is-flat pop`;
      row.innerHTML = `<span class="h">心の声${pulls}<span class="gc-rar r-${rar}">${rar}</span>${rar === 'SSR' ? '<b class="gx-true">本音</b>' : api.pips(api.sure(v.acc))}</span>${api.lean(v.lean)}`;
      // 声の文は遊びの枠に大きく出す（次に引くまで残す）
      let pop = root.querySelector('.gx-pop');
      if (!pop) { pop = document.createElement('div'); pop.className = 'gx-pop mb-ebony'; root.querySelector('.gx-play').appendChild(pop); }
      pop.innerHTML = `<small class="mb-label">心の声${pulls}（${rar}）</small>「${v.text}」`;
      pop.classList.remove('pop'); void pop.offsetWidth; pop.classList.add('pop');
      bal.add(v.lean, v.acc);
      // 本音・大当たりが出た瞬間、相手は動揺する（本人は気づいていない）。セリナは SSR の時だけ
      if (rar === 'SSR' || (rar === 'SR' && who !== 'selina')) api.emote('panic');
      setTimeout(() => { cap.remove(); burst.remove(); badge.remove(); spot.remove(); mach.classList.remove('is-ssr'); }, R ? 200 : 900);
      await api.wait(R ? 100 : 350); if (!api.alive()) return;
      busy = false;
      void isNew;
    };
    // 引く／やめる
    while (panyu >= 10) {
      drawChoice();
      const a = await new Promise(res => {
        $('#mb-gc-pull').onclick = () => { if (!busy) res('pull'); };
        mach.onclick = () => { if (!busy) res('pull'); };
        mach.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); res('pull'); } };
        $('#mb-gc-stop').onclick = () => { if (!busy) { api.sfx.tap(); res('stop'); } };
      });
      if (!api.alive()) return;
      if (a === 'stop') break;
      await pull(); if (!api.alive()) return;
    }
    mach.onclick = null; mach.onkeydown = null; mach.classList.add('is-over');
    root.querySelectorAll('.gx-voice.is-empty .gx-lean').forEach(t => { t.textContent = '聞かなかった'; });

    // 読む
    $('#mb-gc-steps').innerHTML = api.steps(stepNames, 1);
    api.mission('天秤の傾きで読む');
    act.innerHTML = `<div><div class="actions">
      <button class="btn" id="mb-gc-b" type="button">ブラフと読む<small>ミミの方が強い</small></button>
      <button class="btn quiet" id="mb-gc-s" type="button">本物と読む<small>ミミより強い</small></button></div></div>`;
    api.coach(pulls ? '' : '心の声なし。天秤は、これまでの記録だけで傾いている');
    const shownAt = performance.now();
    const decide = await new Promise(res => {
      const on = (v) => () => { if (performance.now() - shownAt < 450) return; api.sfx.tap(); res(v); };
      $('#mb-gc-b').onclick = on('bluff'); $('#mb-gc-s').onclick = on('strong');
    });
    if (!api.alive()) return;
    act.innerHTML = '';
    $('#mb-gc-steps').innerHTML = api.steps(stepNames, 2);
    const pNow = bal.p(), pMine = Math.round((decide === 'bluff' ? pNow : 1 - pNow) * 100);
    const b0 = base();
    await api.wager({ mission: '見込みで自信を決める', question: `「${NAME[decide]}」の見込みは ${pMine}%`, note: '67%超→ぜったい　50%超→確信', base: b0, stakes: STAKES, into: act });
    if (!api.alive()) return;

    const best0 = pNow >= .5 ? 'bluff' : 'strong', pBest0 = Math.round(Math.max(pNow, 1 - pNow) * 100);
    const m = api.mult || 1;
    const notes = got.map((v, i) => ({ label: `心の声${i + 1}（${v.rar}）「${v.text}」→ ${NAME[v.lean]}寄り`, lean: v.lean }));
    const why = decide === best0 ? `天秤の見込みが高い方（${NAME[best0]} ${pBest0}%）を選んだ判断は正しい。` : `天秤の見込みは${NAME[best0]}が${pBest0}%だった。`;
    // 本当の手の勝負：読みを預けて卓に戻る。答え合わせは手の決着の後（battles/games/verdict.js）
    if (T) {
      api.say(decide === 'bluff' ? V.N.bluff[0] : V.open, decide === 'bluff' ? 'panic' : 'smug');
      api.entrust({
        pick: NAME[decide], win: b0 * m, lose: b0 * STAKES[m - 1],
        advice: decide === 'bluff' ? '「ブラフ」と読んだ。信じるなら、付いていく（コール）' : '「本物」と読んだ。信じるなら、降りる',
        pending: { title: '心の声ガチャ', charId: api.charId, pick: decide, truth, mimiEq, endLines: V.end, board, mine, her, base: b0, mult: m, stakes: STAKES,
          perfect: m === 3 && pulls <= 1, notes, why, extra: `残したぱにゅ ${panyu} → ご褒美のもと ${b0}` },
      });
      return;
    }
    // 単独ページ：その場で答え合わせ
    api.lossK = STAKES;
    const correct = decide === truth;
    api.say(V.end[(truth === 'bluff' ? 'b' : 's') + (correct ? 'c' : 'w')], correct ? 'busted' : 'smug');
    api.finish({ correct, base: b0, perfect: correct && m === 3 && pulls <= 1,
      detail: `${jp}は${NAME[truth]}（${her.map(api.label).join(' ')}）だった。${why}`,
      extra: `<div class="gc-res-extra">残したぱにゅ ${panyu} → ご褒美のもと ${b0}・心の声図鑑 ${book.size}/${ALL}</div>` });
  }

  const CSS = `
    /* ---- 2026-10-27 本当の手の版の並び（共通の骨組み .rb-frame に載せる） ---- */
    .gx-play { display: flex; align-items: center; justify-content: center; gap: 16px; }
    .gx-play .gc-mach { flex: 0 0 auto; zoom: 1; }
    .gx-side { display: flex; flex-direction: column; gap: 10px; min-width: 0; margin-left: 18px; }
    .gx-odds { display: grid; gap: 4px; padding: 6px 10px; background: var(--panel); border: 1px solid var(--line-dim); }
    .gx-or { display: grid; grid-template-columns: 3.2em 2.8em auto; align-items: center; gap: 6px; font-size: var(--ty-note, 14px); line-height: 1.3; }
    .gx-or .gc-rar { font-size: 14px; line-height: 1.35; }
    .gx-or b { font-family: var(--mincho); font-weight: 700; color: var(--text); text-align: right; font-variant-numeric: tabular-nums; }
    .gx-acc { font-family: var(--mincho); font-weight: 800; color: var(--gold-hi); white-space: nowrap; }
    .gx-panyu, .gx-ceil { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
    .gx-panyu .h { font-family: var(--mincho); font-weight: 700; font-size: var(--ty-note, 14px); color: var(--gold); }
    .gx-ceil .t { font-family: var(--mincho); font-size: var(--ty-note, 14px); color: var(--dim); }
    .gx-sit { display: flex; flex-direction: column; gap: 2px; }
    .gx-sit-cap { font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.3; color: var(--gold); white-space: nowrap; }
    .gx-sit-row { display: flex; gap: 3px; align-items: center; flex-wrap: nowrap; }
    .gx-sep { width: 8px; flex: 0 0 auto; }
    .gx-voices { display: flex; flex-direction: column; gap: 4px; }
    .gx-voice { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 8px; border: 1px solid var(--line-dim); background: rgba(19,4,6,.7); }
    .gx-voice.is-empty .gx-lean { color: var(--dim); font-weight: 700; }
    .gx-play { position: relative; }
    .gx-pop { position: absolute; left: 0; right: 0; bottom: 0; z-index: 7; padding: 6px 12px 8px; font-size: var(--ty-body, 17px); line-height: 1.45; text-align: center; }
    .gx-pop small { display: block; font-size: 14px; line-height: 1.3; }
    .gx-pop.pop { animation: mb-gxPop .35s cubic-bezier(.2,1.4,.4,1) backwards; }
    .gx-voice .h { display: flex; align-items: center; gap: 6px; font-family: var(--mincho); font-weight: 700; font-size: 14px; line-height: 1.4; color: var(--gold); }
    .gx-voice .h .gc-rar { font-size: 14px; line-height: 1.3; }
    .gx-lean { font-family: var(--mincho); font-weight: 800; font-size: 14px; white-space: nowrap; }
    .gx-lean.bluff { color: #a01f35; } .gx-lean.strong { color: #7a5410; }
    .gx-true { font-family: var(--mincho); font-weight: 800; font-size: 14px; color: #7d1022; }
    .gx-voice.pop { animation: mb-gxPop .35s cubic-bezier(.2,1.4,.4,1) backwards; }
    @keyframes mb-gxPop { from { transform: scale(1.08); opacity: 0; } }
    .gx-choice { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 12px; height: 100%; align-items: stretch; }
    .gx-choice .btn { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; min-height: 0; margin: 0; }
    .gx-choice .btn > span { font-size: var(--ty-btn, 19px); line-height: 1.2; }
    .gx-choice .btn > small { font-size: var(--ty-note, 14px); line-height: 1.3; white-space: nowrap; }
    .gx-pull:not([disabled]) { animation: mb-gcPullBtn 1.4s ease-in-out infinite; }
    .rb-act.gx-act > div > .actions { height: 100%; }

    .gc-board .card { --w: 50px; }
    .gc-hands { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 18px; }
    .gc-hand { display: flex; align-items: center; gap: 8px; }
    .gc-who { font-family: var(--mincho); font-weight: 700; letter-spacing: .1em; color: var(--gold); font-size: 14px; }
    .gc-cards { display: flex; gap: 4px; }
    .gc-hn { font-weight: 900; font-size: 14px; }
    .gc-hn.is-strong { color: var(--red-hi); font-size: 16px; } .gc-hn.is-bluff { color: var(--good); font-size: 16px; }
    .gc-vs { font-family: var(--disp); font-size: 26px; color: var(--red-hi); transform: skewX(-12deg); line-height: 1; }
    .gc-hands.is-reveal .gc-hand:first-child { filter: drop-shadow(0 0 14px rgba(200,37,58,.55)); }
    .gc-sub { margin: -4px 0 0; text-align: center; }
    .gc-herbox { position: relative; display: inline-flex; }
    .gc-herbox .mb-threat.ov { position: absolute; left: 50%; bottom: -5px; transform: translateX(-50%); z-index: 2; }
    .gc-hn.is-threat { color: #ff9aa6; font-family: var(--mincho); font-size: 14px; text-shadow: 0 0 6px rgba(200,37,58,.6); }
    .gc-hands.is-reveal .mb-threat { display: none; }

    .gc-wrap { display: grid; grid-template-columns: 280px minmax(0,1fr); gap: 18px; align-items: start; }
    .gc-left { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .gc-right { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

    /* ---- ガチャ台：うさ耳の金と深紅 ---- */
    .gc-mach { position: relative; width: 230px; height: 344px; cursor: pointer; user-select: none; outline: none; -webkit-tap-highlight-color: transparent; }
    .gc-mach:focus-visible { outline: 2px solid var(--gold-hi); outline-offset: 6px; }
    .gc-ear { position: absolute; top: 2px; width: 40px; height: 100px; border-radius: 50% 50% 44% 44% / 72% 72% 28% 28%; background: linear-gradient(180deg, #fff3c2, #d9b35a 55%, #a87a1a); border: 3px solid #7d1022; transform-origin: 50% 100%; z-index: 1; }
    .gc-ear::after { content: ""; position: absolute; left: 9px; right: 9px; top: 12px; bottom: 16px; border-radius: inherit; background: linear-gradient(180deg, #8a1a22, #4e0509); }
    .gc-ear.l { left: 54px; transform: rotate(-17deg); animation: mb-gcEarL 3.2s ease-in-out infinite; }
    .gc-ear.r { right: 54px; transform: rotate(15deg); animation: mb-gcEarR 3.2s .4s ease-in-out infinite; }
    @keyframes mb-gcEarL { 50% { transform: rotate(-24deg); } }
    @keyframes mb-gcEarR { 50% { transform: rotate(22deg); } 60% { transform: rotate(10deg); } }
    .gc-dome { position: absolute; top: 76px; left: 22px; right: 22px; height: 150px; z-index: 2; overflow: hidden; border-radius: 93px 93px 16px 16px; border: 5px solid var(--gold); box-shadow: 0 0 0 2px #7d1022, inset 0 -14px 26px rgba(0,0,0,.45);
      background: radial-gradient(120% 90% at 30% 18%, rgba(255,255,255,.3), rgba(244,228,189,.1) 48%, rgba(40,6,14,.62)); }
    .gc-dome::after { content: ""; position: absolute; left: 20px; top: 18px; width: 20px; height: 72px; border-radius: 12px; background: linear-gradient(rgba(255,255,255,.6), rgba(255,255,255,0)); transform: rotate(20deg); }
    /* 玉の色は希少度の金属の段：N 銀褐・R 銅・SR 金・SSR 淡金 */
    .gc-balls i { position: absolute; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(180deg, var(--c) 0 50%, #fffdf3 50%); border: 2px solid rgba(20,6,10,.35); box-shadow: inset 0 -4px 6px rgba(0,0,0,.2); }
    .gc-balls .b-n { --c: var(--metal-n); } .gc-balls .b-r { --c: var(--metal-r); } .gc-balls .b-sr { --c: var(--metal-sr); }
    .gc-balls .b-ssr { --c: var(--metal-ssr); background: linear-gradient(180deg, #f3dfaa, #e6c675 20%, #fff2c8 34%, #f3dfaa 50%, #fffdf3 50%); border-color: rgba(122,14,22,.7); }
    .gc-mach.is-pull .gc-balls i { animation: mb-gcJiggle .5s ease; }
    .gc-mach.is-pull .gc-balls i:nth-child(odd) { animation-delay: .06s; }
    @keyframes mb-gcJiggle { 30% { transform: translate(4px, -14px) rotate(40deg); } 60% { transform: translate(-3px, -4px) rotate(-20deg); } }
    .gc-bow { position: absolute; left: 50%; top: 66px; width: 60px; height: 28px; margin-left: -30px; z-index: 3; background: linear-gradient(180deg, #a3162c, #5a0a10); clip-path: polygon(0 0, 50% 38%, 100% 0, 100% 100%, 50% 62%, 0 100%); }
    .gc-bow::after { content: ""; position: absolute; left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; background: var(--gold-hi); transform: rotate(45deg); }
    .gc-body { position: absolute; top: 218px; left: 12px; right: 12px; height: 110px; z-index: 2; border-radius: 16px 16px 10px 10px; border: 3px solid var(--gold); background: linear-gradient(180deg, #5a0a10, #22090c); box-shadow: inset 0 4px 0 rgba(239,205,130,.2), 0 12px 22px rgba(0,0,0,.5); }
    .gc-plate { position: absolute; left: 50%; top: 9px; transform: translateX(-50%) skewX(-12deg); padding: 0 10px; background: #14060a; border: 1px solid var(--gold); white-space: nowrap; }
    .gc-plate span { display: inline-block; transform: skewX(12deg); font-family: var(--mincho); font-weight: 700; color: var(--gold-hi); letter-spacing: .12em; font-size: 15px; line-height: 1.5; }
    .gc-face { position: absolute; left: 50%; top: 40px; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; color: #fff3c2; }
    .gc-face i { width: 7px; height: 7px; border-radius: 50%; background: #fff3c2; position: relative; }
    .gc-face b { font-size: 14px; line-height: 1; font-weight: 900; }
    .gc-chute { position: absolute; left: 50%; bottom: 9px; width: 76px; height: 34px; margin-left: -38px; background: #14060a; border: 3px solid var(--gold); border-radius: 12px 12px 4px 4px; box-shadow: inset 0 8px 10px rgba(0,0,0,.85); }
    .gc-lever { position: absolute; right: -4px; top: 262px; width: 18px; height: 18px; z-index: 3; }
    .gc-lever .pivot { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff3c2, #b8860b); border: 2px solid #7d1022; }
    .gc-lever .stick { position: absolute; left: 5px; bottom: 9px; width: 8px; height: 60px; border-radius: 4px; background: linear-gradient(90deg, #a87a1a, #fff3c2, #a87a1a); transform-origin: 50% 100%; transform: rotate(18deg); transition: transform .22s ease; }
    .gc-lever .stick::before { content: ""; position: absolute; left: 50%; top: -20px; width: 28px; height: 28px; margin-left: -14px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #e0705e, #a3162c 58%, #5a0a10); border: 2px solid var(--gold); }
    .gc-mach:not(.is-over):hover .gc-lever .stick { transform: rotate(28deg); }
    .gc-mach.is-pull .gc-lever .stick { animation: mb-gcLever .48s ease; }
    @keyframes mb-gcLever { 45% { transform: rotate(118deg); } 100% { transform: rotate(18deg); } }
    .gc-mach.is-pull .gc-body, .gc-mach.is-pull .gc-dome { animation: mb-gcShake .42s ease; }
    @keyframes mb-gcShake { 25% { translate: -3px 0; } 50% { translate: 3px 1px; } 75% { translate: -2px 0; } }
    .gc-feet { position: absolute; left: 34px; right: 34px; top: 327px; height: 12px; background: linear-gradient(180deg, var(--gold), #7a5200); border-radius: 0 0 8px 8px; }
    .gc-mach.is-ssr .gc-dome { animation: mb-gcRainbow 1s linear infinite; }
    .gc-mach.is-over { cursor: default; filter: saturate(.75); }

    /* ---- カプセル ---- */
    .gc-cap { position: absolute; left: 50%; top: 276px; width: 56px; height: 56px; margin-left: -28px; z-index: 6; animation: mb-gcDrop .55s cubic-bezier(.3,1.7,.5,1) backwards; transition: transform .45s cubic-bezier(.2,1.3,.4,1); }
    @keyframes mb-gcDrop { from { transform: translateY(-40px) scale(.4); opacity: 0; } }
    .gc-cap.rise { transform: translateY(-140px) scale(1.9); }
    .gc-in { position: absolute; inset: 0; border-radius: 50%; transition: box-shadow .3s; }
    .gc-in .t, .gc-in .b { position: absolute; left: 0; right: 0; height: 50%; transition: transform .45s cubic-bezier(.2,1.2,.4,1), opacity .45s; }
    .gc-in .t { top: 0; border-radius: 28px 28px 0 0; background: #efe6d4; border: 3px solid rgba(20,6,10,.55); border-bottom-width: 2px; }
    .gc-in .b { bottom: 0; border-radius: 0 0 28px 28px; background: #fffdf3; border: 3px solid rgba(20,6,10,.55); border-top-width: 1px; }
    .gc-in .q { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--disp); font-weight: 400; font-size: 24px; color: #7d1022; transition: opacity .2s; }
    .gc-cap.wob .gc-in { animation: mb-gcWob .34s ease-in-out infinite; }
    @keyframes mb-gcWob { 25% { transform: rotate(-14deg); } 75% { transform: rotate(14deg); } }
    .gc-cap.g-R .gc-in { box-shadow: 0 0 14px 6px rgba(214,140,80,1), 0 0 34px 14px rgba(185,122,71,.55); }
    .gc-cap.g-SR .gc-in { box-shadow: 0 0 14px 7px rgba(255,236,160,1), 0 0 38px 18px rgba(245,190,60,.7); }
    .gc-spot { position: absolute; left: 50%; top: 164px; width: 250px; height: 250px; margin: -125px 0 0 -125px; z-index: 5; pointer-events: none; border-radius: 50%;
      background: radial-gradient(circle, rgba(12,3,6,.92) 0 34%, rgba(12,3,6,.6) 52%, rgba(12,3,6,0) 70%); animation: mb-fadeIn .3s backwards; transition: opacity .4s; }
    .gc-spot::after { content: ""; position: absolute; inset: 8%; border-radius: 50%; opacity: 0; transition: opacity .25s;
      background: repeating-conic-gradient(var(--sc, #b97a47) 0 6deg, transparent 6deg 18deg); -webkit-mask: radial-gradient(circle, transparent 22%, #000 30%, transparent 70%); mask: radial-gradient(circle, transparent 22%, #000 30%, transparent 70%); animation: mb-gcSpin 3s linear infinite; }
    .gc-spot.g-R::after { opacity: .55; --sc: #b97a47; } .gc-spot.g-SR::after { opacity: .8; --sc: #d9b269; }
    .gc-spot.g-SSR::after { opacity: .9; background: repeating-conic-gradient(#f3dfaa 0 6deg, transparent 6deg 12deg, #d9b269 12deg 18deg, transparent 18deg 24deg, #c8253a 24deg 30deg, transparent 30deg 36deg, #fff6d8 36deg 42deg, transparent 42deg 48deg); animation-duration: 1.2s; }
    .gc-spot.is-open { opacity: 0; }
    @keyframes mb-gcSpin { to { transform: rotate(360deg); } }
    .gc-cap.g-SSR .gc-in { animation: mb-gcWob .26s ease-in-out infinite, mb-gcRainbow .8s linear infinite; }
    /* 当選の光は暖色だけ：淡金 → 金 → 深紅の赤 → 淡金（虹・水色・緑は使わない） */
    @keyframes mb-gcRainbow { 0% { box-shadow: 0 0 26px 12px rgba(243,223,170,.95); } 33% { box-shadow: 0 0 26px 12px rgba(217,178,105,.95); } 66% { box-shadow: 0 0 26px 12px rgba(200,37,58,.85); } 100% { box-shadow: 0 0 26px 12px rgba(243,223,170,.95); } }
    .gc-cap.open .t { transform: translate(-30px, -44px) rotate(-55deg); opacity: 0; }
    .gc-cap.open .b { transform: translate(18px, 26px) rotate(30deg); opacity: 0; }
    .gc-cap.open .q { opacity: 0; }
    .gc-cap.c-N .t { background: var(--metal-n); } .gc-cap.c-R .t { background: var(--metal-r); } .gc-cap.c-SR .t { background: var(--metal-sr); }
    .gc-cap.c-SSR .t { background: linear-gradient(90deg, #d9b269, #f3dfaa 35%, #fff6d8 55%, #f3dfaa 75%, #d9b269); }
    .gc-up.fizz { color: var(--dim); text-shadow: none; font-size: 24px; }
    .gc-up { position: absolute; left: 50%; top: 40px; z-index: 8; transform: translateX(-50%); font-family: var(--disp); font-weight: 400; font-size: 30px; letter-spacing: .1em; color: #fff; text-shadow: 0 0 12px var(--gold-hi); animation: mb-gcUp .9s ease forwards; pointer-events: none; }
    @keyframes mb-gcUp { from { opacity: 0; transform: translate(-50%, 16px) scale(.6); } 25% { opacity: 1; transform: translate(-50%, 0) scale(1.1); } to { opacity: 0; transform: translate(-50%, -26px); } }
    .gc-burst { position: absolute; left: 50%; top: 164px; width: 300px; height: 300px; margin: -150px 0 0 -150px; z-index: 5; pointer-events: none; border-radius: 50%;
      background: repeating-conic-gradient(var(--bc) 0 9deg, transparent 9deg 20deg); -webkit-mask: radial-gradient(circle, #000 18%, transparent 68%); mask: radial-gradient(circle, #000 18%, transparent 68%); animation: mb-gcBurst 1s ease-out forwards; }
    .gc-burst.c-N { --bc: rgba(184,170,145,.7); } .gc-burst.c-R { --bc: rgba(185,122,71,.9); } .gc-burst.c-SR { --bc: rgba(217,178,105,1); }
    .gc-burst.c-SSR { background: repeating-conic-gradient(#f3dfaa 0 8deg, transparent 8deg 15deg, #d9b269 15deg 23deg, transparent 23deg 30deg, #c8253a 30deg 38deg, transparent 38deg 45deg, #fff6d8 45deg 53deg, transparent 53deg 60deg); animation-duration: 1.4s; }
    @keyframes mb-gcBurst { from { transform: scale(.2) rotate(0); opacity: 1; } to { transform: scale(1.35) rotate(70deg); opacity: 0; } }
    .gc-badge { position: absolute; left: 50%; top: 30px; z-index: 8; transform: translateX(-50%) skewX(-12deg); padding: 2px 18px 0; background: #14060a; border: 2px solid var(--gold); box-shadow: 0 8px 20px rgba(0,0,0,.6); font-family: var(--disp); font-weight: 400; font-size: 56px; line-height: 1; letter-spacing: .04em; pointer-events: none; white-space: nowrap; animation: mb-gcBadge .5s cubic-bezier(.2,1.6,.4,1) both; }
    .gc-badge span { display: inline-block; transform: skewX(12deg); }
    @keyframes mb-gcBadge { from { transform: translateX(-50%) skewX(-12deg) scale(2.4); opacity: 0; } }
    .gc-badge.r-N { color: var(--metal-n); font-size: 40px; border-color: rgba(184,170,145,.6); } .gc-badge.r-R { color: #d9a070; border-color: var(--metal-r); box-shadow: 0 0 22px rgba(185,122,71,.7); }
    .gc-badge.r-SR { color: var(--gold-hi); border-color: var(--gold-hi); box-shadow: 0 0 26px rgba(245,215,122,.8); text-shadow: 0 0 14px rgba(245,215,122,.9); }
    /* SSR：淡金の二重線＋短い光沢（金↔白）。虹はやめた */
    .gc-badge.r-SSR { font-size: 70px; border-color: var(--metal-ssr); box-shadow: 0 0 0 2px #14060a, 0 0 0 3px var(--metal-ssr), 0 0 34px rgba(243,223,170,.7); animation: mb-gcBadge .5s cubic-bezier(.2,1.6,.4,1) both, mb-gcGildBadge 1s ease-in-out infinite; }
    .gc-badge.r-SSR span { background: linear-gradient(90deg, #d9b269, #f3dfaa 30%, #ffffff 50%, #f3dfaa 70%, #d9b269); -webkit-background-clip: text; background-clip: text; color: transparent; }
    @keyframes mb-gcGildBadge { 50% { box-shadow: 0 0 0 2px #14060a, 0 0 0 3px var(--metal-ssr), 0 0 52px rgba(255,246,216,.95); } }

    .gc-acts { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .gc-acts .btn { min-width: 236px; }
    .gc-pull { font-size: 18px; animation: mb-gcPullBtn 1.4s ease-in-out infinite; }
    @keyframes mb-gcPullBtn { 50% { transform: scale(1.04); } }
    .gc-acts.is-ceil .gc-pull::before { box-shadow: 0 0 24px rgba(245,215,122,.9), 0 6px 16px rgba(0,0,0,.45); }
    .gc-pull[disabled], .gc-stop[disabled] { animation: none; }

    /* ---- ぱにゅ・確率表・心の声 ---- */
    .gc-panyu { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; padding: 8px 12px; background: var(--panel); border: 1px solid var(--line-dim); border-radius: 2px; }
    .gc-pn { display: flex; align-items: center; gap: 8px; }
    .gc-pn > span:first-child { font-family: var(--mincho); font-weight: 700; letter-spacing: .1em; font-size: 14px; color: var(--gold); }
    .gc-pn > b { font-family: var(--disp); font-weight: 400; font-size: 32px; line-height: 1; color: var(--gold-hi); min-width: 1.4em; font-variant-numeric: tabular-nums; }
    .gc-segs { display: flex; gap: 5px; }
    .gc-segs i { width: 26px; height: 16px; transform: skewX(-12deg); background: linear-gradient(90deg, var(--gold-hi), var(--gold)); border: 1px solid var(--gold-pale); box-shadow: 0 0 10px rgba(217,178,105,.5); transition: all .3s; }
    .gc-segs i.used { background: var(--off-bg); border-color: var(--off-line); box-shadow: none; }
    /* ぱにゅ → コイン：矢印とコインの図柄＋数字。式の文は出さない */
    .gc-basebox { display: inline-flex; align-items: center; gap: 6px; }
    .gc-basebox b { color: var(--gold-hi); font-family: var(--mincho); font-size: 20px; line-height: 1; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .gc-arr { position: relative; width: 22px; height: 12px; flex: 0 0 auto; }
    .gc-arr::before { content: ""; position: absolute; left: 0; right: 4px; top: 5px; height: 2px; background: var(--gold); }
    .gc-arr::after { content: ""; position: absolute; right: 0; top: 1px; width: 0; height: 0; border-left: 8px solid var(--gold); border-top: 5px solid transparent; border-bottom: 5px solid transparent; }
    .gc-coin { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 50%; background: radial-gradient(circle at 36% 30%, #fff3c2, #e3b964 52%, #a87a1a); border: 2px solid #7a5410; box-shadow: inset 0 0 0 2px rgba(255,243,194,.55), 0 1px 3px rgba(0,0,0,.6); }
    /* 天井の目盛り：3つの点（引いた数だけ点灯）＋「天井」の札。最後の点が天井 */
    .gc-ceilg { display: inline-flex; align-items: center; gap: 7px; }
    .gc-ceilg-t { font-family: var(--mincho); font-weight: 800; font-size: 14px; letter-spacing: .08em; color: #1d080e; background: linear-gradient(180deg, var(--gold-hi), var(--gold)); padding: 0 8px; line-height: 1.5; }
    .gc-ceilg i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--gold); background: #1a0709; box-sizing: border-box; transition: all .3s; }
    .gc-ceilg i.last { width: 18px; height: 18px; border-width: 3px; }
    .gc-ceilg i.on { background: var(--gold-hi); box-shadow: 0 0 9px rgba(239,205,130,.85); }

    .gc-odds { position: relative; padding: 6px 12px 8px; background: var(--panel); border: 1px solid var(--line-dim); border-radius: 2px; display: grid; grid-template-columns: minmax(0,1fr) auto; column-gap: 10px; row-gap: 4px; align-items: center; }
    .gc-odds > .gc-odds-h, .gc-odds > .gc-or { grid-column: 1; }
    .gc-odds-h { font-family: var(--mincho); font-weight: 700; letter-spacing: .06em; font-size: 14px; color: var(--gold-hi); }
    .gc-odds > details.mb-more { position: static; grid-column: 2; grid-row: 1 / span 5; align-self: center; }
    /* 確率＝札＋棒の長さ＋数字＋2〜4字の名前 */
    .gc-or { display: grid; grid-template-columns: 50px minmax(0,1fr) 46px 52px; gap: 8px; align-items: center; font-size: 14px; }
    .gc-or > b { font-family: var(--mincho); font-weight: 700; font-size: 16px; color: var(--text); text-align: right; font-variant-numeric: tabular-nums; }
    .gc-or > em { font-style: normal; font-weight: 700; color: var(--text); white-space: nowrap; }
    .gc-bar { display: block; height: 10px; background: #0d0405; border: 1px solid var(--line-dim); }
    .gc-bar u { display: block; height: 100%; text-decoration: none; background: var(--metal-n); }
    .gc-bar u.r-R { background: var(--metal-r); } .gc-bar u.r-SR { background: linear-gradient(90deg, var(--gold-hi), var(--gold)); } .gc-bar u.r-SSR { background: linear-gradient(90deg, #d9b269, #fff6d8); box-shadow: 0 0 6px rgba(243,223,170,.7); }
    .gc-det p { margin: 0 0 3px; } .gc-det p:last-child { margin: 0; } .gc-det b { color: var(--gold-hi); }
    .gc-det .gc-rar { font-size: 14px; margin-right: 8px; min-width: 2.4em; }
    /* 希少度の札は金属の段：N 銀褐・R 銅・SR 金・SSR 淡金（二重線＋短い光沢） */
    .gc-rar { display: inline-block; text-align: center; font-family: var(--disp); font-weight: 400; font-size: 17px; letter-spacing: .06em; line-height: 1.4; padding: 0 6px; transform: skewX(-12deg); color: #1d080e; }
    .gc-rar.r-N { background: var(--metal-n); } .gc-rar.r-R { background: var(--metal-r); } .gc-rar.r-SR { background: linear-gradient(90deg, var(--gold-hi), var(--gold)); }
    .gc-rar.r-SSR { background: linear-gradient(90deg, #d9b269, #f3dfaa 40%, #fff6d8 60%, #d9b269); box-shadow: 0 0 0 1px #130406, 0 0 0 2px var(--metal-ssr); }
    .gc-voice > .gc-rar.r-SSR { background: linear-gradient(105deg, transparent 38%, rgba(255,255,255,.7) 50%, transparent 62%) -100% 0 / 40% 100% no-repeat, linear-gradient(90deg, #d9b269, #f3dfaa 40%, #fff6d8 60%, #d9b269); animation: mb-gcSheen 1.1s .15s ease-out 1 both; }
    @keyframes mb-gcSheen { from { background-position: -100% 0, 0 0; } to { background-position: 200% 0, 0 0; } }

    .gc-voices { display: flex; flex-direction: column; gap: 10px; min-height: 60px; }
    .gc-empty { display: grid; place-items: center; min-height: 40px; border: 1.5px dashed var(--line); }
    .gc-empty span { font-family: var(--mincho); font-weight: 700; font-size: 14px; letter-spacing: .2em; color: #8a7350; }
    .gc-voice { display: grid; grid-template-columns: 50px minmax(0,1fr); gap: 3px 12px; align-items: center; }
    .gc-voice > .gc-rar { grid-row: span 2; align-self: center; font-size: 20px; }
    /* 心の声の札＝黒檀の札（白い丸い吹き出しの代わり。core.css の .mb-ebony を HTML で付ける）。
       大きさを変えないよう、線は枠でなく内側の影で描く。希少度は線の金属の段で見せる（状態つきの指定＝クラス4つ） */
    .gc-bub { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 7px 14px; }
    .gc-voice .gc-bub { border: 0; border-radius: 2px !important; box-shadow: inset 4px 0 0 var(--crimson), inset 0 0 0 1px var(--line), inset 0 0 0 2px rgba(227,185,100,.14), 0 8px 18px rgba(0,0,0,.55); }
    .gc-bub p { flex: 1 1 10em; margin: 0; font-weight: 700; font-size: 15px; line-height: 1.5; }
    .gc-vcards { display: flex; gap: 4px; }
    .gc-voice.v-R .gc-bub { box-shadow: inset 4px 0 0 var(--crimson), inset 0 0 0 1px var(--metal-r), inset 0 0 0 2px rgba(185,122,71,.3), 0 8px 18px rgba(0,0,0,.55); }
    .gc-voice.v-SR .gc-bub { background: linear-gradient(180deg, #2a0f0c, #170708); box-shadow: inset 4px 0 0 var(--crimson), inset 0 0 0 1px var(--metal-sr), inset 0 0 0 2px #130406, inset 0 0 0 3px rgba(217,178,105,.6), 0 0 18px rgba(217,178,105,.35), 0 8px 18px rgba(0,0,0,.55); }
    .gc-voice.v-SSR .gc-bub { color: var(--metal-ssr);
      background: linear-gradient(105deg, transparent 38%, rgba(243,223,170,.32) 50%, transparent 62%) -100% 0 / 40% 100% no-repeat, linear-gradient(180deg, #2c1410, #160708);
      box-shadow: inset 4px 0 0 var(--crimson), inset 0 0 0 1px var(--metal-ssr), inset 0 0 0 2px #130406, inset 0 0 0 3px rgba(243,223,170,.75), 0 0 14px rgba(243,223,170,.45), 0 8px 18px rgba(0,0,0,.55);
      animation: mb-gcGild 1.6s ease-in-out 3, mb-gcSheen 1.1s .15s ease-out 1 both; }
    @keyframes mb-gcGild { 50% { box-shadow: inset 4px 0 0 var(--crimson), inset 0 0 0 1px var(--metal-ssr), inset 0 0 0 2px #130406, inset 0 0 0 3px rgba(243,223,170,.75), 0 0 26px rgba(255,246,216,.7), 0 8px 18px rgba(0,0,0,.55); } }
    .gc-meta { font-size: 14px; color: var(--dim); }
    .gc-meta em { font-style: normal; font-family: var(--mincho); font-weight: 700; letter-spacing: .08em; font-size: 14px; margin-left: 6px; padding: 0 5px; background: var(--gold-hi); color: #1d080e; }

    /* 図鑑：レア度の色の小さな数字だけ（集めた数／全部の数） */
    .gc-book { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; padding: 4px 12px; font-size: 14px; color: var(--dim); background: linear-gradient(90deg, rgba(217,178,105,.16), rgba(0,0,0,0)); border-left: 3px solid var(--gold); font-variant-numeric: tabular-nums; }
    .gc-book-h { font-family: var(--mincho); font-weight: 700; letter-spacing: .08em; color: var(--gold); font-size: 14px; }
    .gc-book b { font-family: var(--mincho); font-weight: 700; font-size: 16px; }
    .gc-book small { font-size: 14px; opacity: .8; }
    .gc-book .r-N { color: var(--metal-n); } .gc-book .r-R { color: var(--metal-r); } .gc-book .r-SR { color: var(--metal-sr); } .gc-book .r-SSR { color: var(--metal-ssr); }
    .gc-res-extra { margin-top: 6px; font-size: 14px; color: var(--dim); }

    @media (max-width: 720px) {
      /* スマホ：ぱにゅ残量 → ガチャ台とボタン → 出た心の声 → 確率表 → 図鑑 の順に縦に並べる */
      .gc-wrap { display: flex; flex-direction: column; align-items: stretch; gap: 14px; }
      .gc-wrap > * { min-width: 0; }
      .gc-right { display: contents; }
      .gc-panyu { order: 1; } .gc-left { order: 2; } .gc-voices { order: 3; } .gc-odds { order: 4; } .gc-book { order: 5; }
    }
    @media (max-width: 560px) {
      .gc-board .card { --w: 42px; }
      .gc-hands { flex-wrap: nowrap; gap: 10px; }
      .gc-hand { flex-direction: column; gap: 3px; min-width: 0; }
      .gc-hn { text-align: center; }
      .gc-bub p { font-size: 14px; }
      .gc-acts .btn { min-width: 220px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .gc-ear, .gc-pull, .gc-cap, .gc-cap.wob .gc-in, .gc-burst, .gc-voice.v-SSR .gc-bub, .gc-voice > .gc-rar.r-SSR { animation: none !important; }
    }
  `;
})();
