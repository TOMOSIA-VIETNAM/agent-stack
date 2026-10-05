---
paths:
  - "app/**/*.<ext>"
  - "<test-dir>/**/*.<ext>"
---

<!-- TEMPLATE: xoá khối này trước khi commit, và thay hết placeholder `<…>`.
     Rule = quy ước. Không cần front matter nào ngoài `paths:`.
     Viết tiếng Anh, bullet mệnh lệnh, nói *vì sao*.
     rules/framework/<fw>/conventions.md -> .claude/rules/<fw>-conventions.md

     `paths:` là glob quyết định khi nào rule được nạp — cùng cú pháp
     path-specific rules: `**/*.rb`, `app/**/*`, `src/**/*.{ts,tsx}`. Bỏ hẳn
     khối đó thì rule nạp vô điều kiện.

     Claude Code tự nạp `.claude/rules/`: rule không có `paths:` nạp lúc
     launch, rule có `paths:` chỉ nạp khi Claude đọc/sửa file khớp glob.
     agent-stack không `@`-import rule ở đâu cả, nên `paths:` có tác dụng.
-->

# <Framework> Conventions

## Layering

- …

## Data access

- …

## Configuration and secrets

- …

## Testing

- …
