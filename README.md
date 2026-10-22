# Bill · 个人记账与物品追踪

React + Vite 应用，包含物品管理、日均持有成本、账单与分类预算、趋势图、图片识别和可选的 GitHub Gist 同步。

- 仓库：[anghe-6661/bill--tracking](https://github.com/anghe-6661/bill--tracking)
- 线上应用：[weihangchen.me/bill--tracking/](https://weihangchen.me/bill--tracking/)

## 本地运行

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm run build
npm run preview
```

业务数据保存在浏览器 localStorage；可选 Gist 同步及 AI 接口配置见应用设置页。不要将用户凭据或账单导出文件提交到仓库。

## 更新与发布

项目使用 `.github/workflows/deploy.yml`：推送到 `main` → GitHub Actions 安装依赖、构建 → 部署 GitHub Pages。

在本项目中交给编码代理完成的后续更新，按 [AGENTS.md](./AGENTS.md) 的约定，在验证后自动提交和推送。普通手动文件保存不会自动推送；手动开发时应在验证后自行提交、推送。

在 [Actions](https://github.com/anghe-6661/bill--tracking/actions) 检查部署结果，再访问线上应用确认。域名根路径当前是个人主页，记账应用部署在 `/bill--tracking/`。
