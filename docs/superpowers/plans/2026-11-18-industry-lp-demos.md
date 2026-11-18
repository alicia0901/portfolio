# 業種別 飲食店LPデモ 3本 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 大衆酒場「まるよし」・喫茶「ことり」・炭火焼肉「ひのと」の3本のLPデモを `demos/` に追加し、`data.js` に掲載する。

**Architecture:** くゆり(`demos/kuyuri/index.html`)と同じく、各店はHTML1ファイル(CSS・JSインライン)と同フォルダの写真で完結させる。見た目・予約UIは店ごとに別実装。検証はPlaywrightの共通スクリプト1本で、3ページに共通するDOMの目印(下記)を使って行う。

**Tech Stack:** HTML/CSS/バニラJS、Google Fonts。検証は Playwright(環境にインストール済み、`require('playwright')`)。

**Spec:** `docs/superpowers/specs/2026-11-18-industry-lp-demos-design.md`

## Global Constraints

- ビルド・ライブラリなし。外部読み込みは Google Fonts のみ。
- `<html lang="ja">`、`<meta name="robots" content="noindex">`、`<title>` は「<店名>｜<一言>(制作デモ)」の形式。
- 上部の `.demo-bar` に「制作実績用のデモサイトです。店舗・料金・空席情報はすべて架空です。制作：<a href="https://alicia0901.github.io/portfolio/">Alicia</a>」を入れる。
- footer には「<店名>(架空店舗)｜制作実績用デモサイト」「空席表示は、制作者が開発した<a href="https://alicia0901.github.io/portfolio/project.html?id=inshokuten">飲食店予約システム</a>との連携イメージです」「写真：AI生成イメージ｜制作：Alicia(リンク)」を入れる。
- 空席は総座席数ベースのサンプル値。席種・個室別の空席は出さない。
- 確認ダイアログの注記は、くゆりと同じ文面にする(予約:「デモのため予約は確定しません。実際のシステムでは、ご予約の受付・確認メール・店舗カレンダーへの登録までが自動で行われます。」/キャンセル待ち:「デモのため登録はされません。実際のシステムでは、お席が空いたときに自動でメールが届きます。」)。ボタンは「予約システムを見る」(上記 inshokuten URL)と「閉じる」。
- 住所は「東京都架空区○○町」で、あかね町以外。電話は「00-0000-0000(架空)」。
- `prefers-reduced-motion: reduce` で動き(アニメーション・smooth scroll)を止める。
- 幅 360px〜1440px で横スクロールが出ないこと(意図した横スクロール領域の内側は除く)。

## 3ページ共通のDOMの目印(検証スクリプトが依存する)

- 写真枠: `<figure class="ph" data-label="<写真の説明>"><img src="<slug>-xxx.jpg" ...></figure>`。画像が読めないときは `<figure>` に `is-empty` クラスが付き、`<img>` は非表示、`::after` で `写真：<data-label>(イメージ)` を表示する。判定は各ページ末尾のスクリプトで行う。対象は `img.complete && img.naturalWidth === 0` のもの+ `error` イベントが発生したもの。`loading="lazy"` のものも対象にする。
- 予約の空き枠ボタン: `button[data-slot]`。属性は `data-date="YYYY-MM-DD"`、`data-time="HH:MM"`、`data-left="<残席数>"`。満席の枠も押せる(キャンセル待ちに進む)。
- 日付の選択肢(まるよし・ひのとの日付帯/タブ。ことりはカレンダーのセル): `[data-day="YYYY-MM-DD"]`。定休日は出さない(ことりのカレンダーでは定休日のセルを `data-closed` にし、枠ボタンを出さない)。
- 人数: `select#rsvPeople`(value は数値の文字列)。コース: `select#rsvCourse`。
- 進むボタン: `button#go`。文言は通常「ご予約に進む」、`left === 0` または 人数 > `left` のときは「キャンセル待ちに登録」。
- ダイアログ: `dialog#dlg`。見出しは「ご予約内容の確認」/「キャンセル待ちのご登録内容」。

## Review Focus

