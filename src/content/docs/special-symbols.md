---
title: 2. 特殊符号都是怎么用的
---

Bash 符号多，但有规律。把它分成几类就好记了。

## 2.1 变量与展开 `$` `${}`

```bash
name="alice"

echo $name          # alice
echo "$name"        # alice
echo "${name}_x"    # alice_x  ← 用 {} 划定边界

# 各种花式展开
echo "${name:-guest}"   # name 为空就用 guest（不修改 name）
echo "${name:=guest}"   # name 为空就赋值给 name 再用
echo "${name:?error msg}" # name 为空就报错并退出
echo "${name:+alt}"     # name 非空就用 alt，否则空

echo "${name^^}"        # ALICE（转大写，bash 4+）
echo "${name,,}"        # alice（转小写）
echo "${#name}"         # 5（字符串长度）
echo "${name:0:3}"      # ali（子串）
echo "${name/a/A}"      # Alice（替换第一个）
echo "${name//a/A}"     # AlIce（替换所有）
```

**默认变量 vs 必须加花括号**：

```bash
echo $name_x       # ❌ Bash 找的是 $name_x 这个变量，找不到
echo ${name}_x     # ✅ ${name} 是 alice，整体结果是 alice_x
```

## 2.2 命令替换 `` ` ` ` 和 `$( )`

把命令的输出捕获为字符串。

```bash
today=$(date +%F)
files=$(ls)

# 嵌套更友好
echo "Today is $(date +%A $(date +%m/%d))"   # 嵌套 $()

# 旧写法仍然能用，但不推荐
today=`date +%F`

# 注意：结果按 IFS 拆词，除非加双引号
for f in $(ls *.txt); do ... done       # 文件名含空格会坏
while IFS= read -r line; do ... done < file   # ✅ 正确读文件
```

## 2.3 算术展开 `$(( ))`

```bash
echo $(( 1 + 2 ))          # 3
echo $(( 5 > 3 ? 1 : 0 ))  # 1

x=5
echo $(( x * 2 ))          # 10
(( x++ ))                  # 自增，不输出
echo $x                    # 6

# 注意：算术上下文里变量名可省略 $
echo $(( x ))              # 6
(( y = x * 2 ))             # y=10
```

## 2.4 通配符 `*` `?` `[ ]` `{ }`

```bash
# ?  单个字符；[] 字符集；{} 集合
ls *.txt              # 所有 .txt
ls file?.log          # file1.log, fileA.log, ...
ls file[0-9].log      # file0.log 到 file9.log
ls file[!abc].log     # 排除 a/b/c
ls file{1,2,3}.log    # file1.log file2.log file3.log

# brace expansion 会在 shell 层展开，不是文件匹配
echo {a..e}           # a b c d e
echo {01..10..2}      # 01 03 05 07 09
mkdir -p src/{js,css,img}
```

> ⚠️ **空匹配的坑**：在没有匹配文件时，`*` 默认保持原样而不是报错。需要严格匹配就用 `shopt -s nullglob`（匹配空数组）或 `failglob`（找不到直接报错）。

## 2.5 重定向 `>` `>>` `<` `<<` `<<<` `&>` `2>&1`

```bash
echo a > f           # 覆盖
echo a >> f          # 追加
< f read x           # stdin 来自文件

# Here document：<<EOF 把多行文本作为输入
cat <<'EOF' > script.sh
echo $x              # 注意：'EOF' 引号会让内容字面量
EOF
cat <<EOF > script.sh
echo $x              # 没引号会展开变量/命令
EOF

# Here string：<<< 把一个字符串作为 stdin
grep "foo" <<< "hello foo bar"

# 进程替换：<(cmd) 让 cmd 输出看起来像文件
diff <(ls dir1) <(ls dir2)

# FD 复制
exec 3< input.txt            # 打开 fd 3 读 input.txt
read -r -u 3 line            # 从 fd 3 读
exec 3<&-                    # 关闭 fd 3
```

## 2.6 组合控制 `|` `||` `&&` `;` `&`

```bash
cmd1 ; cmd2              # 顺序执行，无论成败
cmd1 && cmd2             # cmd1 成功才执行 cmd2
cmd1 || cmd2             # cmd1 失败才执行 cmd2
cmd &                     # 后台运行
cmd1 | cmd2               # 管道：cmd1 的 stdout → cmd2 的 stdin

# 优先级陷阱
false && echo a || echo c      # 输出 c（与 if/else 类似）
# 等价于 if false; then ... else echo c; fi

# 推荐写法（明确）
ls && { echo "ok"; } || { echo "fail"; exit 1; }
```

## 2.7 引用与转义 `'` `"` `\`

```bash
echo 'It'\''s ok'     # It's ok  ← 经典：单引号里要带单引号就这样
echo "price: \$5"     # price: $5 ← \$ 在双引号里也会被转义
echo "a\nb"           # a\nb  ← \n 在 bash 不是换行！printf 才认
printf 'a\nb\n'        # a b 各占一行
```

## 2.8 进程与作业 `&` `jobs` `fg` `bg` `wait`

```bash
sleep 100 &            # 后台
jobs                   # 查看当前 shell 的后台作业
fg %1                  # 拉回前台
bg %1                  # 让它继续后台
wait                   # 等待所有后台子结束
wait $!                # 等最后一个后台进程

# 关闭终端时，后台进程默认会收到 SIGHUP 退出。解决：
nohup cmd &            # 忽略 SIGHUP
disown                 # 从 jobs 中移除（不收 HUP）
```

## 2.9 测试与条件 `[ ]` `[[ ]]` `(( ))`

```bash
# [ ] 是 test 命令的简写，必须留空格，变量要加引号
[ "$a" = "x" ] && echo yes
[ -f file ] && echo "is file"
[ -d dir ] && echo "is dir"

# [[ ]] 是 bash 的关键字，语法更宽松
[[ $a == x* ]]         # 通配匹配
[[ $a =~ ^[0-9]+$ ]]  # 正则
[[ -z $a ]]            # 空字符串

# (( )) 用于数字
(( a > 0 )) && echo positive
(( a == 0 )) && echo zero

# 综合示例
if [[ -f "$f" && -r "$f" ]]; then
    echo "readable"
elif [[ ! -e "$f" ]]; then
    echo "missing"
else
    echo "other"
fi
```

**常用文件测试**：

| 测试 | 含义 |
|---|---|
| `-e` | 存在 |
| `-f` | 是普通文件 |
| `-d` | 是目录 |
| `-L` | 是符号链接 |
| `-r` | 可读 |
| `-w` | 可写 |
| `-x` | 可执行 |
| `-s` | 存在且非空 |

## 2.10 注释与历史 `#` `!!`

```bash
# 单行注释
: <<'EOF'
多行注释用 here-doc + noop 命令
任何东西都能放这里
EOF

# 历史展开（默认仅交互模式）
!!          # 上一条命令
!$          # 上一条命令的最后一个参数
!^          # 上一条命令的第一个参数
!*          # 上一条命令的所有参数
!n          # 第 n 条历史
!?foo       # 最近一条含 foo 的历史

# 在脚本里禁用历史展开：set +H
```

---

