# Home screen v12 — design review request

You are a senior game UI art director reviewing a home screen mock for a paid, premium Japanese browser game. Be blunt and concrete. Reply in Japanese.

## The game
- 『ミミのテキサスホールデムポーカー』: anime-style Texas Hold'em adventure. The player is rookie bunny-girl dealer Mimi; her mentor リコ先輩 (Rico) teaches her and is the home screen's star. Story = 5 opponents (リコ先輩の研修, ポルカ, セリナ, グラーノ, ヴェルベット).
- Setting: 「グランドクロック・カジノシアター」 — a giant casino + theater built inside a huge clock tower, English Baroque, opulent (gold, crimson velvet, marble, chandeliers, clockwork). Colors: black / crimson / gold. **No purple.**
- Home destinations: 今夜の卓へ (main action, go to the next story table), 交換所 (shop), コレクション (reward CGs), ぱにゅぱにゅ (touch mini-game with Mimi), リコの教室 (lessons), 衣装 (Rico's outfits, 11, shown on home), plus coins, notices, gifts, settings.
- Played on PC (1280×800 stage) and **phones in landscape only** (e.g. 844×390). Never portrait.

## What the producer said so far (must respect)
- Quality above everything. Previous home v11 "シンプルすぎて安く見えた" (too simple → looked cheap): flat text list of destinations, no material feel, no life.
- "ロイヤルフラッシュあと2枚" progress metaphor was unclear → replaced with 5 opponent portrait cards (WIN / tonight glowing / locked).
- Never frame characters in circles (cheap). Past rule "faces in skewed parallelogram windows" is NOT absolute — choose what fits.
- Wants the latest stylish game-home sensibility (2025–2026 top gacha / premium anime games), researched, not generic.
- The illustration is a placeholder (ChatGPT render). Final art will be redrawn as layers (background + Rico) so it can move (breathing, gears turning, candle flicker). Judge the UI skeleton and art direction, not the placeholder's fine details.

## Files
- Mock: `docs/design-ref/home-v12.html` (open/read the code)
- Screenshots: `qa-shots/home_v12_pc.png` (1280×800), `qa-shots/home_v12_phone.png` (844×390)

## What I need from you
1. Overall verdict: does this read as a premium 2026 game home? What still looks cheap or dated, and why (be specific to elements).
2. Top 8 concrete fixes, ranked by impact. For each: what to change, exact direction (layout px / type / material / motion), and whether it is doable in HTML/CSS now or needs a new art asset (describe the asset).
3. Hierarchy check: is 「卓へ」 unmistakably the focal action? Is anything competing?
4. Phone landscape (844×390): readability (min ~11px on screen), tap targets (≥44px on screen), crowding.
5. Anything to remove.
Keep it under ~900 Japanese characters per section; no preamble.
