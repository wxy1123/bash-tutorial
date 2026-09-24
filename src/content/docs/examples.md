---
title: 6. 实战例子
---

## 6.1 日志分析

```bash
#!/usr/bin/env bash
# 统计 access.log 中各状态码的访问次数和带宽
# 用法：./log_summary.sh apic.sh access.log

set -euo pipefail

f=${1:?usage: $0 logfile}

printf '%-6s %10s %12s\n' "code" "count" "bytes"
awk '$9 ~ /^[0-9]+$/ {
    code[$9]++
    bytes[$9] += $10
}
END {
    for (c in code) printf "%-6s %10d %12d\n", c, code[c], bytes[c]
}' "$f" | sort -k2 -rn
```

```bash
# Top 10 最慢请求（基于请求时间）
awk '{print $NF, $0}' apic.log | sort -rn | head | cut -d' ' -f2-

# 5xx 错误告警
tail -F -n0 apic.log | grep --line-buffered ' 5[0-9][0-9] ' | while read -r line; do
    echo "ALERT: $line"
done
```

## 6.2 批量重命名

```bash
# 把 .jpeg 改成 .jpg（仅大写情况不匹配）
for f in *.jpeg; do
    mv -- "$f" "${f%.jpeg}.jpg"
done

# 加前缀（日期）
for f in *.jpg; do
    mv -- "$f" "$(date +%Y%m%d)_$f"
done

# 用 mmv 更稳
mmv '*.jpeg' '#1.jpg'
```

## 6.3 查找大文件 / 清理磁盘

```bash
# 当前目录前 20 大文件
find . -type f -printf '%s\t%p\n' | sort -rn | head -20 | numfmt --field=1 --to=iec

# 哪些目录占用最多
du -h --max-depth=1 . | sort -h | tail

# 找 30 天没访问的大文件
find /var -type f -atime +30 -size +50M -printf '%s\t%p\n' \
    | sort -rn | head

# 清理 N 天前日志（用 trap 防误删）
find /var/log/myapp -name '*.gz' -mtime +30 -delete

# 真正干大事前要 interactive
draft-interactive() {
    find "$1" -type f -mtime +30 -size +100M -print0 |
    xargs -0 -p rm -v
}
```

## 6.4 服务监控脚本

```bash
#!/usr/bin/env bash
# monitor.sh: 每 5 秒检查服务是否在跑
set -euo pipefail

service=${1:-nginx}
interval=${INTERVAL:-5}

while true; do
    if systemctl is-active --quiet "$service"; then
        echo "$(date +%T) $service OK"
    else
        echo "$(date +%T) $service DOWN, restarting..." >&2
        sudo systemctl restart "$service" || true
        # 发邮件/钉钉/微信 等
    fi
    sleep "$interval"
done
```

**健壮版（带 supervisor）**：

```bash
#!/usr/bin/env bash
set -euo pipefail

SERVICE=${1:?service name}
CHECK_INTERVAL=5
MAX_FAILS=3
fails=0

trap 'echo "exiting"; exit 0' INT TERM

while true; do
    if curl -fsS --max-time 3 "http://localhost:8080/health" >/dev/null; then
        fails=0
    else
        fails=$((fails+1))
        echo "$(date -Iseconds) fail $fails/$MAX_FAILS" >&2
        if (( fails >= MAX_FAILS )); then
            systemctl restart "$SERVICE"
            fails=0
            # 发告警...
        fi
    fi
    sleep "$CHECK_INTERVAL"
done
```

## 6.5 增量备份

```bash
#!/usr/bin/env bash
# backup.sh: 用 rsync 做增量备份
set -euo pipefail

SRC=${1:?src}
DST=${2:?dst}
TS=$(date +%Y%m%d-%H%M%S)

mkdir -p "$DST"

# --link-dest 指向最近一次完整备份，做硬链接节约空间
LATEST=$(ls -1 "$DST" | grep -E '^[0-9]{8}-' | sort | tail -1 || true)
LINK=""
if [[ -n "$LATEST" ]]; then
    LINK="--link-dest=$DST/$LATEST"
fi

rsync -a --delete $LINK "$SRC/" "$DST/$TS/"
echo "backup → $DST/$TS"
```

## 6.6 从 CSV 生成 SQL

```bash
#!/usr/bin/env bash
# csv2sql.sh users.csv users.sql "users"
set -euo pipefail

csv=${1:?csv}
out=${2:?out}
table=${3:?table}

{
    echo "BEGIN;"
    awk -F, -v table="$table" '
        NR == 1 { cols = $0; next }
        {
            gsub(/"/,"",$0)
            printf "INSERT INTO %s (%s) VALUES (", table, cols
            for (i=1; i<=NF; i++) {
                if (i>1) printf ", "
                printf "'\''%s'\''", $i
            }
            printf ");\n";
        }
    ' "$csv"
    echo "COMMIT;"
} > "$out"

echo "wrote $out"
```

## 6.7 并发处理（CPU 密集）

