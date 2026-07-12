# Game Radar 本地运行

Game Radar 在本机聚合 Steam、App Store、TapTap、Amazon、股票、汇率和公告数据，并在浏览器中展示榜单。

## 环境要求

- Node.js 22.13 或更高版本
- npm

## 启动

```bash
npm install
cp .env.example .env
npm start
```

然后访问 <http://127.0.0.1:5177>。

本地服务默认只监听 `127.0.0.1`，不会暴露给局域网。如果确实需要从其他设备访问，可在 `.env` 中显式设置 `HOST=0.0.0.0`。

`SRM_SECRET` 只影响九号 SRM 公告；未配置时，其他指标仍可使用，该模块会显示不可用。

## 检查

```bash
npm run check
```

该命令会执行 TypeScript 检查及所有 JavaScript 入口的语法检查。

## 常用配置

```dotenv
HOST=127.0.0.1
PORT=5177
SRM_SECRET=
```

指标默认缓存 5 分钟。页面的“刷新”按钮会强制重新请求外部数据，短时间连续点击可能受到数据源限流。
