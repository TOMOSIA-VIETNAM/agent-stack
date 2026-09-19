<!-- MEMO(image): logo lockup. Add ./docs/images/logo/logo-lockup.svg and logo-lockup-dark.svg (width ~400), then uncomment the block below. -->
<!--
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/images/logo/logo-lockup-dark.svg">
    <img src="./docs/images/logo/logo-lockup.svg" alt="agent-stack" width="400">
  </picture>
</p>
-->

<h1 align="center">agent-stack</h1>

<p align="center">
  <strong>Rule và skill AI cho dự án của bạn — được <em>chọn</em>, không phải được sinh ra.</strong><br>
  <strong>Mã nguồn mở. Tất định. Chạy offline.</strong><br>
  <sub>Plugin Claude Code dựng <code>CLAUDE.md</code> + <code>.claude/</code> từ một knowledge base có kiểm duyệt, quản lý bằng Git</sub><br>
  <code>/generate</code> · <code>/catalog</code>
</p>

<p align="center">
  <a href="https://github.com/TOMOSIA-VIETNAM/agent-stack/releases"><img alt="Release" src="https://img.shields.io/github/v/release/TOMOSIA-VIETNAM/agent-stack?style=flat-square&label=release&color=2ea44f"></a>
  <a href="./LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/github/license/TOMOSIA-VIETNAM/agent-stack?style=flat-square&color=blue"></a>
  <a href="#phát-triển"><img alt="Node 20+" src="https://img.shields.io/badge/Node-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white"></a>
  <a href="#cài-đặt"><img alt="Claude Code" src="https://img.shields.io/badge/Claude_Code-plugin-D97757?style=flat-square&logo=anthropic&logoColor=white"></a>
  <a href="#không-có-nội-dung-do-llm-viết"><img alt="No LLM-written content" src="https://img.shields.io/badge/rule%20content-0%25%20LLM-6E56CF?style=flat-square"></a>
</p>

<!-- MEMO(i18n): if README.en.md / README.ja-JP.md are added later, uncomment this language switcher.
<p align="center">
  <strong>Tiếng Việt</strong> · <a href="./README.en.md">English</a> · <a href="./README.ja-JP.md">日本語</a>
</p>
-->

Repository mới nào cũng bắt đầu giống nhau: ai đó copy `CLAUDE.md` từ dự án trước, xoá phần không còn đúng, rồi quên cập nhật phần còn lại. Sau một tháng, mỗi dự án mang một phương ngữ hơi sai lệch của cùng một bộ quy ước.

**`agent-stack` biến việc copy-paste đó thành một build step.** Bạn nêu framework dự án đang dùng; nó chọn đúng rule, skill và command từ knowledge base nằm trong Git, phân giải dependency, dừng lại khi có xung đột, rồi ghi kết quả vào dự án.

```
Chọn  →  Phân giải  →  Kết hợp  →  Kiểm tra
```

<!-- MEMO(image): terminal screenshot of `/generate rails` showing the resolved stack and the file preview. Save as ./docs/images/generate-demo.png (width ~680) and uncomment.
<p align="center">
  <img src="./docs/images/generate-demo.png" width="680" alt="A generate run: resolved stack, conflict prompt, and the file list written into the project">
</p>
-->

- **Nội dung không bao giờ do model viết** — rule đến từ file do con người review và commit
- **Cùng một framework luôn cho cùng một kết quả** — phân giải, chọn và kết hợp đều chạy bằng TypeScript
- **Xung đột làm dừng cả lần chạy** — generator nêu tên xung đột và cờ để bỏ qua; nó không tự chọn bên thắng
- **Chạy offline** — knowledge base đã được commit, nên lúc generate không đụng network
- **Không phá gì** — `CLAUDE.md` được merge trong cặp marker; chỉ file nằm trong manifest của lần chạy trước mới bị xoá

## Mục lục

