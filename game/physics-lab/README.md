# PHYSICS LAB

近未来の物理研究施設を舞台にした、ブラウザ完結型の3D物理アクション・パズルゲーム。
企画・実装仕様は `PHYSICS_LAB_SPEC.md`、AI向け指示は `AGENT_INSTRUCTIONS.md` を参照。

## 現在の状態: Phase 1 実装済み（2026-11-19）

Phase 1（基本物理環境）の範囲のみ実装済み。Phase 2 以降は未着手。

### Phase 1 で実装したもの
- Three.js 初期化（レンダラー、シーン、フォグ、ライティング、シャドウ）
- Rapier 3D 初期化、固定 60Hz タイムステップ（蓄積＋ステップ上限でタブ復帰時の暴走防止）
- 研究施設風テストルーム: グリッド床、ガラス壁＋発光トリム、段差ステップ、スロープ、円柱、ブロック
- 球体プレイヤー: Dynamic RigidBody + 球 Collider、CCD 有効、重力・摩擦・反発
- 移動: WASD / 矢印キー（カメラ基準、速度ステアリング、水平速度上限 8 m/s、空中操作は弱く）
- ジャンプ: Space（接地判定は下向きレイキャスト、二段ジャンプ不可）
- 三人称カメラ: 補間追従、マウス視点（Pointer Lock 基本、未対応時はドラッグで代替）、仰角クランプ、床めり込み防止（最低高さ）
- ウィンドウリサイズ対応
- 最小 HUD: タイトル、操作ガイド、位置・速度・接地状態のデバッグ表示、視点ロックヒント、エラー表示

### 未実装（Phase 2 以降）
ブースト、落下判定・リスポーン、チェックポイント、ポーズ、HUD 本実装（タイム等）、
ギミック6種、ステージ5面、評価・セーブ、演出・サウンド。

## 操作方法
| 操作 | キー |
|---|---|
| 移動 | W A S D / 矢印キー（カメラ基準） |
| ジャンプ | Space（接地中のみ） |
| 視点 | クリックで Pointer Lock → マウス移動。Esc で解除。ロックできない環境ではドラッグ |

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
npm run test:physics  # Node 上の物理挙動テスト（描画なし）
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
src/game/  Game.js, GameLoop.js, PhysicsWorld.js, Player.js,
           InputManager.js, CameraController.js
src/objects/ LabEnvironment.js（Phase 1 のテストルーム。ギミックは Phase 3 で追加）
src/ui/    HUD.js（Phase 1 最小実装）
src/styles/style.css
tests/physics.test.mjs
```

## 検証結果（2026-11-19、Muse）
- Node 物理テスト 16件 全 PASS（落下・床衝突・静止時振動なし・移動・速度上限・
  停止・ジャンプ・二段ジャンプ不可・壁衝突・高速移動時のすり抜けなし）
- Vite 本番ビルド成功
- ヘッドレス Chromium（Puppeteer、SwiftShader）でビルド版を実起動:
  起動・落下・接地、W 移動（7.9 m/s で壁まで到達し停止）、Space ジャンプ（AIRBORNE 観測）、
  リサイズ対応を確認。コンソールエラー・ページエラー・失敗リクエスト すべて 0。
  ※ ヘッドレス環境は 2.5 fps のため、ステップ上限の仕様によりゲーム内時間は
    実時間より遅く進む（実機 60fps では等速）。これは暴走防止として意図した挙動。
- CDN 配信版（MCP に置くソースそのもの）は、モジュール解決先が CDN になる点のみ
  ビルド版と異なる。CDN の各 URL が 200 で応答することは確認済みだが、
  この検証環境のプロキシ制約で Chromium から CDN へ直接は届かなかったため、
  CDN 版のブラウザ実起動は未実施。公開後に実機での確認が必要。

## 既知の課題・次のフェーズへの申し送り
- カメラの壁めり込み対策は最低高さクランプのみ（Raycast による距離補正は未実装）。
  壁際でカメラが壁の向こうへ出る場合がある。
- スロープ上の接地・移動感は実機での目視確認がまだ。
- Pointer Lock の実機確認（ブラウザ差・解除/再取得）は未実施。ヘッドレスでは代替のドラッグ経路も含め未検証。
- ジャンプ初速 7.8 で最高点は約 3.5m。段差 1.5m には余裕で届く。操作感の調整は実機確認後に。
