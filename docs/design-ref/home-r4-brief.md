# Home v14 → v15: depth & motion of UI parts

Reply in Japanese, concrete, ≤1400 chars, no preamble. Paths relative to C:\Users\takakazu\projects\mp_panyu.
- Current: `docs/design-ref/home-v14.html`, screenshot `qa-shots/home_v14_pc.png` (view it). Parts are real painted assets in `docs/design-ref/img/home/` (plate.png, plate_pic.png, nameplate.png, frame.png (curtained frame), ticket.png, ledger.png (5 windows), oct.png, seal.png, mark.png, lock.png) over one painted scene (scene.png: Rico leaning on a casino table, giant clock face seen from behind, long hand pointing to the bottom-right).
- Producer: 「部品の立体感や動きが大事ですよ。きれいに並んでるだけじゃないのが最近の流行りだと思っています」 — v14 looks like nice parts lined up in a grid; he wants parts that live in 3D space and move, like recent premium game homes.

Give, for each part (nameplate, 5 guide plates, Grano frame, ticket CTA, ledger, top-right buttons):
1. Placement in space: z-depth (px, for CSS perspective 1400px), rotation (rotateX/Y/Z deg), offset from the grid, overlaps, how it is physically held (hung on chains, pinned, lying on the table, floating…).
2. Idle motion (amplitude, period), entrance choreography (order, from where, easing, overshoot), hover/press reaction, and reaction to pointer parallax.
3. One "signature" interaction that ties UI to the scene (e.g. the long hand ticks and the ticket responds).
Name the recent games whose patterns you borrow. Keep phone-landscape and 60fps-cheap CSS (transform/opacity only) in mind.
