// リーディング：目利き（2026-11-17・試作 qa/mekiki と docs/design-ref/read-simple-fable.md §4-B・§5-3・§5-6 を本編へ）
// 場札が1枚ずつめくれ、相手は「自分の役ができた札」だけルーペでのぞく。印を見て、相手の手を3つの見立てから当てる。
// 当たり：相手の手札2枚が、この手の間、卓で表になる。外れ：損なし。答え合わせは手の後。
// 印の計算は engine（このファイルの上半分）。固定の場面の代わりに、卓の本当の札から plan() で scene を作る。お手本だけ固定の場面。
(function () {
  'use strict';
  // ================= 計算（印・役の名前・見立て）=================
  const RANKS = '23456789TJQKA', SUITS = 'shdc';
  const SJ = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const rn = (ch) => (ch === 'T' ? '10' : ch);
  const P = (s) => ({ r: RANKS.indexOf(s[0]), s: s[1], t: s });
  const DECK = []; for (const r of RANKS) for (const s of SUITS) DECK.push(P(r + s));
  function evalCat(cards) {
    const cnt = {}, su = {};
    for (const c of cards) { cnt[c.r] = (cnt[c.r] || 0) + 1; (su[c.s] = su[c.s] || []).push(c.r); }
    const by = (n) => Object.keys(cnt).filter(r => cnt[r] === n).map(Number).sort((a, b) => b - a);
    const st = (rs) => { const u = [...new Set(rs)]; if (u.includes(12)) u.push(-1); u.sort((a, b) => b - a); for (let i = 0; i + 4 < u.length; i++) { let ok = true; for (let k = 1; k < 5; k++) if (!u.includes(u[i] - k)) { ok = false; break; } if (ok) return u[i]; } return -2; };
    let fl = null; for (const s in su) if (su[s].length >= 5) fl = s;
    if (fl && st(su[fl]) > -2) return { cat: 8, key: 'sf' };
    const q = by(4), t = by(3), p = by(2);
    if (q.length) return { cat: 7, key: 'quads' + RANKS[q[0]] };
    if (t.length && (p.length || t.length > 1)) return { cat: 6, key: 'fh' };
    if (fl) return { cat: 5, key: 'flush' + fl };
    if (st(cards.map(c => c.r)) > -2) return { cat: 4, key: 'straight', top: st(cards.map(c => c.r)) };
    if (t.length) return { cat: 3, key: 'trips' + RANKS[t[0]] };
    if (p.length >= 2) return { cat: 2, key: 'two' + RANKS[p[0]] + RANKS[p[1]] };
    if (p.length) return { cat: 1, key: 'pair' + RANKS[p[0]] };
    return { cat: 0, key: 'none' };
  }
  // 印：役の名前が前より上がり、しかも場札だけの役より上になった場札（§5-3）
  function pins(hole, board) {
    let prev = evalCat(hole).cat; const out = [];
    for (let k = 1; k <= board.length; k++) {
      const b = board.slice(0, k), h = evalCat(hole.concat(b)).cat, bo = evalCat(b).cat;
      if (h > prev && h > bo) out.push(k - 1);
      prev = Math.max(prev, h);
    }
    return { pins: out, fin: evalCat(hole.concat(board)), pocket: hole[0].r === hole[1].r };
  }
  function finKey(hole, board) { const p = pins(hole, board); return p.pocket && p.fin.cat <= 1 ? 'pocket' : p.fin.key; }
  // 役を作っている札（光らせる札）。cards は {r,s,id} の並び。id の集合を返す
  function made(cards) {
    const fin = evalCat(cards), out = new Set(), byR = {};
    cards.forEach(c => (byR[c.r] = byR[c.r] || []).push(c));
    const ranksWith = (n) => Object.keys(byR).filter(r => byR[r].length >= n).map(Number).sort((a, b) => b - a);
    if (fin.cat === 1) ranksWith(2).slice(0, 1).forEach(r => byR[r].forEach(c => out.add(c.id)));
    else if (fin.cat === 2) ranksWith(2).slice(0, 2).forEach(r => byR[r].forEach(c => out.add(c.id)));
    else if (fin.cat === 3) ranksWith(3).slice(0, 1).forEach(r => byR[r].forEach(c => out.add(c.id)));
    else if (fin.cat === 7) ranksWith(4).slice(0, 1).forEach(r => byR[r].forEach(c => out.add(c.id)));
    else if (fin.cat === 6) { ranksWith(3).slice(0, 1).forEach(r => byR[r].forEach(c => out.add(c.id))); const t = ranksWith(3)[0]; ranksWith(2).filter(r => r !== t).slice(0, 1).forEach(r => byR[r].forEach(c => out.add(c.id))); }
    else if (fin.cat === 5 || fin.cat === 8) { const su = fin.key.slice(5); const f = cards.filter(c => c.s === su); if (su) f.sort((a, b) => b.r - a.r).slice(0, 5).forEach(c => out.add(c.id)); else cards.forEach(c => out.add(c.id)); }
    else if (fin.cat === 4) { let r = fin.top; while (byR[r < 0 ? 12 : r]) { out.add(byR[r < 0 ? 12 : r][0].id); r--; if (r < -1) break; } }
    return out;
  }
  const labelOf = (key) => {
    if (key === 'none') return '役なし';
    if (key === 'straight') return 'ストレート';
    if (key === 'fh') return 'フルハウス';
    if (key === 'sf') return 'ストレートフラッシュ';
    if (key.startsWith('pair')) return rn(key[4]) + ' のペア';
    if (key.startsWith('trips')) return rn(key[5]) + ' のスリーカード';
    if (key.startsWith('quads')) return rn(key[5]) + ' のフォーカード';
    if (key.startsWith('two')) return rn(key[3]) + ' と ' + rn(key[4]) + ' のツーペア';
    if (key.startsWith('flush')) return SJ[key[5]] + 'のフラッシュ';
    return key;
  };
  const famOf = (key) => key.replace(/[0-9TJQKA].*$|[shdc]$/, '');   // pair / two / trips / quads / flush / none / straight / fh / sf
  // 見立ての理由（印か場札と食い違う所を1行ずつ）。'|' は折り目の印。VERB＝相手ごとの言い方（1行は全角7字まで）
  const VERB = {
    grano: {
      yes: (r) => r + ' で|のぞいた', no: (r) => r + ' で|のぞいていない', also: (r) => r + ' でも|のぞいた', none: '1回も|のぞかなかった', noneWrong: '1回も|のぞいていない',
      two2: '2回のぞいた|ペアが2つ', two1: 'のぞいた札で|ペアが2つ', flushYes: (s) => s + 'の札で|のぞいた', flushNo: (s) => s + 'の札で|のぞいていない', straightYes: '並びの札で|のぞいた', other: 'のぞいた札で|役ができた',
    },
    selina: {
      yes: (r) => r + ' で|めがねを直した', no: (r) => r + ' で|直していない', also: (r) => r + ' で|直した', none: '1回も|直していない', noneWrong: '1回も|直していない',
      two2: '最後の札で|ペアが2つ', two1: '最後の札で|ペアが2つ', flushYes: (s) => '最後の' + s + 'で|直した', flushNo: (s) => s + 'の札で|直していない', straightYes: '最後の並びで|直した', other: '最後の札で|役ができた',
    },
    velvet: {
      yes: (r) => r + ' で|♡が出た', no: (r) => r + ' で|♡は出ていない', also: (r) => r + ' でも|♡が出た', none: '小さな♡は|1つも無い', noneWrong: '小さな♡は|1つも無い',
      two2: '♡が2回出て|ペアが2つ', two1: '♡の札で|ペアが2つ', flushYes: (s) => s + 'の札で|♡が出た', flushNo: (s) => s + 'の札で|♡は出ていない', straightYes: '並びの札で|♡が出た', other: '♡の札で|役ができた',
      decoy: (r) => r + ' の札の|♡は演技',
    },
  };
  function whyFor(key, isTruth, X) {
    const { board, pinIdx } = X, V = VERB[X.ck] || VERB.grano;
    const pinR = pinIdx.map(i => RANKS[board[i].r]), pinS = pinIdx.map(i => board[i].s);
    if (X.decoy && X.decoy === key && V.decoy) return V.decoy(rn(RANKS[board[X.fake].r]));
    if (isTruth) {
      if (key === 'none') return V.none;
      if (key.startsWith('pair') || key.startsWith('trips') || key.startsWith('quads')) return V.yes(rn(key[key.startsWith('pair') ? 4 : 5]));
      if (key.startsWith('two')) return pinIdx.length >= 2 ? V.two2 : V.two1;
      if (key.startsWith('flush')) return V.flushYes(SJ[key[5]]);
      if (key === 'straight') return V.straightYes;
      return V.other;
    }
    if (key === 'none') return pinR.length ? V.yes(rn(pinR[0])) : V.noneWrong;
    const rankKey = (key.startsWith('pair') ? [key[4]] : key.startsWith('trips') || key.startsWith('quads') ? [key[5]] : key.startsWith('two') ? [key[3], key[4]] : null);
    if (rankKey) {
      const miss = rankKey.find(r => !pinR.includes(r));
      if (miss) return V.no(rn(miss));
      const extra = pinR.find(r => !rankKey.includes(r));
      if (extra) return V.also(rn(extra));
      return '印の付き方が|合わない';
    }
    if (key.startsWith('flush')) {
      const s = key[5], n = board.filter(c => c.s === s).length;
      if (n < 3) return SJ[s] + 'は場に|' + n + '枚だけ';
      if (!pinS.includes(s)) return V.flushNo(SJ[s]);
      return '印の付き方が|合わない';
    }
    if (key === 'straight') {
      const rs = [...new Set(board.map(c => c.r))]; let best = 0;
      for (let lo = -1; lo <= 8; lo++) { let n = 0; for (let k = 0; k < 5; k++) { const v = lo + k; if (rs.includes(v < 0 ? 12 : v)) n++; } best = Math.max(best, n); }
      return best < 3 ? '並ぶ数字が|足りない' : '印の付き方が|合わない';
    }
    return '印の付き方が|合わない';
  }
  const coachFor = (board, pinIdx, ck) => {
    const rs = pinIdx.map(i => rn(RANKS[board[i].r]));
    if (ck === 'selina') return rs.length ? 'めがねを直したのは ' + rs[0] + ' の時だけ。|その札で、役が上がったんだね' : '1回もめがねを直さなかったね。|役が上がった札は、無かったってこと';
    if (ck === 'velvet') return rs.length ? '小さな♡が出たのは ' + rs.join(' と ') + '。|大きな♡は演技だから、数えないよ' : '小さな♡は1つも出なかったね。|大きな♡は演技。役は、無かったってこと';
    if (!pinIdx.length) return '1回ものぞかなかったね。|役ができた札は、無かったってこと';
    if (rs.length === 1) return 'のぞいたのは ' + rs[0] + ' だけ。|' + rs[0] + ' で役ができたんだね';
    return 'のぞいたのは ' + rs.join(' と ') + '。|' + rs.length + '回、役ができたんだね';
  };

  // ================= 相手ごとの決まり・絵 =================
  // 1人に1つ（read-integrate §3-1）。グラーノ：役ができた札を、ルーペでのぞく／セリナ：めがねを直すのは、最後に役が上がった1回だけ／
  // ヴェルベット：本物の印は小さく、1つだけ大げさな演技の印（身を乗り出す）を役の上がらない札に付ける。「大げさな方は、演技」
  const FC = (img, size, pos) => ({ img, size, pos });
  const CHARS = {
    grano: {
      name: 'グラーノ', title: 'リーディング：目利き', mark: 'ルーペ', icon: 'rdloupe',
      ruleHtml: 'ルーペの印＝<em>役ができた札</em>',
      look: 'ルーペの印（＝役ができた札）と、|場札のマークと数字。|印が無いのも手がかり。',
      faces: {
        calm: FC('assets/characters/grano_cutin_smug.webp', 'auto 352px', '-248px 18px'),
        peek: FC('assets/characters/grano_cutin_busted.webp', 'auto 352px', '-214px 18px'),
        hit: FC('assets/characters/grano_cutin_haggle.webp', 'auto 352px', '-198px 18px'),
        miss: FC('assets/characters/grano_shop_smile.webp', '300px auto', '22px 0'),
      },
      peekLine: ['ほう……！', 'ほほう……！'], noPin: '……さて、どうですかな',
      hit: 'な、なぜそれを……！|お見通しですな', hitNone: '……空箱とは、お恥ずかしい。|お見通しですな', miss: 'はっはっは。|目利きは、まだまだですな',
      coach: { l1: '今、A をルーペでのぞいたね。|グラーノは、自分の役ができた札だけ、ついのぞいちゃうの', l2: 'あとの4枚は知らん顔。|役ができたのは、A の時だけ' },
    },
    selina: {
      name: 'セリナ', title: 'リーディング：目利き', mark: 'めがね', icon: 'rdglasses',
      ruleHtml: 'めがねの印＝<em>最後に役が上がった札</em>',
      look: 'めがねの印（＝最後に役が上がった札）と、|場札のマークと数字。|印は1回だけ。無いのも手がかり。',
      faces: {
        calm: FC('assets/characters/selina_cutin_bitter.webp', 'auto 352px', '-250px 18px'),
        peek: FC('assets/characters/selina_cutin_compose.webp', 'auto 352px', '-250px 18px'),
        hit: FC('assets/characters/selina_cutin_busted.webp', 'auto 352px', '-250px 18px'),
        miss: FC('assets/characters/selina_cutin_smug.webp', 'auto 352px', '-250px 18px'),
      },
      peekLine: ['……ふぅ。'], noPin: '……さあ、どうかしら',
      hit: '……っ。|見抜かれたわね', hitNone: '……手ぶら、とはね。|見抜かれたわね', miss: '……まだ、|甘いわね',
      coach: { l1: '今、A でめがねを直したね。|セリナは、役が上がった最後の1回だけ、めがねを直すの', l2: 'あとの4枚は知らん顔。|役が上がったのは、A の時だけ' },
    },
    velvet: {
      name: 'ヴェルベット', title: 'リーディング：目利き', mark: 'ハート', icon: 'rdheart',
      ruleHtml: '小さな♡＝<em>役ができた札</em>　大きな♡は演技',
      look: '小さな♡の印（＝役ができた札）と、|場札。大きな♡は演技だから、数えない。',
      faces: {
        calm: FC('assets/characters/velvet_cutin_defiant.webp', 'auto 352px', '-190px 18px'),
        peek: FC('assets/characters/velvet_cutin_defiant.webp', 'auto 352px', '-190px 18px'),
        fake: FC('assets/characters/velvet_cutin_smug.webp', 'auto 352px', '-190px 18px'),
        hit: FC('assets/characters/velvet_cutin_busted.webp', 'auto 352px', '-190px 18px'),
        miss: FC('assets/characters/velvet_cutin_smirk_hide.webp', 'auto 352px', '-190px 18px'),
      },
      subtle: true, peekLine: [''], fakeLine: 'まあ♡|すごいわぁ♡', noPin: 'うふふ、どうかしら♡',
      hit: 'あらぁ……|見抜かれちゃった♡', hitNone: 'あらぁ、空っぽ……|見抜かれちゃった♡', miss: 'うふふ♡|まだまだね',
      coach: { l1: '今、A で小さな♡が出たね。|ヴェルベットは、役ができた札で、つい小さく♡が出ちゃうの', l2: '大きな♡は演技だから、数えないよ。|役ができたのは、A の時だけ', l2d: '' },
    },
  };

  // ================= plan：卓の本当の札から scene を作る =================
  // T = { board:[{r,s}x5], her:[{r,s}x2], ... }（r は 2〜14、s は s/h/d/c）。作れなければ null
  // 出さない：手の中のペア／場札だけの役が相手の役以上／見立ての外れ2つが作れない（§3-1）
  // 相手ごとに「見える印」が違う：グラーノ＝役ができた全部の札／セリナ＝最後に役が上がった1枚だけ／ヴェルベット＝グラーノと同じ小さな印＋大げさな演技の印（役の上がらない札に1つ）
  function plan(T, ctx) {
    ctx = ctx || {};
    const rng = ctx.rng || Math.random;
    const ck = ctx.charKey || 'grano';
    if (!CHARS[ck]) return null;
    if (!T || !T.board || T.board.length !== 5 || !T.her || T.her.length !== 2) return null;
    const mk = (c, id) => Object.assign(P(RANKS[c.r - 2] + c.s), { id });
    const board = T.board.map((c, i) => mk(c, 'b' + i)), hole = T.her.map((c, i) => mk(c, 'h' + i));
    if (hole[0].r === hole[1].r) return null;
    const tr = pins(hole, board);
    const bo = evalCat(board).cat, fin = tr.fin.cat;
    if (!(fin > bo || (fin === 0 && bo === 0))) return null;
    const truth = finKey(hole, board);
    if (truth === 'pocket') return null;
    const obsOf = (ps) => (ck === 'selina' ? (ps.length ? String(ps[ps.length - 1]) : '') : ps.join(','));
    const obsPins = ck === 'selina' ? tr.pins.slice(-1) : tr.pins.slice();
    const pat = obsOf(tr.pins);
    // 同じ印になる手を、場札を除いた全部の2枚組で数える（見立ての外れが「印か場札と必ず食い違う」ことの検算）
    const rest = DECK.filter(c => !board.some(b => b.t === c.t));
    const tally = {}, list = [];
    for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
      const h = [rest[i], rest[j]], p = pins(h, board);
      const k = p.pocket && p.fin.cat <= 1 ? 'pocket' : p.fin.key;
      if (ck === 'velvet') list.push({ ps: p.pins.join(','), k });
      if (obsOf(p.pins) !== pat) continue;
      tally[k] = (tally[k] || 0) + 1;
    }
    if (!(tally[truth] > 0)) return null;
    // 候補：役なし・場札の各数字のペア・各マークのフラッシュ・ストレート・上2つの数字のツーペア
    const cand = ['none', 'straight'];
    const rks = [...new Set(board.map(c => RANKS[c.r]))].sort((a, b) => RANKS.indexOf(b) - RANKS.indexOf(a));
    rks.forEach(r => cand.push('pair' + r));
    SUITS.split('').forEach(s => cand.push('flush' + s));
    if (rks.length >= 2) cand.push('two' + rks[0] + rks[1]);
    // ヴェルベットは演技の印に合う見立てを置くため、候補を広げる（場札の数字の全部のツーペア・スリーカード）
    if (ck === 'velvet') { for (let i = 0; i < rks.length; i++) { for (let j = i + 1; j < rks.length; j++) { const k2 = 'two' + rks[i] + rks[j]; if (!cand.includes(k2)) cand.push(k2); } cand.push('trips' + rks[i]); } }
    const ok = cand.filter(k => k !== truth && !tally[k]);
    for (let i = ok.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ok[i], ok[j]] = [ok[j], ok[i]]; }
    if (ok.length < 2) return null;
    // ヴェルベット：演技の印を、役の上がらない札に1つ。見立ての外れの1つは、その演技の印に合う手にする（演技を信じると外れる）
    let fake = null, decoy = null;
    if (ck === 'velvet') {
      const nonPin = [0, 1, 2, 3, 4].filter(i => !tr.pins.includes(i));
      for (let i = nonPin.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [nonPin[i], nonPin[j]] = [nonPin[j], nonPin[i]]; }
      for (const f of nonPin) {
        const want = tr.pins.concat([f]).sort((a, b) => a - b).join(','), t2 = {};
        list.forEach(e => { if (e.ps === want) t2[e.k] = (t2[e.k] || 0) + 1; });
        const dk = ok.find(k => t2[k]);
        if (dk) { fake = f; decoy = dk; break; }
      }
      if (fake == null) fake = nonPin[Math.floor(rng() * nonPin.length)];   // 合う手が作れない配りは、演技の印だけ付ける（外れ2つは食い違いのまま）
    }
    // 2つは種類（ペア・フラッシュ…）がちがうものを先に。演技に合う手があれば、それを1つ目に
    const a = decoy || ok[0];
    const rest2 = ok.filter(k => k !== a);
    const b = rest2.find(k => famOf(k) !== famOf(a) && famOf(k) !== famOf(truth)) || rest2.find(k => famOf(k) !== famOf(a)) || rest2[0];
    const X = { board, pinIdx: obsPins, ck, fake, decoy };
    const items = [truth, a, b].map((k, i) => ({ key: k, label: labelOf(k), why: whyFor(k, i === 0, X), truth: i === 0 }));
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
    return {
      board: board.map(c => c.t).join(' '), hole: hole.map(c => c.t).join(' '),
      opts: items.map(o => ({ label: o.label, key: o.key, why: o.why })), ans: items.findIndex(o => o.truth),
      pins: obsPins, truthKey: truth, coach: coachFor(board, obsPins, ck), char: ck, fake, decoy,
    };
  }

  // ================= お手本（固定の場面）=================
  // 札は固定（A のペアでのぞく）。見立ての理由の言い方・ヴェルベットの演技の印だけ、相手の決まりに合わせる
  const DEMO_BOARD = 'Ac 7d 4s 9h 2d';
  function demoFor(ck) {
    const bd = DEMO_BOARD.split(' ').map(P), velvet = ck === 'velvet';
    const X = { board: bd, pinIdx: [0], ck, fake: velvet ? 2 : null, decoy: velvet ? 'pair4' : null };
    const o = (label, key, truth) => ({ label, key, why: whyFor(key, !!truth, X) });
    return { board: DEMO_BOARD, hole: 'Ah Js', ans: 0, char: ck, pins: [0], fake: velvet ? 2 : null,
      opts: [o('A のペア', 'pairA', true), velvet ? o('4 のペア', 'pair4') : o('9 のペア', 'pair9'), o('役なし', 'none')] };
  }
  const demoCoach = (CH, ck) => {
    const name = CH.name, c = CH.coach;
    const other = ck === 'velvet' ? '4' : '9';
    return {
      l1: c.l1, l2: c.l2,
      l3: ck === 'velvet' ? '4 の♡は演技だから、4 のペアではない。|役なしなら、小さな♡は出ない。残るのは……'
        : ck === 'selina' ? '9 のペアなら 9 でめがねを直すはず。|役なしなら、1回も直さない。残るのは……'
        : '9 のペアなら 9 でのぞくはず。|役なしなら、どれものぞかない。残るのは……',
      l4: 'A のペア！',
      l5: '当たり。|手札が見えたまま卓に戻れるよ',
    };
  };
  const CARD4 = (CH) => [
    ['目的', CH.name + 'の伏せた手札を当てる。|当てると、手札が開いたまま卓に戻れる。'],
    ['やり方', '場札が1枚ずつめくれる。|' + (CH.name === 'セリナ' ? 'セリナがめがねを直した札に印が付く。' : CH.name === 'ヴェルベット' ? '小さな♡が出た札に印が付く。' : CH.name + 'がルーペでのぞいた札に印が付く。') + '|3つの見立てから1つ選ぶ。'],
    ['危なさ', '外れても損はしない。|ただ、手札は見えないまま。'],
    ['見る物', CH.look],
  ];

  // ================= 画面 =================
  const SVGDEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="rdlpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3bd"/><stop offset=".45" stop-color="#e9c46a"/><stop offset="1" stop-color="#8a5a16"/></linearGradient>
