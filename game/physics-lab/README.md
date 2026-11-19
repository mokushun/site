# PHYSICS LAB

近未来の物理研究施設を舞台にした、ブラウザ完結型の3D物理アクション・パズルゲーム。
企画・実装仕様は `PHYSICS_LAB_SPEC.md`、AI向け指示は `AGENT_INSTRUCTIONS.md` を参照。

## 現在の状態: Phase 4 実装済み（2026-11-19）

Phase 1（基本物理環境）、Phase 2（操作とゲーム基盤）、Phase 3（ギミック）、
Phase 4（ステージ実装）を実装済み。Phase 5 以降は未着手。

### Phase 1〜3 の要約
- Three.js + Rapier 3D、固定 60Hz タイムステップ、球体プレイヤー
  （速度ステアリング移動・ジャンプ・三人称カメラ）
- ブースト（ゲージ制）、チェックポイント、リスポーン、落下判定、ポーズ、HUD
- ギミック6種: ジャンプ台 / 回転床 / 移動床 / 風エリア / 磁力エリア / シーソー
- 動く床の運搬は摩擦だけでは転がる球を運べないため、足場を特定して
  球を追従させる運搬補助（PlatformCarrier）を併用している

### Phase 4 で実装したもの（ステージ実装）
- ステージ定義をデータ化（`src/data/stages.js`）し、`StageLoader` が
  全ステージを同じコードで構築する。ステージ固有の処理は持たない
- 5ステージ:
  1. **TEST LAB** — 壁のある実験室（Phase 1〜3 のルームをデータ化）
  2. **STEP VALLEY** — 浮島を登っていくコース。終盤に移動床
  3. **WIND CANYON** — 上昇気流で上層へ。橋には追い風
  4. **MAGNET PIT** — 中央に落下ピット。シーソー橋・移動床・引力/斥力の磁力
  5. **FINAL CIRCUIT** — ジャンプ台→回転床→移動床→上昇気流の総合コース
- ゴール判定: 緑のゴールマーカーに入るとクリア通知が出て、少し置いて
  次のステージへ自動で進む（5面の次は1面に戻る）
- ステージ切替: 数字キー 1〜5 でいつでも切替可能。URL の `?stage=N` でも
  開始ステージを指定できる
- 落下リスポーンが浮島ステージで本格的に機能する（落ちると最後の
  チェックポイントに戻る）
- クリスタルは各ステージ3個配置（回転・浮遊する見た目のみ。
  収集判定・カウントは Phase 5）

### 未実装（Phase 5 以降）
クリスタルの収集、クリアタイム記録、S/A/B ランク、ステージ解放、
LocalStorage セーブ、リザルト画面（Phase 5）、演出・サウンド・
パフォーマンス調整（Phase 6）。

## 操作方法
| 操作 | キー |
|---|---|
| 移動 | W A S D / 矢印キー（カメラ基準） |
| ジャンプ | Space（接地中のみ） |
| ブースト | Shift（押している間、ゲージ消費） |
| リスポーン | R（最後のチェックポイントへ） |
| ポーズ | Esc / P（Pointer Lock 解除でもポーズ） |
| ステージ切替 | 数字キー 1〜5 |
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
           StageLoader.js
src/objects/ LabEnvironment.js, Checkpoint.js, JumpPad.js,
             RotatingPlatform.js, MovingPlatform.js,
             WindZone.js, Magnet.js, Seesaw.js, Goal.js, Crystal.js
src/ui/    HUD.js, PauseMenu.js
src/styles/style.css
tests/physics.test.mjs, tests/phase2.test.mjs, tests/phase3.test.mjs,
      tests/phase4.test.mjs
```

## 検証結果（2026-11-19、Muse）
### Phase 1〜3
- Node テスト: Phase 1 物理16件、Phase 2 27件、Phase 3 ギミック単体24件、
  いずれも全 PASS（詳細は各フェーズ時点の記録を参照）
- ヘッドレス Chromium で実操作確認（ブースト・チェックポイント・リスポーン・
  ポーズ等）、エラー 0

### Phase 4
- Node テスト 21件 全 PASS: ステージが5面あること、全ステージのデータ妥当性
  （開始地点と最初のチェックポイントの一致、座標の有限性など）、
  StageLoader が全5面を構築できること、各面の開始地点で球が接地すること、
  チェックポイント登録数、ゴール判定の範囲内外。
  Phase 1〜3 のテスト（16+27+24件）も引き続き全 PASS
- Vite 本番ビルド成功
- ヘッドレス Chromium（Puppeteer、SwiftShader）でビルド版を実起動:
  `?stage=2` でステージ2を直接開始、数字キー 5→4→1 でステージ切替、
  各面で開始地点に接地し HUD のステージ名とチェックポイント総数が
  面ごとに切り替わることを確認。コンソール/ページエラー 0
- 浮島ステージの視認性を上げるため、浮島とステップにもグリッド
  テクスチャを適用して再確認済み
- 各ステージの完走（ゴール到達までの実プレイ）は未実施。開始地点の
  接地と構築の正しさはテストで確認済みだが、コース途中の難所の
  到達可能性は実機プレイでの確認待ち
- CDN 配信版は Phase 3 時点で公開・実ブラウザ確認済み（Phase 4 の
  push 後に再確認が必要）

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
- スロープ上の接地・移動感、Pointer Lock の実機確認は未実施。
