# Checklist convention

Mỗi mục là một **ngã rẽ thật**: Laravel cho phép nhiều cách hợp lệ và lựa chọn của dự án làm thay đổi code Claude viết. Gợi ý tìm chỉ là điểm bắt đầu: luôn đọc vài file thật trước khi kết luận.

Mục có ghi **→ AGENTS.md** thì ghi vào `AGENTS.md` (mục ghi trong ngoặc), không ghi vào rule. Còn lại ghi vào mục Đặc thù dự án của rule theo tiêu đề nhóm.

Không có trong checklist (bỏ qua): format thuần (Pint lo), dạng mà Rector đã bật tự chuyển, và mặc định framework mà agent tự viết đúng.

## → laravel-pattern.md

| # | Ngã rẽ | Gợi ý tìm |
|---|---|---|
| P1 | **Lớp chứa nghiệp vụ**: controller trực tiếp / Service / Action / Job / model method **→ AGENTS.md (Code & kiến trúc)** | `ls app/Services app/Actions`; đọc 3–5 method controller |
| P2 | **Cách gọi Action/Service**: `handle` / `execute` / `__invoke`; inject constructor / method / `app()` | grep `function handle\|function execute\|function __invoke` trong lớp nghiệp vụ |
| P3 | **Tầng truy vấn**: Eloquent trực tiếp / Repository / Query object **→ AGENTS.md (Code & kiến trúc)** | `ls app/Repositories app/Queries` |
| P4 | **DTO**: không có / readonly class / spatie/laravel-data; thư mục đặt DTO | `ls app/Data app/DTOs app/DataObjects`; `composer.json` |
| P5 | **Module/domain**: `app/` phẳng / `app/Domains/*` / `Modules/*` **→ AGENTS.md (Code & kiến trúc)** | cây thư mục |
| P6 | **Validation**: FormRequest / `$request->validate()` / `Validator::make()` | `ls app/Http/Requests`; grep `->validate(` trong controller |
| P7 | **Kiểu controller**: resource / invokable 1 action / nhiều method tự do | grep `__invoke`; `Route::resource\|apiResource` |
| P8 | **Route**: file theo guard/actor, prefix, version API; middleware gắn ở group / controller / attribute | `routes/`, `bootstrap/app.php` hoặc `RouteServiceProvider` |
| P9 | **Auth**: Sanctum / Passport / JWT / session; danh sách guard và actor **→ AGENTS.md (Code & kiến trúc)** | `config/auth.php`, `composer.json` |
| P10 | **Phân quyền**: Policy / Gate / middleware role / package (spatie/permission); nơi gọi (`authorize()` trong FormRequest, `Gate::authorize`, `can:` middleware) | `ls app/Policies`; grep `Gate::define\|authorize(\|can:` |
| P11 | **Format response API**: Resource trực tiếp / wrapper `{success, data, message}` / trait helper | đọc 3 controller API; grep `response()->json` |
| P11b | **API luôn trả JSON khi lỗi** (kể cả client thiếu header `Accept`): có `shouldRenderJsonWhen` hay không | `bootstrap/app.php` `withExceptions`, hoặc `Handler.php` |
| P12 | **Exception nghiệp vụ**: class riêng (static factory?) và nơi render | `ls app/Exceptions`; `bootstrap/app.php` hoặc `Handler.php` |

## → laravel-security.md

| # | Ngã rẽ | Gợi ý tìm |
|---|---|---|
| S1 | **Middleware bắt buộc cho nhóm dữ liệu nhạy cảm** (consent, 2FA, tenant) | alias middleware trong `bootstrap/app.php`/Kernel |
| S2 | **Rate limit**: limiter đặt tên trong provider / `throttle:x,y` inline | grep `RateLimiter::for\|throttle:` |
| S3 | **Lưu file**: disk mặc định, file riêng tư trả qua route hay `temporaryUrl()` | `config/filesystems.php`; grep `Storage::disk` |

## → laravel-queue.md

