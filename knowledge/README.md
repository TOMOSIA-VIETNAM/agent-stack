# Knowledge base

Nội dung mà agent-stack chọn ra. Tất cả đều được commit ở đây, nên một lần generate không
cần mạng.

## Quy tắc duy nhất

**agent-stack không đọc cũng không ghi phần bên trong file.** File được chọn thì copy vào
dự án nguyên xi từng byte. Mọi thứ generator cần — file là gì, dành cho ai, sẽ mang tên
nào — đều đọc từ **đường dẫn**.

Vì vậy không có trường `id`, `priority`, `layer`, `applies_to` hay `type` nào để khai. Đặt
file đúng chỗ và đặt tên cho chuẩn là xong.

## Bố cục

```
catalog.yaml                            danh sách framework
upstream.yaml                           copy từ đâu, ghim ở commit nào
upstream.lock.json                      lần sync trước đã đưa về những file nào

rules/global/<name>.md                  -> .claude/rules/<name>.md
rules/framework/<fw>/<name>.md          -> .claude/rules/<fw>-<name>.md
skills/global/<name>/SKILL.md           -> .claude/skills/<name>/
skills/framework/<fw>/<name>/SKILL.md   -> .claude/skills/<name>/
commands/<name>.md                      -> .claude/commands/<name>.md
commands/framework/<fw>/<name>.md       -> .claude/commands/<fw>-<name>.md
agent-md/<name>.md                      -> AGENTS.md, chỉ khi dự án chưa có
agent-md/framework/<fw>/<name>.md       -> AGENTS.md, chỉ khi chọn <fw> và dự án chưa có
```

`<fw>` là id framework trong `catalog.yaml`. File nằm cạnh một `SKILL.md` — thư mục
`references/`, một script — được copy theo.

## Đường dẫn quyết định những gì

| Suy ra | Từ | Ví dụ |
| --- | --- | --- |
| type | thư mục trên cùng | `rules/` → một rule |
| layer | segment 2, nếu là `global` hoặc `framework`; còn lại là `global` | `rules/framework/…` → framework |
| áp dụng cho framework nào | thư mục ngay dưới `framework/` | `rails/` → áp dụng cho Rails |
| tên file sinh ra | phần còn lại của đường dẫn, nối bằng `-`, bỏ `.md` | `rails/security.md` → `rails-security.md` |

Lồng sâu bao nhiêu tuỳ ý dưới thư mục framework: `rails/db/indexes.md` thành
`rails-db-indexes.md`. Dùng nó để nhóm một tập đang phình ra.

**Skill là ngoại lệ**: id của nó là *tên thư mục của chính nó*, không phải đường dẫn nối
lại, nên `skills/framework/rails/rails-feature/` vẫn là `rails-feature`. Tên skill nằm
trong một namespace phẳng mà Claude đối chiếu với task, nên hãy viết tên framework vào
chính tên skill thay vì trông chờ thư mục cha.

Mọi segment phải là lowercase kebab-case, vì đường dẫn sẽ thành tên file. Khác đi thì
knowledge base từ chối lúc load và nêu tên file.

## Front matter

Front matter bạn viết là phần của Claude, và đi vào mọi dự án được sinh ra, y nguyên.
agent-stack không có ý kiến gì về nó.

| File | Claude cần gì |
| --- | --- |
| `SKILL.md` | `name` và `description`. Description là thứ Claude đối chiếu với task — nói nó làm gì **và khi nào dùng** |
| command | `description` |
| rule | không cần gì. Cho một `# Title` rồi viết Markdown |
| template AGENTS.md | không cần gì |

Đừng thêm metadata cho agent-stack: không có gì để thêm, và nó sẽ bị copy vào mọi dự án
chọn file đó.

## Bốn loại nội dung

