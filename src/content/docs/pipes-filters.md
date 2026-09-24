---
title: 3. 管道与过滤器
---

## 3.1 Unix 哲学

Doug McIlroy 总结的 Unix 哲学核心：

> **Write programs that do one thing well. Write programs that work together. Write programs that handle text streams, because that is a universal interface.**

体现在 Bash 里，就是：**每个程序读 stdin、写 stdout、按行（字节流）处理**。`tools` 通过管道串成更大的程序。

## 3.2 常用过滤器一览

| 命令 | 作用 | 一句话 |
|---|---|---|
| `cat` | 拼接 / 输出 | 把输入原样输出 |
| `tac` | 反向输出 | 倒着打印 |
| `head` / `tail` | 头/尾 | 看前/后 N 行 |
| `less` / `more` | 分页看 | 可上下翻 |
| `grep` | 过滤 | 留匹配的行 |
| `sort` | 排序 | 按行排序 |
| `uniq` | 去重 | 连续重复只留一行 |
| `wc` | 计数 | 行/词/字节 |
| `cut` | 切列 | 按字符或字段切 |
| `tr` | 转换 | 字符级替换/压缩 |
| `sed` | 流编辑 | 替换/删除/插入 |
| `awk` | 扫描 | 按字段编程 |
| `tee` | 三通 | 同时输出到文件和 stdout |
| `xargs` | 参数化 | 把 stdin 转成命令行参数 |
| `paste` | 合并 | 多文件按列并 |
| `column` | 表格化 | 对齐成表格 |
| `nl` | 加行号 | 输出带行号 |
| `rev` | 反转每行 | 每行字符反转 |

```bash
# 简单练习：从 /etc/passwd 取所有用户名（第一个字段）
cut -d: -f1 /etc/passwd | sort | uniq -c | sort -rn | head
```

## 3.3 构造管道的思维

把管道想成一个**数据流的水管**：

```
            ┌─→ 过滤/转换 ─┐
stdin ─────►│              ├─→ stdout ─────► 下游
            └─→ 累计/聚合 ─┘
```

**黄金法则**：

1. **每一步只做一件事**：读一过滤一转换一输出。
2. **保持流式**：尽量让数据一行一行流过去，避免一次性塞进内存。
3. **让数据自描述**：CSV/JSON/键值对都好处理；半结构化文本用 `awk`。
5. **善用 `tee`**：想边看边保存？

```bash
make 2>&1 | tee build.log | grep -E 'error|warning' | less -R
```

6. **> 用 `xargs` 衔接"不能读 stdin"的命令**：

```bash
# 删除列出的文件
find . -name "*.tmp" | xargs rm

# 并行版
find . -name "*.tmp" -print0 | xargs -0 -P 8 rm

# 注意：文件名含空格/换行用 -print0 和 -0
```

---

