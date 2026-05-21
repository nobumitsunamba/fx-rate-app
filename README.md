# 作業着完管理アプリ

工場の作業者がiPhoneブラウザで使う、作業の着手・完了を管理するWebアプリです。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **認証・DB**: Supabase
- **バーコード読み取り**: @zxing/browser
- **スタイリング**: Tailwind CSS
- **言語**: TypeScript

## セットアップ

### 1. Supabase テーブル作成

Supabaseダッシュボードの SQL Editor で `supabase/schema.sql` を実行してください。

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 開発サーバー起動

```bash
npm run dev
```

### 4. 本番ビルド

```bash
npm run build
npm start
```

## 画面構成

| パス | 画面 | 説明 |
|------|------|------|
| `/` | ログイン | メール・パスワード認証 |
| `/scan` | スキャン・操作 | バーコード読み取り → 着手 → 完了 |
| `/records` | 実績一覧 | 直近50件の作業実績 |

## iPhoneブラウザ対応

- HTTPS環境でのカメラアクセスが必要です
- viewportに `maximum-scale=1` を設定済み（自動ズーム防止）
- すべてのボタンはタップターゲット 44px 以上
- フォントサイズ 16px 以上（iOSの自動ズーム防止）
