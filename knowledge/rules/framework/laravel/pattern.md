---
paths:
  - "app/**/*.php"
  - "routes/**/*.php"
  - "bootstrap/app.php"
---

# Laravel Patterns

## Thứ tự ưu tiên

1. `AGENTS.md` và mục **Đặc thù dự án** cuối mỗi file rule trong `.claude/rules/laravel-*.md`.
2. Pattern đang có trong code: trước khi tạo class mới, đọc 2–3 file cùng loại gần nhất và làm theo (vị trí thư mục, cách đặt tên, lớp chứa logic, format response).
3. Các quy tắc chung trong `.claude/rules/laravel-*.md`.

Không tự tạo layer hay thư mục mới (Service, Action, Repository, DTO, Module…) khi dự án chưa có, trừ khi được yêu cầu rõ. Không trộn 2 kiểu cho cùng một việc.

## Phiên bản

- Xem phiên bản Laravel/PHP trước khi dùng API hoặc cú pháp mới. `composer.json` chỉ là ràng buộc (`^11.0`); API thêm ở bản minor thì kiểm tra bản đã cài bằng `composer show laravel/framework` hoặc `composer.lock`.
- Cấu trúc theo file đang tồn tại, không theo số phiên bản: app nâng cấp từ L10 lên L11+ vẫn có thể giữ cấu trúc cũ. Có `app/Http/Kernel.php`/`app/Exceptions/Handler.php` thì cấu hình middleware/exception ở đó; không có thì dùng `withMiddleware()`/`withExceptions()` trong `bootstrap/app.php`.

## Request & Controller

- Validate bằng FormRequest (hoặc cách dự án đang dùng). Chỉ dùng dữ liệu đã validate (`$request->validated()`), không dùng `$request->all()` để create/update.
- Không đặt business logic trong route closure hay Blade. Dự án có lớp nghiệp vụ (Service, Action…) thì controller chỉ nhận request → gọi lớp đó → trả response; không có thì viết như các controller hiện có.
- Phân quyền bằng Policy/Gate hoặc middleware, không bỏ qua bước authorize ở endpoint mới.
- Bản ghi lấy theo ID từ request phải giới hạn theo người dùng hiện tại: qua relationship (`$request->user()->orders()->findOrFail($id)`), Policy sau route model binding, hoặc `scopeBindings()` cho route lồng. Route model binding một mình không kiểm tra quyền sở hữu (lỗi IDOR).
- API trả dữ liệu qua API Resource (hoặc format dự án đang dùng), không trả thẳng Model. Trong Resource, relationship lấy qua `$this->whenLoaded('relation')`, không gọi `$this->relation` (gây lazy load, N+1).
- Dữ liệu có cấu trúc truyền qua nhiều lớp: dùng DTO nếu dự án đã có (đúng thư mục, kiểu đang dùng); không có thì truyền mảng từ `validated()`.

## Route

- Route mới thêm vào group có sẵn theo middleware/guard. Không khai báo lại middleware group đã có.
- `Route::resource`/`apiResource` tự đặt tên `{resource}.{action}`; route lẻ đặt tên bằng `->name()`. Dùng route model binding.
- Sinh URL bằng `route('name', $params)`/`to_route()`, không hard-code path.

## Transaction & đồng thời

- Một thao tác ghi ≥2 bảng thì bọc `DB::transaction()`. Không gọi HTTP ra ngoài bên trong transaction.
- Đọc-sửa-ghi trên dòng mà request song song có thể chạm tới (số dư, tồn kho, trạng thái): `lockForUpdate()` bên trong `DB::transaction()`. Tăng/giảm counter bằng `increment()`/`decrement()` (cập nhật phía DB), không đọc giá trị rồi `save()`: 2 request cùng lúc sẽ ghi đè nhau.
- Việc bất đồng bộ phát ra trong transaction phải chạy sau commit (nếu queue connection chưa bật `'after_commit' => true`):
  - Job: `XJob::dispatch(...)->afterCommit()`
  - Mail/Notification có queue: `(new X(...))->afterCommit()`
  - Event: class implement `ShouldDispatchAfterCommit` (Event không có method `afterCommit()`)
  - Listener có queue: implement `ShouldQueueAfterCommit`
- Cache: đọc bằng `Cache::remember()`, không `get()` rồi kiểm tra truthy (giá trị `0`/`false` bị coi là miss). Ghi có điều kiện dùng `Cache::add()` (atomic), không `has()` rồi `put()`. Chống xử lý trùng không gắn với dòng DB dùng `Cache::lock()` (store phải hỗ trợ lock).
- Chỉ dùng `Cache::tags()` khi cache store ở mọi môi trường hỗ trợ (Redis, Memcached…); `file`/`database`/`dynamodb` gọi sẽ lỗi.

## Query & hiệu năng

- Truy cập relationship trong vòng lặp thì eager load (`with()`/`load()`). Chỉ bật `Model::preventLazyLoading()` khi được yêu cầu: bật toàn cục có thể làm test và code hiện có lỗi.
- Endpoint trả danh sách có thể tăng theo dữ liệu thì paginate; chỉ trả toàn bộ khi tập cố định và nhỏ (danh mục, master data). Xử lý dữ liệu lớn dùng `chunkById()`/`lazyById()`, không `->get()` toàn bảng.
- Danh sách paginate phải có `orderBy` tường minh; cột sắp xếp không unique (`created_at`, `name`) thì thêm `->orderBy('id')` để trang không trùng/sót dòng.
- Đọc nhiều dòng chỉ lấy cột cần dùng (`select()`, `pluck()`), nhưng giữ đủ khoá để nối quan hệ: query cha giữ PK và FK của `belongsTo`; eager load giữ PK + FK (`with('author:id,name')`). Thiếu thì quan hệ trả `null`/rỗng mà không báo lỗi.
- Chỉ đếm/kiểm tra tồn tại bằng `count()`/`exists()` ở query, không load collection rồi đếm. Đếm/tổng theo quan hệ dùng `withCount()`/`withSum()`/`withExists()`, không `$model->relation->count()` trong vòng lặp.
- `update()`/`delete()` trên query (kể cả `whereIn()->delete()`, `toQuery()`) chạy 1 câu SQL: không gọi model event, observer, cast, soft delete theo model. Cần những thứ đó thì lặp từng model (`chunkById()` + `$model->update()`).
- Không thêm global scope mới trừ ràng buộc áp dụng cho mọi query (tenant, soft delete); lọc nghiệp vụ dùng local scope.
- Việc chậm (gửi mail, gọi API ngoài, xử lý file) đưa vào queue (xem `laravel-queue.md`).

## Lỗi

- Catch exception cụ thể nhất có thể xảy ra (VD `RequestException`, `QueryException`), không `catch (\Throwable)`/`catch (\Exception)` chung chung ngoài tầng ngoài cùng.
- Không catch rồi nuốt lỗi. Bắt lỗi để xử lý thì `report($e)` hoặc ném lại exception có ý nghĩa. Cố ý bỏ qua lỗi thì comment lý do.
- Lỗi nghiệp vụ dùng exception riêng và render tập trung theo cách dự án đang làm, không trả response lỗi rải rác.
- Message trả cho client không lộ chi tiết nội bộ (stack trace, SQL, response của dịch vụ ngoài); chi tiết ghi log kèm context (ID liên quan), không kèm dữ liệu nhạy cảm.

## Đặc thù dự án

Quy định riêng của dự án. Khi khác hoặc cụ thể hơn quy tắc chung ở trên, làm theo mục này.
