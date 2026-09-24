---
title: 5. 脚本技巧
---

写一个能跑的脚本和写一个**可靠**的脚本是两回事。

## 5.1 Shebang 与可执行权限

```bash
#!/usr/bin/env bash
# 比 #!/bin/bash 更可移植：env 在 PATH 中找 bash

chmod +x script.sh
./script.sh
```

**Bash 模式**（写在脚本里）：

```bash
set -e          # 命令失败立即退出
set -u          # 未定义变量报错
set -o pipefail # 管道中任一阶段失败就算整体失败
set -E          # 让 ERR trap 被函数继承
shopt -s inherit_errexit   # 子 shell 也继承 -e
```

`set -euo pipefail` 是"严肃 Bash 脚本"的标配。

## 5.2 变量、数组、关联数组

```bash
# 字符串
name="alice"
readonly PI=3.14

# 数组
arr=(a b c)
arr[3]=d
echo "${arr[@]}"            # 所有元素
echo "${#arr[@]}"           # 元素个数
for x in "${arr[@]}"; do echo "$x"; done
arr+=(e f)                  # 追加
arr=("${arr[@]/b/B}")       # 替换（所有元素中的 b → B）

# 切片
echo "${arr[@]:1:2}"        # 从 1 开始取 2 个

# 关联数组（hash）
declare -A map
map[foo]=1
map[bar]=2
echo "${map[foo]}" "${!map[@]}"    # 值、键列表
for k in "${!map[@]}"; do echo "$k=${map[$k]}"; done

# 删除
unset arr[2]   # 删元素
unset map[foo]
```

**`$@` vs `$*`** 的差别：

```bash
set -- "a b" "c"
for x in "$@"; do echo "[$x]"; done   # [a b] [c]  ← 独立元素
for x in "$*"; do echo "[$x]"; done   # [a b c]  ← 拼成一个
```

## 5.3 条件分支

```bash
if [[ -f "$f" ]]; then
    echo "file"
elif [[ -d "$f" ]]; then
    echo "dir"
else
    echo "other"
fi

# case
case "$ext" in
    txt) cat "$f" ;;
    gz)  gunzip -c "$f" ;;
    json) jq . "$f" ;;
    *)   echo "unknown: $ext" ;;
esac

# case 模式支持 glob 和 |
case "$1" in
    start|up)    start_service ;;
    stop|down)   stop_service ;;
    restart)     stop_service; start_service ;;
    *)           usage ;;
esac
```

## 5.4 循环

```bash
# C 风格 for
for ((i=0; i<10; i++)); do echo $i; done

# 列表 for
for f in *.log; do
    [[ -s "$f" ]] || continue
    gzip "$f"
done

# while 读文件（推荐方式）
while IFS= read -r line; do
    echo "$line"
done < file.txt

# 读 CSV
while IFS=, read -r a b c; do
    echo "$a | $b | $c"
done < data.csv

# until
until ping -c1 host; do sleep 1; done

# break/continue
for i in {1..100}; do
    (( i % 7 == 0 )) && continue
    (( i > 50 )) && break
    echo "$i"
done
```

## 5.5 函数

```bash
# 推荐：local 永远要写
log() {
    local level="$1"; shift
    local msg="$*"
    printf '[%s] %s %s\n' "$(date +%H:%M:%S)" "$level" "$msg" >&2
}

log info "starting..."
log error "boom"

# 返回值：通过退出码
is_even() {
    (( $1 % 2 == 0 ))
}

if is_even 4; then echo yes; fi

# 返回字符串用 echo，调用者用 $(...)
greet() {
    local name="${1:-world}"
    echo "hello, $name"
}
msg=$(greet "alice")
```

**陷阱**：

```bash
# 函数参数是 $1..$N，不是循环变量
foo() { echo "$1"; }
foo a b c   # 只输出 a

# 递归
fact() {
    local n=$1
    if (( n <= 1 )); then echo 1; return; fi
    local prev; prev=$(fact $((n-1)))
    echo $(( n * prev ))
}
```

## 5.6 参数处理：`getopts` / `shift`

```bash
usage() {
    cat <<EOF
Usage: $0 [-v] [-o FILE] [-h] FILE...
EOF
}

verbose=0
outfile=""

while getopts ":vo:h" opt; do
    case "$opt" in
        v) verbose=1 ;;
        o) outfile="$OPTARG" ;;
        h) usage; exit 0 ;;
        \?) echo "unknown: -$OPTARG" >&2; usage; exit 2 ;;
        :)  echo "missing arg: -$OPTARG" >&2; usage; exit 2 ;;
    esac
done
shift $((OPTIND - 1))

# 现在 $@ 是剩余的位置参数
for f in "$@"; do
    echo "process $f"
done
```

## 5.7 健壮性：`set` 选项 + `trap`

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# 临时文件自动清理
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# 错误时打印行号
trap 'echo "error at line $LINENO" >&2' ERR

# 退出码集中处理
on_exit() {
    local code=$?
    if (( code != 0 )); then
        echo "failed with $code" >&2
    fi
}
trap on_exit EXIT
```

**一些推荐的 `shopt`**：

```bash
shopt -s autocd         # 输入目录名直接 cd
shopt -s cdspell        # cd 自动纠错
shopt -s dirspell       # 补全纠错
shopt -s globstar       # ** 递归匹配
shopt -s nocaseglob    # 通配忽略大小写
shopt -s lastpipe      # 最后一段管道在当前 shell 运行
```

## 5.8 调试技巧

```bash
# 方法 1：bash 内置
bash -x script.sh              # 打印每条命令
bash -v script.sh              # 打印原始行

# 方法 2：脚本里动态开启
set -x                         # 开启 trace
set +x                         # 关闭 trace
PS4='+${BASH_SOURCE}:${LINENO}: '   # 自定义 trace 前缀

# 方法 3：只检查语法不执行
bash -n script.sh

# 方法 4：用 trap 进入调试
trap 'echo "[LINE $LINENO] $BASH_COMMAND"' DEBUG

# 方法 5：用 shellcheck
shellcheck script.sh           # 静态分析，会告诉你很多坑
```

**常见 trap 速查**：

| 信号 | 含义 | 何时触发 |
|---|---|---|
| `EXIT` | 退出 | 脚本正常或异常退出 |
| `ERR` | 错误 | 命令失败（要 `set -E` 才能被函数继承） |
| `DEBUG` | 调试 | 每条命令执行前 |
| `INT` | SIGINT | Ctrl-C |
| `TERM` | SIGTERM | kill |
| `HUP` | SIGHUP | 终端关闭 |

---

