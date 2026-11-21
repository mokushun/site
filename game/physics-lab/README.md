# PHYSICS LAB

近未来の物理研究施設を舞台にした、ブラウザ完結型の3D物理アクション・パズルゲーム。
企画・実装仕様は `PHYSICS_LAB_SPEC.md`、AI向け指示は `AGENT_INSTRUCTIONS.md` を参照。

## 現在の状態: Phase 5 実装済み（2026-11-21）

Phase 1（基本物理環境）、Phase 2（操作とゲーム基盤）、Phase 3（ギミック）、
Phase 4（ステージ実装）、Phase 5（ゲームシステム）を実装済み。
残るは Phase 6（演出と仕上げ）のみ。

### Phase 1〜4 の要約
- Three.js + Rapier 3D、固定 60Hz タイムステップ、球体プレイヤー
  （速度ステアリング移動・ジャンプ・ブースト・三人称カメラ）
- チェックポイント、リスポーン、落下判定、ポーズ、HUD
- ギミック6種: ジャンプ台 / 回転床 / 移動床 / 風エリア / 磁力エリア / シーソー
- ステージはデータ定義（`src/data/stages.js`）で5面を同じコードで構築
- 動く床の運搬は摩擦だけでは転がる球を運べないため、足場を特定して
  球を追従させる運搬補助（PlatformCarrier）を併用している

### Phase 5 で実装したもの（ゲームシステム）
- **クリスタル収集**: 球が近づくと取得（各ステージ3個）。HUD 右上に
  取得数、取得時に中央通知。収集したクリスタルは消える
- **クリア記録とランク**: ゴールでタイマーを止め、クリアタイム・
  クリスタル数・リスポーン回数を記録。ランクは S/A/B の3段階
  （条件はステージ定義データで調整可能）:
  - S: 目標タイム以内 + クリスタル全収集
  - A: 目標タイム以内 + クリスタル2個以上
  - B: 通常クリア
  - 目標タイム: ステージ1=75秒 / 2=90秒 / 3=90秒 / 4=120秒 / 5=150秒
  - ランク条件は HUD（TARGET 行）とリザルト画面に常時表示
- **リザルト画面**: ランク、タイム、クリスタル数、リスポーン回数、
  ベストタイムを表示。「もう一度」「次のステージへ」と、
  解放済みステージへの選択ボタン（ベストランク表示・未解放は鍵マーク）
- **ステージ解放**: 最初はステージ1のみ。クリアすると次のステージが
  解放される。数字キーや URL の `?stage=N` でも未解放の面は開けず、
  通知が出る
- **セーブ（LocalStorage）**: 解放状況と各ステージのベストタイム・
  最高ランク・最多クリスタルを保存（キー `physics-lab-save`、
  バージョン付き）。データが壊れている・旧バージョンの場合は
  初期状態に戻して起動する。保存に失敗してもゲームは続き、
  リザルト画面にその旨が出る
- スキン解放は仕様 §11 に名前だけあり内容が未定義のため、今回は
  実装していない（セーブ形式にも含めていない）

### 未実装（Phase 6）
演出と仕上げ: ライティング、パーティクル、サウンド、UIアニメーション、
カメラ演出、パフォーマンス調整。タイトル画面も Phase 6 側で扱う。

## 操作方法
| 操作 | キー |
|---|---|
| 移動 | W A S D / 矢印キー（カメラ基準） |
| ジャンプ | Space（接地中のみ） |
| ブースト | Shift（押している間、ゲージ消費） |
| リスポーン | R（最後のチェックポイントへ） |
| ポーズ | Esc / P（Pointer Lock 解除でもポーズ） |
| ステージ切替 | 数字キー 1〜5（解放済みのみ） |
| 視点 | クリックで Pointer Lock → マウス移動。ロックできない環境ではドラッグ |

## 起動方法

### そのまま開く（配信形式）
`index.html` を静的ホスティングに置けばそのまま動く。依存ライブラリは
importmap 経由でバージョン固定 CDN（jsDelivr）から読み込むため、ビルド不要。
公開パスは `site/game/physics-lab/`（GitHub Pages では `https://camelliab1.com/game/physics-lab/`）。
※ ローカルで `file://` で開くと ES Modules の CORS 制約で動かない。簡易サーバー経由で開くこと。

