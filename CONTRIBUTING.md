# Đóng góp cho agent-stack

agent-stack sinh `.claude` của một dự án bằng cách **chọn** từ knowledge base có sẵn:
không model nào viết nội dung, file được chọn thì copy nguyên xi.

Đóng góp nghĩa là bạn đồng ý với [Code of Conduct](CODE_OF_CONDUCT.md), và được cấp phép
theo [Apache-2.0](LICENSE). Lỗ hổng bảo mật báo riêng qua [SECURITY.md](SECURITY.md),
không mở issue công khai.

## Chuẩn bị

Node 20 trở lên.

```bash
npm install
npm run check     # typecheck + test + bundle — xanh trước khi bắt đầu, và trước mỗi lần push
```

`dist/agent-stack.mjs` được commit để plugin chạy không cần cài đặt: sửa gì trong `src/`
thì commit `dist/` kèm theo, `npm run check` tự rebuild.

## Thêm rule, skill hay command

**Đường dẫn chính là metadata** — không có trường `id`, `layer`, `applies_to`, `type` hay
`priority` nào để khai. Đặt file đúng chỗ là xong
([knowledge/README.md](knowledge/README.md) là bản tham chiếu đầy đủ):

| Bạn viết | Sinh ra |
| --- | --- |
| `knowledge/rules/global/<name>.md` | `.claude/rules/<name>.md` |
| `knowledge/rules/framework/<fw>/<name>.md` | `.claude/rules/<fw>-<name>.md` |
| `knowledge/skills/framework/<fw>/<name>/SKILL.md` | `.claude/skills/<name>/`, kèm mọi file cạnh nó |
| `knowledge/commands/<name>.md` | `.claude/commands/<name>.md` |
| `knowledge/commands/framework/<fw>/<name>.md` | `.claude/commands/<fw>-<name>.md` |
| `knowledge/claude-md/<name>.md` | inline vào `CLAUDE.md`, không ra file riêng |

**Rule** = quy ước, luôn trong context, `@`-import từ `CLAUDE.md`. **Skill** = quy trình
có các bước, chỉ nạp khi gặp việc — đang đánh số bước thì đó là skill; giữ `SKILL.md` dưới
~500 dòng, tài liệu dài để ra file riêng cùng thư mục. **Command** = thứ lập trình viên gõ.
**Fragment `claude-md/`** = hướng dẫn thuộc về chính `CLAUDE.md` của dự án đích.

Sáu điều dễ sai:

- `<fw>` phải là id trong `catalog.yaml` — hiện chỉ `rails` và `laravel`. Mọi segment phải
  là kebab-case thường, nếu không loader từ chối và nêu tên file.
- **Mọi thứ gate bằng framework.** Catalog không có `ruby`, `php`, `eloquent`, nên rule
  style Ruby nằm dưới `framework/rails/`. Gate bằng thứ ngoài catalog thì rule không bao
  giờ được sinh ra.
- **Id của skill là tên thư mục của chính nó**, không phải cả đường dẫn, và là không gian
  phẳng Claude khớp task vào — viết tên framework vào luôn: `rails-feature`. Hai thư mục
  skill trùng tên là lỗi lúc nạp.
- **Không khai metadata của agent-stack trong front matter** — nó sẽ bị copy vào mọi dự án
  sinh ra. Chỉ để thứ Claude đọc: `name` + `description` trong `SKILL.md`, `description`
  trong command, rule thì không cần gì.
- **Việc chọn không nhìn version.** Nội dung chỉ đúng từ một release nào đó thì nói rõ
  trong thân file.
- Thứ tự `@`-import theo alphabet của tên đầu ra. Muốn rule nằm trên thì đặt tên xếp trước.

Rule và skill sẽ được áp lên code thật: ưu tiên thứ đã thấy hiệu quả hơn thứ nghe có vẻ
đúng, cụ thể đủ để làm theo, và nói *vì sao* khi lý do không hiển nhiên.

## Test

```bash
npm run check                        # typecheck + test + bundle
npm run try -- --framework laravel   # generate vào .agent-stack-try/ (gitignore) để đọc bằng mắt
npm run try -- --clean               # xoá thư mục thử
```

`tests/pipeline.test.ts` nạp knowledge base thật, nên thư mục framework lạ, segment sai
kebab-case hay hai file trùng tên đầu ra đều làm suite đỏ ngay.

**Hành vi mới cần test mới; bug fix cần test fail trước khi sửa.** Thêm nội dung cho một
framework thì khẳng định nó được chọn chỉ từ `--framework`:

```ts
it('selects the Laravel layer from the framework alone', async () => {
  const { selection, report } = await run('laravel');
  expect(selection.rules.map((entry) => entry.artifact.meta.id)).toContain('laravel-conventions');
  expect(selection.skills.map((entry) => entry.artifact.meta.id)).toContain('laravel-feature');
  expect(report.ok).toBe(true);
});
```

`npm run try` seed sẵn một `CLAUDE.md` viết tay, nên mỗi lần chạy cũng chứng minh generator
chỉ merge block của nó mà không đụng chữ xung quanh. Đọc cây file thật thay vì chỉ tin test;
mở `.agent-stack-try/` bằng Claude Code để thấy rule và skill được nạp.

## Nội dung import — đừng đụng vào

Layer global copy từ repo khác, ghim theo SHA 40 ký tự trong `knowledge/upstream.yaml`.

- **Không sửa file dưới đường dẫn mà `upstream.yaml` ánh xạ tới** — lần sync sau ghi đè.
- Viết file của riêng bạn cạnh đó thì được: sync chỉ xoá những file lần trước đã mang về,
  ghi trong `upstream.lock.json`. Commit file lock cùng nội dung nó mô tả.
- Dời pin là commit cần review: `npm run sync -- --ref <sha>` rồi đọc diff. Chỉ nhận SHA đủ
  40 ký tự, không nhận branch hay tag.

## Sửa pipeline

Đặt logic vào module đang sở hữu mối quan tâm đó — bảng module ở
[CLAUDE.md](CLAUDE.md#pipeline). **Chỉ `emit.ts` được ghi hoặc xoá**, và chỉ xoá được đường
dẫn có trong manifest lần chạy trước. Giữ nguyên hình dạng `--json` vì slash command parse
nó. Hai invariant phải giữ: **việc chọn là tất định**, và **xung đột không bao giờ được hoà
giải âm thầm** — làm yếu cái nào thì nói thẳng trong PR.

## Pull request

Một PR một mối quan tâm. [Conventional Commits](https://www.conventionalcommits.org), tiêu
đề mệnh lệnh dưới 72 ký tự, không chấm cuối; body giải thích *vì sao*, không kể lại diff.
Mô tả PR nói đã thay gì và kiểm chứng ra sao — `npm run check` xanh, `dist/` khớp `src/`.

Chưa chắc nên viết gì thì mở issue trước: với bug ghi đúng câu lệnh, output và thứ bạn mong
đợi; với rule hay skill mới nói nó thuộc framework nào và vì sao nội dung hiện có chưa bao
được — knowledge base cố giữ đủ nhỏ để đọc hết.
