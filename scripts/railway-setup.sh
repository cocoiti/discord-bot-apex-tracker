#!/usr/bin/env bash
set -euo pipefail

# Railway 初期セットアップスクリプト
# 前提: railway login 済み、プロジェクトにリンク済み (railway link)
#
# 使い方:
#   railway link              # 先にプロジェクトをリンク
#   bash scripts/railway-setup.sh

echo "=== Railway セットアップ開始 ==="

# 1. PostgreSQL サービスを追加
echo ">> PostgreSQL サービスを追加..."
railway add --database postgres
echo "   PostgreSQL 追加完了"

echo ""
echo "=== 手動設定が必要な項目 ==="
echo ""
echo "  Railway Dashboard > Bot サービス > Variables で以下を設定:"
echo ""
echo "  1. DATABASE_URL (参照変数 — CLI では設定不可)"
echo "     値: \${{Postgres.DATABASE_URL}}"
echo ""
echo "  2. DISCORD_TOKEN"
echo "     値: Discord Developer Portal で取得した Bot Token"
echo ""
echo "  3. APEX_API_KEY"
echo "     値: https://apexlegendsapi.com で取得した API Key"
echo ""

# 2. GitHub Actions 用の設定案内
echo "=== GitHub Actions 自動デプロイの設定 ==="
echo "  GitHub リポジトリの Settings > Secrets and variables で以下を設定:"
echo ""
echo "  [Secrets]"
echo "    RAILWAY_TOKEN    : railway login --browserless で取得"
echo ""
echo "  [Variables]"
echo "    RAILWAY_ENABLED  : true"
echo "    RAILWAY_SERVICE  : <Railway上のサービス名>"
echo ""
echo "=== セットアップ完了 ==="
echo ""
echo "  Config-as-Code (railway.toml) で自動設定される項目:"
echo "    - Dockerfile ビルド"
echo "    - pre-deploy でマイグレーション自動実行"
echo "    - リスタートポリシー (ON_FAILURE, max 10)"
