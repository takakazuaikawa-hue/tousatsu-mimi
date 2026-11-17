// リーディング：おねだり（ほろ酔いの夜・泥酔の夜／ポルカ・グラーノ・リコ・セリナ・ヴェルベットの5人）（2026-11-17・試作 qa/onedari と docs/design-ref/read-integrate.md §1・§3-4）
// ターンの賭けが済み、リバーをめくる前。相手が「欲しい札」を声に出す（おねだり）。決まり：おねだりの札が来なければ、彼女の役はできていない。
// 流れ：mode='say'（言う。終わったら卓で本物のリバーをめくる）→ 相手が ポットの3分の2 を賭ける（卓。この手だけ固定）→ mode='pick'（払う？降りる？ → 卓のコール／フォールド）
//       → 手の後の答え合わせ（待ちの5枚の列）。
// 計算（このファイルの上半分）は卓の本当の札と、次にめくる本物のリバー（ctx.fin）から場面を作る。作れない場は出さない。
(function () {
  'use strict';
  // ================= 計算 =================
  const RANKS = '23456789TJQKA', SUITS = 'shdc';
  const P = (s) => ({ r: RANKS.indexOf(s[0]), s: s[1], t: s });
  const FULL = []; for (const r of RANKS) for (const s of SUITS) FULL.push(P(r + s));
  function straightTop(rs) {
    const u = [...new Set(rs)]; if (u.includes(12)) u.push(-1); u.sort((a, b) => b - a);
    for (let i = 0; i + 4 < u.length; i++) { let ok = true; for (let k = 1; k < 5; k++) if (!u.includes(u[i] - k)) { ok = false; break; } if (ok) return u[i]; }
    return -2;
  }
  function score(cards) {
    const cnt = {}, su = {}; for (const c of cards) { cnt[c.r] = (cnt[c.r] || 0) + 1; (su[c.s] = su[c.s] || []).push(c.r); }
    const rs = Object.keys(cnt).map(Number).sort((a, b) => b - a);
    const by = (n) => rs.filter(r => cnt[r] === n);
    let fl = null; for (const s in su) if (su[s].length >= 5) fl = s;
    if (fl) { const st = straightTop(su[fl]); if (st > -2) return [8, st]; }
    const q = by(4), t = by(3), p = by(2);
    if (q.length) return [7, q[0], rs.filter(r => r !== q[0])[0]];
    if (t.length && (p.length || t.length > 1)) { const pr = Math.max(...(t.slice(1).concat(p))); return [6, t[0], pr]; }
    if (fl) return [5, ...su[fl].sort((a, b) => b - a).slice(0, 5)];
    const st = straightTop(cards.map(c => c.r)); if (st > -2) return [4, st];
    if (t.length) return [3, t[0], ...rs.filter(r => r !== t[0]).slice(0, 2)];
    if (p.length >= 2) return [2, p[0], p[1], rs.filter(r => r !== p[0] && r !== p[1])[0]];
    if (p.length) return [1, p[0], ...rs.filter(r => r !== p[0]).slice(0, 3)];
    return [0, ...rs.slice(0, 5)];
  }
  const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] == null ? -9 : a[i]) - (b[i] == null ? -9 : b[i]); if (d) return d; } return 0; };
  const RN = (r) => ({ 8: '10', 9: 'J', 10: 'Q', 11: 'K', 12: 'A' }[r] || String(r + 2));
  const SJ = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const isRedC = (c) => c.s === 'h' || c.s === 'd';
  const cname = (c) => RN(c.r) + SJ[c.s];
  function hname(sc) {
    const c = sc[0];
    if (c === 0) return '役なし'; if (c === 1) return RN(sc[1]) + ' のペア'; if (c === 2) return RN(sc[1]) + ' と ' + RN(sc[2]) + ' のツーペア';
    if (c === 3) return RN(sc[1]) + ' のスリーカード'; if (c === 4) return 'ストレート'; if (c === 5) return 'フラッシュ'; if (c === 6) return 'フルハウス'; return 'ストレートフラッシュ';
  }
  // 彼女の待ち：場札4枚＋彼女の2枚に足して、ストレート以上の「新しい役」ができる札
  function outsOf(board4, her) {
    const used = new Set(board4.concat(her).map(c => c.t));
    const base = score(board4.concat(her)); const outs = [];
    for (const c of FULL) { if (used.has(c.t)) continue; const sc = score(board4.concat(her, [c])); if (sc[0] >= 4 && sc[0] > base[0]) outs.push({ card: c, cls: sc[0] }); }
    return outs;
  }
  // 並びの絵：待ちの5枚（4枚＋最後の1枚の席）。当たりなら最後の札が入り、外れなら席が空く
  function lineupOf(board4, her, fin, kind, outSuit, hit, outs) {
    const pool = []; her.forEach((c, i) => pool.push({ card: c, from: 'her', i })); board4.forEach((c, i) => pool.push({ card: c, from: 'board', i }));
    if (kind === 'flush') {
      const items = pool.filter(x => x.card.s === outSuit).sort((a, b) => b.card.r - a.card.r);
      items.push(hit ? { card: fin, from: 'board', i: 4, fin: true } : { card: null, empty: true }); return items;
    }
    const rs = pool.map(x => x.card.r), pickOut = hit ? fin.r : outs[0].card.r;
    const top = straightTop(rs.concat([pickOut]));
    const seq = []; for (let k = 0; k < 5; k++) { let r = top - k; if (r < 0) r = 12; seq.push(r); }
    return seq.map(r => {
      if (r === pickOut) return hit ? { card: fin, from: 'board', i: 4, fin: true } : { card: null, empty: true, rank: r };
      return pool.find(x => x.card.r === r);
    });
  }
  // 場面（sc.board は5枚＝最後の1枚つき）から、表示に使う物を全部計算する
  function derive(sc) {
    const b5 = sc.board.split(' ').map(P), board4 = b5.slice(0, 4), fin = b5[4];
    const mimi = sc.mimi.split(' ').map(P), her = sc.her.split(' ').map(P);
    const outs = outsOf(board4, her);
    const kind = outs.length && outs.every(o => o.cls >= 5) ? 'flush' : outs.length && outs.every(o => o.cls === 4) ? 'straight' : 'mixed';
    const outSuit = kind === 'flush' ? outs[0].card.s : null;
    const outRanks = kind === 'straight' ? [...new Set(outs.map(o => o.card.r))].sort((a, b) => a - b) : [];
    const hit = outs.some(o => o.card.t === fin.t);
    const herFinal = score(b5.concat(her)), mimiFinal = score(b5.concat(mimi)), mimi4 = score(board4.concat(mimi));
    const ahead = cmp(mimiFinal, herFinal);
    const made = kind === 'flush' ? 'フラッシュ' : kind === 'straight' ? 'ストレート' : '';
    let sign = null, signMatch = null, signTxt = '';
    if (sc.sign === 'suit') { sign = { t: 'suit', suit: outSuit }; signMatch = fin.s === outSuit; signTxt = SJ[outSuit]; }
    else if (sc.sign === 'rank') { sign = { t: 'rank', ranks: outRanks }; signMatch = outRanks.includes(fin.r); signTxt = outRanks.map(RN).join(' か '); }
    else if (sc.sign === 'color') { const red = outSuit === 'h' || outSuit === 'd'; sign = { t: 'color', red, suit: outSuit }; signMatch = red === isRedC(fin); signTxt = red ? '赤いの' : '黒いの'; }
    else if (sc.sign === 'count') { sign = { t: 'count', n: outs.length }; signTxt = 'あと' + outs.length + '枚'; }
    const lineup = kind === 'mixed' ? [] : lineupOf(board4, her, fin, kind, outSuit, hit, outs);
    return { board4, fin, b5, mimi, her, outs, kind, outSuit, outRanks, hit, herFinal, mimiFinal, mimi4, ahead, made,
      sign, signMatch, signTxt, lineup, answer: ahead > 0 ? 'call' : 'fold',
      finName: cname(fin), finRed: isRedC(fin), herName: hit ? made : hname(herFinal), mimiName: hname(mimiFinal), mimi4Name: hname(mimi4),
      herHole: her.map(cname), bet: sc.bet || 0, pot: sc.pot || 0 };
  }
  // 直す所があれば言葉の一覧を返す（空なら、決まりどおりに作れる場）
  function problems(d) {
    const why = [];
    const all = d.b5.concat(d.mimi, d.her); if (new Set(all.map(c => c.t)).size !== all.length) why.push('札のだぶり');
    if (score(d.board4.concat(d.her))[0] !== 0) why.push('彼女が4枚の時点で待ちだけではない');
    if (d.kind === 'mixed') why.push('待ちの種類が1つに決まらない');
    // （ミミがペア以上、の条件は外した：2026-11-17 自然な待ちだけで出すため。勝ち負けは ahead で決まり、下の「外れなのにミミが負ける」などで守る）
    if (d.ahead === 0) why.push('引き分け');
    if (d.hit) { if (d.herFinal[0] < 4) why.push('当たりなのに役ができていない'); if (d.ahead > 0) why.push('当たりなのにミミが勝つ'); }
    else { if (d.herFinal[0] !== 0) why.push('外れなのに役がある'); if (d.ahead < 0) why.push('外れなのにミミが負ける'); }
    if (d.kind === 'flush' && d.lineup.length !== 5) why.push('並びが5つにならない');
    if (d.kind === 'straight' && (d.lineup.length !== 5 || d.lineup.some(x => !x))) why.push('並びが欠ける');
    if (d.hit && d.lineup.length && !d.lineup.some(x => x && x.fin)) why.push('並びに最後の札が入らない');
    return why;
  }
  // 相手ごとの印のぼかし方：ポルカ・グラーノ・リコ＝待ちの札そのもの（マーク／数字）、セリナ＝枚数、ヴェルベット＝「赤いの」（フラッシュの待ちだけ。並びの待ちは数字）
  function signFor(key, kind) {
    if (key === 'selina') return 'count';
    if (key === 'velvet') return kind === 'flush' ? 'color' : 'rank';
    return kind === 'flush' ? 'suit' : 'rank';
  }
  const NAME = { polka: 'ポルカ', grano: 'グラーノ', rico: 'リコ', selina: 'セリナ', velvet: 'ヴェルベット' };
  // 印の文字（相手ごとのぼかし方 t と、待ち outs から）
  function signTextOf(t, kind, outs) {
    const outSuit = kind === 'flush' ? outs[0].card.s : null;
    if (t === 'suit') return SJ[outSuit];
    if (t === 'rank') return [...new Set(outs.map(o => o.card.r))].sort((a, b) => a - b).map(RN).join(' か ');
    if (t === 'color') return (outSuit === 'h' || outSuit === 'd') ? '赤いの' : '黒いの';
    return 'あと' + outs.length + '枚';
  }
  // 4枚の時点（場札4枚＋彼女の2枚＝six）で「待ちだけ」か（役なし）と、その待ち（outs）を、札を数えて直接出す（outsOf と同じ結果。伏せ札の総当たり用に速くしてある）
  // 待ち＝同じマーク4枚ならそのマークの残り全部（cls 5）／5つ並びの窓に4つ入っていれば、足りない数字の残り全部（cls 4。同じマーク4枚のマークの札なら cls 5）
  function drawOuts(six, board4Set, her) {
    const bySuit = { s: 0, h: 0, d: 0, c: 0 }, rs = new Set(); let dup = false;
    for (const c of six) { bySuit[c.s]++; if (rs.has(c.r)) dup = true; rs.add(c.r); }
    if (dup) return null;                                   // ペア以上がある
    const fl = Object.keys(bySuit).filter(k => bySuit[k] >= 4);
    if (fl.some(k => bySuit[k] >= 5)) return null;          // もうフラッシュ
    const lowA = rs.has(12), has = (r) => rs.has(r) || (r === -1 && lowA);
    const need = new Set();
    for (let lo = -1; lo <= 8; lo++) { let n = 0, miss = null; for (let k = 0; k < 5; k++) { if (has(lo + k)) n++; else miss = lo + k; } if (n === 5) return null; if (n === 4) need.add(miss < 0 ? 12 : miss); }
    const fs0 = fl.length ? fl[0] : null, outs = [];
    for (const c of FULL) { if (board4Set.has(c.t) || c.t === her[0].t || c.t === her[1].t) continue; if (c.s === fs0) outs.push({ card: c, cls: 5 }); else if (need.has(c.r)) outs.push({ card: c, cls: 4 }); }
    return outs;
  }

  // 見える札（場札4枚・ミミの2枚）に合いうる「彼女の伏せ札」を全部。4枚の時点で待ちだけで、待ちの種類が1つに決まる手。リバー（fin）には依らない部分（2026-11-17 Codex 指摘1）
  function altsOf(board4, mimi, key) {
    const used = new Set(board4.concat(mimi).map(c => c.t));
    const pool = FULL.filter(c => !used.has(c.t)), out = [];
    const b4Set = new Set(board4.map(c => c.t));   // 待ちの数え方は outsOf と同じ：場札4枚と彼女の2枚だけを除く（ミミの札は、彼女には見えない＝数える）
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
      const her = [pool[i], pool[j]];
      const outs = drawOuts(board4.concat(her), b4Set, her); if (!outs || !outs.length) continue;
      const kind = outs.every(o => o.cls >= 5) ? 'flush' : outs.every(o => o.cls === 4) ? 'straight' : 'mixed';
      if (kind === 'mixed') continue;
      const st = signFor(key, kind);
      out.push({ her, outs, kind, st, txt: signTextOf(st, kind, outs), set: new Set(outs.map(o => o.card.t)) });
    }
    return out;
  }
  // 見える情報（場札・ミミの札・印・めくれた最後の札）に合う伏せ札が、どれでも「来た／来なかった」と「払う／降りる」が同じになるか。
  // 違う伏せ札が1つでもあれば false（印だけでは答えが決まらない場）
  function unambiguous(d, alts) {
    for (const a of alts) {
      if (a.st !== d.sign.t || a.txt !== d.signTxt) continue;
      if (a.her.some(c => c.t === d.fin.t)) continue;
      const hit = a.set.has(d.fin.t);
      if (hit !== d.hit) return false;
      const ahead = cmp(d.mimiFinal, score(d.b5.concat(a.her)));
      if (hit ? ahead >= 0 : ahead <= 0) return false;
    }
    return true;
  }
  // T＝卓の table（board は4枚）。ctx.charKey・ctx.fin（次にめくる本物のリバー {r,s}）・ctx.toCall・ctx.pot。作れなければ null
  // ctx.alts があれば（仕込みの下見）、伏せ札の総当たりを使い回す
  function plan(T, ctx) {
    ctx = ctx || {};
    const key = ctx.charKey;
    if (!NAME[key] || !ctx.fin) return null;
    if (!T || !T.board || T.board.length !== 4 || !T.her || T.her.length !== 2 || !T.mine || T.mine.length !== 2) return null;
    const mk = (c) => P(RANKS[c.r - 2] + c.s);
    const board4 = T.board.map(mk), fin = mk(ctx.fin), her = T.her.map(mk), mimi = T.mine.map(mk);
    const base = { board: board4.concat([fin]).map(c => c.t).join(' '), mimi: mimi.map(c => c.t).join(' '), her: her.map(c => c.t).join(' '), bet: 0, pot: ctx.pot || T.pot || 0 };
    const d0 = derive(Object.assign({}, base, { sign: null }));
    if (d0.kind === 'mixed') return null;
    const sc = Object.assign({}, base, { key, who: NAME[key], sign: signFor(key, d0.kind) });
    const d = derive(sc);
    if (problems(d).length) return null;
    if (!unambiguous(d, ctx.alts || altsOf(board4, mimi, key))) return null;
    sc.hit = d.hit; sc.answer = d.answer;
    return sc;
  }

  // ================= 5人の言い方・お手本 =================
  // 決まりは同じ。変わるのは、おねだりの言い方（印のぼかし方）と、賭ける時の芝居。{ } は d から出す。| で折る
  const WHO = {
    polka: { ask: d => `お願い〜！|${d.signTxt} こい ${d.signTxt} こい〜！`,
      bet: d => ({ face: 'drunk2', t: `……ど、どーん！|${d.bet}！` }),
      beaten: [{ face: 'panic', t: () => 'なんで〜！|うわぁ〜ん！' }, { face: 'drunk', t: () => '……あ、|声に出てた？' }],
      fooled: [{ face: 'smug', t: () => 'やった〜！|ばれなかった〜♪' }],
      dodged: [{ face: 'drunk2', t: d => `あ〜ん、降りちゃった〜|${d.finName} 来たのに〜` }],
      caught: [{ face: 'smug', t: d => `やった〜！|${d.finName} 来た〜♪` }] },
    grano: { ask: d => `次の ${d.signTxt} は、わたくしが|予約済みですぞ`,
      bet: d => ({ face: 'drunk2', t: `これは掘り出し物ですぞ！|${d.bet}！` }),
      beaten: [{ face: 'panic', t: () => 'ぐぬぬ……|不良在庫でしたか' }],
      fooled: [{ face: 'smug', t: () => 'まいどあり！|口上が物を言いますな' }],
      dodged: [{ face: 'drunk2', t: () => 'おや、降りましたか。|お目が高い' }],
      caught: [{ face: 'smug', t: d => `予約の品が届きましたぞ！|${d.herName}、まいど！` }] },
    rico: { ask: d => `アタシの欲しい札、教えたげる。|${d.signTxt}。その上で、当ててみな？`,
      bet: d => ({ face: 'drunk2', t: `よし、|${d.bet} いこっか` }),
      beaten: [{ face: 'panic', t: () => 'ばれたか〜。|えらいえらい' }],
      fooled: [{ face: 'smug', t: () => 'あはは、降りちゃった？|先輩の勝ち〜' }],
      dodged: [{ face: 'drunk2', t: () => 'ん〜、降りたか。|いい判断だよ' }],
      caught: [{ face: 'smug', t: d => `ごめんね〜。|${d.herName}、できちゃった♪` }] },
    selina: { ask: d => `……${d.signTxt}。|確率は……ひっく`,
      bet: d => ({ face: 'drunk2', t: `……${d.bet}。|賭けます` }),
      beaten: [{ face: 'panic', t: () => '……計算どおりには、|いきませんね' }],
      fooled: [{ face: 'smug', t: () => '……降りるのですか。|計算外です' }],
      dodged: [{ face: 'drunk2', t: () => '……正しい判断です。|降りる局面でした' }],
      caught: [{ face: 'smug', t: d => `……当然の結果です。|待ちの ${d.outs.length} 枚を、引きました` }] },
    // ヴェルベット：「赤いの」だけ言う。賭ける時の芝居は逆（来たのに残念そう・来ないのに嬉しそう）
    velvet: { ask: d => `${d.signTxt}が欲しいな♡|ねぇ、わかる？`,
      bet: d => d.hit ? { face: 'panic', t: `あ〜あ、来ちゃった〜……|${d.bet}` } : { face: 'smug', t: `やったぁ、来た来た〜♡|${d.bet}！` },
      beaten: [{ face: 'panic', t: () => 'ちぇっ。|ざぁこのくせに〜♡' }],
      fooled: [{ face: 'smug', t: () => 'うふふ♡ 引っかかった〜|やっぱり顔を見ちゃう？' }],
      dodged: [{ face: 'drunk2', t: () => 'ちぇっ、降りるんだ。|つまんなぁい♡' }],
      caught: [{ face: 'smug', t: () => 'ほぉら、来ちゃった♡|ごちそうさま〜♡' }] },
  };
  const tx = (s, d) => typeof s === 'function' ? s(d) : s;
  // 顔の中心（透明でない所の重心 x／1000）。窓に出す位置の計算（試作 qa/onedari/build.cjs と同じ値）
  const CX = { polka_drunk: 641, polka_drunk2: 633, polka_smug: 662, polka_panic: 683, rico_drunk: 587, rico_drunk2: 598, rico_smug: 602, rico_panic: 587,
    grano_drunk: 638, grano_drunk2: 577, grano_smug: 682, grano_panic: 641, selina_drunk: 684, selina_drunk2: 621, selina_smug: 715, selina_panic: 674,
    velvet_drunk: 603, velvet_drunk2: 582, velvet_smug: 604, velvet_panic: 631 };
  const FACE_NAMES = ['drunk', 'drunk2', 'smug', 'panic'];
  // お手本の固定の場面（ポルカ・♥待ちのフラッシュは来ない）
  const DEMO = { key: 'polka', who: 'ポルカ', board: 'Ks 9h 4h 2c 6s', mimi: 'Kd Jc', her: 'Ah 7h', sign: 'suit', bet: 600, pot: 800 };
  // お手本の止まる所は2つ（2026-11-17 docs/design-ref/read-demo-length.md）：①欲しい札の印と、めくれた瞬間の「来ない→はったり」を1回に／③自分に役があれば払う（短い1行）。明かしは止めずに流す
  const DEMO_COACH = {
    s12: d => `おねだりは ${d.signTxt}。来たのは ${d.finName}。|来なければ、役はできてない。はったり`,
    s3: d => `ミミは ${d.mimiName}。役があるから、払おう` };
  // お手本の後の4点の札。4つ目の「印の読み方」は、その相手が使う印だけ（2026-11-17 Codex 指摘10）
  const READ_BY = {
    polka: '♥ や 9 は、そのまま。|来た札と、見くらべる。',
    grano: '♥ や 9 は、そのまま。|来た札と、見くらべる。',
    rico: '「5 か 10」のように、数字が2つなら|そのどちらか。来た札と見くらべる。',
    selina: '「あと9枚」は同じマークの待ち。|8枚は並びの両はし。|4枚は間の1枚。',
    velvet: '「赤いの」は ♥ か ♦ のどちらか。|黒い札なら、役はできない。' };
  const card4Of = (key) => [
    ['決まり', 'おねだりの札が来なければ、|彼女の役はできていない（はったり）。'],
    ['印の読み方', READ_BY[key] || READ_BY.polka]];
  const coachOf = (d) => {
    const t = d.sign.t;
    if (t === 'suit') return `おねだりは ${d.signTxt}。来たのは ${d.finName}。|小さい札でも、マークが合えば……？`;
    if (t === 'rank') return `おねだりは ${d.signTxt}。来たのは ${d.finName}。|その数字かどうか、見くらべよう`;
    if (t === 'color') return `おねだりは ${d.signTxt}。来たのは ${d.finName}。|赤でも、${SJ[d.outSuit]} でなければ役はできない`;
    return `「${d.signTxt}」は、待ちの札の数。|来たのは ${d.finName}。その待ちの札かな？`;
  };
  // 理由（計算から）
  function reasonOf(d, pick) {
    const calledRight = pick === 'call' && !d.hit, foldedRight = pick === 'fold' && d.hit;
    let a;
    if (d.sign.t === 'count') a = `「${d.signTxt}」は ${d.kind === 'flush' ? SJ[d.outSuit] + ' の待ち' : '並びの待ち'}。来たのは ${d.finName}。`;
    else if (d.sign.t === 'color') a = `おねだりは${d.signTxt}。来たのは ${d.finName}。${isRedC(d.fin) === d.sign.red && d.fin.s !== d.outSuit ? '赤でも ' + SJ[d.outSuit] + ' ではない。' : ''}`;
    else a = `おねだりは ${d.signTxt}。来たのは ${d.finName}。`;
    const b = d.hit ? `${d.made}が できた。` : `${d.made}は できていない。`;
    let c;
    if (calledRight) c = `ミミの ${d.mimiName} が勝ち`;
    else if (foldedRight) c = `${d.herName}には勝てない。|降りて正解（−${d.bet} を さけた）`;
    else if (!d.hit) c = `払えば、|ミミの ${d.mimiName} が勝って ＋${d.pot + d.bet} だった`;
    else c = `ミミの ${d.mimiName} では、|${d.herName}に勝てない`;
    return a + '|' + b + '|' + c;
  }
  // 結果を計算で決める。pick: 'call'／'fold'
  function outcome(d, pick) {
    const kind = pick === 'call' ? (d.hit ? 'caught' : 'beaten') : (d.hit ? 'dodged' : 'fooled');
    const good = pick === d.answer;
    const mark = { beaten: '◎ 見やぶった', dodged: '◎ かわした', fooled: '✕ だまされた', caught: '✕ つかまった' }[kind];
    const delta = { beaten: `＋${d.pot + d.bet}`, dodged: '±0', fooled: '±0', caught: `−${d.bet}` }[kind];
    return { kind, good, mark, delta, cls: good ? 'good' : 'bad', reason: reasonOf(d, pick) };
  }

  const HAND = '<svg viewBox="0 0 46 56"><path d="M17 5a4.5 4.5 0 0 1 9 0v21h1.5v-5a4.5 4.5 0 0 1 9 0v5h1v-3.5a4.5 4.5 0 0 1 9 0V38c0 10-6 17-16 17h-4c-8 0-13-5-16-12l-4-9a4.2 4.2 0 0 1 7-4.5l5 6.5z" fill="#fff4d8" stroke="#7a4e0f" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  const faceUrl = (key, n) => `assets/characters/${key}_cutin_${n}.webp`;
  const preload = (key) => FACE_NAMES.forEach(n => { const im = new Image(); im.src = faceUrl(key, n); });

  // ================= 画面 =================
  function makeScreen(ST, demo) {
    const U = window.RD.util, { el, fm, cardHTML, isRed } = U;
    const br = (t) => String(t).split('|').join('<br>');
    const root = el('div', 'sg one ' + (demo ? 'demo' : 'live'));
    root.innerHTML = `
  <div class="felt"></div><div class="spot"></div>
  <div class="win"></div><div class="who"></div>
  <div class="val"></div><div class="rail"></div>
  <div class="rib"></div>
  <div class="top"><div class="ins"></div><button type="button" class="tbtn">お手本</button></div>
  <div class="bd"></div>
  <div class="tick"></div><div class="lineup"></div>
  <div class="chip hc"></div>
  <div class="rule"><em>おねだりの札が来なければ</em>、彼女の役はできていない</div>
  <div class="reason"></div>
  <div class="mc m0"></div><div class="mc m1"></div>
  <div class="chip mch"></div>
  <div class="opts"><button type="button" class="pay"><b>払う</b><span class="a1"></span></button><button type="button" class="fold"><b>降りる</b><span class="a2"></span></button></div>
  <div class="speech"></div>
  <button type="button" class="go">卓へ</button>
  <button type="button" class="askrico">リコに聞く</button>
  <div class="rico"><div class="rimg"></div><div class="rsay"></div></div>
  <button type="button" class="skip">とばす</button>
  <div class="hand">${HAND}</div>
  <div class="intro"><div class="in"><div class="rd">READING</div><div class="tt">リーディング：おねだり</div><div class="sn"></div></div></div>
  <div class="panel"><div class="ph">お手本の後で、おぼえておくこと</div><div class="pl"></div><button type="button" class="pgo btnA">はじめる</button></div>`;
    const q = (s) => root.querySelector(s);
    q('.rimg').style.backgroundImage = "url('assets/battle/chibi/rico_think.webp')";
    const S = { root, demo, sc: null, d: null, q, who: null, lkH: [], lkB: [] };
    S.setWho = (key, who) => {
      S.who = who;
      q('.win').innerHTML = FACE_NAMES.map(k => `<div class="face f-${k}" style="background-image:url('${faceUrl(key, k)}');background-size:auto 360px;background-position:${Math.round(-(CX[key + '_' + k] * 0.64 - 150))}px 8px"></div>`).join('');
      q('.who').textContent = who;
    };
    S.face = (n) => { q('.win').querySelectorAll('.face').forEach(f => f.classList.toggle('on', f.classList.contains('f-' + n))); };
    S.shake = () => { const w = q('.win'); w.classList.remove('shake', 'bounce'); void w.offsetWidth; w.classList.add('shake'); };
    S.bounce = () => { const w = q('.win'); w.classList.remove('shake', 'bounce'); void w.offsetWidth; w.classList.add('bounce'); };
    S.ins = (t, k) => { const i = q('.ins'); i.textContent = t; i.className = 'ins' + (k ? ' ' + k : ''); };
    S.rib = (h) => { const r = q('.rib'); r.innerHTML = h; r.style.display = h ? '' : 'none'; };
    S.say = (t) => { const s = q('.speech'); if (t) { s.innerHTML = br(t); s.classList.add('on'); } else s.classList.remove('on'); };
    S.rule = (on) => q('.rule').classList.toggle('on', !!on);
    S.reason = (t) => { const r = q('.reason'); if (t) { r.innerHTML = fm(t); r.classList.add('on'); } else r.classList.remove('on'); };
    S.ask = (on) => q('.askrico').classList.toggle('on', !!on);
    S.tbtn = (on) => { q('.tbtn').style.display = on ? '' : 'none'; };
    S.rico = (t, smug) => { const r = q('.rico'); if (t) { q('.rsay').innerHTML = br(t); q('.rimg').style.backgroundImage = `url('assets/battle/chibi/rico_${smug ? 'smug' : 'think'}.webp')`; r.classList.add('on'); root.classList.add('coaching'); } else { r.classList.remove('on'); root.classList.remove('coaching'); } };
    S.go = (label, on) => { const g = q('.go'); if (label) g.textContent = label; g.classList.toggle('on', !!on); };
    S.intro = (on, sn) => { const i = q('.intro'); if (sn != null) q('.intro .sn').textContent = sn; i.classList.toggle('on', !!on); };
    S.opts = (on) => q('.opts').classList.toggle('on', !!on);
    S.optsEnable = (on) => { ['.pay', '.fold'].forEach(s => { const b = q(s); b.disabled = !on; b.classList.remove('press'); }); q('.pay').classList.toggle('ready', !!on); };
    S.tickOn = (on) => q('.tick').classList.toggle('on', !!on);
    S.mimiChip = (n) => { const c = q('.chip.mch'); c.textContent = 'ミミ：' + n; c.classList.add('on'); };
    const cardEl = (c, cls) => el('div', 'cd' + (isRed(c) ? ' r' : '') + (cls ? ' ' + cls : ''), cardHTML(c));
    const tickHTML = (d) => {
      const s = d.sign; let h = '<i>おねだり</i>';
      if (s.t === 'suit') h += `<span class="sy${s.suit === 'h' || s.suit === 'd' ? ' r' : ''}">${SJ[s.suit]}</span>`;
      else if (s.t === 'rank') h += s.ranks.map(r => `<span class="tk">${RN(r)}</span>`).join('<em>か</em>');
      else if (s.t === 'color') h += `<span class="col${s.red ? ' r' : ''}">${s.red ? '赤いの' : '黒いの'}</span>`;
      else h += `<span class="cnt">あと<b>${s.n}</b>枚</span>`;
      return h;
    };
    // 場面を読み込む。all＝5枚目も表（卓でめくれた後）
    S.load = (sc, all) => {
      S.sc = sc; const d = derive(sc); S.d = d; S.setWho(sc.key, sc.who || NAME[sc.key]);
      const bd = q('.bd'); bd.innerHTML = '';
      S.bcards = d.b5.map((c, i) => { const e = cardEl(c, i < 4 ? 'hid' : (all ? 'fin hid' : 'back fin5 hid')); bd.appendChild(e); return e; });
      root.querySelectorAll('.hc0,.hc1').forEach(e => e.remove());
      S.hcs = d.her.map((c, j) => { const e = cardEl(c, 'back hc' + j + ' hid'); root.appendChild(e); return e; });
      S.mcs = [0, 1].map(i => { const m = q('.m' + i); m.className = 'mc m' + i; m.style.opacity = ''; m.innerHTML = ''; m.appendChild(cardEl(d.mimi[i])); return m; });
      S.lkH = []; S.lkB = [];
      const t = q('.tick'); t.className = 'tick'; t.innerHTML = tickHTML(d);
      const L = q('.lineup'); L.className = 'lineup'; L.innerHTML = '';
      ['.hc', '.mch'].forEach(s => { const c = q('.chip' + s); c.className = 'chip ' + s.slice(1); c.textContent = ''; });
      q('.a1').textContent = d.bet ? `${d.bet} を出す` : ''; q('.a2').textContent = d.bet ? `${d.bet} は出さない` : '';
      S.rule(false); S.say(null); S.reason(null); S.go(null, false); S.face('drunk'); S.rico(null);
      S.opts(false); S.optsEnable(false);
      q('.hand').classList.remove('on', 'tap');
    };
    S.showBoard = async (run, anim, upto) => {
      const n = upto == null ? 5 : upto;
      for (let i = 0; i < n; i++) { const e = S.bcards[i]; e.classList.remove('hid'); if (anim) e.classList.add('swap'); await ST.wait(run, anim ? 70 : 0); }
      for (const e of S.hcs) { e.classList.remove('hid'); if (anim) e.classList.add('swap'); }
      if (anim) await ST.wait(run, 400);
    };
    S.lk = () => { S.bcards.forEach((e, i) => e.classList.toggle('lk', S.lkB.includes(i))); S.hcs.forEach((e, i) => e.classList.toggle('lk', S.lkH.includes(i))); };
    // 最後の札：先に色（赤か黒）の光、次に数字がめくれる
    S.finalFlip = async (run, fast) => {
      const e = S.bcards[4]; e.classList.remove('hid'); e.classList.add(S.d.finRed ? 'tr' : 'tb'); await ST.wait(run, fast ? 450 : 750);
      e.classList.remove('back', 'tr', 'tb', 'fin5'); e.classList.add('flip', 'fin'); await ST.wait(run, fast ? 300 : 450);
    };
    S.mimiIn = async (run) => { q('.mc.m0').classList.add('on'); await ST.wait(run, 120); q('.mc.m1').classList.add('on'); };
    // 答え合わせ：彼女の2枚がめくれ、待ちの札が1列に寄る
    S.herFlip = async (run, fast) => {
      const d = S.d;
      S.mcs.forEach(m => { m.style.opacity = '0'; });
      for (const e of S.hcs) { e.classList.remove('back'); e.classList.add('flip'); }
      S.lkH = d.lineup.filter(x => x && x.from === 'her').map(x => x.i);
      S.lkB = d.lineup.filter(x => x && x.from === 'board').map(x => x.i);
      await ST.wait(run, fast ? 350 : 500); S.lk();
      const c = q('.chip.hc'); c.textContent = S.who + '：' + d.herName; c.classList.add('on');
      await ST.wait(run, fast ? 200 : 350);
    };
    S.lineupShow = async (run) => {
      const d = S.d, L = q('.lineup'); L.innerHTML = ''; L.classList.add('on'); q('.tick').classList.add('off');
      for (const it of d.lineup) {
        const e = it.empty ? el('div', 'cd slotx pop', '<b>?</b>') : cardEl(it.card, 'pop' + (it.fin ? ' hit' : ''));
        L.appendChild(e); await ST.wait(run, 170);
      }
      const st = el('div', 'stamp ' + (d.hit ? 'ok' : 'no'), `<b>${d.hit ? '○' : '×'}</b><span>${d.hit ? 'かなった' : 'かなわなかった'}</span>`);
      L.appendChild(st); void st.offsetWidth; st.classList.add('on');
      if (!d.hit) S.bcards[4].style.opacity = '.35';
      await ST.wait(run, 500);
    };
    return S;
  }

  // 明かし（本番の答え合わせ・お手本の最後）
  async function reveal(ST, run, S, d, pick, isDemo) {
    const out = outcome(d, pick), who = S.sc.key;
    S.rule(false); S.opts(false); S.rico(null); S.say(null);
    S.ins('彼女の札を見る……');
    await S.herFlip(run, isDemo);
    if (!isDemo) { await S.lineupShow(run); await ST.wait(run, 900); }
    const lines = isDemo ? WHO[who][out.kind].slice(0, 1) : WHO[who][out.kind];
    for (const st of lines) {
      S.face(st.face); if (st.face === 'panic') S.shake(); else S.bounce();
      S.say(tx(st.t, d));
      await ST.wait(run, isDemo ? 1300 : 1800);
    }
    S.say(null);
    S.ins(out.mark + '　' + out.delta, out.cls);
    await ST.wait(run, isDemo ? 200 : 350);
    S.reason(out.reason);
    await ST.wait(run, isDemo ? 900 : 600);
    return out;
  }

  // ================= お手本 =================
  async function runDemo(ST, replay, key) {
    const { fm } = window.RD.util;
    if (runDemo.on) return;
    runDemo.on = true;
    const run = ST.newRun(); run.noPause = true;
    const D = makeScreen(ST, true); ST.board.appendChild(D.root);
    D.root.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; run.kick(); });
    D.q('.skip').addEventListener('click', () => { run.kill(); });
    D.load(DEMO); D.rib('<b>お手本</b>'); D.q('.rib').classList.add('demo'); D.ins(''); D.tbtn(false);
    const d = D.d, hand = D.q('.hand'), C = DEMO_COACH;
    const card4 = async () => {
      D.q('.skip').classList.add('off'); D.rico(null); D.say(null);
      D.q('.pl').innerHTML = card4Of(key).map(([a, b]) => `<div class="pi"><i>${a}</i><span>${fm(b)}</span></div>`).join('');
      D.q('.pgo').textContent = replay ? 'もどる' : 'はじめる';
      D.q('.panel').classList.add('on');
      await new Promise(res => D.q('.pgo').addEventListener('click', res, { once: true }));
    };
    try {
      const hold = (t, look) => ST.wait(run, window.RD.util.stopMs(t, look));
      D.intro(true, 'お手本'); await ST.wait(run, 600); D.intro(false); await ST.wait(run, 100);
      // 拍1：おねだり（卓では吹き出しと印だけ。お手本は盤で見せる）
      await D.showBoard(run, true, 4);
      D.bcards[4].classList.remove('hid');
      D.tickOn(true); D.say(WHO.polka.ask(d)); await ST.wait(run, 1000); D.say(null);
      D.q('.tick').classList.add('lit');
      // 拍2：最後の札がめくれる → 止1：来ない → はったり
      D.face('drunk2'); await D.finalFlip(run, true);
      D.q('.tick').classList.remove('lit'); D.bcards[4].classList.add('lit');
      const b = WHO.polka.bet(d); D.face(b.face); D.bounce(); D.say(b.t);
      D.rico(C.s12(d), true); await hold(C.s12(d), true);
      D.rico(null); D.say(null); D.bcards[4].classList.remove('lit');
      // 拍3：ミミの手 → 止2：役があれば払う（短い1行）。払うを押す
      D.mimiChip(d.mimiName); await D.mimiIn(run); D.rule(true);
      D.q('.chip.mch').classList.add('lit'); D.opts(true); D.optsEnable(true);
      D.rico(C.s3(d), true); await hold(C.s3(d));
      D.rico(null); D.q('.chip.mch').classList.remove('lit');
      hand.style.left = '526px'; hand.style.top = '300px'; hand.classList.add('on'); await ST.wait(run, 450);
      hand.classList.add('tap'); D.q('.pay').classList.add('press'); await ST.wait(run, 300);
      hand.classList.remove('on'); D.opts(false);
      // 明かし（止めずに流す）
      await reveal(ST, run, D, d, 'call', true);
    } catch (e) { if (!e || e.message !== 'cancel') { runDemo.on = false; D.root.remove(); throw e; } }
    if (!ST.dead) await card4();
    D.root.remove();
    runDemo.on = false;
  }

  // ================= 本番 =================
  function mount(ST, opts, fin) {
    const save = opts.save, mode = opts.mode || 'say';
    const sc = opts.scene;
    if (!sc) return fin({});
    preload(sc.key);
    // お手本だけ盤で流す形（2026-11-17：「言う」は卓の上に出すだけ。初回のお手本は盤で見せる。mode='demo'＝初回のお手本、'replay'＝見直し）
    if (mode === 'demo' || mode === 'replay') {
      (async () => {
        const replay = mode === 'replay';
        if (replay || !window.RD.saveGet(save, 'rdDemo', 'onedari')) {
          await runDemo(ST, replay, sc.key);
          if (ST.dead) return;
          if (!replay) window.RD.saveSet(save, 'rdDemo', 'onedari', true, opts.saveProgress);
        }
        fin({ demo: true });
      })().catch(e => { if (!(e && e.message === 'cancel')) console.error('onedari demo', e); fin({ demo: true }); });
      return;
    }
    const cnt0 = (save && save.rdCount && save.rdCount.onedari) || 0;
    if (mode === 'say') window.RD.saveSet(save, 'rdCount', 'onedari', cnt0 + 1, opts.saveProgress);
    const plays = cnt0 + 1;   // 何回目の遊びか（手引きの段：最初の2回だけ「リコに聞く」）
    const S = makeScreen(ST, false);
    ST.board.appendChild(S.root);
    const run = ST.newRun();
    S.root.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; if (S.phase === 'say') { run.ff = true; run.kick(); } });
    let demoOn = false;
    S.q('.tbtn').addEventListener('click', () => {
      if (demoOn || ST.pauseP) return; demoOn = true; ST.pause();
      runDemo(ST, true, sc.key).then(() => { demoOn = false; ST.unpause(); });
    });
    const goSay = async () => {
      S.load(sc, false); S.ins(''); S.tbtn(false); S.ask(false);
      if (!window.RD.saveGet(save, 'rdDemo', 'onedari')) {
        await runDemo(ST, false, sc.key);
        if (ST.dead) return;
        window.RD.saveSet(save, 'rdDemo', 'onedari', true, opts.saveProgress);
      }
      S.phase = 'intro';
      S.intro(true, ''); await ST.wait(run, 1000); S.intro(false); await ST.wait(run, 300);
      S.tbtn(true);
      S.phase = 'say';
      S.ins('最後の札の前に、おねだりが出た');
      await S.showBoard(run, true, 4);
      S.bcards[4].classList.remove('hid');
      run.ff = false;
      S.face('drunk'); S.tickOn(true); S.say(WHO[sc.key].ask(S.d)); await ST.wait(run, 2400);
      run.ff = false;
      S.phase = 'say-done';
      S.ins('おねだりを聞いた。最後の札が めくれる');
      S.go('めくる', true);
      await new Promise(res => { S.q('.go').onclick = res; });
      S.q('.go').onclick = null;
      fin({ say: true });
    };
    const goPick = async () => {
      // 専用の盤1回で済ませる（2026-11-18）：初回はお手本 → 場札4枚と伏せたリバー → おねだり（待ちの印）→ リバーがめくれる → 賭けてきた → 払う？降りる？
      S.load(sc, false); S.tbtn(false); S.ask(false); S.ins('');
      if (!window.RD.saveGet(save, 'rdDemo', 'onedari')) {
        await runDemo(ST, false, sc.key);
        if (ST.dead) return;
        window.RD.saveSet(save, 'rdDemo', 'onedari', true, opts.saveProgress);
      }
      window.RD.saveSet(save, 'rdCount', 'onedari', cnt0 + 1, opts.saveProgress);
      S.phase = 'say';
      S.ins('最後の札の前に、おねだりが出ていた');
      await S.showBoard(run, true, 4);
      S.bcards[4].classList.remove('hid');
      S.face('drunk'); S.tickOn(true); S.say(WHO[sc.key].ask(S.d)); await ST.wait(run, 2000);
      run.ff = false;
      S.say(null); S.ins('最後の札は……');
      await S.finalFlip(run, false);
      run.ff = false;
      S.phase = 'pick';
      S.tbtn(true);
      const d = S.d;
      const b = WHO[sc.key].bet(d);
      S.face(b.face); S.bounce(); S.say(b.t); await ST.wait(run, 1700); S.say(null);
      S.ins(`${d.bet} 賭けてきた。払う？ 降りる？`);
      S.rule(true); S.opts(true); S.optsEnable(false); S.mimiChip(d.mimiName);
      const coachOn = plays <= 2;
      S.ask(coachOn);
      await S.mimiIn(run);
      S.q('.askrico').onclick = () => { S.rico(coachOf(d), true); S.ask(false); };
      S.q('.rico').onclick = () => { S.rico(null); S.ask(coachOn); };
      await ST.wait(run, 400); S.optsEnable(true);
      const pick = await new Promise(res => {
        S.q('.pay').onclick = () => { if (S.q('.pay').disabled) return; S.optsEnable(false); S.q('.pay').classList.add('press'); res('call'); };
        S.q('.fold').onclick = () => { if (S.q('.fold').disabled) return; S.optsEnable(false); S.q('.fold').classList.add('press'); res('fold'); };
      });
      S.q('.pay').onclick = null; S.q('.fold').onclick = null; S.rico(null); S.ask(false); S.tbtn(false);
      S.rule(false); S.opts(false);
      S.ins(pick === 'call' ? '払う。答えは手の後で' : '降りる。答えは手の後で');
      await ST.wait(run, 900);
      fin({ act: pick, pending: { game: 'onedari', title: 'リーディング：おねだり', charKey: sc.key, pick, ans: d.answer, scene: sc, deferred: true } });
    };
    (mode === 'pick' ? goPick : goSay)();
  }

  // 手の結果の画面に併記する答え（来た／来なかった・彼女の本当の手）
  function summary(p, ctx) {
    const sc = p.scene, d = derive(sc), out = outcome(d, p.pick);
    return { correct: p.pick === d.answer, mark: out.mark + '（おねだりの札は' + (d.hit ? '来た' : '来なかった') + '）',
      real: sc.who + 'の手札は ' + d.herHole.join(' ') + '（' + d.herName + '）', reason: String(out.reason).split('|').join(' '), gain: '' };
  }
  // 手の後の答え合わせ：選んだ方の結果（待ちの5枚の列）
  function verdict(ST, opts, fin) {
    const p = opts.pending, sc = p.scene;
    preload(sc.key);
    const S = makeScreen(ST, false);
    ST.board.appendChild(S.root);
    const run = ST.newRun();
    S.load(sc, true); S.tbtn(false);
    S.showBoard(run, false, 5).then(() => { S.bcards[4].classList.add('fin'); });
    S.mimiIn(run);
    const resTxt = String(opts.result || '').replace(/（.*）/, '');
    S.rib(resTxt ? '<b>' + resTxt + '</b>' : '');
    const go = async () => {
      S.ins(`答え合わせ：${p.pick === 'call' ? '払った' : '降りた'}`); await ST.wait(run, 800);
      await reveal(ST, run, S, S.d, p.pick, false);
      S.go('次へ', true);
      await new Promise(res => { S.q('.go').onclick = res; });
      fin({ correct: p.pick === S.d.answer });
    };
    go();
  }

  // ================= 卓に重ねる形（2026-11-17）=================
  // 「言う」は盤を開かず、卓の上に、相手の吹き出しと、おねだりの印（札の絵）を出すだけ。印は、卓の本物のリバーがめくれる時にも残す
  // （RD.tbl.close() で消す：「払う？降りる？」の盤を開く時・手が変わる時）。位置は卓の相手の絵（.v2-opp）の実際の場所から取る。
  const TBL_ONE = {
    begin(key, sc, bo) {
      const T = window.RD.tbl, { el } = window.RD.util;
      const d = derive(sc), L = T.ensure();
      const faces = {};
      FACE_NAMES.forEach(n => { faces[n] = { img: faceUrl(key, n), size: 'auto 360px', pos: Math.round(-(CX[key + '_' + n] * 0.64 - 150)) + 'px 8px' }; });
      const W = T.win(faces, 'drunk'), B = T.say(W);
      // 印（札の絵）：suit＝マークの札／rank＝数字の札（か でつなぐ）／color＝赤い札か黒い札／count＝「あと○枚」
      const sg = el('div', 'rdt-sign' + (d.sign.t === 'count' ? ' cnt' : '')), s = d.sign; let h = '<i>おねだり</i>';
      if (s.t === 'suit') h += '<div class="row"><div class="cdi' + (s.suit === 'h' || s.suit === 'd' ? ' r' : '') + '">' + SJ[s.suit] + '</div></div>';
      else if (s.t === 'rank') h += '<div class="row">' + s.ranks.map(r => '<div class="cdi tk">' + RN(r) + '</div>').join('<span class="or">か</span>') + '</div>';
      else if (s.t === 'color') h += '<div class="row"><div class="cdi col' + (s.red ? '' : ' k') + '">' + (s.red ? '赤いの' : '黒いの') + '</div></div>';
      else {
        // セリナの「あと○枚」：文で覚えさせず、絵の印で（同じマーク＝同じ色の5つ／両はし＝両側が光る並び／間＝まん中が光る並び。マークや数字は出さない）
        const bx = (n, x) => '<b' + (x ? ' class="x"' : '') + '></b>'.repeat(1) , row = (a) => '<div class="pic">' + a.map(x => bx(0, x)).join('') + '</div>';
        h += '<div class="pill">あと' + s.n + '枚</div>';
        if (d.kind === 'flush') h += row([0, 0, 0, 0, 0]).replace(/<b>/g, '<b class="f">') + '<em>同じマーク</em>';
        else if (d.outs.length >= 8) h += row([1, 0, 0, 0, 0, 1]) + '<em>両はし</em>';
        else h += row([0, 0, 1, 0, 0]) + '<em>間</em>';
      }
      sg.innerHTML = h; L.appendChild(sg);
      const place = () => {
        // 場札の5枚目（リバー）の右に置く：めくれたリバーと、すぐ隣で見くらべられる（相手の絵の横は卓の文字に重なった。11/17）
        sg.classList.remove('flat');
        const sp = T.span(), cr = T.cardRects(); let w = sg.offsetWidth || 70, h = sg.offsetHeight || 70;
        if (cr.length) {
          const pitch = cr.length > 1 ? cr[1].left - cr[0].left : cr[0].width + 6;
          const right5 = cr[0].left + pitch * 4 + cr[0].width;
          let x = right5 + 12, y = cr[0].top + cr[0].height / 2 - h / 2;
          // 卓のボタン（コール／降りる）に重なる幅なら、横に寝かせた形にして、ボタンと「リコのおすすめ」の札の上へ逃がす（667幅で印がコールを隠した。11/18）
          const ac = document.querySelector('.battle-screen .v2-actions'), ar = ac ? ac.getBoundingClientRect() : null;
          if (ar && ar.width && x + w > ar.left - 4 && y + h > ar.top - 30) {
            sg.classList.add('flat'); w = sg.offsetWidth || w; h = sg.offsetHeight || h;
            x = Math.min(right5 + 6, sp.right - w); y = ar.top - 30 - h - 2;
          }
          // 寝かせた印が相手の台詞に重なる時は、台詞を引っ込める（字が重なって読めないより、印を読ませる）
          const bt = document.querySelector('.battle-screen .v2-band-text'), br = bt ? bt.getBoundingClientRect() : null;
          T.body('rdt-flat-on', !!(sg.classList.contains('flat') && br && br.width && x < br.right + 4 && x + w > br.left && y < br.bottom && y + h > br.top));
          if (x + w <= sp.right + 1) { sg.style.left = x + 'px'; sg.style.top = Math.max(4, y) + 'px'; return; }
        }
        const r = W.rect; if (!r) return;
        let x = r.left - w - 8; if (x < sp.left) x = r.right + 8;
        sg.style.left = x + 'px'; sg.style.top = (r.top + 16) + 'px';
      };
      // 初回だけ、リコの一言（卓の吹き出しは夜は酔って崩れるので、ここに出す。印のすぐ下）
      let co = null;
      if (bo && bo.first) { co = el('div', 'rdt-coach', '<b>リコ</b>「あの札が来なければ、|役はできてない」'.split('|').join('<wbr>')); L.appendChild(co); }
      const placeCo = () => { if (!co) return; const r = sg.getBoundingClientRect(), sp = T.span(), w = co.offsetWidth || 200, h = co.offsetHeight || 46; let x = Math.max(sp.left, Math.min(r.left, sp.right - w)); co.style.left = x + 'px'; co.style.top = Math.max(4, r.top - h - 4) + 'px'; };   // 印の真上（ミミの札にも印にも重ならない）
      T.add(place); T.add(placeCo);
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      let alive = true;
      return {
        // おねだりを言う：窓に顔と吹き出し、印が出る。窓と吹き出しは言い終わったら引っ込め、印は残す
        async say() {
          W.show(true); W.face('drunk'); await wait(350);
          if (!alive) return;
          B.set(WHO[key].ask(d)); sg.classList.add('on'); place();   // | は折り目（fm で <wbr>）
          await wait(2600);
          if (!alive) return;
          B.set(null); W.show(false);
          if (co) { co.classList.add('on'); placeCo(); setTimeout(() => co.classList.remove('on'), 4800); }   // リコの一言は、相手の言う声が終わってから（重ならないように）。リバーをめくる間だけ見せて引っ込める（相手の台詞を隠さない）
        },
        close() { alive = false; T.close(); },
      };
    },
  };
  window.RD.onedariTable = TBL_ONE;
  window.RD.reg('onedari', { id: 'onedari', title: 'リーディング：おねだり', plan, mount, verdict, summary });
  window.RD.onedariEngine = { P, FULL, score, cmp, RN, SJ, hname, outsOf, derive, problems, signFor, plan, outcome, WHO, DEMO, NAME, altsOf, unambiguous, signTextOf };
})();
