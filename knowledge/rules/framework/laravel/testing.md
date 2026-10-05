---
paths:
  - "tests/**/*.php"
---

# Laravel Testing

## Trước khi viết test

- Xác định framework: có `tests/Pest.php` hoặc `pestphp/pest` trong `composer.json` thì viết Pest, không thì PHPUnit. Không trộn 2 kiểu trong cùng thư mục.
- Đọc `tests/Pest.php`, `tests/TestCase.php`, `phpunit.xml` để biết: DB test (SQLite/MySQL/Postgres), trait đã bật sẵn (`RefreshDatabase`…), helper dùng chung, setup chung. Không thêm lại thứ đã có.
- Đọc 1–2 test cùng loại gần nhất và làm theo cách viết của chúng.
- Test cũ viết theo convention của dự án mà khác rule này: không xoá, không viết lại. Có nhược điểm thì nêu ra để user quyết định.
- Chỉ dùng tool test dự án đã cài; thêm package/plugin test (browser test, mutation…) thì hỏi trước.

## Chạy test

- Chạy qua lệnh dự án đang dùng (`composer test`, `php artisan test`, `./vendor/bin/pest`…).
- Khi đang code: chạy test liên quan (`--filter`). Trước khi báo xong: chạy toàn bộ suite.
- Coverage: `pest --coverage` hoặc `php artisan test --coverage` (có `--min=N`); PHPUnit thuần dùng `--coverage-text` (không có `--min`). Cần PCOV hoặc Xdebug với `XDEBUG_MODE=coverage`. Ngưỡng lấy từ CI config/`composer.json`, không tự đặt ngưỡng khác.
- Test fail thì sửa code hoặc sửa test sai, không xoá test, không `->skip()`/`->todo()` (Pest), `markTestSkipped()`/`markTestIncomplete()` (PHPUnit), không nới assertion để qua.

## Đặt test ở đâu

- Tạo test bằng `php artisan make:test {Name}Test` (thêm `--unit`/`--pest` theo dự án); `{Name}` không kèm `Feature/`/`Unit/`.
- Mặc định viết Feature test; Unit test chỉ cho logic không dùng framework (tính toán, chuyển đổi dữ liệu).
- `tests/Feature/`: gọi qua HTTP, console, job; kiểm tra behavior xuyên nhiều lớp, authorization, validation.
- `tests/Unit/`: logic của một class, mirror cấu trúc `app/`. Tên file `{Class}Test.php`. Mặc định Unit test không boot Laravel nên không dùng được DB, facade, container; cần những thứ đó thì viết Feature test, trừ khi `tests/Pest.php`/`TestCase` của dự án đã cấu hình khác.
- HTTP test tập trung vào status, validation, quyền và format response. Logic nhiều nhánh test ở lớp chứa logic đó (Service/Action/Model…), không dồn hết vào HTTP test.
- Tên test mô tả behavior (`it('rejects cancel after shipment')`), không mô tả implementation.

## Dữ liệu

- Tạo dữ liệu bằng factory và state (`User::factory()->admin()->create()`), không insert tay, không hard-code ID.
- Mỗi test tự tạo dữ liệu nó cần, không phụ thuộc thứ tự chạy hay dữ liệu test khác để lại.
- Chỉ tạo đúng lượng dữ liệu test cần; thiếu state thì thêm vào factory thay vì lặp attribute ở nhiều test.

## HTTP test

- API dùng `getJson`/`postJson`/`putJson`/`patchJson`/`deleteJson` (tự gửi `Accept: application/json`).
- Assert status cụ thể (`assertCreated()`, `assertForbidden()`…), không chỉ `assertSuccessful()`.
- Assert nội dung response bằng `assertJsonPath()`/`assertJsonStructure()`; lỗi validate bằng `assertJsonValidationErrors(['field'])` (chỉ JSON) hoặc `assertInvalid(['field'])` (cả JSON lẫn session).
- Sau khi ghi, verify DB bằng assertion trên test case (`$this->…`, không phải `$response`): `assertDatabaseHas`/`assertDatabaseMissing`/`assertDatabaseCount`/`assertSoftDeleted`/`assertModelExists`.
- Test validation bằng cách gửi input sai qua request rồi assert lỗi; không assert nội dung mảng `rules()`.
- Đăng nhập bằng `actingAs($user, '<guard>')`; dự án nhiều guard thì luôn ghi rõ guard.
- Dự án dùng Inertia: `use Inertia\Testing\AssertableInertia;` rồi `->assertInertia(fn (AssertableInertia $page) => $page->component('Orders/Show')->has('order'))`, không assert HTML/JSON thô.