<radialGradient id="rdlpglass" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffffff" stop-opacity=".8"/><stop offset=".5" stop-color="#bfe3ff" stop-opacity=".3"/><stop offset="1" stop-color="#78a8d2" stop-opacity=".22"/></radialGradient>
<symbol id="rdloupe" viewBox="0 0 64 64">
 <line x1="41" y1="41" x2="58" y2="58" stroke="#3a2208" stroke-width="12" stroke-linecap="round"/>
 <line x1="41" y1="41" x2="58" y2="58" stroke="url(#rdlpg)" stroke-width="8" stroke-linecap="round"/>
 <line x1="46" y1="46" x2="55" y2="55" stroke="#7d1022" stroke-width="3" stroke-linecap="round"/>
 <circle cx="26" cy="26" r="21" fill="#3a2208"/>
 <circle cx="26" cy="26" r="18" fill="url(#rdlpglass)" stroke="url(#rdlpg)" stroke-width="6"/>
 <path d="M13 22 A14 14 0 0 1 24 12" stroke="#fff" stroke-opacity=".9" stroke-width="3.2" fill="none" stroke-linecap="round"/>
 <circle cx="33" cy="36" r="2" fill="#fff" fill-opacity=".6"/>
</symbol>
<symbol id="rdglasses" viewBox="0 0 64 64">
 <path d="M5 26 L14 30 M59 26 L50 30" stroke="#3a2208" stroke-width="7" stroke-linecap="round" fill="none"/>
 <path d="M5 26 L14 30 M59 26 L50 30" stroke="url(#rdlpg)" stroke-width="3.6" stroke-linecap="round" fill="none"/>
 <circle cx="19" cy="34" r="13" fill="#3a2208"/><circle cx="45" cy="34" r="13" fill="#3a2208"/>
 <circle cx="19" cy="34" r="10.5" fill="url(#rdlpglass)" stroke="url(#rdlpg)" stroke-width="3.6"/>
 <circle cx="45" cy="34" r="10.5" fill="url(#rdlpglass)" stroke="url(#rdlpg)" stroke-width="3.6"/>
 <path d="M30 32 Q32 29 34 32" stroke="url(#rdlpg)" stroke-width="3.4" fill="none" stroke-linecap="round"/>
 <path d="M12 30 A8 8 0 0 1 19 25" stroke="#fff" stroke-opacity=".9" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</symbol>
