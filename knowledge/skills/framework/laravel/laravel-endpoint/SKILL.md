---
name: laravel-endpoint
description: Thêm hoặc sửa một endpoint Laravel (API hoặc web form) từ đầu đến cuối - route, FormRequest, phân quyền, controller, Resource, test. Dùng khi được yêu cầu add/change an endpoint, route, API, CRUD action.
---

# Laravel Endpoint

Quy trình thêm/sửa một endpoint. Mỗi bước trỏ tới rule trong `.claude/rules/laravel-*.md`; không chép lại rule ở đây.

## Bước 0: Đọc bối cảnh (bắt buộc, trước khi viết code)

1. Đọc `.claude/rules/laravel-pattern.md`, `laravel-security.md`, `laravel-conventions.md`, `laravel-testing.md`, đặc biệt mục **Đặc thù dự án** của từng file. Endpoint dispatch job hoặc gọi dịch vụ ngoài thì đọc thêm `laravel-queue.md`.
2. Xác định:
   - **Actor** gọi endpoint (guest, user, admin…) và **guard** tương ứng.
   - **Loại**: API (JSON) hay web (redirect/view/Inertia).
   - Endpoint **mới** hay **sửa** endpoint có sẵn. Sửa thì đọc test hiện có của nó trước.
3. Tìm 1–2 endpoint gần nhất cùng loại, cùng actor. Ghi lại cách chúng làm và làm theo:
   - file route và group, middleware, cách đặt tên route
   - vị trí và tên FormRequest, Policy, controller, lớp chứa nghiệp vụ (Service/Action/model…)
   - format response (Resource, wrapper), cách trả lỗi
4. Yêu cầu thiếu thông tin quyết định hành vi (ai được gọi, trường nào bắt buộc, status trả về) thì hỏi, không tự đoán.

## Bước 1: Route

- Thêm vào **đúng file và group** của actor/guard; không khai báo lại middleware group đã có.
- CRUD dùng `Route::apiResource`/`resource` (`->only([...])` nếu không đủ action); route lẻ đặt tên bằng `->name()`.
- Route lồng có tham số con: `->scopeBindings()` hoặc giới hạn query theo cha.
- Sinh URL trong code/test bằng `route('name')`, không hard-code path.
- Kiểm tra: `php artisan route:list --path=<uri>` thấy đúng method, URI, name, middleware.

## Bước 2: Validation

- FormRequest mới theo quy ước tên (`Store{Model}Request`/`Update{Model}Request` hoặc theo use-case). Tạo bằng `php artisan make:request`.
- Rule cho mọi field ghi vào DB; update dùng `sometimes` cho field không bắt buộc; `unique` khi update phải bỏ qua bản ghi hiện tại.
- Upload, endpoint login/OTP/gửi mail: theo `laravel-security.md`.

## Bước 3: Phân quyền

- Endpoint mới **luôn** có kiểm tra quyền: Policy/Gate, `authorize()` trong FormRequest, hoặc middleware, theo cách dự án đang làm.
- Bản ghi lấy theo ID phải giới hạn theo actor (relationship của user, Policy sau route model binding, hoặc `scopeBindings()`). Không để user A đọc/sửa bản ghi của user B (IDOR). Dữ liệu multi-tenant thiết kế mới: query qua relationship của actor để bản ghi ngoài phạm vi trả 404, không lộ là bản ghi tồn tại.
- Policy chưa có cho model thì tạo bằng `php artisan make:policy {Model}Policy --model={Model}`.

## Bước 4: Controller & nghiệp vụ

- Controller: nhận FormRequest → gọi lớp nghiệp vụ theo cách dự án đang dùng → trả response. Không query Eloquent hay viết nghiệp vụ trong controller nếu dự án tách lớp.
- Chỉ dùng `$request->validated()` (hoặc DTO nếu dự án có).
- Ghi ≥2 bảng: transaction; job/mail/event phát ra bên trong phải chạy sau commit (xem `laravel-pattern.md` › Transaction).
- Trả danh sách: paginate, eager load relationship mà Resource dùng.

## Bước 5: Response

- API: trả qua Resource (hoặc format dự án dùng). Không trả thẳng Model. Chỉ lộ field client cần, không lộ field nội bộ/nhạy cảm.
- Status: tạo mới 201, xoá 204 (hoặc theo dự án), lỗi nghiệp vụ qua exception của dự án.
- Web: redirect kèm flash message hoặc view/Inertia theo trang cùng loại.

## Bước 6: Test

Trước khi viết test, rà lại code vừa viết và code endpoint dùng tới. Gặp lỗi thiết kế thì báo user thay vì viết test hợp thức hoá nó, VD: action ghi dữ liệu mà không có validation, Policy có nhưng không được gọi, method rỗng.

Viết Feature test theo `laravel-testing.md`, tối thiểu:

| Case | Kiểm tra |
|---|---|
| Happy path | status, nội dung response (`assertJsonPath`/`assertJsonStructure`), DB (`assertDatabaseHas`…) |
| Validation | 1 field bắt buộc thiếu hoặc sai → 422 + lỗi đúng field |
| Chưa đăng nhập | status theo handler của dự án (API thường 401, web thường 302) |
| Sai quyền | user không đủ quyền → 403 (hoặc 404 nếu dự án dùng) và DB không đổi |
| Bản ghi của người khác | user/tenant A gọi lên bản ghi của B → bị chặn, DB không đổi |

Thêm case cho từng nhánh nghiệp vụ quan trọng và side-effect (fake + assert cả trường hợp không xảy ra).

Chạy test vừa viết bằng `--filter`, rồi chạy các test cùng thư mục.

## Bước 7: Hoàn tất

1. Chạy format/static analysis theo `laravel-conventions.md` › Công cụ & style trên file đã sửa.
2. Báo cáo:
   - File đã tạo/sửa
   - Route (method, URI, name, middleware)
   - Quyền: ai được gọi, kiểm tra ở đâu
   - Test đã thêm và kết quả lệnh chạy
   - Điểm cần người review quyết định (nếu có)
