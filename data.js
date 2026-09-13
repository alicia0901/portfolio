// ポートフォリオに掲載する全プロジェクトのデータ。
// index.html (一覧) と project.html (詳細ページ) の両方から <script src="data.js"> で読み込む。
//
// 新しいプロジェクトを追加する場合はこの配列に1件追記するだけでよい。
// フィールドの意味:
//   id       : 詳細ページのURL(project.html?id=xxx)に使うスラッグ。一意にすること
//   category : 一覧のフィルタタブに使うカテゴリ文字列
//   title    : プロジェクト名
//   desc     : 一言説明(一覧カード・詳細ページ共通)
//   story    : 開発の背景・課題(なぜ作ったか)。任意項目、詳細ページにのみ表示
//   features : 主な機能(箇条書き)
//   architecture : 技術的な工夫・設計判断(箇条書き)。任意項目、詳細ページにのみ表示
//   stack    : 技術スタックのタグ
//   path     : フォルダ/エントリーファイルの相対パス(表示用テキスト)
//   demo     : file://で直接開いても相対パスで動く静的Webアプリのみ指定(一覧・詳細どちらにも「デモを開く」リンクが出る)
//   demoNote : demoリンクのtitle属性に出す注記(任意)
//   impact   : 導入前後の比較。basis は "estimate"(推定, 既定) か "measured"(実測) のいずれか。
//              ページ上には「推定」「実測」の個別バッジは表示しない(ページ上部の注記文だけで示す)が、
//              basis自体はデータの性質を管理するために残しているので、実測データが無い限り "measured" にしないこと。
const PROJECTS = [
  {
    id: "travel-expense-splitter",
    category: "Web App",
    title: "旅行の割り勘ツール",
    desc: "参加者と支出を登録すると、誰が誰にいくら払えば精算できるかを自動計算するブラウザアプリ。",
    story: "旅行の精算のたびに誰かが電卓やExcelを持ち出して計算し、1円未満の端数で微妙な空気になる——という毎回の面倒を無くすために作った。",
    features: [
      "送金回数を最小化する精算アルゴリズム(全探索+greedyフォールバック)",
      "1円未満の端数も誤差なく配分。合計は必ず元の金額に一致",
      "サーバ不要。データはlocalStorageにのみ保存"
    ],
    architecture: [
      "状態は state = { people: [], expenses: [] } という1つのオブジェクトに集約し、変更のたびに localStorage へ永続化",
      "renderAll() を唯一の描画エントリポイントにし、状態が変わるたびに4つのセクションを丸ごと再構築(差分描画は行わずシンプルさを優先)",
      "精算(送金)回数の最小化は、対象人数が少ない(10人以下)ときだけ全探索(DFS)で厳密解を求め、それを超える場合は最大債務者⇔最大債権者を繰り返しマッチさせる greedy 法にフォールバックすることで、正確さと実行速度を両立"
    ],
    stack: ["HTML", "Vanilla JS", "localStorage"],
    path: "travel-expense-splitter/index.html",
    demo: "demos/travel-expense-splitter/index.html",
    impact: {
      basis: "estimate",
      metrics: [
        { label: "精算計算にかかる時間", before: "約25分", after: "約2分" },
        { label: "端数計算のズレ", before: "±数円", after: "0円" }
      ]
    }
  },
  {
    id: "umbrella-forecast",
    category: "Web App",
    title: "傘予報",
    desc: "現在地や行き先の地名と滞在時間帯を指定すると、傘が必要かどうかを3段階で判定する単一ページアプリ。",
    story: "天気アプリを開いても「結局、傘は要るのか要らないのか」を自分で時間帯ごとの数字から判断する必要があり、その一手間を無くしたかった。",
    features: [
      "降水確率×降水量から「不要 / 折りたたみ推奨 / 必須」の3段階判定",
      "Open-MeteoとNominatimを組み合わせ、APIキー不要かつ日本語地名検索に対応",
      "ビルド不要。ローカルサーバ起動のみで動作"
    ],
    architecture: [
      "指定した滞在時間帯の時間別データから最大降水確率と合計降水量を集計し、しきい値で3段階判定するロジックを renderResult() に集約",
      "Open-Meteo純正のジオコーディングAPIではなく OpenStreetMap Nominatim を採用し、日本語地名検索と現在地の逆ジオコーディングに対応",
      "外部APIはどちらも無料・APIキー不要な構成を選び、個人利用ツールとして運用コストゼロを実現"
    ],
    stack: ["HTML/CSS/JS", "Open-Meteo API", "Nominatim API"],
    path: "umbrella-forecast/index.html",
    demo: "demos/umbrella-forecast/index.html",
    demoNote: "外部APIへのfetchのためローカルサーバ経由での起動が必要",
    impact: {
      basis: "estimate",
      metrics: [
        { label: "外出前の天気判断にかかる時間", before: "約90秒", after: "約10秒" },
        { label: "傘の判断ハズレ率", before: "約20〜30%", after: "ほぼ0%" }
      ]
    }
  },
  {
    id: "sekkotsuin",
    category: "業務システム (GAS)",
    title: "接骨院予約システム",
    desc: "Google Apps Scriptだけで完結する接骨院向け予約システム。フォーム送信からスプレッドシート記録・カレンダー登録までを自動化。",
    story: "施術中は電話に出られず、後で折り返して予約日程を調整する負担と、手書き台帳への転記ミス・ダブルブッキングのリスクを減らすために作った。",
    features: [
      "営業時間外・定休日・時間重複の予約を自動拒否",
      "外部サーバ不要。Googleアカウントのみで運用可能",
      "共通エンジン+設定ブロック方式で他院への複製展開を自動生成するジェネレーター付き"
    ],
    architecture: [
      "gas/Code.gs を「共通エンジン + CONFIG設定ブロック」という構造にし、新しい店舗を作る際は CONFIG だけを差し替えれば予約ロジック本体(重複チェック・営業時間チェック等)は1箇所のまま共有できる設計",
      "setup/create-store.js が店舗設定ファイルから新しい店舗のコード生成・自動デプロイまで行うため、複製展開の作業をスクリプト化",
      "外部サーバを持たずGoogle Apps Script + スプレッドシート + カレンダーのみで完結させ、運用コストとインフラ管理の負担を最小化"
    ],
    stack: ["Google Apps Script", "HTML", "Google Calendar API"],
    path: "接骨院予約システム/",
    impact: {
      basis: "estimate",
      metrics: [
        { label: "予約受付1件あたりの電話対応時間", before: "約4分", after: "0分" },
        { label: "予約台帳への転記作業(1件あたり)", before: "約3分", after: "0分" },
        { label: "ダブルブッキング発生件数", before: "月 約1件", after: "月0件" }
      ]
    }
  },
  {
    id: "inshokuten",
    category: "業務システム (GAS)",
    title: "飲食店予約システム",
    desc: "座席数ベースの空席管理・キャンセル待ち自動通知・店舗向け管理画面まで備えた飲食店向け予約システム。",
    story: "電話予約だと満席時に断るしかなく機会損失になること、月末の予約集計を手作業でやっている負担を見て、接骨院予約システムの共通エンジンを土台に飲食店向けに拡張した。",
    features: [
      "総座席数×コース滞在時間から時間帯ごとの空席をリアルタイム計算",
      "満席時のキャンセル待ち登録と、空席発生時の自動メール通知",
      "管理画面で予約変更・集計・週間ビュー・臨時休業設定・LINE LIFF連携に対応"
    ],
    architecture: [
      "1テーブル専有ではなく総座席数を基準にした空席計算にすることで、複数組の同時予約に対応(コース滞在時間から時間帯ごとの占有座席数を逆算)",
      "満席時はキャンセル待ちとして登録を受け付け、キャンセル等で座席に空きが出た際に収まる組へ自動メール通知(確定操作自体は管理画面での繰り上げ確定に留め、二重予約を防止)",
      "同一電話番号からの短時間の連続送信・大量送信をブロックする簡易スパム対策を予約フォーム側に実装",
      "ランチ・ディナーのような中抜け営業や、特定日だけの臨時休業・臨時営業にも対応できるよう営業時間設定を柔軟な構造にした"
    ],
    stack: ["Google Apps Script", "HTML/CSS/JS", "LINE LIFF"],
    path: "飲食店予約システム/",
    impact: {
      basis: "estimate",
      metrics: [
        { label: "満席時に取りこぼす予約(月間)", before: "約10件", after: "約3件(キャンセル待ちから回収)" },
        { label: "月次予約集計にかかる時間", before: "約45分", after: "約1分" },
        { label: "無断キャンセル率", before: "約10%", after: "約5%" }
      ]
    }
  },
  {
    id: "netdiag",
    category: "CLIツール",
    title: "netdiag",
    desc: "自宅ネットワークを実測で切り分けるWindows専用診断スクリプト。1コマンドで複数指標をまとめて測定する。",
    story: "自宅ネットワークが「なんとなく遅い」と感じたときに、体感ではなく実測データで原因を切り分けたかった。",
    features: [
      "Wi-Fi/IPv6/遅延/経路/DNS/スループット/バッファブロートを一括計測しJSON保存",
      "ラベル付き実行結果を比較し、設定変更の前後効果を検証できる",
      "追加パッケージ不要。Python標準ライブラリのみで動作"
    ],
    architecture: [
      "macOS専用の networkQuality コマンド(RPM値)がWindowsに存在しないため、6並列ダウンロード中にICMP pingを打ち続けアイドル時との差分からバッファブロートを独自にA+〜Fでグレーディングする代替指標を自作",
      "Windows標準のcurl.exeとPython標準ライブラリのみに依存を絞り、追加パッケージのインストールなしでそのまま実行できるようにした",
      "Wi-Fiのノイズ/SNRなどWindowsのAPIが公開しない値は取得不能である旨をREADMEに明記し、測定できないものを誠実に切り分けている"
    ],
    stack: ["Python", "標準ライブラリのみ"],
    path: "netdiag/netdiag.py",
    impact: {
      basis: "estimate",
      metrics: [
        { label: "原因切り分けにかかる時間", before: "約45分", after: "約5分" },
        { label: "使用するツールの数", before: "3〜4個", after: "1個" }
      ]
    }
  }
];