<symbol id="rdheart" viewBox="0 0 64 64">
 <path d="M32 55 C10 40 5 26 11 17 C17 9 28 10 32 20 C36 10 47 9 53 17 C59 26 54 40 32 55 Z" fill="#3a0714" stroke="#3a0714" stroke-width="9" stroke-linejoin="round"/>
 <path d="M32 55 C10 40 5 26 11 17 C17 9 28 10 32 20 C36 10 47 9 53 17 C59 26 54 40 32 55 Z" fill="#ff5b86" stroke="#ffd0dc" stroke-width="3" stroke-linejoin="round"/>
 <path d="M15 22 C16 17 21 15 25 18" stroke="#fff" stroke-opacity=".9" stroke-width="3.2" fill="none" stroke-linecap="round"/>
</symbol></defs></svg>`;
  const lpOf = (CH) => '<svg class="lp"><use href="#' + (CH.icon || 'rdloupe') + '"/></svg>';

  function mount(ST, opts, fin) {
    const U = window.RD.util, { el, fm, cardHTML, isRed } = U;
    const save = opts.save, ck = opts.charKey || 'grano', CH = CHARS[ck] || CHARS.grano;
    const sc = plan(opts.table, Object.assign({}, opts.ctx || {}, { charKey: ck }));
    if (!sc) return fin({});
    ST.board.insertAdjacentHTML('afterbegin', SVGDEFS);
    Object.values(CH.faces).forEach(f => { const im = new Image(); im.src = f.img; });
    const cnt0 = (save && save.rdCount && save.rdCount.mekiki) || 0;
    window.RD.saveSet(save, 'rdCount', 'mekiki', cnt0 + 1, opts.saveProgress);
    const live = makeScreen(ST, CH, false);
    ST.board.appendChild(live.root);
    const run = ST.newRun();
    live.root.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; if (/flip$/.test(live.phase)) { run.ff = true; run.kick(); } });
    let demoOn = false;
    const openDemo = () => {
      if (demoOn || ST.pauseP) return; demoOn = true; ST.pause();
      runDemo(ST, CH, ck, true).then(() => { demoOn = false; ST.unpause(); });
    };
    live.q('.tbtn').addEventListener('click', openDemo);
    const go = async () => {
      live.load(sc);
      live.tbtn(false);
      // 初回は自動でお手本。お手本を見た後の別の相手には、その相手の決まりの1枚（4点の札）だけ出す
      if (!window.RD.saveGet(save, 'rdDemo', 'mekiki')) {
        await runDemo(ST, CH, ck, false);
        if (ST.dead) return;
        window.RD.saveSet(save, 'rdDemo', 'mekiki', true, opts.saveProgress);
        window.RD.saveSet(save, 'rdRule', 'mekiki:' + ck, true, opts.saveProgress);
      } else if (!window.RD.saveGet(save, 'rdRule', 'mekiki:' + ck)) {
        const D = makeScreen(ST, CH, true); ST.board.appendChild(D.root); D.load(sc);
        await ruleCard(D, CH, false); D.root.remove();
        if (ST.dead) return;
        window.RD.saveSet(save, 'rdRule', 'mekiki:' + ck, true, opts.saveProgress);
      }
      live.ins('');
      live.phase = 'intro';
      live.intro(true, ''); await ST.wait(run, 1000); live.intro(false); await ST.wait(run, 300);
      live.tbtn(true);
      // めくり
      live.phase = 'flip';
      live.ins('めくれる札と、顔を見て');
      let np = 0;
      for (let k = 0; k < 5; k++) {
        await ST.wait(run, 350);
        live.flip('b' + k);
        if (sc.fake === k) {
          // ヴェルベットの演技の印：身を乗り出して大げさに。数えない
          live.face('fake'); live.say(CH.fakeLine); await ST.wait(run, 300); live.pin(k, true); await ST.wait(run, 1100); live.face('calm'); live.say(null);
        } else if (live.pinIdx.includes(k)) {
          np++;
          if (CH.subtle) { live.pin(k); await ST.wait(run, 900); }
          else { live.face('peek'); live.say(CH.peekLine[Math.min(np, CH.peekLine.length) - 1]); await ST.wait(run, 300); live.pin(k); await ST.wait(run, 900); live.face('calm'); live.say(null); }
        } else await ST.wait(run, 250);
      }
      run.ff = false;
      // 見立て
      live.phase = 'pick';
      live.ins(CH.name + 'の手は、3つのどれ？'); live.rule(true); live.opts(true); live.go('これだ！', 'dis');
      const coachOn = cnt0 < 2;   // 手引きの段：最初の2回だけ「リコに聞く」
      live.ask(coachOn);
      const noteHTML = '当たり：手札が開いたまま卓へ<br>外れ：損はなし';
      if (!live.pinIdx.length) { live.say(CH.noPin); ST.later(() => { live.say(null); live.note(noteHTML); }, 2200); } else live.note(noteHTML);
      live.q('.askrico').onclick = () => { live.rico(sc.coach, true); live.ask(false); };
      live.q('.rico').onclick = () => { live.rico(null); live.ask(coachOn); };
      const pick = await new Promise(res => { live.go_handler = () => { const s = live.getSel(); if (s >= 0) res(s); }; });
      live.go_handler = null; live.locked = true; live.rico(null); live.ask(false); live.note(null);
      live.go(null, 'off');
      const hit = pick === sc.ans;
      live.phase = 'reveal';
      if (hit) {
        await reveal(ST, run, live, CH, sc, true, { ins: '当たり！ 手札が開いたまま卓へ' });
      } else {
        live.face('miss'); live.say(CH.miss); live.rule(false);
        live.ins('外れ… 損はなし。答えは手の後で');
        await ST.wait(run, 600);
      }
      live.go('卓へ', 'on');
      live.phase = 'done';
      await new Promise(res => { live.go_handler = res; });
      live.go_handler = null;
      if (hit) fin({ correct: true });
      else fin({ correct: false, pending: { game: 'mekiki', title: CH.title, charKey: ck, pick, ans: sc.ans, scene: sc } });
    };
    go();
  }

  function verdict(ST, opts, fin) {
    const p = opts.pending, sc = p.scene, ck = p.charKey || opts.charKey || 'grano', CH = CHARS[ck] || CHARS.grano;
    ST.board.insertAdjacentHTML('afterbegin', SVGDEFS);
    Object.values(CH.faces).forEach(f => { const im = new Image(); im.src = f.img; });
    const S = makeScreen(ST, CH, false);
    ST.board.appendChild(S.root);
    const run = ST.newRun();
    S.load(sc); S.tbtn(false);
    // めくり終わった形で出す（印も付ける）
    sc.board.split(' ').forEach((_, i) => S.flip('b' + i));
    S.pinIdx.forEach(i => S.pin(i));
    if (sc.fake != null) S.pin(sc.fake, true);
    S.opts(true); S.locked = true;
    const resTxt = String(opts.result || '').replace(/（.*）/, '');
    S.rib(resTxt ? '<b>' + resTxt + '</b>' : '');
    S.q('.opts').children[p.pick].classList.add('mine');
    const go = async () => {
      S.ins('答え合わせ：' + CH.name + 'の手は……');
      await ST.wait(run, 500);
      const hit = p.pick === sc.ans;
      await reveal(ST, run, S, CH, sc, hit, { ins: '答えは「' + sc.opts[sc.ans].label + '」' });
      S.go('次へ', 'on');
      await new Promise(res => { S.go_handler = res; });
      fin({ correct: false });
    };
    go();
  }

  // 明かし：相手の伏せ札がめくれ、役を作る札が寄って光る。見立て3つに理由が付く
  async function reveal(ST, run, S, CH, sc, hit, o) {
    const ev = S.evidence();
    S.say(null); S.note(null); S.face(hit ? 'hit' : 'miss'); if (hit) S.shake();
    S.flip('h0'); await ST.wait(run, 350); S.flip('h1'); await ST.wait(run, 500);
    S.say(hit ? (sc.truthKey === 'none' && CH.hitNone ? CH.hitNone : CH.hit) : CH.miss);
    S.rule(false);
    await ST.wait(run, 500);
    S.dimAll(ev.size ? ev : null); S.glow(ev.size ? ev : null);
    if (o && o.ins) S.ins(o.ins);
    await ST.wait(run, 500);
    S.q('.opts').classList.add('rev');
    const order = sc.opts.map((_, i) => i).sort((a, b) => (a === sc.ans) - (b === sc.ans));
    for (const i of order) { S.badge(i, i === sc.ans); await ST.wait(run, 320); }
  }

  const FACE_KEYS = ['calm', 'peek', 'fake', 'hit', 'miss'];
  function makeScreen(ST, CH, demo) {
    const U = window.RD.util, { el, fm, cardHTML, isRed } = U;
    const root = el('div', 'sg ' + (demo ? 'demo' : 'live'));
    root.innerHTML = `
  <div class="felt"></div><div class="spot"></div>
  <div class="win"><div class="face f-calm on"></div><div class="face f-peek"></div><div class="face f-fake"></div><div class="face f-hit"></div><div class="face f-miss"></div></div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="top"><div class="ins"></div><button type="button" class="tbtn">お手本</button></div>
  <div class="row"><div class="bd"></div><div class="hd"></div></div>
  <div class="marks"></div>
  <div class="rule">${lpOf(CH)}<span>${CH.ruleHtml}</span></div>
  <div class="opts"></div>
  <div class="speech"></div><div class="note"></div>
  <button type="button" class="go">これだ！</button>
  <button type="button" class="askrico">リコに聞く</button>
  <div class="rico"><div class="rimg"></div><div class="rsay"></div></div>
  <button type="button" class="skip">とばす</button>
  <div class="intro"><div class="in"><div class="rd">READING</div><div class="tt">${CH.title}</div><div class="sn"></div></div></div>
  <div class="panel"><div class="ph">この遊びの4つのこと</div><div class="pl"></div><button type="button" class="pgo btnA">はじめる</button></div>`;
    const q = (s) => root.querySelector(s);
    FACE_KEYS.forEach(k => { const f = CH.faces[k] || CH.faces.peek, e = q('.f-' + k); e.style.backgroundImage = `url('${f.img}')`; e.style.backgroundSize = f.size; e.style.backgroundPosition = f.pos; });
    q('.rimg').style.backgroundImage = "url('assets/battle/chibi/rico_think.webp')";
    const S = { root, demo, sc: null, pinIdx: [], phase: 'boot', q };
    S.face = (n) => { FACE_KEYS.forEach(k => q('.f-' + k).classList.toggle('on', k === n)); };
    S.shake = () => { const w = q('.win'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); };
    S.ins = (t) => { q('.ins').textContent = t; };
    S.rib = (h) => { const r = q('.rib'); r.innerHTML = h; r.style.display = h ? '' : 'none'; };
    S.say = (t) => { const s = q('.speech'); if (t) { s.innerHTML = fm(t); s.classList.add('on'); } else s.classList.remove('on'); };
    S.note = (t) => { const n = q('.note'); if (t) { n.innerHTML = t; n.classList.add('on'); } else n.classList.remove('on'); };
    S.rule = (on) => q('.rule').classList.toggle('on', !!on);
    S.opts = (on) => q('.opts').classList.toggle('on', !!on);
    S.ask = (on) => q('.askrico').classList.toggle('on', !!on);
    S.tbtn = (on) => { q('.tbtn').style.display = on ? '' : 'none'; };
    S.rico = (t, smug) => { const r = q('.rico'); if (t) { q('.rsay').innerHTML = fm(t); q('.rimg').style.backgroundImage = `url('assets/battle/chibi/rico_${smug ? 'smug' : 'think'}.webp')`; r.classList.add('on'); } else r.classList.remove('on'); };
    S.go = (label, state) => { const g = q('.go'); if (label) g.textContent = label; g.classList.toggle('on', state !== 'off'); g.disabled = state === 'dis'; g.classList.remove('press'); };
    S.intro = (on, sn) => { const i = q('.intro'); if (sn != null) q('.intro .sn').textContent = sn; i.classList.toggle('on', !!on); };
    S.load = (sc) => {
      S.sc = sc;
      const bd = q('.bd'), hd = q('.hd'); bd.innerHTML = ''; hd.innerHTML = ''; q('.marks').innerHTML = '';
      S.board = sc.board.split(' ').map((t, i) => Object.assign(P(t), { id: 'b' + i }));
      S.hole = sc.hole.split(' ').map((t, i) => Object.assign(P(t), { id: 'h' + i }));
      S.slots = {};
      S.board.forEach(c => { const e = el('div', 'cd back'); bd.appendChild(e); S.slots[c.id] = e; });
      S.hole.forEach(c => { const e = el('div', 'cd back'); hd.appendChild(e); S.slots[c.id] = e; });
      S.pinIdx = sc.pins ? sc.pins.slice() : pins(S.hole, S.board).pins;
      const op = q('.opts'); op.innerHTML = ''; op.classList.remove('rev', 'on');
      sc.opts.forEach((x, i) => { const b = el('button', 'opt', `<b>${x.label}</b><span class="why">${/♡/.test(x.why) ? String(x.why).split('|').join('<br>') : fm(x.why)}</span><i class="bdg"></i>`); b.type = 'button'; b.dataset.i = i; op.appendChild(b); });
      S.rule(false); S.say(null); S.note(null); S.go(null, 'off'); S.face('calm'); S.rico(null);
    };
    const cdc = (c) => 'cd' + (isRed(c) ? ' r' : '');
    S.flip = (id) => { const c = S.board.concat(S.hole).find(x => x.id === id), e = S.slots[id]; e.innerHTML = cardHTML(c); e.className = cdc(c) + ' flip'; };
    S.pin = (i, fake) => {
      // 演技の印（大きなハート）は数えない：札は光らせず、あとで光る印からも外す
      if (!fake) S.slots['b' + i].classList.add('pin');
      // ヴェルベット：本物の印は小さく控えめ、演技の印は大きく跳ねる（同じ大きさだと見分けがつかなかった）
      const m = el('div', 'mk' + (fake ? ' big fk' : CH.subtle ? ' sm' : ''), lpOf(CH)); m.style.left = (i * 68 + (fake ? 2 : CH.subtle ? 20 : 14)) + 'px'; m.dataset.i = i; q('.marks').appendChild(m);
    };
    S.dimBoard = (keep) => { S.board.forEach((c, i) => S.slots[c.id].classList.toggle('dim', keep != null && !keep.includes(i))); };
    S.dimAll = (ids) => { S.board.concat(S.hole).forEach(c => S.slots[c.id].classList.toggle('dim', ids != null && !ids.has(c.id))); };
    S.glow = (ids) => {
      S.board.concat(S.hole).forEach(c => S.slots[c.id].classList.toggle('glow', !!ids && ids.has(c.id)));
      q('.marks').querySelectorAll('.mk:not(.fk)').forEach(m => m.classList.toggle('glow', !!ids && ids.has('b' + m.dataset.i)));
    };
    S.select = (i) => { q('.opts').querySelectorAll('.opt').forEach((b, k) => b.classList.toggle('sel', k === i)); };
    S.cross = (i) => S.badge(i, false);
    S.clearBadges = () => { [...q('.opts').children].forEach(b => { b.classList.remove('no', 'ok'); }); };
    S.badge = (i, ok) => { const b = q('.opts').children[i]; b.classList.add(ok ? 'ok' : 'no'); b.querySelector('.bdg').textContent = ok ? '◎' : '×'; };
    S.evidence = () => made(S.board.concat(S.hole));
    // 選ぶ待ち
    let sel = -1;
    q('.opts').addEventListener('click', (e) => { const b = e.target.closest('.opt'); if (!b || S.locked) return; sel = +b.dataset.i; S.select(sel); S.go('これだ！', 'on'); });
    q('.go').addEventListener('click', () => { if (S.go_handler) S.go_handler(); });
    S.getSel = () => sel;
    return S;
  }

  // ================= お手本 =================
  let DEMO_ON = false;
  async function ruleCard(D, CH, replay) {
    const { fm } = window.RD.util;
    const sk = D.q('.skip'); if (sk) sk.classList.add('off');
    D.rico(null); D.say(null); D.note(null);
    D.q('.pl').innerHTML = CARD4(CH).map(([a, b]) => `<div class="pi"><i>${a}</i><span>${fm(b)}</span></div>`).join('');
    D.q('.pgo').textContent = replay ? 'もどる' : 'はじめる';
    D.q('.panel').classList.add('on');
    await new Promise(res => D.q('.pgo').addEventListener('click', res, { once: true }));
  }
  async function runDemo(ST, CH, ck, replay) {
    const U = window.RD.util, { fm } = U;
    if (DEMO_ON) return;
    DEMO_ON = true;
    const DEMO = demoFor(ck), COACH = demoCoach(CH, ck);
    const run = ST.newRun(); run.noPause = true;
    const D = makeScreen(ST, CH, true); ST.board.appendChild(D.root);
    D.root.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; run.kick(); });
    D.q('.skip').addEventListener('click', () => { run.kill(); });
    D.load(DEMO); D.rib('<b>お手本</b>'); D.root.querySelector('.rib').classList.add('demo'); D.ins(''); D.tbtn(false);
    const card4 = () => ruleCard(D, CH, replay);
    try {
      D.intro(true, 'お手本'); await ST.wait(run, 1000); D.intro(false); await ST.wait(run, 250);
      D.ins('めくれる札と、顔を見て');
      D.flip('b0');
      if (CH.subtle) { await ST.wait(run, 350); D.pin(0); await ST.wait(run, 700); }
      else { D.face('peek'); D.say(CH.peekLine[0]); await ST.wait(run, 350); D.pin(0); await ST.wait(run, 700); }
      D.glow(new Set(['b0'])); D.rico(COACH.l1); await ST.wait(run, 4000);
      D.rico(null); D.glow(null); D.say(null); D.face('calm'); await ST.wait(run, 300);
      for (let k = 1; k < 5; k++) {
        D.flip('b' + k); await ST.wait(run, 500);
        if (DEMO.fake === k) { D.face('fake'); D.say(CH.fakeLine); D.pin(k, true); await ST.wait(run, 1300); D.face('calm'); D.say(null); }
      }
      D.dimBoard([0]); D.rico(COACH.l2, true); await ST.wait(run, 4000);
      D.rico(null); D.dimBoard(null); await ST.wait(run, 200);
      D.ins(CH.name + 'の手は、3つのどれ？'); D.rule(true); D.opts(true); await ST.wait(run, 1000);
      D.rico(COACH.l3); await ST.wait(run, 600);
      D.cross(1); await ST.wait(run, 900);
      D.cross(2); await ST.wait(run, 2500);
      D.rico(null); D.clearBadges();
      D.select(0); D.rico(COACH.l4, true); D.go('これだ！', 'on'); await ST.wait(run, 900);
      D.q('.go').classList.add('press'); await ST.wait(run, 600);
      D.q('.go').classList.remove('press'); D.go(null, 'off'); D.rule(false); D.rico(null);
      await reveal(ST, run, D, CH, DEMO, true, null);
      await ST.wait(run, 1500); D.say(null); D.rico(COACH.l5, true); D.ins('当たり！ 手札が開いたまま卓へ');
      await ST.wait(run, 3000);
    } catch (e) { if (!e || e.message !== 'cancel') { DEMO_ON = false; D.root.remove(); throw e; } }
    if (!ST.dead) await card4();
    D.root.remove();
    DEMO_ON = false;
  }

  window.RD.reg('mekiki', { id: 'mekiki', title: 'リーディング：目利き', plan, mount, verdict, CHARS });
  // 計算だけ外から使う（検査用）
  window.RD.mekikiEngine = { P, evalCat, pins, finKey, made, plan, labelOf, DECK, RANKS };
})();