## Phạm vi tối thiểu

- Endpoint mới: 1 happy path, 1 lỗi validate (nếu có input), 1 lỗi quyền. Status thật xem test hiện có hoặc exception handler, không đoán. Mặc định của Laravel:
  - Chưa đăng nhập: request JSON → 401 (`assertUnauthorized()`); request web → 302 về login.
  - Không đủ quyền: 403 (`assertForbidden()`); 404 chỉ khi code dùng `denyAsNotFound()` hoặc query theo scope của user.
- Logic có nhánh (điều kiện, tính tiền, trạng thái): mỗi nhánh quan trọng 1 test, gồm cả giá trị biên.
- Sửa bug: viết test tái hiện bug (fail) trước, rồi mới sửa.
- Thay đổi chỉ về câu chữ, style, layout không cần test mới.
- Giá trị mong đợi viết cứng trong test (cố định input/thời gian), không tính lại bằng cùng công thức của code. So sánh chặt: `assertSame()` (PHPUnit), `toBe()` (Pest), không `assertEquals()`/`toEqual()` trừ khi cố ý so sánh lỏng.

## Side-effect & phụ thuộc ngoài

- Gọi HTTP ra ngoài qua `Http`: `Http::fake([...pattern => response])` kèm `Http::preventStrayRequests()` (`Http::fake()` không tham số fake mọi request nên `preventStrayRequests` vô tác dụng). SDK tự dùng Guzzle (AWS, Stripe…) không bị `Http::fake` chặn: mock qua interface/container. Không gọi dịch vụ thật.
- Code gọi `Http` có nhánh xử lý lỗi thì test cả response lỗi (`Http::response([], 500)`) và lỗi kết nối (`Http::failedConnection()` từ L11, hoặc callback ném `ConnectionException`).
- Dùng fake của Laravel thay vì mock, đúng assertion của từng fake, và assert cả trường hợp không xảy ra:
  - `Queue::fake()`: `assertPushed`/`assertNotPushed`/`assertNothingPushed`
  - `Bus::fake()`: `assertDispatched`/`assertNotDispatched`/`assertChained`/`assertBatched`
  - `Event::fake()`: `assertDispatched`/`assertNotDispatched`; fake chặn mọi listener (kể cả event của model), nên gọi sau khi tạo dữ liệu bằng factory hoặc dùng `Event::fake([OnlyThis::class])`
  - `Mail::fake()`: `assertSent`/`assertNotSent`/`assertNothingSent`; mailable có queue dùng `assertQueued`/`assertNothingQueued`
  - `Notification::fake()`: `assertSentTo`/`assertNotSentTo`/`assertNothingSent`
  - `Storage::fake('disk')`: `Storage::disk('disk')->assertExists()`/`assertMissing()`
- `Event::fake()`/`Queue::fake()` không tham số chỉ dùng khi test assert toàn bộ kết quả (`assertNothingPushed`…); còn lại truyền class cần fake. Assert cả payload khi dữ liệu là một phần hành vi (`assertPushed(X::class, fn ($job) => $job->orderId === $order->id)`).
- Mock (Mockery, `$this->mock()`) chỉ cho phụ thuộc qua interface hoặc dịch vụ ngoài không có fake. Không mock Eloquent model, chính class đang test, facade `Request`/`Config` (dùng input của request test và `Config::set()`).
- Thời gian: `$this->freezeTime()`/`$this->travelTo()`, không `sleep()`, không assert theo giờ thật. Code dùng `Sleep` thì `Sleep::fake()` + `Sleep::assertSlept(...)`.
- Không để lại `withoutExceptionHandling()` trong test (làm đổi response đang kiểm tra). Kiểm tra exception được report dùng `Exceptions::fake()` + `Exceptions::assertReported(X::class)` (L11+).

## Đặc thù dự án

Quy định riêng của dự án. Khi khác hoặc cụ thể hơn quy tắc chung ở trên, làm theo mục này.
