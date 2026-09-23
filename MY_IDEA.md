# agent-stack

**Biến kiến thức engineering của công ty thành thứ mọi dự án mới dùng được ngay, thay vì
chép tay từ dự án cũ.**

---

## Vấn đề

Repository mới nào cũng bắt đầu giống nhau: ai đó mở dự án gần nhất, copy file hướng dẫn
cho AI, xoá phần không còn đúng, rồi quên cập nhật phần còn lại.

Sau vài tháng, mỗi dự án mang một phiên bản hơi lệch của cùng một bộ quy ước. Không ai
biết bản nào mới nhất. Một bài học rút ra ở dự án A không bao giờ đến được dự án B. Khi
một quy ước thay đổi, không có cách nào cập nhật hàng chục dự án ngoài việc đi sửa tay
từng cái.

Kết quả: AI coding assistant ở mỗi dự án được hướng dẫn một kiểu khác nhau, và chất lượng
đầu ra phụ thuộc vào việc người lập dự án hôm đó nhớ được bao nhiêu.

## Ý tưởng

Tập trung toàn bộ quy ước và quy trình engineering vào **một thư viện dùng chung, được
review và quản lý bằng Git**. Khi lập dự án mới, lập trình viên nêu framework đang dùng,
và công cụ lắp sẵn bộ hướng dẫn tương ứng vào dự án.

```
Nêu framework  →  Chọn  →  Kiểm tra  →  Lắp vào dự án
```

Việc chép tay trở thành một bước tự động. Cải thiện một quy ước thì sửa đúng một chỗ, và
mọi dự án nhận được ở lần chạy kế tiếp.

## Điểm khác biệt cốt lõi: chọn, không sinh

Đây là quyết định quan trọng nhất của dự án, và là thứ phân biệt nó với việc bảo AI tự
viết file hướng dẫn.

**Công cụ không tự sáng tác nội dung.** Nó chỉ lấy đúng những file đã có sẵn trong thư
viện và đặt vào dự án, **nguyên văn, không sửa một ký tự**. Toàn bộ nội dung đều do con
người viết, review và commit.

Điều đó mang lại bốn thứ mà cách tự sinh không có:

| | Để AI tự sinh mỗi lần | agent-stack |
| --- | --- | --- |
| **Tin được không** | Nội dung nghe hợp lý nhưng chưa ai kiểm | Mỗi dòng là một file đã review, có tác giả, có lịch sử |
| **Ổn định không** | Cùng yêu cầu, mỗi lần ra một kiểu | Cùng framework, luôn ra đúng cùng một bộ file |
| **Cải thiện thế nào** | Phải nhắc lại từ đầu ở từng dự án | Sửa một lần, mọi dự án cùng được |
| **Tốn gì** | Gọi mạng và tốn chi phí mỗi lần lập dự án | Chạy hoàn toàn tại chỗ, không tốn gì |

Chỗ duy nhất AI tham gia là ở đầu vào: hiểu câu người dùng nói và chuyển thành lựa chọn.
Nó không quyết định nội dung nào được đưa vào dự án.

## Người dùng nhận được gì

Chạy một lệnh, dự án có ngay:

- **Bộ quy ước** — cách viết code mà đội thống nhất, luôn nằm sẵn trong tầm nhìn của AI.
- **Bộ quy trình** — các việc lặp đi lặp lại được mô tả theo từng bước: thêm một tính
  năng, đổi cấu trúc dữ liệu, xử lý một trang chạy chậm. AI tự lấy ra khi gặp đúng việc.
- **Các lệnh tắt** — những thao tác lập trình viên gõ hằng ngày.
- **Một bản kê khai** — ghi rõ lần chạy này lắp vào những gì và lấy từ đâu, kèm thông tin
  bản quyền của nội dung mượn từ dự án mã nguồn mở khác.

## Bốn cam kết

Đây là những điều dự án không đánh đổi, kể cả khi cần thêm tính năng.

**1. Không nội dung nào do máy bịa ra.** Tất cả đến từ thư viện đã được review.

**2. Cùng đầu vào, luôn cùng kết quả.** Không có yếu tố ngẫu nhiên. Hai người chạy cùng
một lệnh ở hai máy nhận được hai bộ file giống hệt nhau.

**3. Xung đột không bao giờ được xử lý âm thầm.** Nếu hai lựa chọn loại trừ nhau, công cụ
**dừng lại**, nói rõ xung đột là gì, và để người dùng quyết định. Nó không tự chọn bên
thắng rồi im lặng đi tiếp.

