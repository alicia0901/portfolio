# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (claude.ai/code) への手引きです。

## 概要

`claude/` 配下の各プロジェクトのうちゲーム系を除いたものを紹介する、静的な一覧+詳細ページ構成のポートフォリオサイト。ビルド不要、依存関係なし。

## 開発

`index.html` を直接開くか、ディレクトリを静的配信する(例: `python -m http.server`)。ビルド/lint/テストのコマンドは無い。

## アーキテクチャ

- **`data.js`**: 掲載する全プロジェクトのデータ(`PROJECTS` 配列)を一元管理する唯一のソース。`index.html`(一覧)と `project.html`(詳細)の両方が `<script src="data.js">` で読み込む。新規プロジェクト追加時はこの配列に1件追記するだけでよい。詳細なフィールド仕様は `README.md` を参照。
- **`style.css`**: デザイントークン(`:root` の CSS変数)と、一覧ページ・詳細ページ共通のコンポーネントスタイルを1ファイルに集約。`index.html`/`project.html` はどちらもこれを `<link rel="stylesheet">` で読み込むのみで、スタイルの重複は無い。
- **`index.html`**: カテゴリタブによる絞り込み(`renderFilters`/`render`)をバニラJSで実装。各カードのタイトル・「詳細を見る」リンクは `project.html?id=<id>` を指す。
- **`project.html`**: 詳細ページの共通テンプレート。URLの `?id=` クエリパラメータで `PROJECTS` 配列から該当データを検索して描画する(`getProject`/`renderProject`)。該当IDが無い場合は `renderNotFound()` で簡易的な404相当の表示を出す。プロジェクトごとに個別ファイルは作らない。
- `demo` フィールドは、このリポジトリの `demos/` 配下に実体があり相対パスで動く静的Webアプリ(旅費精算アプリ・傘予報)にのみ設定する。GAS製システムやCLI/Pythonツールは単体では起動できないため設定しない。`demos/` の中身は元プロジェクト(`../travel-expense-splitter/`, `../umbrella-forecast/`)からのコピーであり、このリポジトリが公開用の単独リポジトリ(GitHub: alicia0901/portfolio, GitHub Pagesで公開)であるため同梱している。元プロジェクト側を更新した場合はこちらにも反映すること。
- `impact`(導入前後の比較)は `before → after` の数値で表示する。ほぼ全プロジェクトが `basis: "estimate"`(推測値)であり、実際に計測した数値ではない。個別の「推定」バッジは表示しない代わりに、一覧ページ上部の注記文(index.htmlの`.disclaimer`)と、`basis !== "measured"` のプロジェクトの詳細ページ下部の一文(project.htmlの`.disclaimer`)でまとめて注記している。実測データがある場合(現状は競馬AIの回収率のみ)は `basis: "measured"` にし、この注記を出さない。推測値を実測であるかのように表示しないこと。
- ライト/ダークテーマは `prefers-color-scheme` に追従する(手動切り替えUIは無い)。

## 更新時の注意

このページが紹介する対象は `claude/` ワークスペースの直下フォルダ一覧に依存する。新しい非ゲーム系プロジェクトが追加された場合は `data.js` への追記を検討し、ゲーム系プロジェクトは掲載しない。スクリーンショットや画像を追加する場合、実際に動作させて撮影したもの以外(生成・捏造した画像)は掲載しないこと。
