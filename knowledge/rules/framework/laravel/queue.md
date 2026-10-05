---
paths:
  - "app/**/*.php"
  - "routes/console.php"
  - "bootstrap/app.php"
  - "config/queue.php"
  - "config/services.php"
---

# Laravel Queue, Schedule & dịch vụ ngoài

## Job

- Job phải idempotent: chạy lại không gây sai dữ liệu. Không idempotent được (VD thanh toán) thì `$tries = 1` và ghi lý do.
- Job gọi dịch vụ ngoài đặt `$timeout` (phải nhỏ hơn `retry_after` của queue connection), `$tries`/`$backoff` rõ ràng. Xử lý lỗi cuối trong `failed(?Throwable $e)`; method này chạy trên instance job mới, không thấy state đã set trong `handle()`.
- Dữ liệu truyền vào Job phải serialize được: Model (qua `SerializesModels`) hoặc ID. Không truyền closure, resource, object lớn.
- Job, command, task schedule không có user đăng nhập: không gọi `auth()`, `Auth::user()`, `request()`. Truyền ID người thực hiện vào khi cần.
- Job dùng middleware có thể release (`RateLimited`, `WithoutOverlapping`): mỗi lần release tính 1 attempt, nên đặt `retryUntil()` hoặc `$tries` đủ lớn.
- `ShouldBeUnique` chỉ chống dispatch trùng (cần cache có lock, không áp dụng trong batch), không thay cho idempotent.
- Lỗi vĩnh viễn (dữ liệu sai, vi phạm nghiệp vụ) gọi `$this->fail()`, không ném để retry.
- Dispatch trong transaction: chạy sau commit (xem `laravel-pattern.md` › Transaction & đồng thời).

## Schedule

- Task chạy lâu hoặc không được chạy chồng: `->withoutOverlapping(<phút>)` (lock mặc định 24h; kẹt thì `schedule:clear-cache`).
- Nhiều server chạy scheduler: thêm `->onOneServer()` (cache mặc định dùng chung, hỗ trợ lock); closure phải `->name()`.
- Task tự giới hạn khối lượng mỗi lần chạy (chunk, deadline), không xử lý toàn bảng trong 1 lần.

## Event & Listener

- Listener có type-hint event ở `handle()` trong `app/Listeners` được tự discover (mặc định L11+): không đăng ký thêm bằng `Event::listen`/`$listen`, nếu không listener chạy 2 lần. Theo cách dự án đang đăng ký.

## Gọi dịch vụ ngoài

- Chỉ `retry()` request idempotent (GET, PUT theo ID). POST tạo bản ghi, trừ tiền chỉ retry khi API hỗ trợ idempotency key và gửi cùng key ở mọi lần thử; chỉ retry lỗi tạm thời (`ConnectionException`, 5xx, 429).
- `Http` client mặc định timeout 30s và **không** tự throw khi 4xx/5xx: đặt `timeout()` theo nghiệp vụ, gọi `->throw()` hoặc kiểm tra `->failed()`. Riêng `retry()` mặc định throw khi hết lượt (truyền `throw: false` nếu tự xử lý).
- URL, key của dịch vụ ngoài đặt trong `config/services.php`.

## Đặc thù dự án

Quy định riêng của dự án. Khi khác hoặc cụ thể hơn quy tắc chung ở trên, làm theo mục này.
