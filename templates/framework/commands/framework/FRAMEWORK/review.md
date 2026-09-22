---
description: Review a <Framework> diff against this project's conventions
argument-hint: <branch-or-path>
---

<!-- TEMPLATE: xoá khối này trước khi commit.
     Command = một file, một prompt, gõ `/<fw>-review`.
     commands/framework/<fw>/review.md -> .claude/commands/<fw>-review.md
     Dùng được `$ARGUMENTS` và !`<shell command>`.
     Docs khuyên workflow mới nên là skill — gọi bằng `/name` y hệt mà đóng gói
     được file đi kèm. Chỉ để lại file này nếu nó thật sự chỉ là một prompt.
-->

## Diff to review

!`git diff $ARGUMENTS`

Review the changes above against this project's <Framework> conventions:

1. …

Report each finding as `file:line` with the severity and the fix.
