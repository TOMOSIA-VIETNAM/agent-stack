---
paths:
  - "app/**/*.php"
  - "routes/**/*.php"
  - "config/**/*.php"
  - "bootstrap/app.php"
  - "resources/views/**/*.blade.php"
---

# Laravel Security

## Config & secret

- Chỉ gọi `env()` trong `config/`; code khác dùng `config()`. Sau `config:cache`, `.env` không được load nên `env()` ngoài config chỉ đọc được biến môi trường hệ thống (thường thành `null`; trong Docker có thể vẫn chạy, che mất lỗi).
- Hành vi khác nhau theo môi trường đặt trong `config/`, không rải `app()->isProduction()`/`App::environment()` trong code nghiệp vụ (khó test, dễ sót môi trường).
- Key mới trong `config/` đọc từ `env()` thì thêm biến tương ứng (giá trị giả) vào `.env.example`.
- Không hard-code secret, URL môi trường. Không log password, token, dữ liệu cá nhân.

## Input & truy vấn

- Raw SQL: dùng `selectRaw`/`whereRaw`/`havingRaw`/`orderByRaw` với mảng binding (`?`), không nối input vào chuỗi SQL. `DB::raw()` không nhận binding, chỉ dùng cho biểu thức cố định. Tên cột/hướng sort lấy từ input phải whitelist.
- File upload: validate `mimes`/`max`, lưu qua `Storage`, không dùng tên file gốc làm đường dẫn. File riêng tư lưu disk không public, trả qua route có kiểm tra quyền hoặc `temporaryUrl()`.
- Không tin dữ liệu từ ngoài (response API, webhook, file import): kiểm tra field cần dùng trước khi xử lý. Webhook phải verify chữ ký.

## Auth & giới hạn

- Endpoint login, quên mật khẩu, gửi/xác thực OTP, gửi mail/SMS phải có `throttle` (RateLimiter); key theo cả định danh tài khoản và IP.
- Không tự viết lại cơ chế hash, token, session mà framework/package auth của dự án đã có.

## Blade

- In dữ liệu bằng `{{ }}`; `{!! !!}` chỉ cho HTML đã sanitize. Truyền dữ liệu vào `<script>` bằng `Js::from()`.
- Form ghi dữ liệu có `@csrf`. Không thêm route vào ngoại lệ CSRF để chữa lỗi 419; chỉ webhook đã verify chữ ký mới được loại trừ.

## Đặc thù dự án

Quy định riêng của dự án. Khi khác hoặc cụ thể hơn quy tắc chung ở trên, làm theo mục này.
