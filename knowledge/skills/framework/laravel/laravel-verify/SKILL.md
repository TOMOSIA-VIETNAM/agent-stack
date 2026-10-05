---
name: laravel-verify
description: Kiểm tra một thay đổi Laravel trước khi tạo PR hoặc merge - format, static analysis, test, coverage, migration, debug code còn sót - bằng đúng lệnh của dự án, rồi báo cáo pass/fail/skip.
disable-model-invocation: true
---

# Laravel Verify

Chạy kiểm tra trước khi tạo PR. Chỉ kiểm tra và sửa code; không deploy, không chạy lệnh cache (`config:cache`, `route:cache`, `optimize`).

## Bước 0: Lấy danh sách lệnh của dự án

Không tự đoán lệnh. Lấy theo thứ tự ưu tiên:

1. `AGENTS.md` › Lệnh & môi trường.
2. Mục **Đặc thù dự án** trong `.claude/rules/laravel-conventions.md` và `laravel-testing.md`.
3. CI config (`.github/workflows/*.yml`, `.gitlab-ci.yml`…): các bước CI chạy là chuẩn cần đạt.
4. `composer.json` › `scripts` (`lint`, `analyse`, `test`…) và `require-dev` (có Pint, PHP-CS-Fixer, PHPStan/Larastan, Psalm, Pest không).
5. Môi trường chạy: lệnh có bọc Docker/Sail không (`docker compose exec …`, `./vendor/bin/sail …`).

Ghi lại danh sách lệnh sẽ chạy trước khi chạy. Tool không có trong dự án thì đánh dấu **skip**, không tự cài.

## Bước 1: Xác định phạm vi thay đổi

- `git status` và `git diff --name-only <nhánh gốc>...HEAD` (nhánh gốc lấy từ CI hoặc hỏi).
- Ghi lại: file PHP đã sửa, có đụng `database/` không, có đụng `composer.json`/`composer.lock` không.

## Bước 2: Chạy kiểm tra

Chạy theo thứ tự. Bước nào fail: sửa code, chạy lại bước đó, rồi mới đi tiếp.

| # | Kiểm tra | Cách chạy | Ghi chú |
|---|---|---|---|
| 1 | Composer | `composer validate --no-check-publish` | Chỉ khi đụng `composer.json` |
| 2 | Format | Script của dự án; nếu không có: Pint/PHP-CS-Fixer trên **file đã sửa** (`pint --dirty` hoặc truyền danh sách file) | Không format toàn repo |
| 3 | Static analysis | Script/config của dự án (level, baseline có sẵn) | Không thêm ignore, không tạo/sửa baseline, không hạ level |
| 4 | Test liên quan | Lệnh test của dự án + `--filter` cho test của phần đã sửa | |
| 5 | Toàn bộ test | Lệnh test của dự án | |
| 6 | Coverage | Chỉ khi CI có ngưỡng: chạy đúng lệnh và ngưỡng của CI | Cần PCOV/Xdebug; không có thì skip và ghi rõ |
| 7 | Migration | Chỉ khi đụng `database/migrations`: xác nhận DB local (`php artisan db:show`), rồi `migrate` → `migrate:rollback --step=1` → `migrate` | DB không phải local thì dừng và hỏi |
| 8 | Code debug sót | Tìm trong diff: `dd(`, `dump(`, `ray(`, `var_dump(`, `->dump()`, code comment-out | |
| 9 | Dependency | Chỉ khi đụng `composer.lock`: `composer audit` | Báo finding, không tự nâng package |

## Quy tắc khi sửa lỗi

- Sửa code để qua kiểm tra, không nới config tool, không `skip`/xoá test, không nới assertion (xem `laravel-testing.md` › Chạy test).
- Lỗi có sẵn từ trước, không do thay đổi này gây ra: không sửa, ghi vào báo cáo.
- Lỗi cần quyết định nghiệp vụ hoặc sửa lớn ngoài phạm vi: dừng và hỏi.

## Bước 3: Báo cáo

```
| # | Kiểm tra        | Kết quả | Ghi chú                          |
|---|-----------------|---------|----------------------------------|
| 2 | Format          | pass    | 3 file                           |
| 3 | Static analysis | fail→pass | sửa 2 lỗi type ở OrderService  |
| 6 | Coverage        | skip    | CI không có ngưỡng               |
```

Kèm theo:
- Lệnh đã chạy (đúng nguyên văn)
- File đã sửa trong lúc verify
- Lỗi có sẵn từ trước (không thuộc thay đổi này)
- Kết luận: **sẵn sàng tạo PR** hoặc **chưa**, kèm lý do