| Loại | Là gì | Load khi nào |
| --- | --- | --- |
| **Rule** | Một quy ước — *code phải viết thế nào* | Claude Code tự nạp `.claude/rules/`: lúc launch, hoặc chỉ khi đụng file khớp `paths:` nếu rule có khai báo |
| **Skill** | Một quy trình — *làm task X ra sao*, theo từng bước | Khi task đó xuất hiện |
| **Command** | Thứ lập trình viên gõ ra | Khi được gọi |
| **Template AGENTS.md** | Khung để team tự điền thông tin của dự án | Từ token đầu tiên — Claude Code đọc `AGENTS.md` khi dự án không có `CLAUDE.md` |

Nếu bạn đang viết các bước đánh số, đó là skill.

Template AGENTS.md là thứ **duy nhất** chỉ được ghi một lần. Nó được copy y nguyên khi dự
án chưa có `AGENTS.md`, và từ đó file là của dự án: không có checksum trong manifest, không
bao giờ bị ghi đè hay xoá, kể cả với `--overwrite`. Sửa template ở đây chỉ có tác dụng với
dự án sinh sau. Mỗi stack chỉ được khớp đúng một template: hai template cùng khớp thì run
dừng và nêu tên cả hai.

agent-stack không sinh `CLAUDE.md`: còn `CLAUDE.md` thì Claude Code bỏ qua `AGENTS.md`. Ở dự
án đã sinh bằng bản cũ, khối `agent-stack:begin`/`end` được gỡ khỏi `CLAUDE.md`, và file bị
xoá nếu không còn gì khác. Không có thư mục `claude-md/`: một thư mục lạ ở cấp trên cùng
làm knowledge base từ chối lúc load và nêu tên nó.

Giữ `SKILL.md` dưới ~500 dòng. Tài liệu tham chiếu dài thì tách ra file riêng cùng thư
mục; nó được copy tự động.

## Thứ tự

Theo alphabet của tên file sinh ra. Không có trường priority: rule không được import theo
thứ tự nào cả, Claude Code tự nạp cả thư mục `.claude/rules/`.

## Nhiều framework

Một dự án chọn được nhiều framework. Rule và command mang sẵn tên thư mục framework trong
tên, nên hai framework đều có thể có `conventions.md`:

```
rules/framework/rails/conventions.md    -> .claude/rules/rails-conventions.md
rules/framework/laravel/conventions.md  -> .claude/rules/laravel-conventions.md
```

Skill không có tiền tố đó, nên hai thư mục skill trùng tên là lỗi lúc load, nêu tên cả hai
file. agent-stack không đổi tên hộ bạn: làm vậy là đổi cái tên Claude đối chiếu.

## catalog.yaml

Mọi entry đều là một framework, vì framework là thứ duy nhất operator chọn. Không có
trường `kind` — nó sẽ giống nhau ở mọi dòng — và không có version: một rule áp dụng cho
framework, không phải cho một bản phát hành của nó.

```yaml
version: 1

technologies:
  rails:
    name: Ruby on Rails

  laravel:
    name: Laravel
```

| Trường | Ý nghĩa |
| --- | --- |
| `name` | Bắt buộc. Tên cho người đọc |
| `requires` | Tự kéo theo, bắc cầu. Hiện chưa entry nào cần |
| `conflicts_with` | Chỉ báo cáo, **không bao giờ** tự xử. Run dừng lại và in ra flag để bỏ qua |
| `compatible_with` | Chỉ để tài liệu; không enforce |

Một framework chưa có nội dung vẫn hợp lệ: validator báo `uncovered-technology` chứ không
fail. `agent-stack catalog` in ra mỗi framework có gì, để thấy ngay chỗ trống:

```
  ┌─────────┬───────────────┬───────┬────────┬──────────┐
  │ id      │ name          │ rules │ skills │ commands │
  ├─────────┼───────────────┼───────┼────────┼──────────┤
  │ rails   │ Ruby on Rails │     3 │     29 │        9 │
  │ laravel │ Laravel       │     6 │     30 │        9 │
  └─────────┴───────────────┴───────┴────────┴──────────┘
```

Mỗi dòng là đúng những gì `--framework <id>` sinh ra, tính cả global layer, vì layer đó
luôn được chọn bất kể framework nào. Global layer góp 0 rule, 26 skill và 9 command vào mỗi
dòng; phần còn lại là của riêng framework đó. Output `--json` tách hai phần đó ra thành `counts` và
`own`.

