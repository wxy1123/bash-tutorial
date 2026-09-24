---
title: Bash 教程
description: 从里层逻辑到实战的 Bash 中文教程
---

import { Card, CardGrid } from '@astrojs/starlight/components';

# Bash 教程

> 一份从原理到实践的 Bash 指南。读完你应该能读懂任何一段 Shell 脚本，并写出健壮的脚本。

## 这是什么

不是又一个 cheat sheet，是**讲清楚 Bash 内部在做什么**的一份系统材料：

- 字符串的本质
- 标准流的真实角色
- 退出码与流程控制
- 每条命令 fork + exec 时发生了什么
- 各种"特殊符号"到底在干什么
- coreutils 工具如何组合
- 脚本的健壮性技巧

适合：

- 想真正"搞懂" Bash 的人
- 写脚本经常踩坑的人
- 想从 Bash 进阶到 zsh / fish / nushell 的人

## 目录

<CardGrid>
  <Card title="1. 里层逻辑" icon="document">
    字符串、标准流、退出码、进程模型——Bash 到底在做什么？[开始阅读](/bash-tutorial/inner-logic/)
  </Card>
  <Card title="2. 特殊符号" icon="document">
    `$` `$( )` `[[ ]]` `&&` `>` 都是干嘛的？[开始阅读](/bash-tutorial/special-symbols/)
  </Card>
  <Card title="3. 管道与过滤器" icon="document">
    Unix 哲学 + 5 个工具解决 80% 文本处理。[开始阅读](/bash-tutorial/pipes-filters/)
  </Card>
  <Card title="4. Coreutils 工具组合" icon="document">
    grep / sed / awk / xargs / find 的实战组合。[开始阅读](/bash-tutorial/coreutils/)
  </Card>
  <Card title="5. 脚本技巧" icon="document">
    怎么写出"严肃"的脚本—— `set -euo pipefail` + `trap`。[开始阅读](/bash-tutorial/scripting/)
  </Card>
  <Card title="6. 实战例子" icon="document">
    日志分析、批量改名、监控、增量备份。[开始阅读](/bash-tutorial/examples/)
  </Card>
</CardGrid>

## 怎么读

- **第一次**：按顺序读，建立完整心智模型
- **查问题时**：用左侧搜索（`/`）或章节定位
- **写脚本时**：跳到第 5 章查"健壮性模板"

## 阅读前提

```bash
bash --version    # 确认 ≥ 4.0（支持关联数组）
```

## 致谢与贡献

基于日常工作积累，欢迎提 Issue / PR。

## 许可

[MIT](https://opensource.org/licenses/MIT)