```bash
#!/usr/bin/env bash
# 并发处理图片
set -euo pipefail

src=${1:?src dir}
dst=${2:?dst dir}
mkdir -p "$dst"

export -f process_one
export dst

process_one() {
    local f=$1
    local out="$dst/$(basename "${f%.*}").jpg"
    convert "$f" -resize 1024x "$out"
}

export -f process_one

find "$src" -type f \( -iname '*.jpg' -o -iname '*.png' \) -print0 |
    xargs -0 -n1 -P "$(nproc)" bash -c 'process_one "$@"' _

# 或者 GNU parallel（如果有）：
# find "$src" -type f -print0 | parallel -0 -j "$(nproc)" 'convert {} -resize 1024x "$dst"/{/.}.jpg'
```

## 6.8 安全删除 / 防止误删

```bash
# 别名（写到 .bashrc）
alias rm='rm -i'
alias mv='mv -i'
alias cp='cp -i'

# 重要操作前打印 + 确认
danger_rm() {
    echo "About to delete:"
    printf '  %s\n' "$@"
    read -rp "Type 'yes' to confirm: " ans
    [[ $ans == "yes" ]] || { echo "aborted"; return 1; }
    rm -rf -- "$@"
}

# trash-cli（更安全）
brew install trash   # macOS
sudo apt install trash-cli   # Debian/Ubuntu
trash some-file     # 放到回收站而非 rm
```

## 6.9 进阶：构建自己的"小工具"

把常用管线变成可复用的命令：

```bash
# ~/.local/bin/top-ips
#!/usr/bin/env bash
# 显示访问日志中访问次数最多的 N 个 IP
set -euo pipefail
N=${1:-10}
LOG=${LOG_FILE:-/var/log/nginx/access.log}

awk '{print $1}' "$LOG" | sort | uniq -c | sort -rn | head -n "$N"
```

```bash
# ~/.local/bin/find-big
sed -e 's/[ 	][ 	]*/ /g' |
sort -rn |
head -20
```

加进 `PATH` 后就像原生命令一样用。

## 6.10 一些杂项技巧

```bash
# 进度条（pv）
tar cf - \| pv -s $(du -sb . | awk '{print $1}') \| gzip > out.tar.gz

# 批量修改文件后缀
for f in *.html; do
    pandoc "$f" -o "${f%.html}.md"
done

# 文件分割
split -l 1000 big.txt part_    # 每 1000 行一个
split -b 100M big.bin chunk_

# 时间戳转可读
date -d @1700000000
date -d @1700000000 +%F\ %T

# bash 4+ 关联数组做缓存
declare -A cache
slow() {
    local key=$1
    [[ ${cache[$key]:-} ]] && { echo "${cache[$key]}"; return; }
    local v; v=$(curl -s "https://api/$key")  # 假设的慢操作
    cache[$key]=$v
    echo "$v"
}

# 异步 + 等待
slow_async() {
    local key=$1
    slow "$key" &
    pids+=($!)
}
declare -a pids
for k in a b c; do slow_async "$k"; done
for p in "${pids[@]}"; do wait "$p"; done
```

---

## 附录：推荐的 Bash 学习路径

1. **不要背 cheat sheet**，写 50 个小脚本。Cheat sheet 是 lookup，不是教材。
2. 每次新写脚本先跑 `shellcheck`。
3. 读 `/usr/bin` 下的命令实现。看它们怎么处理参数、信号、临时文件。
4. 读 Greg's Wiki：[mywiki.wooledge.org](https://mywiki.wooledge.org/) — 比多数书都好。
6. 不要写 `#!/bin/sh` 除非真要兼容 POSIX shell。
7. 当 Bash 不再合适时：换 Python、Go、Rust。但很多 5–50 行的小活，Bash 还是最快。

## Bash vs POSIX sh 速查

| 特性 | POSIX sh | Bash |
|---|---|---|
| 数组 | ❌ | ✅ |
| `[[ ]]` | ❌ | ✅ |
| `${var,,}`（小写） | ❌ | ✅（bash 4） |
| 关联数组 | ❌ | ✅（bash 4） |
| `{a..z}` brace | ❌ | ✅ |
| `$RANDOM` | ❌ | ✅ |
| `source` vs `.` | 等价 | 等价 |
| `local` | ❌ | ✅（非 POSIX） |
| `[[ -e ]]` vs `[ -e ]` | 都行 | 都行 |
| `set -o pipefail` | ❌ | ✅ |

## 一页速记

```bash
# 安全模式
set -euo pipefail
IFS=$'\n\t'
trap 'echo "line $LINENO: $BASH_COMMAND failed" >&2' ERR

# 参数
"$@"                        # 所有参数（独立）
"$1"                       # 第 1 个
"${1:-default}"            # 默认值
"${var//old/new}"          # 全替换

# 引用
"$var"                      # ✅ 总是加引号
${var}                      # ⚠️ 拼接/特殊语法可不加

# 循环
for f in *.log; do ... done
while IFS= read -r line; do ... done < file

# 调试
bash -x script.n            # trace
bash -n script.n           # syntax only
shellcheck script.n        # 静态检查
```

Happy hacking!