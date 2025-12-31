# Fluv CDN

Fluv 平台的前端資源 CDN 倉庫，透過 jsDelivr 或 GitHub Pages 提供快速、可靠的資源載入。

## 📦 資源列表

### Popup System (`fluv-popup.js`)
彈窗管理系統，支援：
- ✅ 地區篩選（台灣/日本/香港）
- ✅ 測試模式
- ✅ Cookie 顯示控制（每天顯示一次）
- ✅ 主機名稱白名單
- ✅ 自動地區偵測

### Event Banner System (`fluv-event-banner.js`)
活動橫幅系統（官網用），支援：
- ✅ 旋轉木馬輪播
- ✅ 地區篩選（台灣/日本/香港）
- ✅ 測試模式
- ✅ 自動輪播（5 秒間隔）
- ✅ 響應式設計（桌面/手機）
- ✅ 導航列下拉選單整合

### Event List System (`fluv-event-list.js`)
活動列表系統（WordPress 用），支援：
- ✅ 活動卡片顯示（每行三個）
- ✅ 地區篩選（台灣/日本/香港）
- ✅ 測試模式
- ✅ 響應式設計（手機單欄）
- ✅ 選單整合
- ✅ 活動時間顯示

## 🚀 使用方式

### 1. 透過 jsDelivr CDN（推薦）

```html
<!-- Fluv Popup System -->
<script src="https://cdn.jsdelivr.net/gh/fluvo/cdn@main/fluv-popup.js"></script>
```

**版本控制**：
- 最新版本：`@main`
- 特定版本：`@v1.0.0`
- 特定 commit：`@commit-hash`

### 2. 透過 GitHub Pages

```html
<script src="https://fluvo.github.io/cdn/fluv-popup.js"></script>
```

### 3. 透過 rawgit.com

```html
<script src="https://raw.githack.com/fluvo/cdn/main/fluv-popup.js"></script>
```

## 📋 Popup System 使用範例

### 基本使用
直接在 HTML 中引入即可，系統會自動執行：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
</head>
<body>
  <!-- 您的頁面內容 -->

  <!-- Fluv Popup System -->
  <script src="https://cdn.jsdelivr.net/gh/fluvo/cdn@main/fluv-popup.js"></script>
</body>
</html>
```

### 測試模式
在網址加上任意查詢參數即可啟用測試模式：

```
https://example.com/?test
https://example.com/?debug
https://example.com/?preview
```

測試模式特性：
- 忽略 Cookie 檢查
- 顯示所有已啟用的 popup（包含未開始和已過期的）
- Console 會顯示 popup 資料

### 地區偵測
系統會根據以下順序決定地區：

1. **URL 路徑**：`/tw/`（台灣）、`/jp/`（日本）、`/hk/`（香港）
2. **localStorage**：`localStorage.getItem('region')`
3. **預設值**：台灣（1）

範例：
```
https://fluv.com/tw/services  → 台灣 (region=1)
https://fluv.com/jp/services  → 日本 (region=2)
https://fluv.com/hk/services  → 香港 (region=3)
```

### Popup 配置

Popup 需要在後台配置以下欄位：

```javascript
{
  "image": "彈窗主圖片 URL",
  "imageLink": "圖片點擊連結",
  "reopenImage": "重新開啟按鈕圖片（選填，預設為禮物動圖）",
  "html": {
    "allow": ["fluv.com", "www.fluv.com", "blog.fluv.com"]
  },
  "region": 1,  // 1=台灣, 2=日本, 3=香港
  "isActive": true,
  "startAt": "2025-01-01T00:00:00Z",
  "expiredAt": "2025-12-31T23:59:59Z"
}
```

## 🔧 開發與部署

### 本地開發
1. Clone 此倉庫
2. 修改 JS 檔案
3. 在本地測試（使用本地伺服器）

### 部署流程
1. 提交修改到 GitHub
2. 推送到 main 分支
3. jsDelivr 會自動更新（可能需要 1-5 分鐘）
4. 清除快取（如果需要）：訪問 `https://purge.jsdelivr.net/gh/fluvo/cdn@main/fluv-popup.js`

### 版本控制建議
- 使用語義化版本（Semantic Versioning）
- 重大更新時建立新的 Git tag
- 生產環境使用特定版本，避免使用 `@main`

```bash
# 建立版本標籤
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 使用特定版本
<script src="https://cdn.jsdelivr.net/gh/fluvo/cdn@v1.0.0/fluv-popup.js"></script>
```

## 📝 變更日誌

### v1.0.0 (2025-01-31)
- ✨ 初始版本
- ✅ 支援地區篩選（TW/JP/HK）
- ✅ 支援測試模式
- ✅ Cookie 顯示控制
- ✅ 主機名稱白名單驗證

## 🤝 貢獻指南

1. Fork 此倉庫
2. 建立功能分支：`git checkout -b feature/new-feature`
3. 提交修改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交 Pull Request

## 📄 授權

Copyright © 2025 Fluv. All rights reserved.