| # | Ngã rẽ | Gợi ý tìm |
|---|---|---|
| Q1 | **Tích hợp ngoài**: interface + binding theo config / class concrete; thư mục đặt client | `app/Providers/*ServiceProvider.php`; `ls app/Services/*` |
| Q2 | **Event/Notification**: dùng event-listener làm xương sống hay gọi trực tiếp; thư mục notification theo actor | `ls app/Events app/Listeners app/Notifications` |
| Q3 | **Job**: nhận Model hay ID; `$tries`, queue riêng | đọc 3 job |
| Q4 | **Queue connection/tên queue** dùng cho từng loại việc; `after_commit` bật ở connection chưa | `config/queue.php`; grep `onQueue(` |

## → laravel-conventions.md

| # | Ngã rẽ | Gợi ý tìm |
|---|---|---|
| C1 | **Lệnh format / static analysis**: script composer, bọc Docker/Sail, level PHPStan, custom rule **→ AGENTS.md (Lệnh & môi trường)** | `composer.json` scripts; `phpstan.neon*`; `app/PHPStan` |
| C2 | **Mass assignment**: `$fillable` / `#[Fillable]` / `$guarded` | grep trong `app/Models` |
| C3 | **Cast**: `casts()` / `$casts` (chỉ ghi khi dự án L11+ vẫn giữ `$casts`) | grep trong `app/Models` |
| C4 | **Accessor/mutator**: `Attribute` class / `getXxxAttribute()` cũ | grep `Attribute::make` vs `function get.*Attribute` |
| C5 | **Enum**: thư mục, kiểu case (PascalCase/UPPER), có method label/helper | `ls app/Enums`; đọc 2 enum |
| C6 | **`strict_types`, `final`, readonly** dùng nhất quán hay không | grep `declare(strict_types` / `final class` trong `app/` |
| C7 | **Docblock bắt buộc** (VD docblock controller do PHPStan custom rule yêu cầu; `@property` trên model) | đọc model, controller; custom rule |
| C8 | **Đặt tên lệch chuẩn**: hậu tố class (`*Action`, `*Service`), tên FormRequest, tên Resource | `ls` các thư mục trong `app/` |

## → laravel-testing.md

| # | Ngã rẽ | Gợi ý tìm |
|---|---|---|
| T1 | **Framework**: Pest / PHPUnit; plugin Pest | `tests/Pest.php`, `composer.json` |
| T2 | **Lệnh chạy test và coverage**, ngưỡng trong CI **→ AGENTS.md (Lệnh & môi trường)** | CI config, `composer.json` scripts |
| T3 | **DB test**: SQLite memory / MySQL / Postgres; trait bật sẵn ở đâu (`RefreshDatabase`, `LazilyRefreshDatabase`) | `phpunit.xml`, `tests/Pest.php`, `tests/TestCase.php` |
| T4 | **Setup chung trong TestCase** (header, flush cache, seed) | `tests/TestCase.php` |
| T5 | **Helper dùng chung** (global function trong Pest.php, trait) | `tests/Pest.php`, `tests/Concerns` |
| T6 | **Cấu trúc thư mục test** (theo guard/actor, theo version API) | `ls -R tests/Feature` |
| T7 | **Unit test có boot Laravel/DB không** | `tests/Pest.php` (`uses(...)->in('Unit')`) |
| T8 | **Quy ước đặt tên/nhóm test** (`describe` kèm mã ticket, `group`) | đọc 3 test |
| T9 | **Status mặc định khi sai quyền**: 403 hay 404 | test authorization hiện có |

## → laravel-database.md

| # | Ngã rẽ | Gợi ý tìm |
|---|---|---|
| D1 | **DB engine** dev/prod | `config/database.php`, `docker-compose.yml`, CI |
| D2 | **Khoá chính**: auto-increment / UUID / ULID | grep `HasUuids\|HasUlids`; migration `id()` vs `uuid(` |
| D3 | **Soft delete** dùng rộng hay hạn chế | grep `SoftDeletes` |
| D4 | **Quy ước tên index/constraint** đặt tay | grep `->index('` / `->unique('` có tên |
| D5 | **Migration**: anonymous class hay class có tên; gom nhiều bảng 1 file | đọc 3 migration gần nhất |
| D6 | **Timezone lưu DB**, cột thời gian đặc biệt | `config/app.php` timezone; migration |
| D7 | **Tài liệu schema** làm nguồn tham chiếu | `docs/`, README |
| D8 | **Seeder bắt buộc khi setup** (master data) | `DatabaseSeeder.php` |
