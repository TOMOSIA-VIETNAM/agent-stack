---
paths:
  - "database/**/*.php"
---

# Laravel Database

## Migration

- Đọc 1–2 migration/factory gần nhất và làm theo cách viết của chúng (anonymous class, kiểu khoá chính, tên index…).
- Tạo bằng `php artisan make:migration`. Không sửa migration đã merge vào nhánh chính hoặc đã release; thay đổi schema bằng migration mới. Chỉ sửa migration chưa merge của chính thay đổi đang làm.
- Viết `down()` đảo ngược đúng `up()`. Không đảo ngược được (xoá dữ liệu) thì ghi comment lý do.
- Không dùng Model trong migration (Model thay đổi về sau sẽ làm migration cũ chạy sai); cần thao tác dữ liệu thì dùng `DB::table()`.
- `->change()`: luôn khai báo lại đủ thuộc tính muốn giữ (`nullable`, `default`, `unsigned`, `comment`…); từ L11 thuộc tính không khai báo sẽ bị mất. `change()` không đổi index, cần thì ghi riêng. L11+ không cần `doctrine/dbal`; L10 cần khi dùng SQLite; L9 trở xuống cần cho mọi DB.

## Kiểu cột & ràng buộc

- Tiền: `decimal(p, s)` hoặc integer theo đơn vị nhỏ nhất, không dùng `float`/`double`.
- Status/type: cột `string` + backed enum PHP, không dùng `enum()` của DB: đổi danh sách giá trị luôn cần migration, tuỳ DB có thể copy lại bảng (SQLite luôn rebuild; MySQL khi chèn giữa/xoá giá trị), và L10 + `doctrine/dbal` không `change()` được cột enum.
- `nullable()` chỉ khi null có nghĩa; còn lại đặt `default()` hợp lý.
- Cột có `default()` mà code đọc ngay sau khi tạo: khai báo cùng giá trị trong `$attributes` của model (xem `laravel-conventions.md` › Model).
- Khoá ngoại: `foreignId()->constrained()`, chọn rõ hành vi xoá (`cascadeOnDelete()`, `restrictOnDelete()`, `nullOnDelete()`) theo nghiệp vụ. Modifier cột (`nullable()`…) gọi trước `constrained()`; `nullOnDelete()` cần cột `nullable()`.
- Index thiết kế theo query thật (lọc, join, sắp xếp thường xuyên trên bảng lớn): lọc + sắp xếp cùng nhau dùng index nhiều cột đúng thứ tự (`index(['status', 'created_at'])`); không thêm index trùng cột đầu của index đã có. MySQL tự tạo index cho FK của `constrained()`, PostgreSQL thì không.
- Ràng buộc duy nhất của nghiệp vụ đặt `unique()` ở DB, không chỉ dựa vào validation.

## Thay đổi bảng đang có dữ liệu

- Thêm cột vào bảng có dữ liệu: `nullable()` hoặc có `default()`. Cột cần NOT NULL mà không có default: thêm `nullable()` → backfill → đổi sang NOT NULL ở migration sau, khi backfill đã chạy xong trên production.
- Thêm `unique()` trên bảng có dữ liệu: kiểm tra dữ liệu trùng trước; cột mới thì thêm `nullable()` → backfill giá trị không trùng → thêm unique ở migration sau.
- Đổi tên hoặc xoá cột mà code đang dùng: tách nhiều bước (thêm cột mới → code ghi cả hai → chuyển dữ liệu → code chỉ dùng cột mới → xoá cột cũ), không làm trong 1 migration.
- Chuyển dữ liệu lớn: tách khỏi migration schema, xử lý theo `chunkById()` (migration riêng hoặc command/job).
- Thêm index trên bảng lớn (hoặc không rõ kích thước bảng): ghi chú trong PR để team chọn thời điểm chạy. MySQL InnoDB tạo index online; PostgreSQL `CREATE INDEX` chặn ghi, L12 có `->online()` (CONCURRENTLY, migration cần `public $withinTransaction = false;`).

## Factory

- `definition()` tạo được bản ghi hợp lệ: đủ cột NOT NULL, quan hệ bắt buộc dùng factory của model liên quan (`'user_id' => User::factory()`).
- Biến thể dùng state (`->paid()`, `->cancelled()`), không lặp attribute ở nhiều test.
- Cột có unique index dùng `fake()->unique()`; unique nhiều cột dùng `sequence()` hoặc giá trị dẫn xuất.
- Thêm cột NOT NULL vào bảng thì cập nhật factory tương ứng trong cùng thay đổi.

## Seeder

- Dữ liệu dev/test dùng factory, chỉ gọi ở môi trường local/testing.
- Dữ liệu master cần ở production: seeder idempotent (`updateOrCreate`, hoặc `upsert` khi cột so khớp có unique/primary index), không dùng factory/`fake()`: `fakerphp/faker` nằm trong `require-dev`, không có khi `composer install --no-dev`.
- Không đưa secret, mật khẩu thật, dữ liệu cá nhân thật vào seeder.

## Chạy lệnh

- Lệnh xoá/rollback dữ liệu (`migrate:fresh`, `migrate:refresh`, `migrate:reset`, `migrate:rollback`, `db:wipe`, mọi lệnh có `--force`): chỉ chạy trên DB local/testing, kiểm tra DB đang kết nối bằng `php artisan db:show` (không đọc `.env`), và hỏi trước khi chạy.
- Ngoại lệ không cần hỏi: viết migration xong, trên DB local chạy `migrate` → `migrate:rollback --step=1` → `migrate` để kiểm tra `down()`.

## Đặc thù dự án

Quy định riêng của dự án. Khi khác hoặc cụ thể hơn quy tắc chung ở trên, làm theo mục này.
