# 作業着完管理アプリ 開発レポート

## 概要

工場の作業者がiPhoneブラウザで使う、バーコードスキャンによる作業の着手・完了を管理するWebアプリ。

- **開発期間**: 2026年5月
- **リポジトリ**: nobumitsunamba/fx-rate-app
- **本番URL**: Vercel（fx-rate-app プロジェクト）
- **ブランチ**: `claude/uniform-management-app-8ZbTO` → `main` にマージ済み

---

## 技術スタック

| 種別 | 内容 |
|------|------|
| 言語 | TypeScript |
| フレームワーク | Next.js 14（App Router） |
| 認証・DB | Supabase |
| バーコード読み取り | @zxing/browser + @zxing/library |
| スタイリング | Tailwind CSS |
| デプロイ | Vercel |

---

## Claude Codeへの指示文（プロンプト）

### 1. アプリ全体の初期構築

```
Next.jsとSupabaseを使った作業着完管理Webアプリを作成してください。
工場の作業者がiPhoneブラウザで使うアプリです。

## 技術スタック
- フレームワーク: Next.js 14（App Router）
- 認証・DB: Supabase
- バーコード読み取り: @zxing/browser（Code128などの1次元バーコード対応）
- スタイリング: Tailwind CSS
- 言語: TypeScript

## Supabase接続情報
NEXT_PUBLIC_SUPABASE_URL=lofoevxauqdpmgscujde
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（省略）

## 画面構成
### 1. ログイン画面（/）
### 2. スキャン・操作画面（/scan）
### 3. 実績一覧画面（/records）

（以下、詳細仕様を記載）
```

### 2. プロフィール設定画面の追加

```
ログイン後に表示名（username）を設定できる画面を追加してください。
- 初回ログイン時、usernameが未設定なら自動的に設定画面へ遷移する
- 設定後はスキャン画面へ戻る
- URLは /profile
```

### 3. 重複着手の警告ダイアログ

```
同じ作業指示番号に対して、すでに着手中（completed_atがnull）のレコードがある場合、
着手ボタンを押したときに警告ダイアログを表示してください。
「すでに着手中の記録があります。続けて着手しますか？」と確認を求める。
```

### 4. バーコード読み取り精度の改善

```
iPhone15 + Edge、iPhone15 + Safari、iPhone15 + Chromeでは、
カメラにバーコードは映りますが、バーコードが読み取れません。
```

---

## 実装手順

### Step 1: プロジェクトファイルの作成

以下のファイルを一括作成：

```
fx-rate-app/
├── package.json
├── .env.local
├── .gitignore
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── middleware.ts          # 未認証リダイレクト
├── app/
│   ├── layout.tsx         # viewport設定（iOSズーム防止）
│   ├── globals.css
│   ├── page.tsx           # ログイン画面
│   ├── scan/page.tsx      # スキャン・操作画面
│   └── records/page.tsx   # 実績一覧画面
├── lib/
│   ├── supabase.ts        # ブラウザ用クライアント
│   ├── supabase-server.ts # サーバー用クライアント
│   └── types.ts           # 型定義
└── supabase/
    └── schema.sql         # テーブル作成SQL
```

### Step 2: Supabaseのテーブル作成

Supabaseダッシュボード → SQL Editor で `supabase/schema.sql` を実行。

```sql
create table if not exists public.work_records (
  id uuid default gen_random_uuid() primary key,
  work_order_no text not null,
  user_id uuid not null references auth.users(id),
  username text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.work_records enable row level security;
-- RLSポリシーも設定（schema.sql参照）
```

### Step 3: Vercelへのデプロイ