### ローカル開発（Vite）
```
npm install
npm run dev      # 開発サーバー
npm run build    # dist/ に静的ビルド（base: './' でサブパス配信対応）
npm run test:physics  # Phase 1 物理テスト（Node、描画なし）
npm run test:phase2   # Phase 2 テスト（Node、描画なし）
npm run test:phase3   # Phase 3 テスト（Node、描画なし）
npm run test:phase4   # Phase 4 テスト（Node、描画なし）
npm run test:phase5   # Phase 5 テスト（Node、描画なし）
```

## 技術構成
- Three.js 0.180.0 / @dimforge/rapier3d-compat 0.21.0 / Vite 8.3.8（すべてバージョン固定）
- 配信は site リポジトリの既存ルール（ビルドなし静的ファイル、他ゲームと同方式）に合わせ、
  ソースをそのまま置き、ライブラリは CDN から読む。
  Vite ビルドも可能だが、Rapier 同梱で JS が約 4.8MB になるため、
  MCP の 1ファイル 1MB 制限に収まるソース＋CDN 形式を正としている。

## ディレクトリ構成
```
index.html / package.json / vite.config.js / README.md
src/main.js
src/data/stages.js
src/game/  Game.js, GameLoop.js, PhysicsWorld.js, Player.js,
           InputManager.js, CameraController.js,
           BoostController.js, CheckpointManager.js, PlatformCarrier.js,
           StageLoader.js, Rank.js, SaveManager.js
src/objects/ LabEnvironment.js, Checkpoint.js, JumpPad.js,
             RotatingPlatform.js, MovingPlatform.js,
             WindZone.js, Magnet.js, Seesaw.js, Goal.js, Crystal.js
src/ui/    HUD.js, PauseMenu.js, ResultScreen.js
src/styles/style.css
tests/physics.test.mjs, tests/phase2.test.mjs, tests/phase3.test.mjs,
      tests/phase4.test.mjs, tests/phase5.test.mjs
```

## 検証結果
### Phase 1〜4
- Node テスト: Phase 1 物理16件、Phase 2 27件、Phase 3 24件、Phase 4 21件、
  いずれも全 PASS
- ヘッドレス Chromium で各フェーズの実操作を確認、エラー 0
- Phase 4 は公開ページ（camelliab1.com）でも表示確認済み（2026-11-20）

### Phase 5（2026-11-21、Muse）
- Node テスト 26件 全 PASS: ランク境界（S/A/B の条件分岐）、セーブの
  記録・再読み込み・ベスト更新ルール、ステージ解放、不正データ
  （壊れた JSON・別バージョン・型違い）での初期化、保存失敗時の継続、
  クリスタル収集の範囲内外と二重収集防止。
  Phase 1〜4 のテスト（88件）も引き続き全 PASS
- Vite 本番ビルド成功
- ヘッドレス Chromium（Puppeteer、SwiftShader）でビルド版を実操作:
  未解放ステージへのキー切替が通知付きでブロックされること、
  クリスタル取得で HUD が 1/3 になること、ゴールでリザルト画面が
  出ること（ランク・記録・解放メッセージ）、セーブ内容
  （unlockedStageCount=2、ベスト記録）、「次のステージへ」遷移、
  ページ再読み込み後も解放が残り未解放は開けないことを確認。
  コンソール/ページエラー 0
  ※ ゴール到達は検証用にゴール位置へ移動させて行った。通常プレイでの
  完走確認は実機プレイ待ち（Phase 4 から継続の未確認事項）
- CDN 配信版（Phase 5 の push 後）の公開確認は未実施

## 既知の課題・次のフェーズへの申し送り
- カメラの壁めり込み対策は最低高さクランプのみ（Raycast による距離補正は未実装）。
- Pointer Lock 中の Esc はブラウザ仕様で keydown が届かないため、ロック解除を
  検知してポーズする方式。Chrome ではロック解除直後の再ロックにクールダウンがあり、
  再開直後にロックが拒否されることがある（その場合は画面クリックで再ロック可能）。
- 回転床では運搬補助に摩擦の寄与が重なり、球が床の回転よりやや速く周回する。
  長い移動床の乗車では、無入力だと球が端方向へ少しずつずれることがある。
- 浮島ステージは遠くの足場が暗く見えにくいことがある（ライティング調整は
  Phase 6 の範囲）。
- 上昇気流は強め（抜けた先で大きく跳ね上がる）。
- 目標タイム（75〜150秒）は実プレイ未計測の仮置き。難しければ
  `src/data/stages.js` の targetTimeSeconds を調整する。
- スロープ上の接地・移動感、Pointer Lock の実機確認は未実施。
