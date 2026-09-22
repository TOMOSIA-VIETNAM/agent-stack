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

     LƯU Ý: hôm nay `paths:` chưa có tác dụng — agent-stack `@`-import mọi rule
     được chọn từ CLAUDE.md, và file đã import thì nạp hết lúc launch. Viết
     đúng glob ngay từ giờ để không phải sửa lại khi cơ chế import thay đổi;
     cần gate theo task *ngay* thì viết skill, nơi `paths:` đã chạy.
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