## Thêm nội dung

**Rule** — file Markdown dưới `rules/framework/<fw>/`. Cho một `# Title` rồi viết quy ước.
Hết.

**Skill** — thư mục dưới `skills/framework/<fw>/<skill-name>/` chứa `SKILL.md` có `name`
và `description`. Viết các bước theo thứ tự, kết bằng việc cần báo cáo gì. Đặt tên thư mục
theo đúng cái tên Claude nên gọi, kèm framework.

**Command** — file Markdown dưới `commands/framework/<fw>/`, hoặc `commands/` nếu áp dụng
mọi nơi.

**Template AGENTS.md** — file Markdown dưới `agent-md/`, hoặc `agent-md/framework/<fw>/`
nếu chỉ dành cho một framework. Viết sẵn heading và comment hướng dẫn để team điền.

**Framework** — `npm run new-framework -- <id> "<Name>"` thêm entry vào `catalog.yaml` và clone [`templates/framework/`](../templates/framework/) vào đúng chỗ. Chi tiết ở [CONTRIBUTING.md](../CONTRIBUTING.md#thêm-một-framework).

Chạy `npm test` sau mỗi thay đổi: suite load thư mục này và fail khi trùng tên, khi thư
mục framework lạ, hoặc khi một đường dẫn không thể thành tên file.

## Nội dung import

Global layer được copy từ một dự án MIT và commit ở đây:
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) — skill vào
`skills/global/`, command vào `commands/`.

`upstream.yaml` ghi repository, commit chính xác, licence, và đường dẫn upstream nào ứng
với đường dẫn nào ở đây. Commit là **SHA đủ 40 ký tự** — branch hay tag bị từ chối — nên
bản copy truy được về đúng một revision.

```bash
npm run sync                      # copy lại ở commit đã ghim
npm run sync -- --ref <sha>       # dời ghim, rồi copy
```

**Không bao giờ sửa file import.** Lần sync sau ghi đè lên.

**Viết file của bạn nằm cạnh chúng thì không sao.** Một lần sync chỉ xoá những file mà lần
sync *trước* đã đưa về, tức những gì `upstream.lock.json` ghi lại. Upstream xoá file thì
vẫn lan xuống — file đó có trong sổ và không có trong snapshot mới — còn file chưa từng
nằm trong sổ thì không bao giờ là ứng viên bị xoá. Commit lock file kèm nội dung nó mô tả;
thiếu nó, sync không phân biệt được upstream xoá với việc bạn tự viết, nên nó không xoá gì
cả và nói rõ như vậy.

`license`, `license_url` và `copyright` đi vào `.claude/agent-stack-manifest.json` của mọi
dự án sinh ra, dưới `imported`. Đó là nơi notice của upstream nằm — một lần cho mỗi dự án.
Giữ chúng chính xác, và đừng thêm nguồn nào không thể ghi nhận ở đó.

### Hạn chế đã biết

Các command import gọi skill bằng tên plugin upstream, ví dụ
`agent-skills:test-driven-development`. Trong dự án sinh ra, skill đó nằm ở
`.claude/skills/<name>/` không namespace, nên tham chiếu chỉ resolve được nếu dự án đó
*cũng* cài plugin upstream. File được giữ đúng như bản phát hành thay vì viết lại.

## Khi load thất bại

| Thông báo | Nguyên nhân |
| --- | --- |
| `"X_y" cannot be a filename under .claude/` | Một segment không phải lowercase kebab-case |
| `a framework artifact lives under <type>/framework/<framework>/` | File nằm thẳng trong `framework/`, thiếu thư mục framework |
| `the directory "x" is not a framework in catalog.yaml` | Thư mục dưới `framework/` không ứng với entry nào trong catalog |
| `duplicate <type> id "x" (a, b)` | Hai file sẽ sinh ra cùng một tên |
| `catalog.yaml: x conflicts with itself` | `conflicts_with` liệt kê chính id của nó |
| `catalog.yaml: x.requires references unknown technology "y"` | Tham chiếu treo trong graph |