1. 写真がまだ1枚もない状態 — 壊れた画像アイコンは出さず、すべての枠にラベル付きの面が出る(lazy の画像や、スクリプトより先に error が起きた画像も含む)。→ 各タスクの検証「placeholders」
2. 残席より多い人数を選んだ場合 — 「ご予約に進む」ではなく「キャンセル待ちに登録」になる。→ 検証「overbook」
3. 今日が定休日の場合 — 定休日が選択肢に一切出ない。→ 検証「closed-day」(日付を固定して確認)
4. スマホ幅(375px) — ページ全体に横スクロールが出ない。→ 検証「no-hscroll」
5. 日付を切り替えた場合 — 前の日付で選んだ時間がそのまま残って、別の日のまま予約に進めてしまわない(選択が解除され、人数・コース欄が隠れる)。→ 検証「day-switch」

---

### Task 1: 共通検証スクリプトと、大衆酒場「まるよし」

**Files:**
- Create: `<scratchpad>/verify-lp.js`(リポジトリには入れない。portfolio にはテスト基盤が無く、増やさない)
- Create: `demos/maruyoshi/index.html`
- Create: `demos/maruyoshi/PHOTOS.md`

**Interfaces:**
- Produces: `node verify-lp.js <html-path> --closed=<曜日番号,…> --open=<HH:MM-HH:MM>` が上記の目印を使って下の検証を行い、すべて通れば `ALL PASS` を出力し、失敗があれば終了コード1で終わる。Task 2・3 でも同じスクリプトを使う。

- [ ] **Step 1: `verify-lp.js` を書く。** `file://` で開き、以下を順に確認する。
  - `console-clean`: console の error と pageerror が0件(画像の404による "Failed to load resource" は除く)
  - `placeholders`: 写真ファイルが無い状態で、`figure.ph` がすべて `is-empty`、すべての `img` が非表示(`offsetParent === null`)
  - `no-hscroll`: 375×812 と 1440×900 で `document.documentElement.scrollWidth <= innerWidth`
  - `closed-day`: `page.clock.setFixedTime` で「定休日に当たる日」の12:00に固定して再読込し、`[data-day]` と `button[data-slot]` の `data-date` に定休曜日が含まれない
  - `book`: `data-left` が人数の初期値以上の枠を押し、`#go` が「ご予約に進む」、押すと `dialog#dlg[open]` で見出しが「ご予約内容の確認」、dl に日付・時間が入っている
  - `waitlist`: `data-left="0"` の枠を押すと `#go` が「キャンセル待ちに登録」で、ダイアログ見出しが「キャンセル待ちのご登録内容」。表示中の日付に満席枠が無ければ、ほかの日付も順に探す(固定日時の中で必ず1枠は満席になるサンプル値にする)
  - `overbook`: `0 < data-left < 人数の最大値` の枠を選び、人数を `left + 1` にすると `#go` が「キャンセル待ちに登録」に変わる
  - `day-switch`: 枠を選んだあと別の `[data-day]` を押すと、`[data-slot][aria-pressed="true"]` が0件になり、`#go` が非表示になる
- [ ] **Step 2: 空のページで失敗を確認。** `demos/maruyoshi/index.html` に demo-bar だけを置いて実行し、`FAIL` が出ることを確認する。
- [ ] **Step 3: まるよしを実装。** 設計書「A. 大衆酒場まるよし」の通りに作る。固定値は次の通り。
  - 総座席 40 / 定休 日曜(0) / 営業 16:00〜24:00 / 予約枠 17:00〜21:00 の30分刻み(9枠)
  - 日付帯: 今日から定休日を除く7日分、横スクロール。枠の表示記号は ◎(残り>15)○(6〜15)△(1〜5)×(0)。記号の意味の凡例も出す
  - 人数: 2〜20名(初期値4)、「21名以上・貸切は電話」の注記。コース: 「宴会A 飲み放題2時間(3,500円)」「宴会B 飲み放題2時間(4,500円)」「宴会C 飲み放題2.5時間(5,500円)」「席のみ」
  - 今月のおすすめ: 月(0〜11)ごとに1品の旬メニュー名を配列で持ち、表示時の月で出す
  - フォント: Dela Gothic One(見出し)、Yusei Magic(短冊)。色トークンを `:root` に定義(赤提灯の赤・生成り・墨・黄色)
  - 写真枠(`figure.ph`): `maruyoshi-hero.jpg`(赤提灯と外観)、`maruyoshi-yakitori.jpg`、`maruyoshi-motsuni.jpg`、`maruyoshi-enkai.jpg`(宴会の卓)、`maruyoshi-zashiki.jpg`、`maruyoshi-counter.jpg`
