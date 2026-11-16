// リーディング：押し出すふり（ポルカ・グラーノ・セリナ・ヴェルベット）（2026-11-17・試作 qa/s1furi と docs/design-ref/read-s1-spec.md §6・read-integrate.md §3-3）
// リバーで相手が大きく賭けた時、ミミが自分で押して始める。払うふりでチップを近づけ、相手の反応から本物かはったりかを読む。
//  ポルカ：「あわてたら、はったり。にやけたら、本物——口がすべって、役を言う」
//  ほか3人：「光った場札が、彼女の役。何も光らなければ、はったり」（役の名前は言わない。光るのは相手の役に使う場札）
// 顔は卓の事実から（相手の賭けのつもり intent）。払う／降りるは、そのまま卓のコール／フォールド（卓の AI は触らない）。
// 手の後の答え合わせは verdict。ミミの手が同じ種類の役の時は判子を押さない（verdict を出さない）。
(function () {
  'use strict';
  // ================= 計算（試作 qa/s1furi/engine.js の写し）=================
  const RANKS = '23456789TJQKA';
  const CAT = ['役なし', 'ワンペア', 'ツーペア', 'スリーカード', 'ストレート', 'フラッシュ', 'フルハウス', 'フォーカード', 'ストレートフラッシュ'];
  const SJ = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const P1 = (s) => ({ r: RANKS.indexOf(s[0]) + 2, s: s[1], t: s });
  const PS = (str) => str.trim().split(/\s+/).map(P1);
  function eval5(cs) {
    const rs = cs.map(c => c.r).sort((a, b) => b - a);
    const flush = cs.every(c => c.s === cs[0].s);
    const uniq = [...new Set(rs)];
    let sh = 0;
    if (uniq.length === 5) { if (rs[0] - rs[4] === 4) sh = rs[0]; else if (rs[0] === 14 && rs[1] === 5 && rs[4] === 2) sh = 5; }
    const cnt = {}; rs.forEach(r => cnt[r] = (cnt[r] || 0) + 1);
    const groups = Object.entries(cnt).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    const kick = groups.map(g => g[1]);
    let cat;
    if (sh && flush) cat = 8; else if (groups[0][0] === 4) cat = 7; else if (groups[0][0] === 3 && groups[1][0] === 2) cat = 6;
    else if (flush) cat = 5; else if (sh) cat = 4; else if (groups[0][0] === 3) cat = 3;
    else if (groups[0][0] === 2 && groups[1][0] === 2) cat = 2; else if (groups[0][0] === 2) cat = 1; else cat = 0;
    return { cat, key: [cat, ...(sh ? [sh] : kick)] };
  }
  function cmp(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; }
  function best(cards) {
    let bE = null, bC = null; const n = cards.length;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
      const five = [cards[a], cards[b], cards[c], cards[d], cards[e]]; const ev = eval5(five);
      if (!bE || cmp(ev.key, bE.key) > 0) { bE = ev; bC = five; }
    }
    return { ...bE, five: bC };
  }
  function madeCards(b) {
    if (b.cat === 0) return [];
    if (b.cat === 4 || b.cat === 5 || b.cat === 8) return b.five;
    const cnt = {}; b.five.forEach(c => cnt[c.r] = (cnt[c.r] || 0) + 1);
    return b.five.filter(c => cnt[c.r] >= 2);
  }
  const rk = (c) => ({ T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' }[RANKS[c.r - 2]] || RANKS[c.r - 2]);
  // sc = { board, mimi, polka, bluff(顔の材料。卓の事実＝賭けのつもり) }。顔・口がすべる役・光る場札・正解は全部ここで計算する
  function analyze(sc) {
    const B = PS(sc.board), M = PS(sc.mimi), Q = PS(sc.polka);
    const all = [...B, ...M, ...Q].map(c => c.t), dup = new Set(all).size !== all.length;
    const bm = best([...B, ...M]), bq = best([...B, ...Q]), bb = eval5(B);
    const c = cmp(bm.key, bq.key);
    const bluff = sc.bluff != null ? !!sc.bluff : bq.cat === 0;
    const glintTok = madeCards(bq).filter(x => B.some(y => y.t === x.t)).map(x => x.t);
    const glint = B.map((x, i) => glintTok.includes(x.t) ? i : -1).filter(i => i >= 0);
    const mc = bm.cat, qc = bq.cat;
    const mimiMade = madeCards(bm);
    const mimiName = mc === 1 && mimiMade.length ? rk(mimiMade[0]) + ' のペア' : CAT[mc];
    const polkaName = qc === 1 && madeCards(bq).length ? rk(madeCards(bq)[0]) + ' のペア' : CAT[qc];
    return { B, M, Q, dup, bm, bq, bb, bluff, say: bluff ? null : CAT[qc], ans: c > 0 ? '払う' : '降りる', win: c > 0, tie: c === 0, glint, mc, qc, mimiName, mimiCat: CAT[mc], polkaCat: CAT[qc], polkaName, polkaHigher: qc > mc, sameCat: qc === mc, boardCat: bb.cat };
  }
  const BLUFF_INTENT = new Set(['bluff', 'forced_bluff', 'tutorial_bluff']);
  // T = 卓の table（{ board:[{r,s}x5], her, mine, toCall, pot }）。ctx = { charKey, intent, toCall, pot }。出さない時は null（read-integrate §3-3）
  function plan(T, ctx) {
    ctx = ctx || {};
    const ck = ctx.charKey || 'polka';
    if (!CHARS[ck]) return null;
    if (!T || !T.board || T.board.length !== 5 || !T.her || T.her.length !== 2 || !T.mine || T.mine.length !== 2) return null;
    const intent = ctx.intent;
    const bluff = BLUFF_INTENT.has(intent), real = intent === 'value';
    if (!bluff && !real) return null;
    const S = (c) => RANKS[c.r - 2] + c.s;
    const sc = { board: T.board.map(S).join(' '), mimi: T.mine.map(S).join(' '), polka: T.her.map(S).join(' '), bluff, char: ck };
    const A = analyze(sc);
    if (A.dup) return null;
    if (bluff) {
      if (A.qc !== 0) return null;          // あわてる＝何も無い手（決まりの「はったり」が事実になる時だけ）
      if (!A.win) return null;              // 払えばミミが勝つ手だけ（「あわてたら払う」が成り立つ）
    } else {
      if (A.qc < 1) return null;            // 本物なのに役がペアより下
      if (A.boardCat >= A.qc) return null;  // 場札だけで相手の役ができている
      if (ck !== 'polka' && !A.glint.length) return null;   // 相手の役が手札2枚だけ（光る場札が無い）
    }
    return Object.assign(sc, {
      bet: ctx.toCall != null ? ctx.toCall : (T.toCall || 0), pot: ctx.pot != null ? ctx.pot : (T.pot || 0),
      stamp: !(A.sameCat && !bluff),         // 同じ種類の役どうしは判子を押さない
    });
  }

  // ================= 相手ごとの決まり・絵・台詞（read-integrate §3-3）=================
  const F = (img, size, pos) => ({ img, size, pos });
  const CHARS = {
    polka: {
      name: 'ポルカ', title: 'リーディング：押し出すふり',
      rule: '<u>あわてたら、はったり。</u><br>にやけたら、<em>本物</em>——口がすべって、役を言う',
      look: 'ポルカの顔（あわてる／にやける）と、|口がすべった役。それと、ミミの役。',
      faces: {
        def: F('assets/characters/polka_default.webp', 'auto 1100px', '-173px -59px'),
        real: F('assets/characters/polka_cutin_smug.webp', 'auto 440px', '-279px -13px'),
        bluff: F('assets/characters/polka_cutin_panic.webp', 'auto 440px', '-271px -45px'),
        plead: F('assets/characters/polka_cutin_plead.webp', 'auto 440px', '-201px -30px'),
        busted: F('assets/characters/polka_cutin_busted.webp', 'auto 440px', '-178px -36px'),
        bawl: F('assets/characters/polka_cutin_bawl.webp', 'auto 440px', '-217px -45px'),
        smug: F('assets/characters/polka_cutin_smug.webp', 'auto 440px', '-279px -13px'),
      },
      bet: (b) => ['どーん！ ' + (b || '') + '！', '……（すんっ）'],
      calm: '……（すんっ）', panic: 'えっ、は、払うの……！？|ま、待って待って！', smug: '払って払って♪|だって {F} だもん！', oops: '……あっ',
    },
    grano: {
      name: 'グラーノ', title: 'リーディング：押し出すふり',
      rule: '<em>光った場札が、彼女の役。</em><br>何も光らなければ、<u>はったり</u>',
      look: '相手の顔と、光った場札。|それと、ミミの役。',
      faces: {
        def: F('assets/characters/grano_cutin_smug.webp', 'auto 352px', '-248px 18px'),
        real: F('assets/characters/grano_shop_smile.webp', '300px auto', '22px 0'),
        bluff: F('assets/characters/grano_cutin_busted.webp', 'auto 352px', '-214px 18px'),
        plead: F('assets/characters/grano_cutin_haggle.webp', 'auto 352px', '-198px 18px'),
        busted: F('assets/characters/grano_cutin_panic.webp', 'auto 352px', '-232px 18px'),
        bawl: F('assets/characters/grano_cutin_grovel.webp', 'auto 352px', '-176px 18px'),
        smug: F('assets/characters/grano_cutin_smug.webp', 'auto 352px', '-248px 18px'),
      },
      bet: () => ['さて……この額で、|いかがですかな？', '……（にっこり）'],
      calm: '……（にっこり）', panic: '……お支払いは、|よくお考えなされ', smug: 'おや、お買い上げで？|良い品ですぞ', oops: '',
    },
    selina: {
      name: 'セリナ', title: 'リーディング：押し出すふり',
      rule: '<em>光った場札が、彼女の役。</em><br>何も光らなければ、<u>はったり</u>',
      look: '相手の顔と、光った場札。|それと、ミミの役。',
      faces: {
        def: F('assets/characters/selina_cutin_bitter.webp', 'auto 352px', '-250px 18px'),
        real: F('assets/characters/selina_cutin_bitter.webp', 'auto 352px', '-250px 18px'),
        bluff: F('assets/characters/selina_cutin_smug.webp', 'auto 352px', '-250px 18px'),
        plead: F('assets/characters/selina_cutin_compose.webp', 'auto 352px', '-250px 18px'),
        busted: F('assets/characters/selina_cutin_busted.webp', 'auto 352px', '-250px 18px'),
        bawl: F('assets/characters/selina_cutin_panic.webp', 'auto 352px', '-190px 18px'),
        smug: F('assets/characters/selina_cutin_smug.webp', 'auto 352px', '-250px 18px'),
      },
      bet: () => ['……どうぞ。', '……（しずか）'],
      calm: '……（しずか）', panic: '……本気？', smug: '……どうぞ。払うなら', oops: '',
    },
    velvet: {
      name: 'ヴェルベット', title: 'リーディング：押し出すふり',
      rule: '<em>光った場札が、彼女の役。</em><br>何も光らなければ、<u>はったり</u>',
      look: '光った場札。顔の芝居は、|手がかりにならない。ミミの役。',
      faces: {
        def: F('assets/characters/velvet_cutin_defiant.webp', 'auto 352px', '-190px 18px'),
        real: F('assets/characters/velvet_cutin_panic.webp', 'auto 352px', '-262px 18px'),
        bluff: F('assets/characters/velvet_cutin_smirk_hide.webp', 'auto 352px', '-190px 18px'),
        plead: F('assets/characters/velvet_cutin_defiant.webp', 'auto 352px', '-190px 18px'),
        busted: F('assets/characters/velvet_cutin_busted.webp', 'auto 352px', '-190px 18px'),
        bawl: F('assets/characters/velvet_cutin_bawl.webp', 'auto 352px', '-190px 18px'),
        smug: F('assets/characters/velvet_cutin_smug.webp', 'auto 352px', '-190px 18px'),
      },
      bet: () => ['うふふ……♡', '……（にこにこ）'],
      calm: '……（にこにこ）', panic: 'どうぞ？', smug: 'やだ、払うの？|こわぁい♡', oops: '',
    },
  };
  const FACE_KEYS = ['def', 'real', 'bluff', 'plead', 'busted', 'bawl', 'smug'];
  // 明かし：kind ごとに、相手ごとの台詞。steps = [{ f:顔, t:台詞, ms, fx:[…] }]。{F}＝相手の役、{M}＝ミミの役。「札を開く」のはポルカだけ（ほかは払った時の勝負だけ）
  const OUTS = {
    polka: {
      bPay: [{ f: 'busted', t: 'うぅ〜……|なんにも なかったの〜！', ms: 1700, fx: ['flip', 'shake'] }, { f: 'busted', t: 'なんで 分かったの〜！？', ms: 1800, fx: ['stamp', 'reason'] }],
      bFold: [{ f: 'smug', t: 'ほっ……。|えへへ、助かった〜♪', ms: 1700, fx: ['bounce'] }, { f: 'busted', t: 'じつは、|なんにも なかったの♪', ms: 2000, fx: ['flip', 'stamp', 'reason'] }],
      rFold: [{ f: 'plead', t: 'え〜っ、降りちゃうの〜？|せっかく|{F} だったのに〜！', ms: 2300, fx: ['flip', 'ladder', 'stamp', 'reason'] }],
      rPayLost: [{ f: 'smug', t: 'やった〜！ 払った払った♪', ms: 1500, fx: ['bounce'] }, { f: 'smug', t: 'ほら、{F}！|言ったでしょ〜♪', ms: 2000, fx: ['flip', 'ladder', 'stamp', 'reason'] }],
      rPayWon: [{ f: 'smug', t: 'やった〜！ 払った払った♪|{F}だよ〜！', ms: 1700, fx: ['flip'] }, { f: 'busted', t: 'えっ……{M}！？|うそぉ〜！', ms: 1700, fx: ['ladder', 'mimilit', 'shake'] }, { f: 'bawl', t: 'うわぁ〜ん！', ms: 1500, fx: ['stamp', 'reason'] }],
      rFoldMissed: [{ f: 'plead', t: 'え〜っ、降りちゃうの〜？|{F}だったのに〜', ms: 1800, fx: ['flip'] }, { f: 'busted', t: '……え、ミミちゃん|{M}だったの！？|あぶな〜い！', ms: 2300, fx: ['ladder', 'mimilit', 'stamp', 'reason'] }],
    },
    grano: {
      bPay: [{ f: 'busted', t: 'ぬぬっ……空箱でしたか。|やられましたな', ms: 1800, fx: ['flip', 'shake'] }, { f: 'busted', t: 'お見事ですな', ms: 1500, fx: ['stamp', 'reason'] }],
      bFold: [{ f: 'smug', t: 'ふぅ……|賢明でしたな', ms: 1800, fx: ['bounce', 'stamp', 'reason'] }],
      rFold: [{ f: 'plead', t: '……賢明ですな。|良い品でしたぞ', ms: 2200, fx: ['ladder', 'stamp', 'reason'] }],
      rPayLost: [{ f: 'smug', t: 'まいどあり！|お買い上げ、ですな', ms: 2000, fx: ['flip', 'ladder', 'stamp', 'reason'] }],
      rPayWon: [{ f: 'busted', t: 'なんと……！|そちらが上物でしたか', ms: 1800, fx: ['flip', 'ladder', 'mimilit', 'shake'] }, { f: 'bawl', t: 'ま、負けました……', ms: 1500, fx: ['stamp', 'reason'] }],
      rFoldMissed: [{ f: 'smug', t: '……賢明ですな', ms: 1800, fx: ['ladder', 'mimilit', 'stamp', 'reason'] }],
    },
    selina: {
      bPay: [{ f: 'busted', t: '……やられたわ。', ms: 1800, fx: ['flip', 'shake', 'stamp', 'reason'] }],
      bFold: [{ f: 'smug', t: '……そう。降りるのね。', ms: 1800, fx: ['bounce', 'stamp', 'reason'] }],
      rFold: [{ f: 'plead', t: '……賢明ね。', ms: 1800, fx: ['ladder', 'stamp', 'reason'] }],
      rPayLost: [{ f: 'smug', t: '……お代は、いただくわ。', ms: 2000, fx: ['flip', 'ladder', 'stamp', 'reason'] }],
      rPayWon: [{ f: 'busted', t: '……そちらが上、ね。', ms: 1900, fx: ['flip', 'ladder', 'mimilit', 'shake', 'stamp', 'reason'] }],
      rFoldMissed: [{ f: 'plead', t: '……賢明ね。', ms: 1800, fx: ['ladder', 'mimilit', 'stamp', 'reason'] }],
    },
    velvet: {
      bPay: [{ f: 'busted', t: 'あらぁ……|見抜かれちゃった♡', ms: 1800, fx: ['flip', 'shake', 'stamp', 'reason'] }],
      bFold: [{ f: 'smug', t: 'うふふ、|助かっちゃった♡', ms: 1800, fx: ['bounce', 'stamp', 'reason'] }],
      rFold: [{ f: 'plead', t: 'あら、降りちゃうの？|つまんなぁい♡', ms: 2000, fx: ['ladder', 'stamp', 'reason'] }],
      rPayLost: [{ f: 'smug', t: 'ありがとう♡|いただくわね', ms: 2000, fx: ['flip', 'ladder', 'stamp', 'reason'] }],
      rPayWon: [{ f: 'busted', t: 'うそ……！|あなたの方が上なのね', ms: 1900, fx: ['flip', 'ladder', 'mimilit', 'shake', 'stamp', 'reason'] }],
      rFoldMissed: [{ f: 'plead', t: 'あら……|降りちゃった♡', ms: 1800, fx: ['ladder', 'mimilit', 'stamp', 'reason'] }],
    },
  };
  // 本物か・はったりか・どちらを選んだか → 明かしの形
  function outcomeOf(A, pay) {
    if (A.bluff) return pay ? 'bPay' : 'bFold';
    return A.polkaHigher ? (pay ? 'rPayLost' : 'rFold') : (pay ? 'rPayWon' : 'rFoldMissed');
  }
  function stampsOf(kind, A, ck) {
    const F_ = A.polkaName, M_ = A.mimiName;
    const hold = ck !== 'polka';
    switch (kind) {
      case 'bPay': return { stamp: ['◎ 見やぶった', 'good'], reason: hold ? `何も光らなかったのは、はったり。|${M_}で勝ち` : `あわてたのは、払われたら負けるから。|${M_}で勝ち` };
      case 'bFold': return { stamp: ['✕ だまされた（払えば勝っていた）', 'bad'], reason: hold ? `何も光らなかった。はったり。|払えば、${M_}で勝っていた` : `あわてていた。|払えば、${M_}で勝っていた` };
      case 'rFold': return { stamp: ['◎ かわした', 'good'], reason: hold ? '光った場札は、ミミの役より上の役だった。|降りて正解' : `${F_}は、${A.mimiCat}より上。降りて正解` };
      case 'rPayLost': return { stamp: ['✕ つかまった', 'bad'], reason: hold ? '光った場札は、ミミの役より上の役だった。|払うと負ける' : `${F_}は、${A.mimiCat}より上。|にやけたのは、勝てるから` };
      case 'rPayWon': return { stamp: ['◎ 上をいった', 'good'], reason: hold ? `光った場札が本物でも、ミミの${M_}が上。|本物でも、ミミが上なら払う` : `${F_}より、${A.mimiCat}が上。|本物でも、ミミが上なら払う` };
      default: return { stamp: ['△ もったいない', 'mid'], reason: hold ? `光った場札より、ミミの${M_}が上。|払えば勝っていた` : `${F_}より、${A.mimiCat}が上。払えば勝っていた` };
    }
  }

  // ================= お手本（固定の場面）=================
  const DEMO = { board: 'Ks 9d 6c 4h 2s', mimi: '9s 8s', polka: 'Qh Jh', bluff: true, bet: 600, pot: 600 };
  const DEMO_COACH = (CH, ck) => ({
    l1: CH.name + '、すまし顔でがまんしてる。|払うふりで、チップを近づけてみよう'.replace('すまし顔でがまんしてる', ck === 'polka' ? 'すまし顔でがまんしてる' : '落ち着いた顔でいる'),
    l2: ck === 'polka' ? 'あわてたね。払われたら負ける手——|はったりだよ' : '何も光らないね。光る場札が無いのは、|はったりだよ',
    l3: 'ミミは {P}。はったりになら、|これで勝てる。払おう',
    l4: ck === 'polka' ? 'もし にやけたら、本物。うれしくて、役まで言っちゃうよ。|その時は、ミミの役とくらべてね' : 'もし場札が光ったら、本物。光った札が、|相手の役。その時は、ミミの役とくらべてね',
  });
  const CARD4 = (CH) => [
    ['目的', CH.name + 'の大きな賭けが、はったりか本物かを|見やぶって、払うか降りるかを決める。'],
    ['やり方', 'チップの山を金の線まで近づけて、顔を見る。|それから「払う」か「降りる」。'],
    ['危なさ', '本物に、下の役で払うと負ける。|はったりに降りると、取れたポットを逃す。'],
    ['見る物', CH.look],
  ];
  const LADDER = [[6, 'フルハウス'], [5, 'フラッシュ'], [4, 'ストレート'], [3, 'スリーカード'], [2, 'ツーペア'], [1, 'ペア']];
  const HAND = '<path d="M17 5a4.5 4.5 0 0 1 9 0v21h1.5v-5a4.5 4.5 0 0 1 9 0v5h1v-3.5a4.5 4.5 0 0 1 9 0V38c0 10-6 17-16 17h-4c-8 0-13-5-16-12l-4-9a4.2 4.2 0 0 1 7-4.5l5 6.5z" fill="#fff4d8" stroke="#7a4e0f" stroke-width="2.2" stroke-linejoin="round"/>';
  const SWEAT = '<svg viewBox="0 0 46 54"><path d="M23 3C23 3 6 25 6 35a17 17 0 0 0 34 0C40 25 23 3 23 3z" fill="#9fe3ff" stroke="#1b6fa0" stroke-width="3"/><path d="M14 35a9 9 0 0 0 7 9" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>';
  const NOTE = '<svg viewBox="0 0 46 54"><ellipse cx="14" cy="43" rx="10" ry="7.5" transform="rotate(-20 14 43)" fill="#ffe29a" stroke="#7a4e0f" stroke-width="2.5"/><path d="M22 41V7" stroke="#7a4e0f" stroke-width="6" stroke-linecap="round"/><path d="M22 41V7" stroke="#ffe29a" stroke-width="2.6" stroke-linecap="round"/><path d="M22 7c4 8 16 8 17 22-4-8-10-7-17-12z" fill="#ffe29a" stroke="#7a4e0f" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  // 押し出しの道の寸法（道の中での山の左端）
  const START = 474, GOAL = 10, LANEX = 262, LANEY = 252;
  const stageOf = (p) => p >= .75 ? 2 : p >= .4 ? 1 : 0;
  const pileLeft = (p) => START - p * (START - GOAL);

  // ================= 画面 =================
  function makeScreen(ST, CH, ck, demo) {
    const U = window.RD.util, { el, fm, cardHTML, isRed } = U;
    const br = (t) => String(t).split('|').join('<br>');
    const polka = ck === 'polka';
    const root = el('div', 'sg furi ' + (demo ? 'demo' : 'live') + ' ck-' + ck);
    root.innerHTML = `
  <div class="felt"></div><div class="spot"></div>
  <div class="win">${FACE_KEYS.map(k => `<div class="face f-${k}${k === 'def' ? ' on' : ''}"></div>`).join('')}
   <div class="mk sweat">${SWEAT}</div><div class="mk note">${NOTE}</div></div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="speech"></div>
  <div class="top"><div class="ins"></div><button type="button" class="tbtn">お手本</button></div>
  <div class="hole"></div><div class="bd"></div><div class="mc"></div>
  <div class="slips"><div class="sp polka"></div><div class="sp mimi"></div></div>
  <div class="ladder"></div>
  <div class="rule">${CH.rule}</div>
  <div class="reason"></div>
  <div class="lane"><div class="road"></div><div class="gline"></div><div class="glabel">ここまでが ふり</div>
   <div class="hint"><svg viewBox="0 0 46 56">${HAND}</svg><b>➜</b></div>
   <div class="pile"><div class="chip">${'' }</div></div></div>
  <div class="opts"><button type="button" class="opt" data-a="払う">払う</button><button type="button" class="opt" data-a="降りる">降りる</button><button type="button" class="opt back" data-a="卓">卓にもどって決める</button></div>
  <button type="button" class="go">次へ</button>
  <button type="button" class="askrico">リコに聞く</button>
  <div class="rico"><div class="rimg"></div><div class="rsay"></div></div>
  <button type="button" class="skip">とばす</button>
  <div class="hand"><svg viewBox="0 0 46 56">${HAND}</svg></div>
  <div class="intro"><div class="in"><div class="rd">READING</div><div class="tt">${CH.title}</div><div class="sn"></div></div></div>
  <div class="panel"><div class="ph">この遊びの4つのこと</div><div class="pl"></div><button type="button" class="pgo btnA">はじめる</button></div>`;
    const q = (s) => root.querySelector(s);
    FACE_KEYS.forEach(k => { const f = CH.faces[k], e = q('.f-' + k); e.style.backgroundImage = `url('${f.img}')`; e.style.backgroundSize = f.size; e.style.backgroundPosition = f.pos; });
    q('.rimg').style.backgroundImage = "url('assets/battle/chibi/rico_think.webp')";
    const S = { root, demo, sc: null, q, A: null, pos: 0, stage: 0, near: false, tellDone: false, locked: false, ck, CH };
    const pile = q('.pile'), lane = q('.lane');
    S.face = (n) => { S.curFace = n; FACE_KEYS.forEach(k => q('.f-' + k).classList.toggle('on', k === n)); };
    S.shake = () => { const w = q('.win'); w.classList.remove('shake', 'bounce'); void w.offsetWidth; w.classList.add('shake'); };
    S.bounce = () => { const w = q('.win'); w.classList.remove('shake', 'bounce'); void w.offsetWidth; w.classList.add('bounce'); };
    S.ins = (t, k) => { const i = q('.ins'); i.innerHTML = br(t); i.className = 'ins' + (k ? ' ' + k : ''); };
    S.rib = (h) => { const r = q('.rib'); r.innerHTML = h; r.style.display = h ? '' : 'none'; };
    S.fill = (t) => String(t).replace(/\{F\}/g, (S.A && S.A.polkaName) || '').replace(/\{M\}/g, S.A ? S.A.mimiCat : '').replace(/\{P\}/g, S.A ? S.A.mimiName : '');
    S.say = (t) => { const s = q('.speech'); if (t) { s.innerHTML = br(S.fill(t)); s.classList.add('on'); } else s.classList.remove('on'); };
    S.mark = (k) => { q('.mk.sweat').classList.toggle('on', k === 'sweat'); q('.mk.note').classList.toggle('on', k === 'note'); };
    S.rule = (on) => q('.rule').classList.toggle('on', !!on);
    S.reason = (t) => { const r = q('.reason'); if (t) { r.innerHTML = br(S.fill(t)); r.classList.add('on'); } else r.classList.remove('on'); };
    S.laneOn = (on) => q('.lane').classList.toggle('on', !!on);
    S.opts = (on) => { const o = q('.opts'); o.classList.toggle('on', !!on); if (!on) o.classList.remove('lit'); };
    S.optsEnable = (on) => q('.opts').querySelectorAll('.opt').forEach(b => { b.disabled = !on; b.classList.remove('press'); });
    S.ask = (on) => q('.askrico').classList.toggle('on', !!on);
    S.tbtn = (on) => { q('.tbtn').style.display = on ? '' : 'none'; };
    S.rico = (t, smug) => { const r = q('.rico'); if (t) { q('.rsay').innerHTML = fm(S.fill(t)); q('.rimg').style.backgroundImage = `url('assets/battle/chibi/rico_${smug ? 'smug' : 'think'}.webp')`; r.classList.add('on'); } else r.classList.remove('on'); };
    S.go = (label, on) => { const g = q('.go'); if (label) g.textContent = label; g.classList.toggle('on', !!on); };
    S.intro = (on, sn) => { const i = q('.intro'); if (sn != null) q('.intro .sn').textContent = sn; i.classList.toggle('on', !!on); };
    S.hand = (x, y, on, tap) => { const h = q('.hand'); if (x != null) h.style.left = x + 'px'; if (y != null) h.style.top = y + 'px'; h.classList.toggle('on', !!on); h.classList.toggle('tap', !!tap); };
    S.load = (sc) => {
      S.sc = sc; const A = S.A = analyze(sc);
      const hole = q('.hole'); hole.innerHTML = ''; A.Q.forEach(() => hole.appendChild(el('div', 'cd back')));
      const bd = q('.bd'); bd.innerHTML = ''; S.bcards = A.B.map(c => { const e = el('div', 'cd' + (isRed(c) ? ' r' : ''), cardHTML(c)); bd.appendChild(e); return e; });
      const mc = q('.mc'); mc.innerHTML = ''; mc.classList.remove('lit'); A.M.forEach(c => mc.appendChild(el('div', 'cd' + (isRed(c) ? ' r' : ''), cardHTML(c))));
      const pk = q('.sp.polka'); pk.className = 'sp polka'; pk.textContent = '';
      q('.sp.mimi').className = 'sp mimi'; q('.sp.mimi').textContent = 'ミミ：' + A.mimiName;
      const ld = q('.ladder'); ld.className = 'ladder';
      ld.innerHTML = LADDER.map(([c, n]) => `<div class="lr" data-c="${c}"><i></i><span>${n}</span></div>`).join('');
      q('.pile .chip').textContent = sc.bet ? String(sc.bet) : '';
      q('.opt[data-a="払う"]').textContent = sc.bet ? '払う ' + sc.bet : '払う';
      S.pos = 0; S.stage = 0; S.near = false; S.tellDone = false; S.tellPending = false; S.locked = false; S.onNear = null; S.onTellDone = null; S.onStageLog = null;
      pile.style.transition = 'none'; pile.style.left = START + 'px'; pile.className = 'pile'; lane.className = 'lane';
      S.face('def'); S.say(null); S.mark(null); S.rule(false); S.reason(null); S.laneOn(false); S.opts(false); S.optsEnable(false);
      S.go(null, false); S.rico(null); S.ask(false); S.hand(null, null, false); S.ins('');
    };
    S.setSlip = (txt) => { const pk = q('.sp.polka'); pk.textContent = 'ポルカ：' + txt; pk.classList.add('on', 'pop'); ST.later(() => pk.classList.remove('pop'), 600); };
    S.glint = (on) => S.bcards.forEach((e, i) => e.classList.toggle('glow', !!on && S.A.glint.includes(i)));
    S.ladderOn = (showP, showM) => {
      const A = S.A, ld = q('.ladder');
      ld.querySelectorAll('.lr').forEach(r => {
        const c = +r.dataset.c;
        const lp = c === Math.max(1, A.qc), lm = c === Math.max(1, A.mc);
        const i = r.querySelector('i'); const onP = !!showP && lp && A.qc >= 1, onM = !!showM && lm && A.mc >= 1;
        i.className = onP ? 'on p' : onM ? 'on m' : ''; i.textContent = onP ? (S.ck === 'polka' ? 'ポ' : '相') : onM ? 'ミ' : '';
        r.classList.toggle('hit', !!(showP && showM && c === Math.max(A.qc, A.mc)));
      });
      ld.classList.add('on');
    };
    S.ladderOff = () => q('.ladder').classList.remove('on');
    S.openHole = () => { const hole = q('.hole'); hole.innerHTML = ''; S.A.Q.forEach(c => { const e = el('div', 'cd flipin' + (isRed(c) ? ' r' : ''), cardHTML(c)); hole.appendChild(e); }); };
    // 押し出し：山の位置から顔と印を出す（乱数なし。何度押しても同じ反応）
    S.placePile = (p, ms) => {
      p = Math.max(0, Math.min(1, p));
      pile.style.transition = ms ? `left ${ms}ms ease-in-out` : 'none'; pile.style.left = pileLeft(p) + 'px';
      S.pos = p; const st = stageOf(p);
      if (st !== S.stage) { const prev = S.stage; S.stage = st; S.react(st, prev); }
    };
    S.react = (st, prev) => {
      const A = S.A;
      if (S.onStageLog) S.onStageLog(st, prev);
      if (st === 2) {
        if (A.bluff) {
          S.face('bluff'); S.say(CH.panic); if (polka) S.mark('sweat');
          if (!S.tellDone) { S.near = true; if (polka) S.setSlip('あわてた'); S.tellDone = true; if (S.onNear) S.onNear(); if (S.onTellDone) ST.later(S.onTellDone, 50); }
          else S.near = true;
        } else {
          S.face('real'); S.say(CH.smug); if (polka) S.mark('note');
          if (!S.tellDone && !S.tellPending) {
            S.tellPending = true; S.near = true; if (S.onNear) S.onNear();
            ST.later(() => {
              if (polka) { if (S.stage === 2) S.say(CH.oops); S.setSlip(A.polkaName); }
              S.glint(true); S.tellDone = true; S.tellPending = false;
              if (S.onTellDone) S.onTellDone();
            }, polka ? 650 : 450);
          }
        }
      } else {
        S.face('def'); S.say(CH.calm);
        S.mark(polka && st === 1 ? (A.bluff ? 'sweat' : 'note') : null);
      }
    };
    S.tap = () => { const st = S.stage; S.placePile(st === 0 ? .55 : st === 1 ? 1 : 0, 380); };
    let drag = null;
    pile.addEventListener('pointerdown', (e) => {
      if (S.locked || !lane.classList.contains('on')) return;
      e.preventDefault(); try { pile.setPointerCapture(e.pointerId); } catch (e2) {}
      const r = ST.board.getBoundingClientRect(), sc = ST.scale() || 1; const bx = (e.clientX - r.left) / sc;
      drag = { id: e.pointerId, x0: e.clientX, off: bx - LANEX - pileLeft(S.pos), moved: false };
      pile.classList.add('drag'); lane.classList.remove('hinting');
      if (S.onTouch) S.onTouch();
    });
    pile.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (Math.abs(e.clientX - drag.x0) > 6) drag.moved = true;
      if (!drag.moved) return;
      const r = ST.board.getBoundingClientRect(), sc = ST.scale() || 1; const bx = (e.clientX - r.left) / sc;
      const left = Math.max(GOAL, Math.min(START, bx - LANEX - drag.off));
      S.placePile((START - left) / (START - GOAL), 0);
    });
    const up = (e) => { if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; pile.classList.remove('drag'); if (!d.moved) S.tap(); };
    pile.addEventListener('pointerup', up); pile.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) { drag = null; pile.classList.remove('drag'); } });
    S.pileOut = (pay) => { pile.style.transition = 'left .5s ease-in,opacity .5s'; pile.style.left = pay ? (GOAL - 30) + 'px' : (START + 40) + 'px'; pile.classList.add('gone'); };
    return S;
  }

  // 明かし（選んだ事と起きた事に台詞を必ず合わせる）。pay＝払う。実際に札が開くかは相手ごと
  async function reveal(ST, run, S, pay, o) {
    o = o || {};
    const A = S.A, ck = S.ck, kind = outcomeOf(A, pay), O = stampsOf(kind, A, ck);
    const steps = OUTS[ck][kind];
    S.say(null); S.mark(null); S.rule(false); S.optsEnable(false); S.opts(false); S.laneOn(false); S.rico(null); S.ask(false); S.locked = true;
    if (!o.noPile) { S.pileOut(pay); await ST.wait(run, 550); }
    S.ins('');
    for (const st of steps) {
      S.face(st.f); S.say(st.t);
      if (st.fx.includes('flip') && (ck === 'polka' || pay)) S.openHole();
      if (st.fx.includes('shake')) S.shake();
      if (st.fx.includes('bounce')) S.bounce();
      if (st.fx.includes('ladder') || (st.fx.includes('flip') && !A.bluff && (ck === 'polka' || pay))) { if (ck === 'polka' || pay) S.ladderOn(true, true); }
      if (st.fx.includes('mimilit')) { S.q('.mc').classList.add('lit'); S.q('.sp.mimi').classList.add('lit'); }
      if (st.fx.includes('stamp')) S.ins(O.stamp[0], O.stamp[1]);
      if (st.fx.includes('reason')) S.reason(O.reason);
      await ST.wait(run, st.ms);
    }
    S.ins(O.stamp[0], O.stamp[1]); S.reason(O.reason);
    return { kind, stamp: O.stamp, reason: O.reason };
  }

  // ================= お手本 =================
  async function runDemo(ST, CH, ck, replay) {
    const U = window.RD.util, { fm } = U;
    if (runDemo.on) return;
    runDemo.on = true;
    const run = ST.newRun(); run.noPause = true;
    const D = makeScreen(ST, CH, ck, true); ST.board.appendChild(D.root);
    D.root.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; run.kick(); });
    D.q('.skip').addEventListener('click', () => { run.kill(); });
    const sc = Object.assign({}, DEMO, { char: ck });
    D.load(sc); D.rib('<b>お手本</b>'); D.q('.rib').classList.add('demo'); D.tbtn(false);
    const C = DEMO_COACH(CH, ck);
    const pileX = (p) => LANEX + pileLeft(p) + 14;
    try {
      D.intro(true, 'お手本'); await ST.wait(run, 1000); D.intro(false); await ST.wait(run, 250);
      D.ins(CH.name + 'が大きく賭けた。|' + (ck === 'polka' ? 'すまし顔で、がまんしている' : '落ち着いた顔をしている'));
      const bl = CH.bet(sc.bet); D.say(bl[0]); D.shake(); await ST.wait(run, 1000); D.say(bl[1]); await ST.wait(run, 1000);
      D.laneOn(true); D.q('.lane').classList.add('glowline'); D.rule(true);
      D.rico(C.l1); await ST.wait(run, 4000);
      D.rico(null); D.q('.lane').classList.remove('glowline'); await ST.wait(run, 200);
      D.ins('チップを近づけて、顔を見る');
      D.hand(pileX(0), LANEY + 14, true); await ST.wait(run, 500);
      D.hand(pileX(.55), null, true); D.placePile(.55, 800); await ST.wait(run, 1100);
      D.hand(pileX(1), null, true); D.placePile(1, 700); await ST.wait(run, 1700);
      D.q('.sp.polka').classList.add('lit'); D.q('.rule').classList.add('lit');
      D.rico(C.l2, true); await ST.wait(run, 4000);
      D.rico(null); D.q('.sp.polka').classList.remove('lit'); D.q('.rule').classList.remove('lit');
      D.hand(pileX(0), null, true); D.placePile(0, 900); await ST.wait(run, 1500); D.hand(null, null, false);
      D.q('.sp.mimi').classList.add('lit'); D.q('.mc').classList.add('lit');
      D.rico(C.l3, true); await ST.wait(run, 4000);
      D.rico(null); D.q('.sp.mimi').classList.remove('lit'); D.q('.mc').classList.remove('lit');
      D.ins('払う？ 降りる？'); D.opts(true); D.optsEnable(true); await ST.wait(run, 500);
      D.hand(380, 326, true); await ST.wait(run, 900);
      D.hand(null, null, true, true); D.q('.opt[data-a="払う"]').classList.add('press'); await ST.wait(run, 400); D.hand(null, null, false);
      await reveal(ST, run, D, true, { noPile: false });
      D.rico(C.l4, true); await ST.wait(run, 4500);
    } catch (e) { if (!e || e.message !== 'cancel') { runDemo.on = false; D.root.remove(); throw e; } }
    if (!ST.dead) await ruleCard(ST, D, CH, replay);
    D.root.remove();
    runDemo.on = false;
  }
  // 4点の札（お手本の最後・相手ごとの初回）
  async function ruleCard(ST, D, CH, replay) {
    const { fm } = window.RD.util;
    D.q('.skip').classList.add('off'); D.rico(null); D.say(null);
    D.q('.pl').innerHTML = CARD4(CH).map(([a, b]) => `<div class="pi"><i>${a}</i><span>${fm(b)}</span></div>`).join('');
    D.q('.pgo').textContent = replay ? 'もどる' : 'はじめる';
    D.q('.panel').classList.add('on');
    await new Promise(res => D.q('.pgo').addEventListener('click', res, { once: true }));
  }

  // ================= 卓から =================
  function mount(ST, opts, fin) {
    const save = opts.save, ck = opts.charKey || 'polka', CH = CHARS[ck];
    const sc = CH && plan(opts.table, Object.assign({}, opts.ctx || {}, { charKey: ck }));
    if (!sc) return fin({});
    Object.values(CH.faces).forEach(f => { const im = new Image(); im.src = f.img; });
    const cnt0 = (save && save.rdCount && save.rdCount.furi) || 0;
    window.RD.saveSet(save, 'rdCount', 'furi', cnt0 + 1, opts.saveProgress);
    const S = makeScreen(ST, CH, ck, false);
    ST.board.appendChild(S.root);
    const run = ST.newRun();
    S.root.addEventListener('pointerdown', (e) => { if (e.target.closest('button,.pile')) return; if (S.phase === 'bet') { run.ff = true; run.kick(); } });
    let demoOn = false;
    S.q('.tbtn').addEventListener('click', () => {
      if (demoOn || ST.pauseP) return; demoOn = true; ST.pause();
      runDemo(ST, CH, ck, true).then(() => { demoOn = false; ST.unpause(); });
    });
    const go = async () => {
      S.load(sc); S.tbtn(false);
      if (!window.RD.saveGet(save, 'rdDemo', 'furi')) {
        await runDemo(ST, CH, ck, false);
        if (ST.dead) return;
        window.RD.saveSet(save, 'rdDemo', 'furi', true, opts.saveProgress);
        window.RD.saveSet(save, 'rdRule', 'furi:' + ck, true, opts.saveProgress);
      } else if (!window.RD.saveGet(save, 'rdRule', 'furi:' + ck)) {
        // この相手の初回：決まりの1枚（4点の札）
        const D = makeScreen(ST, CH, ck, true); ST.board.appendChild(D.root); D.load(sc);
        await ruleCard(ST, D, CH, false); D.root.remove();
        if (ST.dead) return;
        window.RD.saveSet(save, 'rdRule', 'furi:' + ck, true, opts.saveProgress);
      }
      S.phase = 'intro';
      S.intro(true, ''); await ST.wait(run, 1000); S.intro(false); await ST.wait(run, 300);
      S.tbtn(true);
      S.phase = 'bet';
      const A = S.A;
      S.ins(CH.name + 'が大きく賭けた。|' + (ck === 'polka' ? 'すまし顔で、がまんしている' : '落ち着いた顔をしている'));
      const bl = CH.bet(sc.bet); S.say(bl[0]); S.shake(); await ST.wait(run, 1000); S.say(bl[1]);
      run.ff = false; await ST.wait(run, 900);
      S.phase = 'push';
      S.ins('チップを近づけて、顔を見る'); S.laneOn(true); S.rule(true);
      if (!save || !save.rdFuriHinted) S.q('.lane').classList.add('hinting');
      S.q('.lane').classList.add('glowline');
      S.onTouch = () => { S.q('.lane').classList.remove('hinting'); if (save) { save.rdFuriHinted = true; } };
      S.onNear = () => { S.q('.lane').classList.remove('glowline'); };
      await new Promise(res => { S.onTellDone = res; });
      S.q('.lane').classList.remove('hinting', 'glowline');
      const coachOn = cnt0 < 2;   // 手引きの段：最初の2回だけ「リコに聞く」
      if (coachOn) { S.ladderOn(ck === 'polka', true); S.ask(true); }   // 役のはしご：ポルカは口がすべった役が印になる。ほかの3人は役の名前を言わないので、ミミの印だけ
      S.ins('払う？ 降りる？'); S.opts(true); S.optsEnable(false); S.q('.opts').classList.add('lit');
      const coach = ck === 'polka'
        ? (A.bluff ? 'あわてた。はったりだよ。|ミミは {P}。払って勝てる？' : 'にやけた。本物だよ。{F}って言っちゃったね。|ミミは {M}。はしごで、どっちが上？')
        : (A.bluff ? '何も光らなかった。はったりだよ。|ミミは {P}。払って勝てる？' : '光った場札が、彼女の役だよ。|ミミは {M}。はしごで、どっちが上？');
      S.q('.askrico').onclick = () => { S.rico(coach, true); S.ask(false); };
      S.q('.rico').onclick = () => { S.rico(null); S.ask(coachOn); };
      await ST.wait(run, 400); S.optsEnable(true);
      S.phase = 'pick';
      const pick = await new Promise(res => { S.q('.opts').onclick = (e) => { const b = e.target.closest('.opt'); if (!b || b.disabled) return; S.optsEnable(false); b.classList.add('press'); res(b.dataset.a); }; });
      S.q('.opts').onclick = null; S.locked = true; S.rico(null); S.ask(false); S.tbtn(false);
      // 決めた後は、そのまま卓へ。答え合わせは手の後
      S.phase = 'done';
      const act = pick === '払う' ? 'pay' : pick === '降りる' ? 'fold' : null;
      S.opts(false); S.laneOn(false);
      if (act) { S.pileOut(act === 'pay'); S.face(act === 'pay' ? 'def' : 'def'); S.say(null); S.ins(act === 'pay' ? 'そのまま、払う' : 'そのまま、降りる'); await ST.wait(run, 700); }
      const pending = sc.stamp ? { game: 'furi', title: CH.title, charKey: ck, pick: act, ans: A.ans, scene: sc } : null;
      fin({ correct: false, act, back: !act, pending, tell: { bluff: A.bluff, say: A.say, glint: A.glint.length } });
    };
    go();
  }

  function verdict(ST, opts, fin) {
    const p = opts.pending, sc = p.scene, ck = p.charKey || 'polka', CH = CHARS[ck];
    Object.values(CH.faces).forEach(f => { const im = new Image(); im.src = f.img; });
    const S = makeScreen(ST, CH, ck, false);
    ST.board.appendChild(S.root);
    const run = ST.newRun();
    S.load(sc); S.tbtn(false);
    S.q('.mc').classList.remove('lit');
    if (S.A.bluff === false && (S.A.glint || []).length && ck !== 'polka') S.glint(true);
    const resTxt = String(opts.result || '').replace(/（.*）/, '');
    S.rib(resTxt ? '<b>' + resTxt + '</b>' : '');
    // 実際に何を選んだか：卓で決めた時は、手の結果から（ミミが降りた＝降りる）
    let pick = p.pick;
    if (!pick) { const h = opts.hand || {}; pick = (h.winner === 'opponent' && h.reason === 'fold') ? 'fold' : 'pay'; }
    const pay = pick === 'pay';
    const go = async () => {
      S.ins('答え合わせ：' + (pay ? '払った' : '降りた')); await ST.wait(run, 700);
      const r = await reveal(ST, run, S, pay, { noPile: true });
      S.go('次へ', true);
      await new Promise(res => { S.q('.go').onclick = res; });
      fin({ correct: (pay ? '払う' : '降りる') === S.A.ans });
    };
    go();
  }

  window.RD.reg('furi', { id: 'furi', title: 'リーディング：押し出すふり', plan, mount, verdict, CHARS });
  window.RD.furiEngine = { analyze, plan, best, eval5, cmp, madeCards, CAT };
})();
