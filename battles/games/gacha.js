// 心理：心の声ガチャ（ぱにゅぱにゅ）
// 相手が賭けてきた。ミミの外れスキル《ぱにゅぱにゅ》で、相手の「心の声」を引ける（手持ち30、1回10、最大3回）。
// 引かずに残したぱにゅは、1あたりコイン2枚として賭け金のもとに足される＝引くか節約するかの駆け引き。
// 心の声はすべて、裏で決めた相手の本当の手札から作る（N と R は書いてある割合で外れる。SR・SSR は正確）。
(() => {
  const RAR = {
    N: { p: 55, name: '気分のかけら', acc: '6割で本当の手に沿う' },
    R: { p: 30, name: '手の強さのヒント', acc: '8割で本当の手に沿う' },
    SR: { p: 12, name: '相手の札を1枚見抜く', acc: '正確' },
    SSR: { p: 3, name: '両方の札が見える', acc: '正確・大当たり' },
  };
  const ORDER = ['N', 'R', 'SR', 'SSR'];
  // 天井（3回目）は R 以上だけを、同じ比率で引き直す
  const CEIL = { R: 30 / 45, SR: 12 / 45, SSR: 3 / 45 };
  const pct = (x) => (Math.round(x * 1000) / 10) + '%';

  // キャラごとの心の声（口調を変える）
  const VOICE = {
    polka: {
      N: {
        strong: ['えへへ、早く見せたいな〜♪', 'ふんふーん、今日のボク、ついてる気がする！', 'わくわく……ばれちゃダメだぞ、ボク！'],
        bluff: ['……どきどき。お願い、降りて〜', 'ひ、ひざが勝手にゆれちゃう……', '平気な顔、平気な顔……！'],
      },
      R: { strong: 'ボクの札、場札とばっちり噛み合ってるもんね！', bluff: 'ボクの札、場札とぜんっぜん噛み合ってないや……' },
      SR: '{c}ちゃん、がんばって〜！',
      SSR: '{a}と{b}、ボクの宝物！ 見ないで〜！',
      open: 'ミミちゃん、勝負だよっ！ ボク、本気だからね！',
      end: { winBluff: 'うわーん、バレてたー！', loseBluff: 'えへへ、ブラフでした〜！', winStrong: 'ちぇー、降りられちゃった', loseStrong: 'やったー！ 本物だよ！' },
    },
    selina: {
      N: {
        strong: ['……問題ない。', '……静か。いい。', '……勝ち筋、見えた。'],
        bluff: ['……早く、降りて。', '……計算が、合わない。', '……顔には、出さない。'],
      },
      R: { strong: '……私の札、場と、つながってる。', bluff: '……私の札、場と、つながらない。' },
      SR: '……{c}。',
      SSR: '……{a}、{b}。……見た？',
      open: '……ポット。',
      end: { winBluff: '……読まれた。', loseBluff: '……降りてくれて、ありがとう。', winStrong: '……賢明。', loseStrong: '……本物。' },
    },
    grano: {
      N: {
        strong: ['ふふ、これは良い取引になりそうですな', '利益の匂いがいたしますぞ', '値切られる前に、しっかり頂きましょう'],
        bluff: ['……損切りの準備はしておきましょうか', '在庫は空っぽ、しかし看板は立派に', 'ここは口八丁で乗り切るしか……'],
      },
      R: { strong: '私の二枚、場札と上々の相性ですな', bluff: '私の二枚、場札とは取引不成立でして' },
      SR: '頼みますぞ、{c}殿……',
      SSR: '{a}と{b}、私の全財産ですぞ……',
      open: 'ここは強気に参りましょう。さあ、いかがなさいます？',
      end: { winBluff: 'なんと、見抜かれましたか……', loseBluff: 'ふふ、良い取引でした', winStrong: '慎重なお方ですな', loseStrong: 'まいど、ありがとうございます' },
    },
    velvet: {
      N: {
        strong: ['ふふん、早くコールしなさいよ♡', 'あたしの勝ち、もう決まってるの♡', 'ざぁこの泣き顔、楽しみなの♡'],
        bluff: ['……は、早く降りなさいよ、ざぁこ', 'こ、こわくなんかないの……！', 'なんでこっち見てるの……？'],
      },
      R: { strong: 'あたしの札、場札とお似合いなの♡', bluff: 'あたしの札……場札と、ぜんぜん合ってないの' },
      SR: '{c}、あたしの味方でしょ？',
      SSR: '{a}と{b}……見ないでよ、ざぁこ！',
      open: 'ほら、コールしてみなさいよ。ざぁこ♡',
      end: { winBluff: 'う、うそ……あたしのブラフが……！', loseBluff: 'ふふっ、降りちゃった♡ ざぁこ♡', winStrong: '……ちっ。逃げ足だけは速いのね', loseStrong: 'ざぁんねん♡ 本物なの' },
    },
  };
  const WHO = Object.keys(VOICE);
  const TOTAL = { N: WHO.length * 6, R: WHO.length * 2, SR: WHO.length, SSR: WHO.length };
  const ALL = TOTAL.N + TOTAL.R + TOTAL.SR + TOTAL.SSR;
  // 心の声図鑑（このページで集めた種類）
  const book = new Set();
  try { JSON.parse(localStorage.getItem('mbGachaBook') || '[]').forEach(k => book.add(k)); } catch (e) {}
  const saveBook = () => { try { localStorage.setItem('mbGachaBook', JSON.stringify([...book])); } catch (e) {} };

  MB.register({ id: 'gacha', group: 'psych', order: 5, title: '心の声ガチャ', sub: 'PSYCH · ぱにゅぱにゅ', isNew: true, chars: ['polka', 'selina', 'grano', 'velvet'], start });

  // 本当の手を決める。flush：場に同じマーク3枚、強い＝そのマーク2枚。set：強い＝場の数字と同じポケットペア。
  // ミミは一番上の数字のワンペア（ブラフには勝ち、強い手には負け）になるまで配り直す。
  function deal(api, truth) {
    const R = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    for (let t = 0; t < 500; t++) {
      const tpl = Math.random() < .5 ? 'flush' : 'set';
      const ranks = api.shuffle(R).slice(0, 5);
      let board, X = null;
      if (tpl === 'flush') {
        X = api.pick(api.SUITS); const O = api.shuffle(api.SUITS.filter(s => s !== X));
        board = ranks.map((r, i) => ({ r, s: i < 3 ? X : O[i - 3] }));
      } else {
        const ss = api.shuffle(api.SUITS); const pat = [0, 1, 2, 3, api.rand(4)];
        board = ranks.map((r, i) => ({ r, s: ss[pat[i]] }));
      }
      const used = new Set(board.map(api.key));
      const top = Math.max(...ranks); const topCard = board.find(c => c.r === top);
      const nonX = api.SUITS.filter(s => s !== X);
      const kick = R.slice().reverse().find(r => !ranks.includes(r));
      const mimi = [{ r: top, s: api.pick(nonX.filter(s => s !== topCard.s)) }, { r: kick, s: api.pick(nonX) }];
      mimi.forEach(c => used.add(api.key(c)));
      let her;
      if (truth === 'strong') {
        if (tpl === 'flush') {
          her = api.shuffle(R.filter(r => !ranks.includes(r) && r !== kick)).slice(0, 2).map(r => ({ r, s: X }));
        } else {
          const m = api.pick(ranks.filter(r => r !== top));
          const bs = board.find(c => c.r === m).s;
          her = api.shuffle(api.SUITS.filter(s => s !== bs)).slice(0, 2).map(s => ({ r: m, s }));
        }
      } else {
        const rs = api.shuffle(R.filter(r => !ranks.includes(r) && r !== kick && r !== top)).slice(0, 2);
        her = rs.map(r => ({ r, s: api.pick(nonX) }));
      }
      if (her.some(c => used.has(api.key(c))) || new Set(her.map(api.key)).size < 2) continue;
      if (api.category(mimi.concat(board)) !== 1) continue;
      const a = api.score(her.concat(board)), b = api.score(mimi.concat(board));
      if (truth === 'strong' ? a <= b : a >= b) continue;
      if (truth === 'bluff' && api.category(her.concat(board)) !== 0) continue;
      return { tpl, X, board: api.shuffle(board), mimi, her, top };
    }
    return null;
  }

  async function start({ api }) {
    const force = (window.MB_FORCE || {}).gacha || {};
    const who = api.charId in VOICE ? api.charId : 'polka';
    const V = VOICE[who];
    const jp = api.char.jp;
    const truth = force.truth || (Math.random() < .5 ? 'bluff' : 'strong');
    const opp = (t) => (t === 'bluff' ? 'strong' : 'bluff');
    let D = deal(api, truth);
    if (!D) { // 念のための固定の配り
      const b = [{ r: 13, s: 'h' }, { r: 9, s: 'h' }, { r: 4, s: 'c' }, { r: 2, s: 'h' }, { r: 7, s: 's' }];
      D = { tpl: 'flush', X: 'h', board: b, mimi: [{ r: 13, s: 'c' }, { r: 14, s: 'd' }], her: truth === 'strong' ? [{ r: 12, s: 'h' }, { r: 6, s: 'h' }] : [{ r: 6, s: 'd' }, { r: 5, s: 'c' }], top: 13 };
    }
    const { board, mimi, her, tpl, X } = D;
    const herCat = api.CAT_NAME[api.category(her.concat(board))];
    const mimiName = `${api.rn(D.top)}のワンペア`;
    const bet = 300 + api.rand(8) * 100;

    api.say(V.open, who === 'selina' ? 'think' : 'smug'); api.bet(bet);
    api.css('gacha', CSS);
    const root = api.root;
    const stepNames = ['心の声を引く', '読む', '読みを賭ける', '答え合わせ'];
    const explain = tpl === 'flush'
      ? `場に${api.SYM[X]}が3枚。${jp}が${api.SYM[X]}を2枚持っていれば<b>フラッシュ</b>（同じマーク5枚）`
      : `${jp}の札が場の数字と重なれば<b>スリーカード</b>（同じ数字3枚）`;
    const balls = [['n', 12, 6], ['r', 44, 2], ['n', 78, 8], ['sr', 110, 3], ['n', 140, 6], ['r', 26, 30], ['n', 60, 34], ['ssr', 94, 30], ['n', 126, 32], ['r', 150, 36], ['n', 40, 58], ['sr', 76, 60], ['n', 112, 58]];
    root.innerHTML = `
      <div id="mb-gc-steps">${api.steps(stepNames, 0)}</div>
      <div class="row gc-board">${board.map(c => api.cardHTML(c)).join('')}</div>
      <div class="gc-hands" id="mb-gc-hands">
        <div class="gc-hand"><span class="gc-who">${api.char.name}</span><span class="gc-cards" id="mb-gc-her">${api.backHTML('small')}${api.backHTML('small')}</span><span class="gc-hn" id="mb-gc-her-name">？？？</span></div>
        <span class="gc-vs">VS</span>
        <div class="gc-hand"><span class="gc-who">MIMI</span><span class="gc-cards">${mimi.map(c => api.cardHTML(c, 'small')).join('')}</span><span class="gc-hn">${mimiName}</span></div>
      </div>
      <p class="gc-sub">${explain}。ミミの${mimiName}は、ブラフには勝ち、強い手には負ける。</p>
      <div class="gc-wrap">
        <div class="gc-left">
          <div class="gc-mach" id="mb-gc-mach" role="button" tabindex="0" aria-label="ガチャのレバーを引く">
            <i class="gc-ear l"></i><i class="gc-ear r"></i>
            <div class="gc-dome"><div class="gc-balls">${balls.map(([k, x, y]) => `<i class="b-${k}" style="left:${x}px;bottom:${y}px"></i>`).join('')}</div></div>
            <i class="gc-bow"></i>
            <div class="gc-body">
              <div class="gc-plate"><span>PANYU♡PANYU</span></div>
              <div class="gc-face"><i></i><b>ω</b><i></i></div>
              <div class="gc-chute"></div>
            </div>
            <div class="gc-lever"><i class="stick"></i><i class="pivot"></i></div>
            <i class="gc-feet"></i>
          </div>
          <div class="gc-acts" id="mb-gc-acts">
            <button class="btn gold gc-pull" id="mb-gc-pull">ぱにゅぱにゅ！<small>心の声を1回引く（ぱにゅ10）</small></button>
            <button class="btn quiet gc-stop" id="mb-gc-stop">もう引かない<small>読みに進む</small></button>
          </div>
        </div>
        <div class="gc-right">
          <div class="gc-panyu">
            <div class="gc-pn"><span>ぱにゅ</span><b id="mb-gc-pn">30</b><span class="gc-segs" id="mb-gc-segs"><i></i><i></i><i></i></span></div>
            <div class="gc-basebox">残したぱにゅは1あたりコイン2枚。ご褒美のもと <b>20＋<span id="mb-gc-left">30</span>×2＝<span id="mb-gc-bv">80</span></b></div>
          </div>
          <div class="gc-voices" id="mb-gc-voices"><div class="gc-empty">まだ心の声は聞こえない……</div></div>
          <div class="gc-odds">
            <div class="gc-odds-h">排出確率<small>（そのまま表示）</small></div>
            ${ORDER.map(k => `<div class="gc-orow"><span class="gc-rar r-${k}">${k}</span><b>${RAR[k].p}%</b><span>${RAR[k].name}<small>${RAR[k].acc}</small></span></div>`).join('')}
            <div class="gc-ceil"><b>天井</b>：3回目は <b>R以上が確定</b>（R ${pct(CEIL.R)}・SR ${pct(CEIL.SR)}・SSR ${pct(CEIL.SSR)}）</div>
          </div>
          <div class="gc-book" id="mb-gc-book"></div>
        </div>
      </div>
      <div class="actions" id="mb-gc-decide" hidden>
        <button class="btn" data-d="bluff">ブラフと読む<small>コールして勝負</small></button>
        <button class="btn quiet" data-d="strong">強い手と読む<small>降りて守る</small></button>
      </div>`;
    api.coach('《ぱにゅぱにゅ》で心の声を引ける。1回10、残せばコインに', 'think');

    const $ = (s) => root.querySelector(s);
    const mach = $('#mb-gc-mach');
    let panyu = 30, pulls = 0, busy = false, over = false;
    const got = [];
    const drawBook = () => {
      const n = (k) => [...book].filter(x => x.split(':')[1] === k).length;
      $('#mb-gc-book').innerHTML = `<span class="gc-book-h">心の声図鑑</span><b>${book.size}</b><small>/${ALL}種</small>
        <span class="gc-book-r">${ORDER.map(k => `<span class="r-${k}">${k} ${n(k)}/${TOTAL[k]}</span>`).join('')}</span>`;
    };
    const drawPanyu = () => {
      $('#mb-gc-pn').textContent = panyu; $('#mb-gc-left').textContent = panyu; $('#mb-gc-bv').textContent = 20 + panyu * 2;
      $('#mb-gc-segs').querySelectorAll('i').forEach((el, i) => el.classList.toggle('used', i >= panyu / 10));
      const p = $('#mb-gc-pull');
      if (p) p.innerHTML = pulls === 2 ? 'ぱにゅぱにゅ！<small>3回目は R以上 確定！（ぱにゅ10）</small>' : 'ぱにゅぱにゅ！<small>心の声を1回引く（ぱにゅ10）</small>';
      $('#mb-gc-acts').classList.toggle('is-ceil', pulls === 2);
    };
    drawBook(); drawPanyu();

    const roll = () => {
      if (force.rolls && force.rolls[pulls - 1]) return force.rolls[pulls - 1];
      if (pulls === 3) { const y = Math.random(); return y < CEIL.SSR ? 'SSR' : y < CEIL.SSR + CEIL.SR ? 'SR' : 'R'; }
      const x = Math.random() * 100;
      return x < 3 ? 'SSR' : x < 15 ? 'SR' : x < 45 ? 'R' : 'N';
    };
    const voiceOf = (rar) => {
      if (rar === 'N') { const lean = Math.random() < .6 ? truth : opp(truth); const i = api.rand(3); return { rar, lean, text: V.N[lean][i], key: `${who}:N:${lean}:${i}` }; }
      if (rar === 'R') { const lean = Math.random() < .8 ? truth : opp(truth); return { rar, lean, text: V.R[lean], key: `${who}:R:${lean}` }; }
      if (rar === 'SR') { const c = api.pick(her); return { rar, lean: truth, cards: [c], text: V.SR.replace('{c}', api.label(c)), key: `${who}:SR` }; }
      return { rar, lean: truth, cards: her, text: V.SSR.replace('{a}', api.label(her[0])).replace('{b}', api.label(her[1])), key: `${who}:SSR` };
    };
    const ricoOn = (v) => {
      if (v.rar === 'N') return '気分のかけら。当たるのは6割、参考ていどにね';
      if (v.rar === 'R') return '手の強さのヒント。8割は本当のことだよ';
      if (v.rar === 'SSR') return `両方見えた！ ${herCat}だよ。もう迷わないね`;
      const c = v.cards[0], L = `<b>${api.label(c)}</b>`;
      if (tpl === 'flush') return c.s === X ? `${L}は場と同じマーク。フラッシュの匂い…！` : `${L}は場のマークと違う。フラッシュは無いね`;
      return board.some(b => b.r === c.r) ? `${L}は場の数字と同じ！ スリーカードだ` : `${L}は場のどれとも合わない。空振りっぽい`;
    };

    // 1回引く：レバー → カプセルが落ちて揺れる（ため）→ 開いてレア度の色 → 心の声
    const pull = async () => {
      if (busy || over || panyu < 10) return;
      busy = true; pulls++; panyu -= 10; drawPanyu();
      $('#mb-gc-pull').disabled = true; $('#mb-gc-stop').disabled = true;
      const rar = roll(); const v = voiceOf(rar);
      api.sfx.tap(); api.coach('ぱにゅぱにゅ……！');
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
      // 心の声をフキダシで出し、図鑑に数える
      const isNew = !book.has(v.key); book.add(v.key); saveBook(); got.push(v);
      const list = $('#mb-gc-voices'); const empty = list.querySelector('.gc-empty'); if (empty) empty.remove();
      list.insertAdjacentHTML('afterbegin', `<div class="gc-voice v-${rar} pop">
        <span class="gc-rar r-${rar}">${rar}</span>
        <div class="gc-bub"><p>「${v.text}」</p>${v.cards ? `<div class="gc-vcards">${v.cards.map(c => api.cardHTML(c, 'small')).join('')}</div>` : ''}</div>
        <div class="gc-meta">${pulls}回目・${RAR[rar].name}（${RAR[rar].acc}）${isNew ? '<em>NEW</em>' : ''}</div></div>`);
      drawBook();
      if (window.innerWidth <= 720) api.reveal(list.firstElementChild, 'nearest');
      api.coach(ricoOn(v), rar === 'SSR' ? 'win' : rar === 'SR' ? 'smug' : 'think');
      // 札を見抜かれた瞬間、相手は動揺する（本人は気づいていない）。セリナは SSR の時だけ
      if (rar === 'SSR' || (rar === 'SR' && who !== 'selina')) api.emote('panic');
      setTimeout(() => { cap.remove(); burst.remove(); badge.remove(); spot.remove(); mach.classList.remove('is-ssr'); }, R ? 200 : 900);
      await api.wait(R ? 100 : 350); if (!api.alive()) return;
      busy = false;
      if (panyu < 10) { finishPulls(true); return; }
      $('#mb-gc-pull').disabled = false; $('#mb-gc-stop').disabled = false;
    };
    let endPulls;
    const pulled = new Promise(r => { endPulls = r; });
    const finishPulls = (out) => {
      if (over) return; over = true;
      $('#mb-gc-acts').hidden = true; mach.classList.add('is-over');
      if (out) api.coach('ぱにゅ切れ！ 集めた心の声で読もう');
      else api.coach(pulls === 0 ? 'ぱにゅは全部とっておく作戦。さあ、どっち？' : 'ここで止める。残したぱにゅはコインになるよ');
      endPulls();
    };
    $('#mb-gc-pull').addEventListener('click', pull);
    mach.addEventListener('click', pull);
    mach.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pull(); } });
    $('#mb-gc-stop').addEventListener('click', () => { if (busy || over) return; api.sfx.tap(); finishPulls(false); });
    await pulled;
    if (!api.alive()) return;

    // 読む
    $('#mb-gc-steps').innerHTML = api.steps(stepNames, 1);
    const decideEl = $('#mb-gc-decide');
    decideEl.hidden = false; decideEl.classList.add('pop');
    api.reveal(decideEl, 'nearest');
    const decide = await new Promise(res => decideEl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { api.sfx.tap(); res(b.dataset.d); })));
    if (!api.alive()) return;
    decideEl.hidden = true;
    $('#mb-gc-steps').innerHTML = api.steps(stepNames, 2);
    const base = 20 + panyu * 2;
    await api.wager({ question: `「${decide === 'bluff' ? 'ブラフ' : '強い手'}」と読んだ。自信は？`, base });
    if (!api.alive()) return;

    // ためてから、相手の手札をめくる
    $('#mb-gc-steps').innerHTML = api.steps(stepNames, 3);
    const hands = $('#mb-gc-hands');
    api.reveal(hands, 'center');
    hands.classList.add('is-reveal');
    api.coach(`${jp}の手札、めくるよ……！`); api.sfx.drum();
    await api.wait(api.reduce ? 200 : 1000); if (!api.alive()) return;
    const herEl = $('#mb-gc-her');
    herEl.children[0].outerHTML = api.cardHTML(her[0], 'small flip'); api.sfx.tick();
    await api.wait(api.reduce ? 150 : 750); if (!api.alive()) return;
    herEl.children[1].outerHTML = api.cardHTML(her[1], 'small flip'); api.sfx.tick();
    await api.wait(api.reduce ? 150 : 500); if (!api.alive()) return;
    const nm = $('#mb-gc-her-name'); nm.textContent = herCat; nm.classList.add(truth === 'strong' ? 'is-strong' : 'is-bluff', 'pop');
    const correct = decide === truth;
    api.say(truth === 'bluff' ? (correct ? V.end.winBluff : V.end.loseBluff) : (correct ? V.end.winStrong : V.end.loseStrong),
      truth === 'bluff' ? (correct ? 'busted' : 'smug') : (who === 'selina' ? 'think' : 'smug'));
    await api.wait(api.reduce ? 200 : 900); if (!api.alive()) return;

    // 集めた声から見て、筋の通った読みはどちらだったか（SR・SSR は決め手、N・R は割合で重み）
    let lo = 0, exact = false;
    for (const v of got) {
      if (v.rar === 'SR' || v.rar === 'SSR') exact = true;
      else lo += (v.lean === 'bluff' ? 1 : -1) * (v.rar === 'R' ? Math.log(4) : Math.log(1.5));
    }
    const sensible = exact ? truth : lo > 0 ? 'bluff' : lo < 0 ? 'strong' : null;
    const truthDesc = truth === 'strong' ? `本当に強い手（${herCat}・${her.map(api.label).join(' ')}）` : `ブラフ（${herCat}・${her.map(api.label).join(' ')}）`;
    let why;
    if (correct) why = pulls === 0 ? '心の声なしで読み切った！' : `心の声${pulls}回で読み切った。`;
    else if (pulls === 0) why = '1回引けば、ヒントがもらえたかも。';
    else if (sensible === decide) {
      const liar = got.find(v => v.lean !== truth);
      why = `${liar ? liar.rar + 'の声は' + (liar.rar === 'N' ? '4割' : '2割') + '外れる。' : ''}判断は筋が通ってた、運が悪かっただけ。`;
    } else why = `心の声は「${truth === 'bluff' ? 'ブラフ' : '強い手'}」寄りだった。`;
    api.fitStage();
    api.finish({
      correct, base,
      perfect: correct && api.mult === 3 && pulls <= 1,
      detail: `${jp}は${truthDesc}だった。${why}`,
      extra: `<div class="gc-res-extra">残したぱにゅ ${panyu} → ご褒美のもと ${base}・心の声図鑑 ${book.size}/${ALL}</div>`,
    });
  }

  const CSS = `
    .gc-board .card { --w: 50px; }
    .gc-hands { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 18px; }
    .gc-hand { display: flex; align-items: center; gap: 8px; }
    .gc-who { font-family: var(--disp); letter-spacing: .14em; color: var(--gold); font-size: 15px; }
    .gc-cards { display: flex; gap: 4px; }
    .gc-hn { font-weight: 900; font-size: 13px; }
    .gc-hn.is-strong { color: var(--red-hi); font-size: 16px; } .gc-hn.is-bluff { color: var(--good); font-size: 16px; }
    .gc-vs { font-family: var(--disp); font-size: 26px; color: var(--red-hi); transform: skewX(-12deg); line-height: 1; }
    .gc-hands.is-reveal .gc-hand:first-child { filter: drop-shadow(0 0 14px rgba(255,74,96,.6)); }
    .gc-sub { margin: -4px 0 0; text-align: center; font-size: 13px; color: var(--dim); text-wrap: balance; }
    .gc-sub b { color: var(--text); }

    .gc-wrap { display: grid; grid-template-columns: 280px minmax(0,1fr); gap: 18px; align-items: start; }
    .gc-left { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .gc-right { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

    /* ---- ガチャ台：うさ耳の金と深紅 ---- */
    .gc-mach { position: relative; width: 230px; height: 344px; cursor: pointer; user-select: none; outline: none; -webkit-tap-highlight-color: transparent; }
    .gc-mach:focus-visible { outline: 2px solid var(--gold-hi); outline-offset: 6px; }
    .gc-ear { position: absolute; top: 2px; width: 40px; height: 100px; border-radius: 50% 50% 44% 44% / 72% 72% 28% 28%; background: linear-gradient(180deg, #fff3c2, #d9b35a 55%, #a87a1a); border: 3px solid #7d1022; transform-origin: 50% 100%; z-index: 1; }
    .gc-ear::after { content: ""; position: absolute; left: 9px; right: 9px; top: 12px; bottom: 16px; border-radius: inherit; background: linear-gradient(180deg, #ffd0df, #ff9fc2); }
    .gc-ear.l { left: 54px; transform: rotate(-17deg); animation: mb-gcEarL 3.2s ease-in-out infinite; }
    .gc-ear.r { right: 54px; transform: rotate(15deg); animation: mb-gcEarR 3.2s .4s ease-in-out infinite; }
    @keyframes mb-gcEarL { 50% { transform: rotate(-24deg); } }
    @keyframes mb-gcEarR { 50% { transform: rotate(22deg); } 60% { transform: rotate(10deg); } }
    .gc-dome { position: absolute; top: 76px; left: 22px; right: 22px; height: 150px; z-index: 2; overflow: hidden; border-radius: 93px 93px 16px 16px; border: 5px solid var(--gold); box-shadow: 0 0 0 2px #7d1022, inset 0 -14px 26px rgba(0,0,0,.45);
      background: radial-gradient(120% 90% at 30% 18%, rgba(255,255,255,.34), rgba(255,210,225,.1) 48%, rgba(40,6,14,.62)); }
    .gc-dome::after { content: ""; position: absolute; left: 20px; top: 18px; width: 20px; height: 72px; border-radius: 12px; background: linear-gradient(rgba(255,255,255,.6), rgba(255,255,255,0)); transform: rotate(20deg); }
    .gc-balls i { position: absolute; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(180deg, var(--c) 0 50%, #fffdf3 50%); border: 2px solid rgba(20,6,10,.35); box-shadow: inset 0 -4px 6px rgba(0,0,0,.2); }
    .gc-balls .b-n { --c: #efe6d4; } .gc-balls .b-r { --c: #4aa3ff; } .gc-balls .b-sr { --c: #f5d77a; }
    .gc-balls .b-ssr { --c: #ff6b8a; background: linear-gradient(180deg, #ff6b8a, #ffb14a 18%, #f5d77a 30%, #8fe3a8 42%, #6cc8ff 50%, #fffdf3 50%); }
    .gc-mach.is-pull .gc-balls i { animation: mb-gcJiggle .5s ease; }
    .gc-mach.is-pull .gc-balls i:nth-child(odd) { animation-delay: .06s; }
    @keyframes mb-gcJiggle { 30% { transform: translate(4px, -14px) rotate(40deg); } 60% { transform: translate(-3px, -4px) rotate(-20deg); } }
    .gc-bow { position: absolute; left: 50%; top: 66px; width: 60px; height: 28px; margin-left: -30px; z-index: 3; background: linear-gradient(180deg, #ff4a60, #a3162c); clip-path: polygon(0 0, 50% 38%, 100% 0, 100% 100%, 50% 62%, 0 100%); }
    .gc-bow::after { content: ""; position: absolute; left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; background: var(--gold-hi); transform: rotate(45deg); }
    .gc-body { position: absolute; top: 218px; left: 12px; right: 12px; height: 110px; z-index: 2; border-radius: 16px 16px 10px 10px; border: 3px solid var(--gold); background: linear-gradient(180deg, #d42d44, #7d1022); box-shadow: inset 0 4px 0 rgba(255,255,255,.22), 0 12px 22px rgba(0,0,0,.5); }
    .gc-plate { position: absolute; left: 50%; top: 9px; transform: translateX(-50%) skewX(-12deg); padding: 0 10px; background: #14060a; border: 1px solid var(--gold); white-space: nowrap; }
    .gc-plate span { display: inline-block; transform: skewX(12deg); font-family: var(--disp); color: var(--gold-hi); letter-spacing: .14em; font-size: 15px; line-height: 1.5; }
    .gc-face { position: absolute; left: 50%; top: 40px; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; color: #fff3c2; }
    .gc-face i { width: 7px; height: 7px; border-radius: 50%; background: #fff3c2; box-shadow: 0 5px 0 -1px rgba(255,159,194,.0); position: relative; }
    .gc-face i::after { content: ""; position: absolute; top: 8px; left: -5px; width: 14px; height: 6px; border-radius: 50%; background: rgba(255,159,194,.75); }
    .gc-face b { font-size: 14px; line-height: 1; font-weight: 900; }
    .gc-chute { position: absolute; left: 50%; bottom: 9px; width: 76px; height: 34px; margin-left: -38px; background: #14060a; border: 3px solid var(--gold); border-radius: 12px 12px 4px 4px; box-shadow: inset 0 8px 10px rgba(0,0,0,.85); }
    .gc-lever { position: absolute; right: -4px; top: 262px; width: 18px; height: 18px; z-index: 3; }
    .gc-lever .pivot { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff3c2, #b8860b); border: 2px solid #7d1022; }
    .gc-lever .stick { position: absolute; left: 5px; bottom: 9px; width: 8px; height: 60px; border-radius: 4px; background: linear-gradient(90deg, #a87a1a, #fff3c2, #a87a1a); transform-origin: 50% 100%; transform: rotate(18deg); transition: transform .22s ease; }
    .gc-lever .stick::before { content: ""; position: absolute; left: 50%; top: -20px; width: 28px; height: 28px; margin-left: -14px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffb0c0, #c8253a 58%, #7d1022); border: 2px solid var(--gold); }
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
    .gc-cap.g-R .gc-in { box-shadow: 0 0 14px 6px rgba(74,163,255,1), 0 0 34px 14px rgba(74,163,255,.55); }
    .gc-cap.g-SR .gc-in { box-shadow: 0 0 14px 7px rgba(255,236,160,1), 0 0 38px 18px rgba(245,190,60,.7); }
    .gc-spot { position: absolute; left: 50%; top: 164px; width: 250px; height: 250px; margin: -125px 0 0 -125px; z-index: 5; pointer-events: none; border-radius: 50%;
      background: radial-gradient(circle, rgba(12,3,6,.92) 0 34%, rgba(12,3,6,.6) 52%, rgba(12,3,6,0) 70%); animation: mb-fadeIn .3s backwards; transition: opacity .4s; }
    .gc-spot::after { content: ""; position: absolute; inset: 8%; border-radius: 50%; opacity: 0; transition: opacity .25s;
      background: repeating-conic-gradient(var(--sc, #4aa3ff) 0 6deg, transparent 6deg 18deg); -webkit-mask: radial-gradient(circle, transparent 22%, #000 30%, transparent 70%); mask: radial-gradient(circle, transparent 22%, #000 30%, transparent 70%); animation: mb-gcSpin 3s linear infinite; }
    .gc-spot.g-R::after { opacity: .55; --sc: #4aa3ff; } .gc-spot.g-SR::after { opacity: .8; --sc: #f5d77a; }
    .gc-spot.g-SSR::after { opacity: .9; background: repeating-conic-gradient(#ff4a60 0 6deg, transparent 6deg 12deg, #f5d77a 12deg 18deg, transparent 18deg 24deg, #8fe3a8 24deg 30deg, transparent 30deg 36deg, #6cc8ff 36deg 42deg, transparent 42deg 48deg); animation-duration: 1.2s; }
    .gc-spot.is-open { opacity: 0; }
    @keyframes mb-gcSpin { to { transform: rotate(360deg); } }
    .gc-cap.g-SSR .gc-in { animation: mb-gcWob .26s ease-in-out infinite, mb-gcRainbow .8s linear infinite; }
    @keyframes mb-gcRainbow { 0% { box-shadow: 0 0 26px 12px rgba(255,74,96,.95); } 25% { box-shadow: 0 0 26px 12px rgba(245,215,122,.95); } 50% { box-shadow: 0 0 26px 12px rgba(143,227,168,.95); } 75% { box-shadow: 0 0 26px 12px rgba(108,200,255,.95); } 100% { box-shadow: 0 0 26px 12px rgba(255,74,96,.95); } }
    .gc-cap.open .t { transform: translate(-30px, -44px) rotate(-55deg); opacity: 0; }
    .gc-cap.open .b { transform: translate(18px, 26px) rotate(30deg); opacity: 0; }
    .gc-cap.open .q { opacity: 0; }
    .gc-cap.c-N .t { background: #fff; } .gc-cap.c-R .t { background: #4aa3ff; } .gc-cap.c-SR .t { background: var(--gold-hi); }
    .gc-cap.c-SSR .t { background: linear-gradient(90deg, #ff4a60, #ffb14a, #f5d77a, #8fe3a8, #6cc8ff); }
    .gc-up.fizz { color: var(--dim); text-shadow: none; font-size: 24px; }
    .gc-up { position: absolute; left: 50%; top: 40px; z-index: 8; transform: translateX(-50%); font-family: var(--disp); font-weight: 400; font-size: 30px; letter-spacing: .1em; color: #fff; text-shadow: 0 0 12px var(--gold-hi); animation: mb-gcUp .9s ease forwards; pointer-events: none; }
    @keyframes mb-gcUp { from { opacity: 0; transform: translate(-50%, 16px) scale(.6); } 25% { opacity: 1; transform: translate(-50%, 0) scale(1.1); } to { opacity: 0; transform: translate(-50%, -26px); } }
    .gc-burst { position: absolute; left: 50%; top: 164px; width: 300px; height: 300px; margin: -150px 0 0 -150px; z-index: 5; pointer-events: none; border-radius: 50%;
      background: repeating-conic-gradient(var(--bc) 0 9deg, transparent 9deg 20deg); -webkit-mask: radial-gradient(circle, #000 18%, transparent 68%); mask: radial-gradient(circle, #000 18%, transparent 68%); animation: mb-gcBurst 1s ease-out forwards; }
    .gc-burst.c-N { --bc: rgba(255,255,255,.7); } .gc-burst.c-R { --bc: rgba(74,163,255,.9); } .gc-burst.c-SR { --bc: rgba(245,215,122,1); }
    .gc-burst.c-SSR { background: repeating-conic-gradient(#ff4a60 0 8deg, transparent 8deg 15deg, #f5d77a 15deg 23deg, transparent 23deg 30deg, #8fe3a8 30deg 38deg, transparent 38deg 45deg, #6cc8ff 45deg 53deg, transparent 53deg 60deg); animation-duration: 1.4s; }
    @keyframes mb-gcBurst { from { transform: scale(.2) rotate(0); opacity: 1; } to { transform: scale(1.35) rotate(70deg); opacity: 0; } }
    .gc-badge { position: absolute; left: 50%; top: 30px; z-index: 8; transform: translateX(-50%) skewX(-12deg); padding: 2px 18px 0; background: #14060a; border: 2px solid var(--gold); box-shadow: 0 8px 20px rgba(0,0,0,.6); font-family: var(--disp); font-weight: 400; font-size: 56px; line-height: 1; letter-spacing: .04em; pointer-events: none; white-space: nowrap; animation: mb-gcBadge .5s cubic-bezier(.2,1.6,.4,1) both; }
    .gc-badge span { display: inline-block; transform: skewX(12deg); }
    @keyframes mb-gcBadge { from { transform: translateX(-50%) skewX(-12deg) scale(2.4); opacity: 0; } }
    .gc-badge.r-N { color: #fff; font-size: 40px; border-color: rgba(255,255,255,.5); } .gc-badge.r-R { color: #7cc0ff; border-color: #4aa3ff; box-shadow: 0 0 22px rgba(74,163,255,.7); }
    .gc-badge.r-SR { color: var(--gold-hi); border-color: var(--gold-hi); box-shadow: 0 0 26px rgba(245,215,122,.8); text-shadow: 0 0 14px rgba(245,215,122,.9); }
    .gc-badge.r-SSR { font-size: 70px; border-color: #fff; box-shadow: 0 0 34px rgba(255,255,255,.7); animation: mb-gcBadge .5s cubic-bezier(.2,1.6,.4,1) both, mb-gcRainbow 1s linear infinite; }
    .gc-badge.r-SSR span { background: linear-gradient(90deg, #ff6b8a, #ffb14a, #f5d77a, #8fe3a8, #6cc8ff); -webkit-background-clip: text; background-clip: text; color: transparent; }

    .gc-acts { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .gc-acts .btn { min-width: 236px; }
    .gc-pull { font-size: 18px; animation: mb-gcPullBtn 1.4s ease-in-out infinite; }
    @keyframes mb-gcPullBtn { 50% { transform: scale(1.04); } }
    .gc-acts.is-ceil .gc-pull::before { box-shadow: 0 0 24px rgba(245,215,122,.9), 0 6px 16px rgba(0,0,0,.45); }
    .gc-pull[disabled], .gc-stop[disabled] { animation: none; }

    /* ---- ぱにゅ・確率表・心の声 ---- */
    .gc-panyu { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; padding: 8px 12px; background: rgba(0,0,0,.4); border: 1px solid rgba(217,179,90,.45); }
    .gc-pn { display: flex; align-items: center; gap: 8px; }
    .gc-pn > span:first-child { font-weight: 900; font-size: 13px; color: var(--pink); }
    .gc-pn > b { font-family: var(--disp); font-weight: 400; font-size: 32px; line-height: 1; color: var(--gold-hi); min-width: 1.4em; font-variant-numeric: tabular-nums; }
    .gc-segs { display: flex; gap: 5px; }
    .gc-segs i { width: 26px; height: 16px; transform: skewX(-12deg); background: linear-gradient(90deg, #ffc2d6, var(--pink)); border: 1px solid #fff; box-shadow: 0 0 10px rgba(255,159,194,.55); transition: all .3s; }
    .gc-segs i.used { background: #2b0e18; border-color: rgba(255,159,194,.3); box-shadow: none; }
    .gc-basebox { font-size: 12px; color: var(--dim); line-height: 1.5; }
    .gc-basebox b { color: var(--gold-hi); font-size: 14px; font-variant-numeric: tabular-nums; white-space: nowrap; }

    .gc-odds { padding: 8px 12px 10px; background: rgba(0,0,0,.4); border: 1px solid rgba(217,179,90,.3); display: grid; gap: 5px; }
    .gc-odds-h { font-weight: 900; font-size: 13px; color: var(--gold-pale); }
    .gc-odds-h small { font-weight: 400; color: var(--dim); margin-left: 4px; }
    .gc-orow { display: grid; grid-template-columns: 50px 44px minmax(0,1fr); gap: 10px; align-items: center; font-size: 13px; }
    .gc-orow > b { font-family: var(--disp); font-weight: 400; font-size: 20px; color: var(--text); text-align: right; font-variant-numeric: tabular-nums; }
    .gc-orow > span:last-child { font-weight: 700; line-height: 1.35; }
    .gc-orow small { display: inline-block; margin-left: 8px; font-weight: 400; font-size: 11.5px; color: var(--dim); }
    .gc-ceil { margin-top: 2px; padding-top: 6px; border-top: 1px dashed rgba(217,179,90,.35); font-size: 12px; color: var(--dim); }
    .gc-ceil b { color: var(--gold-hi); }
    .gc-rar { display: inline-block; text-align: center; font-family: var(--disp); font-weight: 400; font-size: 17px; letter-spacing: .06em; line-height: 1.4; padding: 0 6px; transform: skewX(-12deg); color: #1d080e; }
    .gc-rar.r-N { background: #f4f1ea; } .gc-rar.r-R { background: #4aa3ff; color: #fff; } .gc-rar.r-SR { background: linear-gradient(90deg, var(--gold-hi), var(--gold)); }
    .gc-rar.r-SSR { background: linear-gradient(90deg, #ff6b8a, #ffb14a, #f5d77a, #8fe3a8, #6cc8ff); }

    .gc-voices { display: flex; flex-direction: column; gap: 10px; min-height: 60px; }
    .gc-empty { padding: 16px; text-align: center; font-size: 13px; color: var(--dim); border: 1px dashed rgba(255,159,194,.4); }
    .gc-voice { display: grid; grid-template-columns: 50px minmax(0,1fr); gap: 3px 12px; align-items: center; }
    .gc-voice > .gc-rar { grid-row: span 2; align-self: center; font-size: 20px; }
    .gc-bub { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 7px 14px; background: #fff; color: #2b0e18; border-radius: 16px; box-shadow: 0 6px 14px rgba(0,0,0,.4); }
    .gc-bub::before { content: ""; position: absolute; left: -10px; top: 50%; width: 10px; height: 10px; margin-top: -8px; border-radius: 50%; background: #fff; }
    .gc-bub::after { content: ""; position: absolute; left: -18px; top: 50%; width: 6px; height: 6px; margin-top: -2px; border-radius: 50%; background: #fff; }
    .gc-bub p { flex: 1 1 10em; margin: 0; font-weight: 800; font-size: 15px; line-height: 1.5; }
    .gc-vcards { display: flex; gap: 4px; }
    .gc-voice.v-R .gc-bub { box-shadow: 0 0 0 3px #4aa3ff, 0 6px 14px rgba(0,0,0,.4); }
    .gc-voice.v-SR .gc-bub { background: #fffbe6; box-shadow: 0 0 0 3px var(--gold-hi), 0 0 20px rgba(245,215,122,.6); }
    .gc-voice.v-SR .gc-bub::before, .gc-voice.v-SR .gc-bub::after { background: #fffbe6; }
    .gc-voice.v-SSR .gc-bub { background: #fffbe6; box-shadow: 0 0 0 3px #fff; animation: mb-gcRainbow 1.6s linear infinite; }
    .gc-voice.v-SSR .gc-bub::before, .gc-voice.v-SSR .gc-bub::after { background: #fffbe6; }
    .gc-meta { font-size: 11.5px; color: var(--dim); }
    .gc-meta em { font-style: normal; font-family: var(--disp); letter-spacing: .1em; font-size: 13px; margin-left: 6px; padding: 0 5px; background: var(--gold-hi); color: #1d080e; }

    .gc-book { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; padding: 6px 12px; font-size: 12px; color: var(--dim); background: linear-gradient(90deg, rgba(255,159,194,.16), rgba(0,0,0,0)); border-left: 3px solid var(--pink); }
    .gc-book-h { font-weight: 900; color: var(--pink); font-size: 13px; }
    .gc-book > b { font-family: var(--disp); font-weight: 400; font-size: 22px; line-height: 1; color: var(--gold-hi); }
    .gc-book-r { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-left: 6px; font-variant-numeric: tabular-nums; }
    .gc-book-r .r-R { color: #7cc0ff; } .gc-book-r .r-SR { color: var(--gold-hi); } .gc-book-r .r-SSR { color: var(--pink); }
    .gc-res-extra { margin-top: 6px; font-size: 12px; color: var(--dim); }

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
      .gc-orow { grid-template-columns: 44px 38px minmax(0,1fr); gap: 8px; font-size: 12px; }
      .gc-orow small { display: block; margin-left: 0; }
      .gc-bub p { font-size: 14px; }
      .gc-acts .btn { min-width: 220px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .gc-ear, .gc-pull, .gc-cap, .gc-cap.wob .gc-in, .gc-burst { animation: none !important; }
    }
  `;
})();
