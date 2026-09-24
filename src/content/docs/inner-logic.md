---
title: 1. Bash 的里层逻辑
---

理解 Bash 最重要的是：**它本质上是一个字符串处理 + 进程启动器**。它本身没有"数据结构"概念，所有东西都是字符串。这一点决定了它的强项和怪癖。

## 1.1 一切皆字符串

```bash
n=42
echo $n          # 42  ← 看起来是数字，实际存的是字符串 "42"

a="3 + 4"
echo $a          # 3 + 4  ← 不会算，会原样输出

# 想做数学运算？必须用算术展开：
echo $(( 3 + 4 ))   # 7
```

**关键点**：Bash 里的"变量"只是一个名字 → 字符串的映射。没有类型、没有边界检查。`a=hello world` 会因为空格而失败（被当成两条命令），必须加引号。

```bash
a=hello world      # bash: world: command not found
a="hello world"    # OK
```

## 1.2 三种引用方式

这是 Bash 最容易出错的地方之一。

| 写法 | 名称 | 会发生什么 |
| --- | --- | --- |
| `'...'` | 单引号 | 完全字面，不做任何展开 |
| `"..."` | 双引号 | 展开变量 `$x` 和命令替换 `` `x` `` / `$(x)`，但禁用大多数特殊字符 |
| `...` | 无引号 | 展开变量、通配符、分词（按空白切） |

```bash
name="Alice"

echo '$name'      # $name        ← 字面量
echo "$name"      # Alice        ← 展开变量
echo $name        # Alice        ← 展开变量（结果一样）
echo Hello $name  # Hello Alice

# 关键差别：分词
arr=$(echo "a b c")       # arr 是一个字符串 "a b c"
echo "$arr"               # a b c  ← 整体
echo $arr                 # a b c  ← 还是整体（没引号时按 IFS 切，但这里 echo 会接到多个参数）
set -- $arr                # 把 a b c 分别设为 $1 $2 $3

# 数组 vs 字符串
arr=("a b" "c d")
echo "${arr[@]}"   # a b c d  ← 每个元素原样输出（@ 表示所有元素各自独立）
echo "${arr[*]}"   # a b c d  ← 用 IFS 拼成一个字符串

# IFS：内部字段分隔符，默认是 " \t\n"（空格、Tab、换行）
IFS="," read -r a b c <<< "1,2,3"
echo "$a $b $c"    # 1 2 3
```

> **经验法则**：永远把变量放在双引号里，除非你有明确理由不这么做。
>
> ```bash
> cp "$file" "$dest"     # ✅
> cp $file $dest         # ❌ 文件名含空格会炸
> ```

## 1.3 标准流：stdin / stdout / stderr

每个进程被启动时，Bash 会为它打开三个"文件描述符"：

| FD | 名字 | 用途 |
| --- | --- | --- |
| 0 | stdin  | 标准输入（默认是键盘） |
| 1 | stdout | 标准输出（默认是终端） |
| 2 | stderr | 标准错误（默认是终端） |

这非常重要：**stdin / stdout 是字节流，不是文件**。任何能读写字节流的东西都能用管道串起来。

```bash
# 看 stderr 是什么
ls /no/such/path > /dev/null    # stdout 丢弃
ls /no/such/path 2> /dev/null   # stderr 丢弃

# 重定向细节
echo hi > out.txt        # 覆盖写
echo hi >> out.txt       # 追加写
< in.txt wc -l           # 把文件接到 stdin

# 合并流
command > out 2>&1       # stderr → stdout → 文件（顺序敏感！）
command &> out           # 同上，更现代的写法
command > out 2> err     # 分别重定向
```

**为什么 `> out 2>&1` 必须这个顺序？** 重定向从左到右解释：先把 stdout 指向 out，再把 stderr 指向"当前 stdout 的目标"。如果写反了 `2>&1 > out`，stderr 会指向原始终端，stdout 指向文件。

## 1.4 退出码：命令的"返回值"

每个命令结束时返回一个 0–255 的整数：**0 = 成功，非 0 = 失败**。这与 C 语言的 main 返回值语义一致。

```bash
ls /tmp
echo $?      # 0（成功）

ls /nope
echo $?      # 2（失败）

true;  echo $?    # 0
false; echo $?    # 1
```

退出码是 Bash 控制流的基础：

```bash
cmd && echo "成功"      # cmd 成功才执行
cmd || echo "失败"      # cmd 失败才执行
cmd1 && cmd2 || cmd3   # if/elif/else 缩影
```

特殊变量：

| 变量 | 含义 |
|---|---|
| `$?` | 上一个命令的退出码 |
| `$$` | 当前 shell 的 PID |
| `$!` | 最后一个后台进程的 PID |
| `$0` | 当前脚本名 |
| `$1..$9`/`${10}` | 位置参数 |
| `$#` | 位置参数个数 |
| `$@` | 所有参数（独立） |
| `$*` | 所有参数（拼成一个字符串） |

## 1.5 进程模型：fork + exec

理解这一段，你就懂 Bash 在干什么：

```bash
ls | grep foo
```

Bash 看到这条命令时：

1. **解析**：识别出两个命令 + 一个管道
3. **fork 出 3 个进程**：左边 `ls`、右边 `grep foo`、当前 shell 等待
4. **创建管道**：内核分配一对 FD（一端写、一端读）
5. **exec**：`ls` 替换为 `ls` 进程（stdin/stdout/stderr 按需重定向到管道）
6. **exec**：`grep` 替换为 `grep` 进程（stdin 是管道读端）
7. **wait**：父 shell `wait` 两个孩子，然后返回最后一个的退出码

**关键点**：
- `bash` 本身是**一个不断 fork/exec 的调度器**，大部分"特性"都是外部命令。
- `echo`、`cd`、`read` 这种叫 **builtin**——由 shell 自己实现，不启动新进程。`type cd` 看 builtin，`type ls` 看外部命令。
- 用 `builtin` 可以强制调用 builtin（避免被同名的函数/外部命令覆盖）。

---

