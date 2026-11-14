# Home screen — round 2: define the FINISHED look

Reply in Japanese. You are a senior art director for a premium Japanese anime game. Read first:
- `docs/design-ref/home-v12-review-brief.md` (game, setting, constraints)
- `docs/design-ref/home-v12-review-fable.md` and `docs/design-ref/home-v12-review-astra.md` (round 1 reviews by you two)
- `docs/design-ref/home-v13.html` + screenshots `qa-shots/v13_pc.png`, `qa-shots/v13_sp.png` (v13 applied your round-1 fixes)

Producer's verdict on v13: 「骨しかないので判断できません。もう一度話し合ってもっと良いものに」 — it is only a code skeleton (CSS shapes, placeholder art); he cannot judge quality. He needs to SEE the finished look. Earlier he said: v11 "too simple → cheap", quality above all, wants 2025–2026 premium game-home sensibility, setting = giant clock tower casino theater, English Baroque, black/crimson/gold, no purple, no circular character frames, phone landscape only.

Our next step: generate a single high-fidelity **concept image of the finished home screen** (16:9, UI and art painted together as one key frame, like a studio's UI concept art), with ChatGPT image generation, using reference images (Rico's design sheet `assets/characters/rico_default.webp`, the clock hall `assets/backgrounds/bg_lobby_clock.jpg`, opponent faces). Then build the real screen from assets that match it.

Deliver (be concrete, no preamble, ≤1800 Japanese chars total):
1. **Finished-look direction** in 5–8 bullets: the one big idea that makes this home unforgettable (not generic gacha), how the clock tower / theater / casino appear IN the UI, materials of each UI part, typography, light, motion.
2. **Layout of the finished frame** (PC 1280×800): every element with position/size, what it is made of, and what it shows. Keep 「今夜の卓へ」 the single focal action and Rico the visual star.
3. **The concept-image prompt** to give ChatGPT (Japanese, ready to paste, ≤900 chars), describing the full screen including UI parts as painted objects. Note: ChatGPT garbles small text — specify only a few short large labels or use decorative pseudo-text.
4. **Asset list** to build the real screen afterwards (each asset: what, size, transparent or not).
5. One thing in the other reviewer's round-1 review you disagree with, and why.
