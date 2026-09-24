---
title: 4. Coreutils 工具组合使用
---

这一节聚焦实战里反复用到的几对工具，并展示它们如何组合。

## 4.1 文本三剑客：`grep` `sed` `awk`

### `grep`：行级过滤

```bash
grep "pattern" file
grep -i "error" file          # 忽略大小写
grep -v "debug" file          # 反向（不含 debug）
grep -E "warn|error" file     # 扩展正则
grep -c "" file               # 匹配的行数（不是次数）
grep -n "foo" file            # 带行号
grep -r "TODO" src/           # 递归目录
grep -l "main" *.c            # 只列出含 main 的文件名

# 常用：-P（PCRE），-F（字面量），-A/-B/-C（上下文行数）
grep -A 2 "Exception" log     # 匹配行 + 后 2 行
```

**案例：从注释/字符串中剔除**：

```bash
grep -v '^\s*#' file          # 去掉以 # 开头的行（注意 \s 在 -P 才支持，-E 用 [[:space:]]）
grep -v -E '^\s*(#|$)' file  # 同时跳过空行
```

### `sed`：流编辑

```bash
sed 's/old/new/' file             # 每行替换第一个
sed 's/old/new/g' file            # 全局替换
sed -i.bak 's/old/new/g' file     # 直接改文件，备份为 file.bak

# 地址：指定行
sed '5s/x/y/' file                # 第 5 行
sed '5,10d' file                  # 删除 5–10 行
sed '/pattern/d' file             # 删除匹配行
sed -n '/start/,/end/p' file      # 打印 start 到 end 区间
sed '/pattern/!d' file            # 反向（保留非匹配）

# 多命令
sed -e 's/a/A/' -e 's/b/B/' file
sed 's/a/A/; s/b/B/' file

# 高级
sed 's/\(foo\)\(bar\)/\2\1/' file             # 分组引用
sed -E 's/(foo)(bar)/\2\1/' file              # ERE 写法
sed 's/.*/<<&>>/' file                          # 在每行外加 <<>>
sed -n '/foo/{p;=;}' file                      # 匹配行同时打印行号

# 用 sed 做"加法"
seq 1 10 | sed 's/^/+ /' | bc
```

### `awk`：按字段编程

`awk` 实际上是图灵完备的领域专用语言。常用形式：`awk 'pattern { action }' file`。

```bash
# 默认按空白切字段，$1 $2 ... $NF（最后一列），$0（整行）
awk '{ print $1 }' file            # 第一列
awk -F: '{ print $1 }' /etc/passwd   # 自定义分隔符
awk -F: '$3 == ":0" { print $1 }' /etc/passwd   # 过滤 root
awk -F: 'BEGIN{OFS="\t"} {print $1, $3}' file   # 输出分隔符
awk '$2 > 100 { sum += $2 } END { print sum }' file   # 求和

# 数组：词频统计
awk '{ for (i=1;i<=NF;i++) c[$i]++ } END { for (k in c) print c[k], k }' file | sort -rn

# 内置：NR（行号）、NF（列数）、FS（输入分隔符）、OFS（输出分隔符）、FILENAME、ARGV

# 实战：统计 access log 中状态码分布
awk '{ c[$9]++ } END { for (k in c) print k, c[k] }' access.log | sort -k2 -rn

# 实战：按 IP 统计请求数
awk '{ ip[$1]++ } END { for (k in ip) print ip[k], k }' access.log | sort -rn | head

# gawk 才有的：gensub、asort、match 第三个参数
```

## 4.2 排序去重：`sort` `uniq`

```bash
sort file                     # 字典序
sort -n file                  # 数值
sort -r file                  # 倒序
sort -k2,2 -n file            # 按第 2 列数值排序
sort -u file                  # 去重
sort -t: -k3 -n /etc/passwd   # 按 uid 排
sort -R file                  # 随机（不保证真随机）

# uniq：注意只对连续重复生效
sort file | uniq              # ✅ 全局去重
sort file | uniq -c           # 统计次数
sort file | uniq -d           # 只显示重复过的
sort file | uniq -u            # 只显示没重复的
```

## 4.3 字段切割：`cut` `paste` `column`

```bash
cut -d: -f1,3 /etc/passwd            # 切第 1、3 字段
cut -c1-10 file                      # 每行前 10 个字符

paste file1 file2                    # 两文件按行并
paste -d, file1 file2                # 自定义分隔符
paste - - < file                     # 把每两行合成一行

column -t -s: file                   # 按 : 分隔，表格化输出
```

## 4.4 字符转换：`tr` `iconv`

```bash
tr 'a-z' 'A-Z' < file                # 小写转大写
tr -d '\r' < windows.txt > unix.txt  # 删 \r
tr -s ' '                            # 压缩连续空格为单个
tr -cd '0-9\n'                       # 只保留数字和换行（-d 取反）
tr ':' '\n'                          # : 换成换行

iconv -f GBK -t UTF-8 in.txt -o out.txt
```

## 4.5 计数统计：`wc` `nl`

```bash
wc -l file       # 行数
wc -c file       # 字节数
wc -m file       # 字符数（多字节字符正确）
wc -lwc file     # 一次全要

nl file           # 加行号（默认跳过空行）
nl -ba file       # 全编号
```

## 4.6 流控制：`xargs` `tee` `pv`

```bash
# xargs：把 stdin 转成命令行参数
echo "a b c" | xargs mkdir           # mkdir a b c
find . -name '*.log' -print0 | xargs -0 rm    # 文件名含空格

# 并行
seq 100 | xargs -n1 -P8 sleep 1     # 8 个并发跑

# 确认模式
rm -i $(...) | xargs -p rm          # 每条都问

# tee：一变二
make 2>&1 | tee build.log | grep ERROR

# pv：监控吞吐量
dd if=/dev/zero | pv | gzip > /dev/null
```

## 4.7 文件查找：`find` `locate` `fd`

```bash
# find 是个编程语言
find . -type f -name '*.go'
find . -mtime -7                     # 7 天内改过
find . -size +100M                   # 大于 100M
find . -user www-data
find . -perm -u+x                    # 用户可执行
find . -name '*.tmp' -delete

# 与其他工具组合
find . -type f -name '*.log' -exec grep -l "ERROR" {} +
# 末尾 + 表示把多个文件一次性传给 grep，性能更好

# 或者用 xargs 替 exec
find . -type f -name '*.log' -print0 | xargs -0 grep -l "ERROR"

# locate 走数据库，快但可能过期
sudo updatedb
locate passwd
```

## 4.8 组合拳：常见管线配方

```bash
# Top 10 出现最多的错误
grep -h ERROR app.log | sed 's/.*ERROR //' | sort | uniq -c | sort -rn | head

# 找出 5 分钟内修改过的最大 5 个文件
find . -type f -mmin -5 -printf '%s\t%p\n' | sort -rn | head -5

# 当前目录下所有 .sh 的代码行数
find . -name '*.sh' -print0 | xargs -0 wc -l | tail -n +2 | awk '{s+=$1} END {print s}'

# 把多空格变 CSV
column -t -s' ' file | column -t -s$'\t' -o,

# JSON 提取（jq 登场）
curl -s api.example.com | jq '.items[] | {id, name}'

# XML 提取（xmllint）
xmllint --xpath '//book/title/text()' books.xml

# YAML 提取（yq）
yq '.services[].image' docker-compose.yml
```

---