1. [vercel.com](https://vercel.com) → 「Add New → Project」
2. GitHubリポジトリをインポート
3. 環境変数を設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 「Deploy」をクリック

### Step 4: Supabaseの認証URL設定

Supabase → Authentication → URL Configuration:
- **Site URL**: `https://（VercelのURL）`
- **Redirect URLs**: 同上

---

## トラブルシューティング

### 問題1: iPhoneでカメラが真っ黒のまま起動しない

**症状**: スキャンボタンを押すと「カメラ起動中...」と表示されるが、
カメラ映像が映らず黒画面のまま固まる。エラーメッセージも表示されない。

**原因の調査過程**:

| 試した対策 | 結果 | 理由 |
|-----------|------|------|
| `decodeFromVideoDevice` → `getUserMedia + decodeFromStream` に変更 | NG | 根本原因が別にあった |
| `decodeFromConstraints` に一本化 | NG | 根本原因が別にあった |
| ビデオ要素を `sr-only` で常時DOM保持 | NG | sr-only（1px）でiOSがplay()を拒否 |
| カメラ初期化を `useEffect` に移動 | **OK** | 根本原因を解消 |

**根本原因**:

```
ユーザーがボタンをタップ
  ↓
startScan() が呼ばれる
  ↓
setScanning(true)  ← Reactの再レンダリングはまだ発生していない
  ↓
if (!videoRef.current) return;  ← ビデオ要素がDOMにないのでnull → 早期リターン！
  ↓
カメラ初期化されないまま scanning=true の画面が表示される（黒画面）
```

ビデオ要素は `scanning === false` の間はDOMに存在しない（条件付きレンダリング）。
`startScan()` を呼んだ瞬間はまだ `scanning === false` のため、
`videoRef.current` が `null` になって早期リターンしていた。

**解決策**: カメラ初期化処理を `startScan()` から `useEffect` に移動

```typescript
// ❌ 旧: startScan()内でカメラ初期化（videoRef.currentがnullになる）
async function startScan() {
  setScanning(true);
  if (!videoRef.current) return; // ← ここでnullになって終了
  // カメラ初期化...
}

// ✅ 新: setScanning(true)だけ行い、useEffectでカメラ初期化
function startScan() {
  setScanning(true);
  // カメラ初期化はuseEffectで行う
}

useEffect(() => {
  if (!scanning || step !== 'scan') return;

  const init = async () => {
    if (!videoRef.current) return; // ← ここでは確実に存在する
    // カメラ初期化...
  };
  init();
}, [scanning]); // scanningがtrueになってビデオ要素がDOMに描画された後に実行
```

**ポイント**: `useEffect` はReactの再レンダリング（DOM更新）後に実行されるため、
`videoRef.current` が確実に取得できる。

---

### 問題2: カメラ許可ダイアログが表示されない

**症状**: カメラが起動せず、許可を求めるダイアログも出ない。

**原因**: 過去に「許可しない」を選んだため、二度とダイアログが自動表示されなくなった。

**解決策**: SafariのURL設定から手動で許可に変更。

```
Safari アドレスバー左端の「ぁあ」ボタン
  → 「Webサイトの設定」
  → 「カメラ」を「許可」に変更
  → ページをリロード
```

**注意**: iOSの設定アプリ → プライバシー → カメラ はネイティブアプリの設定のみ。
Webサイトのカメラ権限はSafariのアドレスバーから変更する必要がある。

---

### 問題3: iPhone15でバーコードが映るが読み取れない

**症状**: カメラは起動し映像も映るが、バーコードにかざしても認識しない。
iPhone16eでは正常に動作する。

**原因**: zxingのデフォルト設定ではデコード精度が低い。
また、解像度指定がないためiPhone15が最適でないカメラ設定を選ぶ場合がある。

**解決策**: デコードヒントと解像度を明示的に指定。

```typescript
// ❌ 旧
const reader = new BrowserMultiFormatReader();
const controls = await reader.decodeFromConstraints(
  { video: { facingMode: { ideal: 'environment' } } },
  videoRef.current, callback
);

// ✅ 新
const hints = new Map<DecodeHintType, unknown>();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
]);
hints.set(DecodeHintType.TRY_HARDER, true); // ← 精度向上の鍵

const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 300 });
const controls = await reader.decodeFromConstraints(
  {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },  // ← 解像度を明示
      height: { ideal: 720 },
    },
  },
  videoRef.current, callback
);
```

| 設定 | 効果 |
|------|------|
| `TRY_HARDER` | 画像内のバーコード探索を徹底的に行う |
| `POSSIBLE_FORMATS` | 対象フォーマットを絞ることで処理を高速化 |
| 解像度指定 | 機種によらず安定した映像品質を確保 |
| `delayBetweenScanAttempts: 300` | スキャン間隔を調整（デフォルト500ms） |

---

## iOSブラウザ対応のポイント（ノウハウ集）

### カメラ関連

1. **ビデオ要素は必ず `playsInline` と `muted` を指定する**
   ```jsx
   <video playsInline muted autoPlay />
   ```

2. **getUserMedia はユーザー操作のイベントハンドラから呼ぶ**
   （ボタンタップ → startScan → useEffect の流れでOK）

3. **カメラ停止時はMediaStreamのトラックも必ず停止する**
   ```typescript
   stream.getTracks().forEach(t => t.stop());
   video.srcObject = null;
   ```

4. **背面カメラの指定**
   ```typescript
   facingMode: { ideal: 'environment' }  // ideal推奨（exactだと失敗することがある）
   ```

### UI/UX関連

5. **iOSの自動ズーム防止**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
   ```

6. **フォントサイズは16px以上**（16px未満だとiOSがフォーカス時にズームする）

7. **タップターゲットは44px以上**（手袋着用時の操作を考慮）

---

## Vercelデプロイ手順

### 初回デプロイ

1. [vercel.com](https://vercel.com) → GitHubアカウントでログイン
2. 「Add New → Project」→ リポジトリを選択 → Import
3. Environment Variables に以下を追加：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://（プロジェクトID）.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |

4. Deploy → Ready になったら完了

### デプロイURL確認

Vercelダッシュボード → プロジェクト → Deployments タブ → 最新行の Visit ボタン

### デプロイ種別

| 種別 | トリガー | URL |
|------|---------|-----|
| Production | mainブランチへのpush/merge | 本番URL |
| Preview | feature ブランチへのpush | プレビューURL（テスト用） |

### 本番反映の手順

```
feature ブランチで開発・確認
  → GitHub でPRを作成
  → PRをmainにマージ
  → VercelがProductionに自動デプロイ
```

---

## コミット履歴（主要なもの）

| コミット | 内容 |
|---------|------|
| `577d45c` | Next.js + Supabase 作業着完管理アプリ初期構築 |
| `474a617` | /profile ページ追加、username未設定時のリダイレクト |
| `a793d92` | 着手重複時の確認ダイアログ追加 |
| `3b7ceea` | iOSカメラ修正①: getUserMedia + decodeFromStream |
| `19970ec` | iOSカメラ修正②: decodeFromConstraints に一本化 |
| `ce6d696` | iOSカメラ修正③: ビデオ要素を常時DOM保持（sr-only） |
| `ab3be58` | iOSカメラ修正④: useEffectに移動（根本解決） |
| `963f7be` | バーコード読み取り精度改善（TRY_HARDER等） |
