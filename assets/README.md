# 画像素材の格納場所

このフォルダに画像を置くと、自動的にゲーム内で表示されます。
画像が無くてもゲームは動作し、CSS仮表示（紫パネル＋テキスト）にフォールバックします。

---

## ディレクトリ構成

```
tousatsu_mimi/
└── assets/
    ├── characters/   ← キャラ立ち絵（透過PNG推奨）
    ├── backgrounds/  ← 背景画像（1920×1080）
    └── ui/           ← カード裏・アイコン・演出ロゴ
```

ファイル名は **必ず以下と一致** させてください（大文字小文字も完全一致）。

---

## Phase 1で参照する画像

### キャラクター（`assets/characters/`）

| ファイル名 | サイズ | 背景 | 用途 | 優先度 |
|---|---:|---|---|:-:|
| `mimi_default.png`  | 1024×1536 | 透過 | ミミ通常立ち絵（タイトル・バトル・チュートリアル） | S |
| `mimi_blush.png`    | 1024×1536 | 透過 | ミミ赤面差分（心理バトル失敗時など） | S |
| `rico_default.png`  | 1024×1536 | 透過 | リコ先輩通常立ち絵（バトル左パネル・チュートリアル相手） | S |
| `polka_default.png` | 1024×1536 | 透過 | ポルカ通常立ち絵（Stage 2対戦相手） | S |
| `polka_panic.png`   | 1024×1536 | 透過 | ポルカ焦り差分（ブラフ看破時） | A |

### 背景（`assets/backgrounds/`）

> Phase 1ではCSSグラデーションで代替済み。配置すると豪華になります。

| ファイル名 | サイズ | 用途 | 優先度 |
|---|---:|---|:-:|
| `title_bg.png`       | 1920×1080 | タイトル画面背景 | A |
| `poker_table_bg.png` | 1920×1080 | ポーカーバトル画面背景 | S |

### UI（`assets/ui/`）

| ファイル名 | サイズ | 背景 | 用途 | 優先度 |
|---|---:|---|---|:-:|
| `card_back_default.png` | 512×768 | 透過/カード単体 | カード裏面 | B |
| `icon_panyu.png`        | 512×512 | 透過 | ぱにゅゲージアイコン | C |
| `icon_zazazo.png`       | 512×512 | 透過 | ゾゾゾゲージアイコン | C |
| `logo_tousatsu.png`     | 1024×512 | 透過 | タイトルロゴ | C |

---

## Phase 2 で追加（参考）

| ファイル名 | フォルダ | 用途 |
|---|---|---|
| `selina_default.png` | characters/ | セリナ立ち絵 |
| `grano_default.png` | characters/ | グラーノ立ち絵 |
| `shop_bg.png` | backgrounds/ | 交換所背景 |
| `card_back_red_gold.png` | ui/ | 赤金カード裏スキン |
| `rico_smile.png` | characters/ | ショップ用リコ笑顔差分 |

## Phase 3 で追加（参考）

| ファイル名 | フォルダ | 用途 |
|---|---|---|
| `velvet_default.png` | characters/ | ヴェルベット立ち絵 |
| `velvet_shaken.png` | characters/ | ヴェルベット動揺差分 |
| `vip_room_bg.png` | backgrounds/ | VIPルーム背景 |
| `effect_bluff_break.png` | ui/ | ブラフブレイク演出 |
| `effect_tousatsu_daigyakuten.png` | ui/ | 闘札大逆転演出 |
| `mimi_serious.png` | characters/ | 大逆転演出時のミミ |
| `rico_serious.png` | characters/ | 最終助言時のリコ |

---

## キャラ立ち絵の作画ガイド

`common_asset_spec_v2.txt` から抜粋：

- **キャンバスサイズ統一**：全キャラを 1024×1536 か 1024×1792 で統一
- **背景透過 PNG**：周囲に余白80px以上
- **構図**：全身または膝上、中心線をキャンバス中央に
- **顔位置**：上から25〜40%の範囲
- **入れない**：文字 / ロゴ / UI / 手札カード / キャラの背景
- **ゲーム側の表示**：`object-fit: contain` で枠に収めて表示

### 画像生成プロンプト例

```
high quality Japanese anime game character sprite, transparent background,
full body or knee-up standing pose, clean silhouette, centered character,
no text, no logo, no UI, bright fantasy casino theme,
black red gold purple accents, expressive face,
elegant but playful light novel game style
```

---

## 背景画像の作画ガイド

- 中央〜下部に余白を残す（UIを重ねるため）
- 文字・ロゴ・キャラを入れない
- 明るい異世界カジノ風、黒・赤・金・濃紫

### 画像生成プロンプト例

```
16:9 game background, 1920x1080, no characters, no text, no logo,
designed for UI overlay, bright fantasy casino lounge,
black red gold purple color palette, elegant magical casino,
clean central space for poker UI
```

---

## 画像未配置時のフォールバック

ゲーム側で以下の代替表示が自動で出ます。

- **キャラ未配置** → 紫グラデの仮パネル＋「[名前] 説明 (仮表示)」テキスト
- **背景未配置** → CSSグラデーション（タイトル=濃紫、バトル=赤黒、結果=金）
- **カード未配置** → HTML/CSSでスートとランクを描画

console には `404` 警告が出ますが、ゲーム進行は止まりません。

---

## 確認方法

1. このフォルダに画像を配置
2. ブラウザでゲーム画面をハードリロード（Ctrl+Shift+R）
3. 画像が正しく表示されればOK
4. 表示位置がズレる場合は、画像のキャンバスサイズと余白を確認
