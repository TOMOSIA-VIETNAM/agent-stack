# Tổng quan bài toán

Cần xây một **Agent sinh cấu hình AI coding (rules + skills + command)** cho dự án phần mềm, dựa trên **framework mà dự án dùng**. Agent **không tự sáng tác** rule/skill bằng LLM mỗi lần — mà **chọn, ghép và điều chỉnh** từ một **knowledge base có sẵn** (đã được chuẩn hóa theo từng ngôn ngữ/framework). Mục tiêu cuối: biến kiến thức engineering hiện có (rời rạc theo ruby/php...) thành một hệ thống **tái sử dụng, version-control được**, tự động sinh ra bộ `.ai/rules` + `.ai/skills` chuẩn cho từng dự án mới.

Nguyên lý cốt lõi: **Select → Resolve → Compose → Validate**, trong đó phần *deterministic* (tra cứu, resolve dependency, ghép file) nên do code xử lý; LLM chỉ tham gia ở phần *hiểu ngôn ngữ tự nhiên, xử lý ambiguity, giải thích conflict*.

---

# Yêu cầu chi tiết

## 1. Chuẩn hóa Knowledge Base (làm trước tiên, ưu tiên cao nhất)
- Tổ chức lại toàn bộ rule/skill hiện có theo cấu trúc thư mục 2 tầng:
  - **Layer 1 – Global**: coding principles, security, git, testing, documentation chung.
  - **Layer 2 – Framework**: rails, laravel.
- **File trong knowledge là của người dùng, agent-stack copy nguyên văn.** Không đọc, không sửa, không dựng lại front matter. Thứ gì trong file là để Claude đọc, không phải để generator xử lý.
- Ngoại lệ duy nhất là `claude-md/`: nội dung của nó được ghép thẳng vào `CLAUDE.md` của dự án — file đó do agent-stack dựng, không phải file được copy.
- Vì vậy **toàn bộ metadata suy từ đường dẫn**: `type` từ thư mục gốc (`rules/`, `skills/`, `commands/`), `layer` từ segment 2, `applies_to` từ thư mục framework, `id` từ phần còn lại nối bằng `-`.
- `rules/framework/rails/security.md` ra `.claude/rules/rails-security.md`, giống từng byte. Thứ tự sắp theo alphabet của chính tên đó.
- Phân biệt rõ:
  - **Rule** = quy tắc/convention ("phải code như thế nào"), `@`-import từ CLAUDE.md.
  - **Skill** = quy trình/khả năng thực hiện task ("làm task X như thế nào", gồm các bước cụ thể).

## 2. Tech Stack Model (định nghĩa input)
- **Đầu vào chỉ là framework, và catalog cũng chỉ chứa framework.** Operator nêu framework dự án đang dùng (`rails`, `laravel`) và không nêu gì khác.
- Lý do: framework là thứ duy nhất người dùng luôn biết chắc và không bao giờ nhầm. Mỗi thứ thêm vào đầu vào là một cơ hội để operator bỏ sót và rule biến mất im lặng.
- Không có trường `kind`: mọi entry trong catalog đều là framework, nên một trường luôn mang cùng một giá trị chỉ là nhiễu.
- Hệ quả: rule về ngôn ngữ cũng gate bằng framework. Rule style Ruby nằm ở `rules/framework/rails/ruby.md`, ra `.claude/rules/rails-ruby.md`.
- Agent phải chuyển input (form có cấu trúc hoặc câu tự nhiên) thành danh sách framework id đã normalize.

## 3. Dependency Resolver
- Giữ **dependency graph** qua `requires`: chọn một framework thì kéo theo mọi thứ nó khai, đệ quy.
- Hiện chưa entry nào cần `requires` — Rails và Laravel không phụ thuộc gì trong catalog. Cơ chế vẫn nằm đó vì nó là thứ resolver tồn tại để làm, và vì một framework build trên framework khác là chuyện có thật.
- **`requires` chỉ chạy một chiều: lên trên.** Một rule gate bằng thứ không có trong catalog sẽ không bao giờ được sinh ra.

## 4. Compatibility Checker
- Mỗi công nghệ cần khai báo `requires`, `compatible_with`, `conflicts_with`.
- Agent phải phát hiện xung đột (ví dụ hai framework kéo vào hai database loại trừ nhau) và **hỏi lại người dùng** hoặc cảnh báo rõ ràng, không tự quyết định âm thầm.

## 5. Rule/Skill Selector + Composer
- Dựa trên tech stack đã resolve, chọn đúng tập rule/skill tương ứng từ knowledge base (bao gồm cả rule Global).
- Ghép (compose) thành output cuối, tránh trùng lặp giữa các layer.

## 6. Validator
- Kiểm tra tính đầy đủ (đã chọn framework chưa, có xung đột nào chưa được chấp nhận không, v.v.) trước khi generate.
- Trả về báo cáo: số rule/skill đã áp dụng, có conflict hay không.

## 7. Output chuẩn
- Sinh ra cấu trúc thư mục cố định, mỗi file là bản copy nguyên văn của file trong knowledge:
```
CLAUDE.md                          đoạn claude-md inline + khối @-import, trong cặp marker
.claude/rules/<tên>.md
.claude/skills/<tên>/SKILL.md
.claude/commands/<tên>.md
.claude/agent-stack-manifest.json
```

## 8. Không xử lý version
- Việc chọn rule/skill **không quan tâm tới version** của ngôn ngữ hay framework. Một artifact gate bằng technology, không gate bằng release của nó.
- Lý do: version gate phải đi kèm việc bắt operator pin version; pin sai hoặc bỏ trống thì rule bị loại âm thầm — đúng thứ hệ thống này tồn tại để tránh. Nội dung nào thật sự chỉ đúng với một version nhất định thì viết rõ điều kiện đó trong thân rule, để người đọc thấy được.
- Bản thân knowledge base được version-control bằng Git; đó là cơ chế versioning duy nhất.

## 9. Giao diện sử dụng (theo giai đoạn)
- **Phase 1 (MVP – không dùng LLM)**: CLI tool, input qua đúng một cờ `--framework` (lặp lại được), catalog đúng hai entry là Rails và Laravel. Dùng file YAML (`catalog.yaml`) làm nguồn dữ liệu, KHÔNG cần vector DB/RAG ở bước này.
- **Phase 2**: Thêm LLM ở lớp input — cho phép user tả bằng ngôn ngữ tự nhiên (ví dụ: "Làm SaaS bằng Rails"), LLM convert thành danh sách framework id; phần resolve/compose vẫn deterministic.
- **Phase 3**: Tích hợp thành hệ thống bootstrap project đầy đủ (sinh rules/skills/OpenSpec cùng lúc), phục vụ nhiều công cụ AI (Claude Code, Cursor, CI/CD).

## 10. Ràng buộc kỹ thuật quan trọng
- Không để LLM tự "bịa" nội dung rule/skill — LLM chỉ chọn và diễn giải, nội dung gốc luôn lấy từ knowledge base đã kiểm soát.
- Ưu tiên thiết kế `catalog.yaml` + schema + resolver **trước khi** viết agent/LLM layer.
- Toàn bộ knowledge nên nằm trong Git repo để version-control được.