- [Cài đặt](#cài-đặt)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Vì sao chọn lại hơn sinh](#vì-sao-chọn-lại-hơn-sinh)
- [Nó ghi ra những gì](#nó-ghi-ra-những-gì)
- [Command và agent](#command-và-agent)
- [Tham chiếu CLI](#tham-chiếu-cli)
- [Knowledge base](#knowledge-base)
- [Phạm vi hiện có](#phạm-vi-hiện-có)
- [Đóng góp: thêm một stack mới](#đóng-góp-thêm-một-stack-mới)
- [Phát triển](#phát-triển)
- [Giấy phép](#giấy-phép)

## Cài đặt

Cần [Node 20+](https://nodejs.org/) và [Claude Code](https://claude.ai/code).

```bash
/plugin marketplace add TOMOSIA-VIETNAM/agent-stack
/plugin install agent-stack@agent-stack
```

Repository này vừa là marketplace vừa là plugin. `dist/agent-stack.mjs` đã được commit, nên plugin chạy được trên bất kỳ máy nào có Node 20+ — không cần `npm install`, không cần build.

<details>
<summary>Cài từ bản clone local</summary>

```bash
git clone https://github.com/TOMOSIA-VIETNAM/agent-stack.git
```

```bash
/plugin marketplace add /path/to/agent-stack
/plugin install agent-stack@agent-stack
```

</details>

## Bắt đầu nhanh

Trong dự án bạn muốn cấu hình:

```
/generate ruby 3.3, rails 7.1, postgres, sidekiq, rspec
```

Command này ánh xạ yêu cầu của bạn sang id trong catalog, phân giải dependency, dừng lại hỏi khi có xung đột, xem trước danh sách file, rồi mới ghi.

Muốn biết knowledge base đang có gì trước khi chốt stack:

```
/catalog
```

## Vì sao chọn lại hơn sinh

Phần lớn công cụ "sinh rule AI cho tôi" đều nhờ một model viết rule. Kết quả đọc thì xuôi nhưng mỗi lần chạy lại lệch đi — khác câu chữ, khác mức độ nghiêm ngặt, và kèm những quy ước cả team chưa từng thống nhất.

| Rule do model viết | `agent-stack` |
| --- | --- |
| Cùng một stack, mỗi lần chạy ra văn bản khác nhau | Cùng framework vào, cùng file ra — giống tới từng byte |
| Rule nghe hợp lý nhưng chưa ai review | Mỗi dòng là một file đã commit, có tác giả và có diff |
| Hai lựa chọn xung khắc bị âm thầm hoà giải | Lần chạy **dừng lại**, nêu tên xung đột, in ra cờ bỏ qua |
| Muốn cải thiện một rule phải prompt lại, từng dự án một | Sửa file một lần; mọi dự án nhận được khi chạy lại |
| Cần gọi network và tốn token để scaffold | Generate là offline và miễn phí |

### Không có nội dung do LLM viết

<a name="không-có-nội-dung-do-llm-viết"></a>

Model trong vòng lặp chỉ có đúng hai việc: biến một câu tiếng người thành cờ CLI, và chuyển tiếp xung đột cho bạn. Ngoài ra nó không quyết định gì và không viết một dòng nội dung rule nào. Toàn bộ phần sau — mở rộng dependency, chọn artifact, kết hợp, kiểm tra — là TypeScript trong `src/`, có test nạp knowledge base thật.

## Nó ghi ra những gì

```
CLAUDE.md                        hướng dẫn chung và các @-import, nằm trong cặp marker agent-stack
.claude/rules/<tên>.md           mỗi rule được chọn một file, copy nguyên văn
.claude/skills/<tên>/SKILL.md    mỗi skill được chọn một thư mục, kèm file của nó
.claude/commands/<tên>.md        mỗi command được chọn một file
.claude/agent-stack-manifest.json       lần chạy này sinh ra gì, và copy từ đâu
```

`CLAUDE.md` giữ phần hướng dẫn chung dạng inline, rồi `@`-import các rule riêng cho stack. Nó được **merge chứ không bị thay thế**: chữ nằm ngoài cặp marker `agent-stack:begin` / `agent-stack:end` được giữ nguyên.

Khi chạy lại, file nào có trong manifest lần trước mà lần này không còn được chọn sẽ bị xoá — và ngoài ra không xoá gì khác. Mọi thứ ngoài manifest là của bạn.

## Command và agent

| Command | Làm gì |
| --- | --- |
| `/generate <stack>` | Phân giải stack, xem trước danh sách file, rồi ghi `CLAUDE.md` và `.claude/`. Gặp xung đột thì dừng và hỏi |
| `/catalog` | Liệt kê technology, rule, skill và command mà knowledge base đang phủ — và cả những chỗ còn trống |

Khi bạn chưa biết — hoặc chưa muốn gõ — stack của dự án, dùng agent:

| Agent | Làm gì |
| --- | --- |
| `detect` | Đọc manifest và lockfile của repo để tự suy ra stack, đưa bảng cho bạn duyệt, rồi chạy tiếp đúng luồng của `/generate` |

Khác biệt nằm ở **ai xác định stack**:

| | Đầu vào | Ai xác định framework |
| --- | --- | --- |
| `/generate rails` | Bạn gõ framework | Bạn |
| `detect` | Không cần gõ gì | Agent đọc repo và suy ra, bạn duyệt lại |

`detect` đọc `Gemfile.lock`, `composer.lock`, `composer.json`, và cấu trúc thư mục khi không có lockfile nào được commit. Nó chỉ đi tìm **một thứ**: framework. Ngôn ngữ, database, cache và hạ tầng không phải đầu vào và cũng không có trong catalog, nên đọc thêm về chúng chỉ là nhiễu.

Thứ nó tìm được gắn nhãn `found` (có tên trong manifest hoặc lockfile), `uncertain` (chỉ suy từ cấu trúc thư mục) hay `missing`. Không phải `found` thì phải hỏi lại bạn trước khi generate.

Việc chạy trong subagent có lý do: đọc cả chục file manifest là việc tản mát và ồn, kết quả đó không nên đổ vào context chính. Thứ trả về chỉ là framework bạn đã duyệt và báo cáo những gì đã sinh ra.

## Tham chiếu CLI

Plugin chỉ là lớp mỏng bọc một CLI mà bạn chạy trực tiếp được, trong CI hoặc bằng tay:

```bash
node dist/agent-stack.mjs catalog  [--json]
node dist/agent-stack.mjs resolve  --framework rails [--json]
node dist/agent-stack.mjs generate --framework rails --out . [--write]
```

**Đầu vào chỉ có một cờ** — `--framework <id>`, lặp lại được cho dự án nhiều framework:

```bash
node dist/agent-stack.mjs generate --framework rails --framework laravel --out .
```

Không có cờ cho ngôn ngữ, database, cache hay hạ tầng — và cũng không có entry nào cho chúng trong catalog. Không có cú pháp `@version`. Framework là thứ operator luôn biết chắc; mỗi cờ thêm vào là thêm một cơ hội để operator bỏ sót và rule biến mất mà không báo gì.

**Tuỳ chọn khác:**

| Cờ | Ý nghĩa |
| --- | --- |
| `--out <dir>` | Thư mục dự án đích (mặc định: thư mục hiện tại) |
| `--write` | Ghi file thật; không có cờ này thì chỉ xem trước |
| `--accept-conflict <id>` | Chấp nhận đúng một xung đột, theo id mà CLI in ra |
| `--knowledge <dir>` | Dùng knowledge base ở chỗ khác (mặc định: bản đi kèm) |
| `--json` | Xuất dạng máy đọc |

**Exit code:**

| Code | Ý nghĩa |
| --- | --- |
| `0` | Thành công |
| `2` | Có lỗi ở bước kiểm tra |
| `64` | Sai cách dùng |
| `65` | Technology không tồn tại |

Đầu ra `--json` là một hợp đồng ổn định — `commands/generate.md` parse nó, và CI của bạn cũng parse được.

## Knowledge base

`knowledge/` chính là sản phẩm.

```
knowledge/
├── catalog.yaml            đồ thị framework: requires / conflicts_with
├── upstream.yaml           nội dung import lấy từ đâu, ghim theo commit
├── rules/global/<tên>.md                 ra .claude/rules/<tên>.md
├── rules/framework/<fw>/<tên>.md         ra .claude/rules/<fw>-<tên>.md
├── skills/framework/<fw>/<tên>/SKILL.md  ra .claude/skills/<tên>/
├── commands/<tên>.md                     ra .claude/commands/<tên>.md
└── claude-md/<tên>.md                    inline vào CLAUDE.md, không sinh file riêng
```

**Đường dẫn là metadata, và file không bao giờ bị đụng tới.** agent-stack không đọc, không sửa, không dựng lại front matter — file sinh ra giống file trong `knowledge/` từng byte. Ngoại lệ duy nhất là `claude-md/`, được inline vào `CLAUDE.md` chứ không copy.

Bốn thứ đọc từ đường dẫn, và **không thứ gì** đọc từ trong file:

| Suy ra | Từ đâu |
| --- | --- |
| `type` | thư mục gốc — `rules/`, `skills/`, `commands/`, `claude-md/` |
| `layer` | segment 2, nếu là `global` hoặc `framework`; không thì `global` |
| `applies_to` | thư mục framework nằm dưới `framework/` |
| `id` | phần còn lại nối bằng `-`, bỏ `.md`. Skill thì lấy tên thư mục của chính nó |

Lồng sâu bao nhiêu cũng được dưới thư mục framework — `rails/db/indexes.md` ra `rails-db-indexes`.

Bốn loại nội dung, và phân biệt được chúng là quan trọng:

| Loại | Nó là gì | Nạp khi nào |
| --- | --- | --- |
| **Rule** | Một quy ước — *code phải viết thế nào* | Luôn ở trong context, qua `@`-import |
| **Skill** | Một quy trình — *làm việc X theo các bước nào* | Khi gặp đúng việc đó |
| **Command** | Thứ developer gõ ra | Khi được gọi |
| **Đoạn CLAUDE.md** | Hướng dẫn mọi dự án đều cần sẵn inline | Ngay từ token đầu tiên |

> `claude-md/` là loại **duy nhất** không copy thành file: nội dung nó được ghép vào chính `CLAUDE.md` của dự án. Vì đang chèn vào tài liệu của người khác, hai thứ bị bỏ — khối front matter ở đầu (nằm giữa file Markdown thì vô nghĩa) và tiêu đề `# ` của nó (nếu không dự án sẽ có hai h1).

> Nếu bạn đang viết các bước được đánh số thì đó là **skill**, không phải rule.

<!-- MEMO(image): a layer diagram — Layer 1 global / Layer 2 framework, with the resolver pulling a slice down each column. Save as ./docs/images/layers.svg (+ layers-dark.svg) and uncomment.
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/images/layers-dark.svg">
    <img src="./docs/images/layers.svg" width="760" alt="Three knowledge base layers: global, language, framework — a resolved stack selects a slice from each">
  </picture>
</p>
-->

## Phạm vi hiện có

**Layer 1 — global.** Copy từ hai dự án MIT tại commit được ghim trong `upstream.yaml`: 25 skill và 9 command từ [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), và bộ hướng dẫn hành vi từ [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills), được inline thẳng vào `CLAUDE.md` của mọi dự án. Tất cả đã commit ở đây, nên generate không cần network. `npm run sync` copy lại tại commit đã ghim — xem [Nội dung import](#nội-dung-import--đừng-đụng-vào).

**Layer 2 — tự viết trong repo này.** Ruby, Rails, Active Record, tất cả gate bằng `rails`.

**Catalog đúng hai entry: Rails và Laravel.** Không có gì khác, vì framework là thứ duy nhất chọn được. Laravel hiện chưa có nội dung nào, và validator báo nó là `uncovered-technology` chứ không làm hỏng lần chạy.

> [!NOTE]
> Một framework có trong catalog mà chưa có rule nào là **khoảng trống đã được ghi nhận, không phải bug**. Bổ sung nội dung cho nó là đóng góp có giá trị nhất — phần dưới đây hướng dẫn từng bước.

## Đóng góp: thêm một stack mới

Phần này đi hết một ví dụ chạy được thật: bổ sung nội dung Laravel. Laravel đã có sẵn trong catalog nhưng chưa có rule hay skill nào, nên hiện tại `/generate laravel` chỉ ra được layer global.

Phần này cho biết thứ tự làm và những chỗ dễ sai.

### Bước 0 — Chuẩn bị

```bash
npm install
npm run check     # typecheck + test + bundle; phải xanh trước khi bạn bắt đầu
```

### Bước 1 — Khai báo technology trong `catalog.yaml`

Laravel đã có sẵn, nên xem nó như bản mẫu:

```yaml
  laravel:
    name: Laravel
```

Chỉ có thế. Không có `kind`: mọi entry đều là framework, nên một trường luôn mang cùng một giá trị chỉ là nhiễu.

| Trường | Ý nghĩa |
| --- | --- |
| `name` | Bắt buộc. Tên cho người đọc |
| `aliases` | Tên khác mà người dùng có thể gõ, ví dụ `["lumen"]` |
| `requires` | Kéo vào **tự động, theo chiều lên**, đệ quy. Chưa entry nào cần, nhưng một framework dựng trên framework khác thì dùng tới |
| `conflicts_with` | Báo cáo, **không bao giờ tự hoà giải**. Lần chạy dừng lại và in ra cờ bỏ qua |
| `compatible_with` | Chỉ để tài liệu, không được kiểm tra |

> [!WARNING]
> **Mọi rule đều gate bằng framework.** Catalog không có `php`, `eloquent`, `pest` hay `postgresql`, nên không gate được bằng chúng — một `applies_to` trỏ tới thứ không có trong catalog sẽ bị lint chặn ngay. Rule Eloquent gate bằng `laravel`. Rule style PHP cũng gate bằng `laravel`. Lỗi "rule biến mất im lặng" này từng xảy ra thật với Active Record, và một lần nữa với RSpec.

> [!IMPORTANT]
> `applies_to` là phép **AND**, không có OR. Hôm nay mỗi ngôn ngữ chỉ có một framework nên không thành vấn đề. Ngày thêm framework Ruby thứ hai, một rule Ruby dùng chung cho cả hai sẽ **không** biểu diễn được bằng `applies_to` — `[rails, hanami]` nghĩa là phải có cả hai. Lúc đó hãy thêm lại layer ngôn ngữ thay vì copy file rule.

### Bước 2 — Viết rule

Rule là một quy ước: *code phải viết thế nào*. Luôn nằm trong context.

Tạo `knowledge/rules/framework/laravel.md`:

```markdown
---
name: Laravel Conventions
description: Quy ước phân tầng, controller và cấu hình cho ứng dụng Laravel.
type: rule
layer: framework
applies_to: [laravel]
tags: [laravel, architecture]
---

## Phân tầng

- Controller đọc request, gọi đúng một object, rồi trả response. Không chứa
  business logic, không orchestrate nhiều bước, không viết chuỗi query trực tiếp.
- Form Request giữ toàn bộ validation. Controller không gọi `$request->validate()`.

## Eloquent

- Eager-load quan hệ mà bạn sẽ render bằng `with()`. N+1 query trong list view là
  một defect, không phải chuyện style.
- Dùng `chunkById()` cho bất cứ tập dữ liệu nào có thể vượt vài nghìn dòng.
```

Đặt file ở `rules/framework/laravel/conventions.md` — thư mục `laravel/` vừa quyết định rule này áp dụng cho Laravel, vừa thành tiền tố tên đầu ra `.claude/rules/laravel-conventions.md`. Mọi segment phải là kebab-case thường, nếu không loader từ chối ngay và nói rõ file nào.

> [!IMPORTANT]
> **Không khai metadata của agent-stack trong file.** Không có trường nào để khai. Đường dẫn nói hết. Thứ gì bạn viết trong front matter sẽ được copy nguyên vào mọi dự án sinh ra — nên chỉ để lại thứ Claude cần đọc: `name` + `description` trong `SKILL.md`, `description` trong command, và không gì cả trong rule nếu bạn không cần.

Thứ tự `@`-import sắp theo alphabet của tên đầu ra. Muốn một rule nằm trên, đặt tên nó xếp trước.

`applies_to` là danh sách framework id, và là **phép AND**: mọi id đều phải có trong stack đã phân giải. Với catalog hai entry hiện tại, thực tế nó luôn là đúng một id.

> [!IMPORTANT]
> **Việc chọn không nhìn tới version.** Không có trường `versions`, và `--framework laravel@11` không phải cú pháp hợp lệ. Một rule áp dụng cho một technology, không phải cho một release của nó. Nội dung nào thật sự chỉ đúng từ một version nào đó thì viết điều kiện ngay trong thân rule, để người đọc thấy được — thay vì để nó biến mất âm thầm vì operator pin sai số.

### Bước 3 — Viết skill

Skill là một quy trình có các bước, chỉ nạp khi gặp đúng việc đó.

Tạo `knowledge/skills/framework/laravel-feature/SKILL.md`:

```markdown
---
name: laravel-feature
description: Thêm một feature end-to-end vào ứng dụng Laravel — route, Form Request, action, view và test. Dùng khi bắt đầu một màn hình hoặc endpoint mới.
type: skill
layer: framework
applies_to: [laravel]
tags: [laravel, feature, workflow]
---

Làm theo thứ tự. Mỗi bước chạy được trước khi sang bước sau.

1. Khai route trong `routes/web.php` hoặc `routes/api.php`, trỏ tới một
   controller đơn lẻ.
2. ...
```

Với skill, **tên thư mục của chính nó** là id — `skills/framework/laravel/laravel-feature/SKILL.md` ra `.claude/skills/laravel-feature/`, thư mục `laravel/` chỉ để gom nhóm. Tên skill là một không gian phẳng mà Claude khớp task vào, nên hãy viết tên framework vào chính tên skill. `description` là thứ Claude đọc để quyết định có nạp hay không — viết rõ **nó làm gì** *và* **khi nào dùng**.

Giữ `SKILL.md` dưới ~500 dòng. Tài liệu tham chiếu dài để ra file riêng trong cùng thư mục; mọi file khác trong thư mục đó được copy tự động.

`dependencies` kéo theo artifact khác bất kể stack có technology mà nó gate hay không: `laravel-feature` khai `dependencies: [laravel-conventions]` thì rule kia luôn được sinh ra cùng. Dùng nó khi hướng dẫn của bạn không đầy đủ nếu thiếu artifact kia.

### Bước 4 — Viết test

Mọi hành vi mới cần test; mọi bug fix cần một test fail trước khi sửa. `tests/pipeline.test.ts` nạp knowledge base thật, nên một thay đổi nội dung phá vỡ invariant sẽ làm suite đỏ.

Thêm vào `tests/pipeline.test.ts`:

```ts
it('selects the Laravel layer from the framework alone', async () => {
  const { selection, report } = await run('laravel');
  const ruleIds = selection.rules.map((entry) => entry.artifact.meta.id);
  expect(ruleIds).toContain('laravel-conventions');
  expect(selection.skills.map((entry) => entry.artifact.meta.id)).toContain('laravel-feature');
  expect(report.ok).toBe(true);
});
```

Có sẵn một test chặn đúng cái bẫy ở Bước 1 — `emits every Rails artifact from the framework alone`. Khi thêm stack mới, nên viết một bản tương tự: lọc mọi artifact có `applies_to` chứa `'laravel'` rồi khẳng định tất cả đều được chọn chỉ từ `--framework laravel`.

Lưu ý test `flags a technology the knowledge base does not cover yet` đang dùng chính PHP/Laravel làm ví dụ về khoảng trống. Khi bạn lấp khoảng trống đó, hãy đổi nó sang một technology khác còn trống.

### Bước 5 — Chạy thử bằng mắt

```bash
npm run check
npm run try -- --framework laravel
```

`npm run try` generate vào `.agent-stack-try/` (đã gitignore) để bạn đọc cây file thật thay vì đoán. Script seed sẵn một `CLAUDE.md` viết tay, nên mỗi lần chạy cũng chứng minh luôn rằng generator merge đúng block của nó mà không đụng chữ xung quanh.

```bash
npm run try -- --clean      # xoá thư mục thử
```

Mở `.agent-stack-try/` bằng Claude Code nếu muốn thấy rule và skill thực sự được nạp.

### Bước 6 — Mở PR

Checklist trước khi push:

- [ ] `npm run check` xanh (typecheck + test + bundle)
- [ ] Đã commit `dist/agent-stack.mjs` nếu có sửa gì trong `src/` — `npm run check` tự rebuild
- [ ] Có test mới cho hành vi mới, hoặc test fail-trước-khi-sửa cho bug fix
- [ ] Đã đọc output của `npm run try` bằng mắt, không chỉ tin test
- [ ] File nằm dưới đúng thư mục framework mà operator **thực sự gõ**
- [ ] Front matter không chứa metadata của agent-stack — nó sẽ bị copy vào dự án đích
- [ ] Không sửa hay thêm file nào nằm dưới đường dẫn mà `upstream.yaml` ánh xạ tới
- [ ] Commit theo Conventional Commits, tiêu đề ở thể mệnh lệnh, dưới 72 ký tự; phần body giải thích **vì sao**

Ví dụ commit:

```
feat(knowledge): add Laravel conventions and feature skill

Laravel resolved but generated nothing beyond the global layer. Gate both
artifacts on `laravel` so a plain `--framework laravel` run emits them.
```

### Những lỗi lint hay gặp

`npm run check` nạp knowledge base thật và fail sớm. Các thông báo bạn có thể gặp:

| Thông báo | Nguyên nhân |
| --- | --- |
| `global artifacts must not declare applies_to` | File trong `*/global/` mà có `applies_to` |
| `<layer> artifacts must declare applies_to` | File ngoài `global` mà thiếu `applies_to` |
| `the directory "x" is not a framework in catalog.yaml` | Thư mục dưới `framework/` không phải id trong catalog |
| `duplicate <type> id "x"` | Hai file cùng `type` cho ra cùng tên đầu ra |
| `"X_y" cannot be a filename under .claude/` | Một segment không phải kebab-case thường |
| `a framework artifact lives under <type>/framework/<framework>/` | Thiếu thư mục framework |
| `catalog.yaml: x conflicts with itself` | `conflicts_with` chứa chính nó |

### Nội dung import — đừng đụng vào

Layer global được copy từ repo khác và ghim theo SHA 40 ký tự.

- **Không sửa file nào nằm dưới đường dẫn mà `upstream.yaml` ánh xạ tới.** Lần sync sau sẽ ghi đè.
- **Cũng không tạo file mới ở đó.** Lần sync sau sẽ xoá.
- Dời pin là một commit cần review: `npm run sync -- --ref <sha>`, rồi đọc diff xem nó mang gì vào.

Thứ một file import thiếu — description, layer — được khai trong `upstream.yaml` hoặc suy ra từ đường dẫn, chứ không thêm vào file đã copy.

## Phát triển

```bash
npm install
npm run check      # typecheck + test + bundle — chạy trước mỗi lần push
npm run sync       # copy lại nội dung import tại commit đã ghim
npm run try        # generate vào .agent-stack-try/ để đọc kết quả thật
```

> [!IMPORTANT]
> `dist/agent-stack.mjs` được commit để plugin chạy mà không cần cài đặt gì. **Rebuild và commit nó cùng mọi thay đổi trong `src/`** — `npm run check` lo phần rebuild.

### Pipeline

Mỗi module một mối quan tâm. Sửa gì thì đặt vào đúng chỗ mối quan tâm đó đang sống:

| Module | Sở hữu |
| --- | --- |
| `catalog.ts` | Nạp knowledge base, suy ra metadata, lint |
| `upstream.ts` | Cái gì copy từ đâu, theo giấy phép nào |
| `resolver.ts` | Mở rộng đồ thị technology qua `requires`, báo cáo xung đột |
| `selector.ts` | Artifact nào áp dụng cho một stack đã phân giải |
| `composer.ts` | Dựng output trong bộ nhớ, merge block `CLAUDE.md` |
| `validator.ts` | Các phát hiện về tính đầy đủ và nhất quán |
| `emit.ts` | Module **duy nhất** được ghi hoặc xoá |
| `cli.ts` | Cờ dòng lệnh, output cho người và `--json` |

> [!CAUTION]
> `emit.ts` chỉ được xoá những đường dẫn có trong manifest của lần chạy trước. Không bao giờ nới rộng phạm vi đó. Mọi thứ ngoài manifest thuộc về người dùng.

### Hai invariant

Mọi thứ ở đây xoay quanh hai điều này. Thay đổi nào làm yếu một trong hai phải nói thẳng ra, không được lách qua:

1. **Việc chọn là tất định.** Phân giải, kiểm tra tương thích, kết hợp và kiểm tra đều chạy bằng TypeScript trong `src/`. Model chỉ ánh xạ yêu cầu sang cờ CLI và chuyển tiếp xung đột cho operator. Ngoài ra nó không quyết định gì và không viết nội dung.
2. **Xung đột không bao giờ được hoà giải âm thầm.** Khi hai technology được chọn bị khai là không tương thích, lần chạy dừng lại, nêu tên xung đột, và in ra cờ để bỏ qua. Generator không tự chọn bên thắng.

Điều thứ ba đúng với knowledge base: **generate là offline.** Một lần generate chỉ đọc repository này và ghi vào thư mục đích. Chỉ `npm run sync`, chạy có chủ đích, mới đụng network.

### Tài liệu liên quan

[CONTRIBUTING.md](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md) để báo lỗ hổng bảo mật riêng tư, không qua issue công khai.

## Giấy phép

[Apache-2.0](LICENSE) · Copyright 2026 TOMOSIA VIETNAM.

Nội dung trong `knowledge/` copy từ dự án khác giữ giấy phép riêng của nó; xem [NOTICE](NOTICE). Dự án được generate ghi lại phần ghi công trong `.claude/agent-stack-manifest.json`.

---

<!-- MEMO(image): small square mark for the footer. Add ./docs/images/logo/logo.svg (+ logo-dark.svg), width 44, then uncomment.
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/images/logo/logo-dark.svg">
    <img src="./docs/images/logo/logo.svg" alt="" width="44">
  </picture>
</p>
-->

<p align="center">
  <sub>Thực hiện bởi <a href="https://github.com/TOMOSIA-VIETNAM">TOMOSIA VIETNAM</a> · Xem thêm <a href="https://github.com/TOMOSIA-VIETNAM/open-pr">open-pr</a>, AI code review chạy thẳng trên PR của bạn</sub>
</p>