- [ ] **Step 4: `PHOTOS.md` を書く。** 写真ごとに、ファイル名・使う場所・縦横比・推奨ピクセル数・生成プロンプト(日本語と英語。実在店舗のロゴや看板の文字を入れない指示を含む)・alt文。
- [ ] **Step 5: 検証。** `node verify-lp.js /home/user/portfolio/demos/maruyoshi/index.html --closed=0 --open=17:00-21:00` → `ALL PASS`。あわせて 375px と 1440px のスクリーンショット(deviceScaleFactor 1、scratchpad に保存)を目で確認し、くゆりの色違いに見えないこと・文字の重なりがないことを確かめる。
- [ ] **Step 6: Commit** `git add demos/maruyoshi && git commit -m "LP制作見本: 大衆酒場まるよしを追加"`

### Task 2: 喫茶「ことり」

**Files:**
- Create: `demos/kotori/index.html`, `demos/kotori/PHOTOS.md`

**Interfaces:**
- Consumes: Task 1 の `verify-lp.js` と、共通のDOMの目印

- [ ] **Step 1: 実装。** 設計書「B. 喫茶ことり」の通りに作る。固定値は次の通り。
  - 総座席 16 / 定休 水曜(3) / 営業 9:00〜18:00 / 予約枠 11:00・13:00・15:00(各2時間)
  - 予約カレンダー: 今日から14日分を曜日ごとの列のグリッドで出す。セルに `data-day`、各セルの中に3つの `button[data-slot]`(小さな丸。空き/残りわずか(1〜4)/満席)。水曜のセルは `data-closed` で「定休日」と出し、枠ボタンを出さない。スマホでは7列のまま収まるよう、丸の大きさと時刻表示を縮める(押せる領域は 32px 以上)。カレンダーのセルを押すと、その日の3枠が詳細欄に大きく出る。`day-switch` 検証はこのセルの切り替えで満たす
  - 人数: 1〜4名(初期値2)。プラン: 「季節のアフタヌーンティー(3,800円)」「ケーキセットのお席予約(1,200円〜)」
  - 季節名: 3〜5月 春/6〜8月 夏/9〜11月 秋/12〜2月 冬。季節ごとのアフタヌーンティー名(例: 冬 = 「冬のいちごアフタヌーンティー」)を配列で持つ
  - フォント: Zen Maru Gothic。色: 白・生成り・ミント・くすんだピンク
  - 写真枠: `kotori-hero.jpg`(アフタヌーンティーのスタンド)、`kotori-cake.jpg`、`kotori-drip.jpg`、`kotori-window.jpg`(窓辺の席)、`kotori-exterior.jpg`
- [ ] **Step 2: `PHOTOS.md`**(Task 1 Step 4 と同じ形式)
- [ ] **Step 3: 検証。** `node verify-lp.js /home/user/portfolio/demos/kotori/index.html --closed=3 --open=11:00-15:00` → `ALL PASS`。375px と 1440px のスクリーンショットを目で確認する。
- [ ] **Step 4: Commit** `git commit -m "LP制作見本: 喫茶ことりを追加"`

### Task 3: 炭火焼肉「ひのと」

**Files:**
- Create: `demos/hinoto/index.html`, `demos/hinoto/PHOTOS.md`

**Interfaces:**
- Consumes: Task 1 の `verify-lp.js` と、共通のDOMの目印

