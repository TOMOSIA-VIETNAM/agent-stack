---
name: laravel-infer-conventions
description: Khảo sát codebase Laravel để tìm lệnh, kiến trúc và convention thật của dự án, rồi ghi vào AGENTS.md và mục "Đặc thù dự án" của .claude/rules/laravel-*.md. Dùng khi setup template cho repo mới, hoặc khi được yêu cầu detect/document/update project conventions.
disable-model-invocation: true
---

# Laravel Infer Conventions

Ghi lại cách dự án **đang** làm vào đúng chỗ. Mô tả thực tế, không cải thiện nó.

Ý tưởng dựa trên skill `infer-conventions` của [laravel/boost](https://github.com/laravel/boost) (MIT).

## Ghi vào đâu

| Thông tin | File đích |
|---|---|
| Lệnh cài đặt, test, lint, static analysis; chạy native hay qua Docker/Sail | `AGENTS.md` › Lệnh & môi trường |
| Kiến trúc tổng quan: lớp chứa nghiệp vụ, layer KHÔNG dùng, module/domain, actor và guard | `AGENTS.md` › Code & kiến trúc (vài dòng) |
| Chi tiết khi viết code (format response, exception, cast, helper test, DB engine…) | Mục **Đặc thù dự án** của rule tương ứng trong `.claude/rules/laravel-*.md` |
| Allow rule cho lệnh chạy qua Docker/Sail | `.claude/settings.json` |

`AGENTS.md` luôn được nạp và mọi công cụ AI đều đọc; rule chỉ Claude Code đọc, và rule có `paths:` chỉ được nạp khi làm với file khớp.

Mỗi thông tin chỉ ghi ở **một** nơi. Đã có trong `AGENTS.md` thì rule không ghi lại.

Không tự điền các mục `AGENTS.md` không suy ra được từ code: Quy trình làm việc, Bảo mật, Lưu ý quan trọng. Hỏi user ở Bước 3; user không trả lời thì giữ nguyên.

## Nguyên tắc (đọc trước khi bắt đầu)

- **Thực tế là chuẩn.** Kiểu chiếm đa số trong code là convention, kể cả khi có cách "tốt hơn". Không đề xuất cải tiến trong lúc ghi.
- **Chỉ ghi lựa chọn, không ghi mặc định.** Câu hỏi cho mỗi ứng viên: *không có dòng này, Claude có viết khác đi không?* Chỉ ghi khi câu trả lời là có. Quy tắc chung trong file rule đã nói thì không ghi lại.
- **Ghi cả sự vắng mặt có chủ ý.** VD "Không có Service/Repository; controller gọi Eloquent trực tiếp" để Claude không thêm layer.
- **Kiến trúc là quan trọng nhất**: lớp chứa nghiệp vụ (Service/Action/Job/model), DTO, query object, module/domain folder, cách gọi (`handle`/`execute`/`__invoke`).
- **Phải có bằng chứng**: ≥3 ví dụ nhất quán, kiểu cạnh tranh dưới ~20%. Thiếu thì bỏ qua. Với lệnh chạy, bằng chứng là CI config, composer scripts hoặc chạy thử thành công.
- **Xung đột thì báo, không chọn hộ.** Hai kiểu cùng tồn tại đáng kể: hỏi user có ranh giới nào giải thích không (VD module cũ/mới); không có thì ghi là xung đột chưa giải quyết, không ghi.
- **Tool lo thì bỏ.** Style mà Pint/Rector/PHPStan đang ép (theo config đã bật) thì không ghi.
- **Chỉ nêu convention**: 1–2 câu mệnh lệnh, tối đa 1 đoạn cú pháp ngắn. Không ghi số đếm, tỉ lệ, danh sách file làm bằng chứng.

## Bước 0: Định hướng

1. Đọc `AGENTS.md`, `CLAUDE.md` và 6 file `.claude/rules/laravel-*.md`: phần quy tắc chung (để biết gì đã là mặc định) và nội dung dự án đã điền (đã ghi thì bỏ qua, trừ khi được yêu cầu cập nhật).
2. Đọc `composer.json` (phiên bản, package: Pest, Sanctum/Passport/JWT, Livewire/Inertia, Horizon, spatie/laravel-data…), `pint.json`, `phpstan.neon*`, `rector.php`, `phpunit.xml`, CI config.
3. Liệt kê mọi thư mục trong `app/` (và `Modules/`, `src/`, `Domain/` nếu có). Thư mục ngoài skeleton mặc định (`Http`, `Models`, `Providers`, `Console`, `Exceptions`) là dấu hiệu kiến trúc cần xác nhận ở Bước 2.
4. Xác định cách chạy lệnh: native, Sail, Docker (`docker-compose.yml`, `Makefile`, script trong `composer.json`, CI).

**Xong khi:** có danh sách package, tool, thư mục ngoài skeleton, cách chạy lệnh.

## Bước 1: Quét theo checklist

Mở `references/checklist.md`, đi qua từng mục áp dụng được với dự án. Mỗi mục đọc vài file thật (không kết luận chỉ từ số đếm grep), rồi gán đúng 1 kết luận:

| Kết luận | Ý nghĩa | Xử lý |
|---|---|---|
| Pattern | Đủ bằng chứng, là lựa chọn thật | Ứng viên ghi, kèm 2–3 file ví dụ |
| Xung đột | 2 kiểu cùng đáng kể | Báo cáo kèm số lượng và file, hỏi user |
| Mặc định | Nhất quán nhưng trùng quy tắc chung/mặc định Laravel | Bỏ qua |
| Không đủ tín hiệu | Ít ví dụ hoặc không dùng | Bỏ qua |
| Tool lo / đã ghi | Theo nguyên tắc ở trên | Bỏ qua |

Dự án lớn và có công cụ subagent: chia các nhóm checklist cho subagent chạy song song, mỗi subagent trả về (mục, kết luận, bằng chứng, câu đề xuất, file đích).

**Xong khi:** mọi mục áp dụng được đều có đúng 1 kết luận.

## Bước 2: Kiến trúc và đặc thù riêng

1. Với mỗi thư mục ngoài skeleton ở Bước 0: xác nhận cách dùng (VD Action gọi bằng `handle()`, inject vào controller; DTO là readonly class hay spatie/laravel-data) và áp dụng cùng tiêu chuẩn bằng chứng.
2. Tìm thêm điểm riêng của codebase: base class/trait hầu hết code kế thừa, scope tenant/actor trong query, helper riêng, format response chung, exception riêng. Tối đa ~5 mục ngoài kiến trúc.

## Bước 3: Xác nhận với user

Trình bày tất cả ứng viên **trong một lần**, nhóm theo file đích:

```
### AGENTS.md › Lệnh & môi trường
1. [Pattern] Lệnh chạy trong container. Bằng chứng: .github/workflows/ci.yml, Makefile.
   Đề xuất: "Test: `docker compose exec -T app ./vendor/bin/pest`"

### AGENTS.md › Code & kiến trúc
2. [Pattern] Nghiệp vụ trong Action (app/Actions, handle()). 14 Action, 0 Service.
   Đề xuất: "Nghiệp vụ đặt trong Action (`app/Actions`, method `handle()`), inject vào controller. Không tạo Service, Repository."

### laravel-pattern.md
3. [Xung đột] Validation: 22 FormRequest, 9 controller dùng $request->validate(). Có ranh giới nào không?

### Cần user cung cấp (không suy ra từ code)
- AGENTS.md › Quy trình làm việc: format branch, commit, PR?
- AGENTS.md › Bảo mật: service bên ngoài được phép dùng, việc phải hỏi trước?
```

Chỉ ghi những mục user đồng ý. User nói rõ "ghi hết", "không cần hỏi" thì ghi mọi Pattern; Xung đột vẫn phải hỏi.

## Bước 4: Ghi

**AGENTS.md:**
- Ghi vào đúng mục; thay placeholder và xoá comment `<!-- -->` hướng dẫn của mục vừa điền. Mục chưa có thông tin thì giữ nguyên.
- Lệnh ghi nguyên văn, chạy được ngay (kèm runner Docker/Sail nếu có).
- Giữ toàn file dưới 200 dòng.

**Rule** (`.claude/rules/laravel-*.md`):
- Ghi vào mục `## Đặc thù dự án` của file đích, dưới câu mở đầu của mục. Không sửa phần quy tắc chung.
- Mỗi convention 1 gạch đầu dòng, viết dạng mệnh lệnh, bỏ hết bằng chứng.

Ghi thế này:
> - Nghiệp vụ đặt trong Action (`app/Actions`, method `handle()`), inject vào controller. Không tạo Service.

Không ghi thế này:
> - Dự án có 14 Action và 0 Service (VD `app/Actions/CreateOrder.php`), nên dùng Action.

**settings.json:** lệnh chạy qua Docker/Sail thì đề xuất allow rule tương ứng (VD `Bash(docker compose exec -T app ./vendor/bin/pest *)`), chỉ sửa khi user đồng ý. Allow rule không đặt `*` trước lệnh con.

## Bước 5: Báo cáo

- Nội dung đã ghi (file, mục, nội dung)
- Xung đột user chưa quyết định
- Mục `AGENTS.md` còn trống, cần user điền
- Mục không đủ tín hiệu đáng chú ý (1 dòng)
- Nhắc commit `AGENTS.md`, `.claude/rules/laravel-*.md` và `.claude/settings.json` để cả team dùng chung
