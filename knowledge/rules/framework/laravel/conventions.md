# Laravel Conventions

## Công cụ & style

- Xem `composer.json` (`require-dev`, `scripts`) để biết dự án có Pint/PHP-CS-Fixer, PHPStan/Larastan/Psalm, Rector. Có thì chạy trên file đã sửa trước khi báo xong; vi phạm thì sửa code, không nới config hay thêm ignore/baseline.
- Có `composer` script (`composer lint`, `composer test`…) thì chạy qua script để giống CI, không tự ghép lệnh khác.
- Format theo config của dự án (`pint.json`, `.php-cs-fixer.php`…). Có Pint mà không có config thì chạy Pint mặc định (preset `laravel`, không phải `psr12`); không có tool nào thì theo PSR-12.
- Chỉ format file mình sửa, không reformat hàng loạt file không liên quan.
- Tạo file bằng `php artisan make:*` khi có lệnh tương ứng (`make:enum`, `make:class`, `make:interface`, `make:trait` chỉ có từ L11). Không tự đặt tên hay timestamp migration.
- Không để lại `dd()`, `dump()`, `ray()`, `var_dump()`, code comment-out.
- Lệnh artisan chạy với `--no-interaction` và đủ tham số/option (thiếu thì Laravel Prompts hỏi, lệnh bị treo).
- Không thay đổi dependency (`composer require`/`remove`, nâng version) khi chưa được đồng ý.
- Xem config đã resolve bằng `php artisan config:show <file>`, không đọc `.env`. `php artisan tinker --execute '…'` chỉ dùng để đọc; không tạo/sửa dữ liệu khi chưa được đồng ý. Có thể kiểm chứng bằng test thì viết test, không viết script tạm.

## PHP

- Khai báo type cho tham số, return và property. Dùng cú pháp đúng phiên bản PHP trong `composer.json` (constructor promotion, `readonly`, enum…).
- `declare(strict_types=1)`: chỉ thêm khi các file cùng loại trong dự án đã dùng. Bật lẻ tẻ có thể làm vỡ code đang dựa vào ép kiểu.
- Biến, method: camelCase. Class: PascalCase. Hằng: UPPER_SNAKE.
- So sánh dùng `===`. Không dùng `@` để che lỗi.
- Chuỗi có thể chứa ký tự đa byte (tiếng Việt, Nhật…) xử lý bằng `Str::` (`Str::length`, `Str::limit`, `Str::lower`) hoặc `mb_*`, không `strlen`/`substr`/`strtolower`.
- Import mọi class/interface/trait bằng `use`, không viết FQCN inline (`\App\Models\User::`). Xoá `use` không dùng.
- Không trả `false`/`null` để báo lỗi ở code mới; ném exception. `null` chỉ dùng khi "không có" là kết quả hợp lệ (VD `find()`).

## Cấu trúc code

- Ưu tiên early return/guard clause; không lồng `if`/`foreach` quá 3 cấp.
- Method dài quá ~40 dòng hoặc làm nhiều việc thì tách thành method private có tên rõ.
- Không dùng magic number/string: ngưỡng, giới hạn, thời gian dùng constant, enum hoặc `config()`.
- Tên boolean đọc như mệnh đề: `isActive`, `hasPaid`, `canCancel()`.
- Chỉ tách hàm dùng chung khi logic đã lặp thật (≥2 chỗ); không thêm abstraction, tham số, option cho nhu cầu chưa có.
- Cần chờ trong code (retry, polling) dùng `Sleep::for(…)->seconds()` (`Illuminate\Support\Sleep`, L10+), không `sleep()`/`usleep()`, để test fake được.
- Không sửa tham số đầu vào (array, object, Carbon) ngoài ý muốn: trả giá trị mới. Carbon mutable thì `->copy()` trước khi `add*`/`sub*`, hoặc dùng `CarbonImmutable`.

## Đặt tên theo Laravel

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Model | Số ít, PascalCase | `OrderItem` |
| Bảng | Số nhiều, snake_case | `order_items` |
| Bảng pivot | 2 model số ít, thứ tự alphabet | `product_tag` |
| Cột, khoá ngoại | snake_case; FK `belongsTo` = `{tên relationship}_id` | `order_id`, `customer_id` |
| Relationship | `belongsTo`/`hasOne` số ít, `hasMany`/`belongsToMany` số nhiều, camelCase | `customer()`, `orderItems()` |
| Controller | Số ít + `Controller` | `OrderController` |
| FormRequest | `Store{Model}Request`/`Update{Model}Request`; ngoài CRUD đặt theo use-case | `CancelOrderRequest` |
| Resource | `{Model}Resource`, dùng `::collection()` cho danh sách; chỉ tạo `{Model}Collection` khi cần meta riêng | `OrderResource` |
| Policy, Factory, Seeder | `{Model}Policy`, `{Model}Factory`, `{Model}Seeder` | `OrderPolicy` |
| Job | Động từ + đối tượng | `SyncOrderToErp` |
| Event | Việc đã xảy ra, quá khứ | `OrderShipped` |
| Listener | Hành động phản hồi | `SendShipmentNotification` |
| Route URI | Số nhiều, kebab-case | `/order-items/{order_item}` (tham số do `Route::resource` sinh) |
| Route name | Dấu chấm, theo resource | `order-items.show` |
| Config, lang key (file PHP) | snake_case; lang JSON dùng câu gốc làm key | `services.payment.api_key` |
| Migration | Mô tả hành động, snake_case | `add_status_to_orders_table` |

FK không theo convention (VD `created_by`) phải truyền key tường minh: `belongsTo(User::class, 'created_by')`.

Controller resource dùng đúng tên action chuẩn: `index`, `show`, `store`, `update`, `destroy` (`create`, `edit` cho web).

## Model

- Khai báo `$fillable` rõ ràng; không dùng `$guarded = []`.
- Cast ngày giờ, boolean, JSON, enum đầy đủ, theo cách model hiện có: method `casts()` (từ L11) hoặc property `$casts` (vẫn chạy ở L11+). Không chuyển đổi model cũ.
- Cột status/type cast sang backed enum nếu dự án có enum, không so sánh magic string.
- Relationship khai báo return type (`BelongsTo`, `HasMany`…).
- Cột có default ở DB: giá trị đó chỉ có sau insert, model vừa `create()`/`new` vẫn là `null`. Code đọc ngay giá trị (Resource, cast enum) thì khai báo cùng giá trị trong `$attributes` của model, hoặc gọi `->refresh()`.
- Secret cần đọc lại (token, API key bên thứ ba) cast `encrypted` và thêm vào `$hidden`; cột `text`, không where được. Mật khẩu dùng cast `hashed` (L10+), không `encrypted`.

## Thời gian & chuỗi

- Dùng `now()`, `Carbon`/`CarbonImmutable`, không dùng `date()`/`time()`.
- Thông báo hiển thị cho người dùng dùng `__()` khi dự án có thư mục `lang/` (L11+ mặc định không có).

## Comment

- Comment và docblock giải thích WHY (lý do nghiệp vụ, edge case), không lặp lại WHAT code đã thể hiện.
- Docblock chỉ thêm khi type PHP không diễn tả đủ (generic collection, array shape) hoặc tool của dự án yêu cầu.

## Đặc thù dự án

Quy định riêng của dự án. Khi khác hoặc cụ thể hơn quy tắc chung ở trên, làm theo mục này.
