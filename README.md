# Discord Bot Apex Tracker

Apex LegendsのRP（ランクポイント）をトラッキングするDiscord Bot。

## Features

### コマンド

| コマンド | 説明 |
|----------|------|
| `/rank <player> [platform]` | ランク情報・目標RP・累計キルを表示 |
| `/rankstart <player> [platform]` | セッション追跡を開始 |
| `/rankend <player> [platform]` | セッション結果（キル数・RP変動）を表示 |

### その他の機能

- ボットステータスにランクマップローテーションを表示（1分ごと更新）
- スプリット終了日までに必要な1日あたりのRPを計算
- ティア単位（Platinum → Diamond → Master）での目標表示

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

`.env` に以下を設定:

| 変数 | 説明 |
|------|------|
| `DISCORD_TOKEN` | Discord Bot Token |
| `APEX_API_KEY` | [Apex Legends Status API](https://apexlegendsapi.com) のAPIキー |

### 3. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## CLI Testing

Discord無しでランクコマンドをテスト:

```bash
npm run rank -- <PlayerName> [Platform]
```

Platform: `PC`（デフォルト）, `PS4`, `X1`, `SWITCH`

## Deploy to Railway

### 1. Railwayでプロジェクト作成

1. [Railway](https://railway.app) にログイン
2. "New Project" → "Deploy from GitHub repo"
3. このリポジトリを選択

### 2. 環境変数を設定

Railway Dashboard → Variables:

| 変数 | 値 |
|------|-----|
| `DISCORD_TOKEN` | Discord Bot Token |
| `APEX_API_KEY` | Apex Legends Status API Key |

### 3. GitHub Actions設定（自動デプロイ）

GitHub リポジトリ Settings → Secrets and variables → Actions:

**Secrets:**
| 名前 | 値 |
|------|-----|
| `RAILWAY_TOKEN` | Railwayで発行したトークン |

**Variables:**
| 名前 | 値 |
|------|-----|
| `RAILWAY_ENABLED` | `true` |
| `RAILWAY_SERVICE` | Railwayのサービス名 |

## Docker

```bash
docker compose up -d
```

## Testing

```bash
# Run tests
npm run test:run

# Watch mode
npm test
```

## Configuration

`config/season.json` でスプリット終了日とランクRP閾値を管理。

```json
{
  "activeSeason": "season27_split2",
  "seasons": {
    "season27_split2": {
      "name": "Season 27 Amped Split 2",
      "splitEndDate": "2026-02-10",
      "ranks": [
        { "name": "Rookie", "minRP": 0 },
        { "name": "Bronze IV", "minRP": 1000 },
        ...
        { "name": "Master", "minRP": 16000 },
        { "name": "Predator", "minRP": 99999 }
      ]
    }
  }
}
```

### シーズン更新方法

1. `seasons` に新しいシーズンを追加
2. `activeSeason` を新しいシーズンのキーに変更
3. `splitEndDate` を正しい日付（YYYY-MM-DD形式）に設定

## APIs & Libraries

このプロジェクトは以下のAPIとライブラリを使用しています：

### APIs

| API | 用途 | ドキュメント |
|-----|------|-------------|
| Apex Legends Status API | プレイヤー統計・マップローテーション取得 | [apexlegendsapi.com](https://apexlegendsapi.com) |
| Discord API | Botインタラクション | [discord.com/developers](https://discord.com/developers/docs) |

### Libraries

| ライブラリ | 用途 |
|-----------|------|
| [discord.js](https://discord.js.org) | Discord Bot フレームワーク |
| [TypeScript](https://www.typescriptlang.org) | 型安全な開発 |
| [Vitest](https://vitest.dev) | テストフレームワーク |

## License

MIT