- [ ] **Step 1: 実装。** 設計書「C. 炭火焼肉ひのと」の通りに作る。固定値は次の通り。
  - 総座席 48 / 定休 火曜(2) / 営業 17:00〜23:00(土日祝 11:30〜14:30 もあり) / 予約枠 夜 17:00〜21:00 の30分刻み、土日は加えて 11:30〜13:00 の30分刻み
  - 日付タブ: 今日から定休日を除く7日分。時間ごとの縦リストで、各行は `button[data-slot]`。行の中に時刻・混み具合のバー(`(48-left)/48` の幅)・「残りN席」または「満席」を出す
  - 人数: 1〜12名(初期値2)。コース: 「上カルビコース 全8品(5,980円)」「特選和牛コース 全10品(8,980円)」「席のみ」
  - 部位図: 牛の横向きシルエットをインラインSVGで描き、部位(タン・肩ロース・リブロース・サーロイン・ヒレ・ランプ・カルビ(バラ)・ハラミ)を `<button>` 相当(SVG内の `role="button"` `tabindex="0"`、Enter/Space で選択)にする。選択した部位の名前・説明・価格を横の欄に出す。凡例のリストも用意し、SVGを押せない環境でも同じ選択ができるようにする
  - フォント: Zen Kaku Gothic New(700/900)、Bebas Neue(数字・英字)。色: 黒・炎の赤・オレンジ
  - 写真枠: `hinoto-hero.jpg`(網の上の肉)、`hinoto-wagyu.jpg`(盛り合わせ)、`hinoto-charcoal.jpg`、`hinoto-course.jpg`、`hinoto-interior.jpg`
- [ ] **Step 2: `PHOTOS.md`**(Task 1 Step 4 と同じ形式)
- [ ] **Step 3: 検証。** `node verify-lp.js /home/user/portfolio/demos/hinoto/index.html --closed=2 --open=11:30-21:00` → `ALL PASS`。あわせて部位図を Playwright でクリックとキーボードで1部位ずつ選び、説明欄が変わることを確認する。375px と 1440px のスクリーンショットで、くゆりと並べて別物に見えることを確認する。
- [ ] **Step 4: Commit** `git commit -m "LP制作見本: 炭火焼肉ひのとを追加"`

### Task 4: ポートフォリオへの掲載と push

**Files:**
- Modify: `data.js`(`kuyuri-lp` の後ろに3件追加)
- Modify: `README.md`(ディレクトリ構成の `demos/` に3フォルダを追記。LP制作見本の段落を、くゆり1本から4本の説明に更新)
- Modify: `CLAUDE.md`(`demo` フィールドの段落で、LP制作見本の列挙に3本を加える。スクリーンショットは写真が入ってから撮る旨を追記)

- [ ] **Step 1: `data.js` に3件追加。** `id` は `maruyoshi-lp` / `kotori-lp` / `hinoto-lp`、`category: "LP制作"`、`title` は「飲食店LP「大衆酒場 まるよし」(架空店舗)」の形式。`desc`・`story`・`features`・`architecture` はくゆりの項目と同じ粒度で、各店の業種と予約UIの違いを書く(story には「くゆりとは違う業種・雰囲気でも作れることを示すため」を含める)。`stack: ["HTML/CSS/JS"]`、`path`・`demo` は `demos/<slug>/index.html`、`demoNote: "架空店舗のデモ。予約ボタンを押しても実際の予約は行われません"`。`screenshot` は付けない。
- [ ] **Step 2: README.md と CLAUDE.md を更新。**
- [ ] **Step 3: 一覧と詳細の表示確認。** `python3 -m http.server` で配信し、Playwright で `index.html` の「LP制作」タブにカードが4件出ること、`project.html?id=<3つのid>` がそれぞれ404表示にならず、「デモを開く」のリンク先が200を返すことを確認する。
- [ ] **Step 4: Commit と push。** `git commit -m "LP制作見本3本をポートフォリオに掲載"`、続けて `git -C /home/user/portfolio -c push.negotiate=true push -u origin claude/relaxed-euler-yg9e7d`。main には push しない。
