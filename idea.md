# Tổng quan bài toán

Cần xây một **Agent sinh cấu hình AI coding (rules + skills)** cho dự án phần mềm, dựa trên một **tech stack đầu vào** (ngôn ngữ, framework, database, infra...). Agent **không tự sáng tác** rule/skill bằng LLM mỗi lần — mà **chọn, ghép và điều chỉnh** từ một **knowledge base có sẵn** (đã được chuẩn hóa theo từng ngôn ngữ/framework). Mục tiêu cuối: biến kiến thức engineering hiện có (rời rạc theo ruby/php/node...) thành một hệ thống **tái sử dụng, version-control được**, tự động sinh ra bộ `.ai/rules` + `.ai/skills` chuẩn cho từng dự án mới.

Nguyên lý cốt lõi: **Select → Resolve → Compose → Validate**, trong đó phần *deterministic* (tra cứu, resolve dependency, ghép file) nên do code xử lý; LLM chỉ tham gia ở phần *hiểu ngôn ngữ tự nhiên, xử lý ambiguity, giải thích conflict*.

---

# Yêu cầu chi tiết

## 1. Chuẩn hóa Knowledge Base (làm trước tiên, ưu tiên cao nhất)
- Tổ chức lại toàn bộ rule/skill hiện có theo cấu trúc thư mục 3 tầng:
  - **Layer 1 – Global**: coding principles, security, git, testing, documentation chung.
  - **Layer 2 – Language**: ruby, php, node...
  - **Layer 3 – Framework/Stack**: rails, laravel, nestjs, react, stimulus...
- Mỗi **rule** và **skill** phải có metadata (YAML) gồm: `id`, `name`, `type`, `language/framework`, `dependencies`, `conflicts_with`, `compatible_with`, `tags`, `priority`, `version range`, `files`.
- Phân biệt rõ:
  - **Rule** = quy tắc/convention ("phải code như thế nào").
  - **Skill** = quy trình/khả năng thực hiện task ("làm task X như thế nào", gồm các bước cụ thể).

## 2. Tech Stack Model (định nghĩa input)
- Định nghĩa schema input chuẩn cho tech stack: `language`, `framework`, `frontend`, `database`, `cache`, `testing`, `infrastructure`, `architecture`, kèm version.
- Agent phải chuyển input (form có cấu trúc hoặc câu tự nhiên) thành JSON/YAML tech stack đã normalize.

## 3. Dependency Resolver
- Xây dựng **dependency graph** giữa các công nghệ (ví dụ: Rails → Ruby, ActiveRecord; ECS → AWS, Docker; RDS → AWS, PostgreSQL).
- Khi user chọn 1 công nghệ, agent phải tự động resolve toàn bộ dependency liên quan (ví dụ chọn ECS thì tự thêm Docker).

## 4. Compatibility Checker
- Mỗi công nghệ cần khai báo `requires`, `compatible_with`, `conflicts_with`.
- Agent phải phát hiện xung đột (ví dụ Rails + React + Stimulus cùng lúc) và **hỏi lại người dùng** hoặc cảnh báo rõ ràng, không tự quyết định âm thầm.

## 5. Rule/Skill Selector + Composer
- Dựa trên tech stack đã resolve, chọn đúng tập rule/skill tương ứng từ knowledge base (bao gồm cả rule Global).
- Ghép (compose) thành output cuối, tránh trùng lặp giữa các layer.

## 6. Validator
- Kiểm tra tính đầy đủ (đã có version Ruby, Rails chưa xung đột, v.v.) trước khi generate.
- Trả về báo cáo: số rule/skill đã áp dụng, có conflict hay không.

## 7. Output chuẩn
- Sinh ra cấu trúc thư mục cố định, ví dụ:
```
.ai/
├── rules/     (00-general.md, ruby.md, rails.md, ...)
└── skills/    (rails/, active-record/, aws/, ...)
```

## 8. Versioning
- Rule/skill phải hỗ trợ **version range** (ví dụ Ruby 3.3–3.4, Rails 7–8.x) để sinh đúng nội dung theo version cụ thể của dự án.

## 9. Giao diện sử dụng (theo giai đoạn)
- **Phase 1 (MVP – không dùng LLM)**: CLI tool, input qua flag (`--language`, `--framework`...), chỉ hỗ trợ Ruby/PHP/Node + Rails/Laravel/NestJS. Dùng file YAML (`catalog.yaml`) làm nguồn dữ liệu, KHÔNG cần vector DB/RAG ở bước này.
- **Phase 2**: Thêm LLM ở lớp input — cho phép user tả bằng ngôn ngữ tự nhiên (ví dụ: "Làm SaaS bằng Rails, frontend Stimulus, Postgres, deploy ECS"), LLM convert thành JSON tech stack chuẩn; phần resolve/compose vẫn deterministic.
- **Phase 3**: Tích hợp thành hệ thống bootstrap project đầy đủ (sinh rules/skills/OpenSpec cùng lúc), phục vụ nhiều công cụ AI (Claude Code, Cursor, CI/CD).

## 10. Ràng buộc kỹ thuật quan trọng
- Không để LLM tự "bịa" nội dung rule/skill — LLM chỉ chọn và diễn giải, nội dung gốc luôn lấy từ knowledge base đã kiểm soát.
- Ưu tiên thiết kế `catalog.yaml` + schema + resolver **trước khi** viết agent/LLM layer.
- Toàn bộ knowledge nên nằm trong Git repo để version-control được.
