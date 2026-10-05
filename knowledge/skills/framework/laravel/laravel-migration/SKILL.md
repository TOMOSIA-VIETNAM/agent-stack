---
name: laravel-migration
description: Thay đổi schema DB trong dự án Laravel một cách an toàn - tạo bảng, thêm/đổi/xoá cột, index, khoá ngoại - và cập nhật model, factory, validation, Resource, test liên quan. Dùng khi được yêu cầu add/change/drop a column, table, index, foreign key, migration.
---

# Laravel Migration

Quy trình thay đổi schema và mọi file bị ảnh hưởng. Quy tắc chi tiết nằm ở `.claude/rules/laravel-database.md`; không chép lại ở đây.

## Bước 0: Đọc bối cảnh

1. Đọc `.claude/rules/laravel-database.md` và `laravel-conventions.md` (mục Model, Đặt tên), cả mục **Đặc thù dự án**.
2. Xem DB đang kết nối: `php artisan db:show` (không đọc `.env`). Ghi lại engine (MySQL/PostgreSQL/SQLite) vì cách thay đổi an toàn khác nhau. Lệnh báo thiếu `doctrine/dbal` (L10 trở xuống) thì dùng `php artisan tinker --execute="echo DB::connection()->getDriverName().' '.DB::connection()->getDatabaseName();"`, không tự cài package.
3. Đọc 1–2 migration gần nhất trong `database/migrations/` và làm theo cách viết (anonymous class, kiểu khoá chính, tên index).
4. Bảng bị đụng đã có:
   - Đọc schema hiện tại: `php artisan db:table <table>`, hoặc migration tạo bảng và các migration sửa sau đó.
   - Tìm nơi dùng bảng/cột: model, `$fillable`/casts, factory, FormRequest, Resource, query (`grep` theo tên cột).

## Bước 1: Phân loại thay đổi

| Loại | Cách làm |
|---|---|
| Bảng mới | 1 migration, làm tiếp bước 2 |
| Thêm cột nullable hoặc có default | 1 migration |
| Thêm cột NOT NULL không default vào bảng có dữ liệu | Nhiều bước: thêm `nullable()` → backfill → migration sau đổi sang NOT NULL |
| Đổi tên / xoá / đổi kiểu cột đang được code dùng | Nhiều bước (expand/contract), mỗi bước một PR/release |
| Thêm index trên bảng lớn hoặc không rõ kích thước | 1 migration + ghi chú trong PR để team chọn thời điểm chạy |

Thay đổi nhiều bước: trình bày kế hoạch các bước và hỏi xác nhận trước khi viết. Chỉ làm bước đầu trong lần này, trừ khi được yêu cầu khác.

## Bước 2: Viết migration

- Tạo bằng `php artisan make:migration <tên_mô_tả_snake_case>`.
- Theo `laravel-database.md`: kiểu cột, `nullable`/`default`, khoá ngoại với hành vi xoá chọn theo nghiệp vụ, index cho cột lọc/join/sort, `unique()` cho ràng buộc nghiệp vụ.
- `down()` đảo ngược đúng `up()`. Không đảo ngược được thì comment lý do.
- Backfill dữ liệu: dùng `DB::table()` theo `chunkById()`, không dùng Model; dữ liệu lớn tách khỏi migration schema.
- Không sửa migration đã merge vào nhánh chính.

## Bước 3: Cập nhật file liên quan

Đi qua danh sách, bỏ qua mục không áp dụng:

| File | Việc cần làm |
|---|---|
| Model | `$fillable`, cast (ngày, boolean, JSON, enum) theo cách model đang khai báo; relationship mới kèm return type |
| Enum | Cột status/type mới: backed enum (`php artisan make:enum` từ L11) |
| Factory | Cột NOT NULL mới có giá trị trong `definition()`; state cho biến thể; quan hệ dùng factory của model liên quan |
| FormRequest | Rule cho cột client được gửi lên |
| Resource | Thêm field client cần, không lộ field nội bộ |
| Seeder | Chỉ khi dữ liệu master cần cho cột mới (idempotent) |
| Query, scope, code dùng cột cũ | Đổi/xoá cột: cập nhật mọi nơi đã tìm ở Bước 0 |

## Bước 4: Kiểm tra

1. Xác nhận DB đang là local/testing (`php artisan db:show`). Không phải thì dừng và hỏi.
2. Chạy: `php artisan migrate` → `php artisan migrate:rollback --step=1` → `php artisan migrate`. Cả 3 phải thành công.
3. Xem lại schema: `php artisan db:table <table>`.
4. Chạy test liên quan đến model/bảng bị đổi (`--filter`), rồi toàn bộ suite nếu đổi bảng dùng nhiều nơi.
5. Thêm/sửa test khi hành vi thay đổi (ràng buộc unique, cast enum, cột mới trong response).

## Bước 5: Báo cáo

- Migration đã tạo và tóm tắt thay đổi schema
- File liên quan đã cập nhật
- Kết quả migrate/rollback/migrate và test
- Rủi ro khi chạy trên production: lock bảng, thời gian backfill, bước tiếp theo nếu là thay đổi nhiều bước
