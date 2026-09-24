# Bash 教程：从里层逻辑到实战

[![Deploy to GitHub Pages](https://github.com/wxy1123/bash-tutorial/actions/workflows/deploy.yml/badge.svg)](https://github.com/wxy1123/bash-tutorial/actions/workflows/deploy.yml)

一份系统讲解 Bash 的中文教程，覆盖原理、符号、管道、coreutils、脚本技巧与实战。

📖 **在线阅读**：https://wxy1123.github.io/bash-tutorial/

## 目录

1. [里层逻辑](https://wxy1123.github.io/bash-tutorial/inner-logic/) — 字符串、标准流、退出码、进程模型
2. [特殊符号](https://wxy1123.github.io/bash-tutorial/special-symbols/) — `$` `$( )` `[[ ]]` `&&` `>`
3. [管道与过滤器](https://wxy1123.github.io/bash-tutorial/pipes-filters/) — Unix 哲学、过滤器配方
4. [Coreutils 工具组合](https://wxy1123.github.io/bash-tutorial/coreutils/) — grep/sed/awk/xargs/find
5. [脚本技巧](https://wxy1123.github.io/bash-tutorial/scripting/) — `set -euo pipefail` + trap + 调试
6. [实战例子](https://wxy1123.github.io/bash-tutorial/examples/) — 日志、备份、监控、并发

## 本地开发

```bash
npm install
npm run dev    # http://localhost:4321
```

## 构建

```bash
npm run build
```

构建产物在 `dist/`，可部署到任何静态托管。

## 技术栈

- [Astro 7](https://astro.build/)
- [Starlight](https://starlight.astro.build/)
- GitHub Pages（通过 GitHub Actions 自动部署）

## 贡献

欢迎提 Issue / PR。修改 `src/content/docs/` 下的 Markdown 文件即可。

## 许可

[MIT](LICENSE)