**4. Không phá thứ gì của người dùng.** Công cụ chỉ được xoá đúng những file chính nó đã
tạo ở lần chạy trước. Phần hướng dẫn viết tay trong dự án được giữ nguyên vẹn; công cụ chỉ
cập nhật đúng phần nó quản lý, nằm giữa hai dấu mốc rõ ràng.

Hệ quả của cam kết 1 và 2: **toàn bộ quá trình chạy tại chỗ, không cần mạng.** Thư viện
nằm sẵn trong công cụ.

## Nguyên tắc tổ chức thư viện

Một nguyên tắc duy nhất, và nó giải thích gần hết cách dùng:

> **Thư mục quyết định file đó dành cho ai, và tên file quyết định tên file sinh ra.**

Đặt một quy ước về bảo mật Rails vào thư mục `rails`, nó sẽ chỉ xuất hiện ở dự án Rails,
và mang đúng cái tên bạn đặt. Không cần khai báo thêm gì trong file.

Nhờ vậy người đóng góp chỉ cần biết viết Markdown, không cần học một định dạng riêng. Và
vì file được copy nguyên văn, thứ bạn viết đúng bằng thứ dự án nhận được.

## Đầu vào: chỉ hỏi framework

Công cụ chỉ hỏi một thứ: **dự án dùng framework nào.**

Ngôn ngữ, cơ sở dữ liệu, hạ tầng đều không hỏi. Lý do rất thực tế: framework là thứ duy
nhất người lập dự án luôn biết chắc và không bao giờ nhầm. Mỗi câu hỏi thêm vào là thêm
một cơ hội để ai đó bỏ sót, và khi bỏ sót thì một phần quy ước lặng lẽ không được lắp vào
— không báo lỗi, không ai biết. Đó là kiểu hỏng nguy hiểm nhất, vì nó trông y hệt lúc chạy
đúng.

Cũng vì vậy công cụ **không quan tâm tới số phiên bản**. Một quy ước áp dụng cho framework,
không phải cho một bản phát hành cụ thể của nó. Bắt người dùng nhập đúng số phiên bản chỉ
tạo thêm một chỗ để nhập sai và mất quy ước mà không hay.

## Phạm vi hiện tại

**Đã chạy được:** Rails, với bộ quy ước và quy trình do đội tự viết. Cộng với một lớp
hướng dẫn chung áp dụng cho mọi dự án, mượn từ hai dự án mã nguồn mở giấy phép MIT và ghim
theo phiên bản cụ thể để truy vết được.

**Đã có chỗ, chưa có nội dung:** Laravel. Chạy được, nhưng hiện chỉ nhận lớp chung. Bổ
sung nội dung cho nó là phần đóng góp có giá trị nhất lúc này, và không cần biết gì về
code của công cụ — chỉ cần viết Markdown đặt đúng thư mục.

Một framework có trong danh mục mà chưa có nội dung là **khoảng trống đã được ghi nhận,
không phải lỗi**. Công cụ báo rõ điều đó thay vì chạy im lặng.

## Hướng đi tiếp

**Đã làm — nói bằng tiếng người.** Thay vì gõ đúng tên framework, người dùng chỉ cần mô
tả: "làm một hệ thống SaaS bằng Rails". AI hiểu câu đó và chuyển thành lựa chọn, rồi đưa
bảng ánh xạ cho người dùng duyệt: từ nào thành lựa chọn, từ nào không dùng và vì sao. Không
từ nào bị bỏ đi mà không báo. Phần chọn và lắp ráp vẫn giữ nguyên tính tất định — AI chỉ
đứng ở cửa vào.

**Đã làm — biết dự án nào đã cũ.** Một lệnh kiểm tra so dự án với thư viện hiện tại và
liệt kê những gì lần chạy kế tiếp sẽ đổi, không ghi gì. Đặt trong CI thì dự án nào chưa
nhận bản sửa quy ước mới nhất sẽ lộ ra ngay. Đi kèm: file do công cụ tạo mà người dùng đã
sửa tay thì trở thành của người dùng — không bị ghi đè, không bị xoá.

**Xa hơn — lắp đặt trọn gói.** Không chỉ hướng dẫn cho AI, mà dựng luôn khung dự án đầy
đủ, phục vụ được nhiều công cụ khác nhau chứ không riêng một loại.

## Thước đo thành công

- Lập dự án mới không còn ai mở dự án cũ ra copy.
- Một bài học rút ra ở một dự án đến được mọi dự án còn lại, qua một lần sửa.
- Hỏi "quy ước hiện tại là gì" luôn có đúng một câu trả lời, và nó nằm trong Git.
