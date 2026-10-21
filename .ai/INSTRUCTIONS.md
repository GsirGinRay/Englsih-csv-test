# 英文單字測驗（csvtest） — 專案規則（Claude Code / Codex 共用正本）

英文單字測驗網站（Next.js + Prisma + PostgreSQL）。

## 部署

正式環境在 main 主機 `/srv/apps/csvtest` 的 Docker Compose（服務 `app`），網址 https://csvtest.dreamerstart.com。
主機不連 GitHub，**push 不會自動部署**；push `main` 後在本機執行：

```bash
python D:\ops\deploy.py csvtest             # 從 origin/main 打包 → 上傳 → 健康檢查，失敗自動退回上一版
python D:\ops\deploy.py csvtest --rollback  # 退回上一版
python D:\ops\deploy.py --status          # 各服務線上版本 vs GitHub
```

只會部署已 push 的 commit。環境變數在主機 `/srv/apps/csvtest/.env`（不進 Git，不要印出值）。每次容器啟動都會執行 `npx prisma db push`，改 schema 前先備份資料庫。完整流程見 `vps-deploy` skill。
