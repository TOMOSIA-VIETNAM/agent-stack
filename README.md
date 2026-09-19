<!-- MEMO(image): logo lockup. Add ./docs/images/logo/logo-lockup.svg and logo-lockup-dark.svg (width ~400), then uncomment the block below. -->
<!--
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/images/logo/logo-lockup-dark.svg">
    <img src="./docs/images/logo/logo-lockup.svg" alt="open-aidd" width="400">
  </picture>
</p>
-->

<h1 align="center">open-aidd</h1>

<p align="center">
  <strong>Rule và skill AI cho dự án của bạn — được <em>chọn</em>, không phải được sinh ra.</strong><br>
  <strong>Mã nguồn mở. Tất định. Chạy offline.</strong><br>
  <sub>Plugin Claude Code dựng <code>CLAUDE.md</code> + <code>.claude/</code> từ một knowledge base có kiểm duyệt, quản lý bằng Git</sub><br>
  <code>/generate</code> · <code>/catalog</code>
</p>

<p align="center">
  <a href="https://github.com/TOMOSIA-VIETNAM/open-aidd/releases"><img alt="Release" src="https://img.shields.io/github/v/release/TOMOSIA-VIETNAM/open-aidd?style=flat-square&label=release&color=2ea44f"></a>
  <a href="./LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/github/license/TOMOSIA-VIETNAM/open-aidd?style=flat-square&color=blue"></a>
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

**`open-aidd` biến việc copy-paste đó thành một build step.** Bạn khai tech stack; nó chọn đúng rule, skill và command từ knowledge base nằm trong Git, phân giải dependency, dừng lại khi có xung đột, rồi ghi kết quả vào dự án.

```
Chọn  →  Phân giải  →  Kết hợp  →  Kiểm tra
```

<!-- MEMO(image): terminal screenshot of `/generate ruby 3.3, rails 7.1, postgres, rspec` showing the conflict prompt and the file preview. Save as ./docs/images/generate-demo.png (width ~680) and uncomment.
<p align="center">
  <img src="./docs/images/generate-demo.png" width="680" alt="A generate run: resolved stack, conflict prompt, and the file list written into the project">
</p>
-->

- **Nội dung không bao giờ do model viết** — rule đến từ file do con người review và commit
- **Cùng một stack luôn cho cùng một kết quả** — phân giải, so khớp version và kết hợp đều chạy bằng TypeScript
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
/plugin marketplace add TOMOSIA-VIETNAM/open-aidd
/plugin install open-aidd@open-aidd
```

Repository này vừa là marketplace vừa là plugin. `dist/aidd.mjs` đã được commit, nên plugin chạy được trên bất kỳ máy nào có Node 20+ — không cần `npm install`, không cần build.

<details>
<summary>Cài từ bản clone local</summary>

```bash
git clone https://github.com/TOMOSIA-VIETNAM/open-aidd.git
```

```bash
/plugin marketplace add /path/to/open-aidd
/plugin install open-aidd@open-aidd
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

| Rule do model viết | `open-aidd` |
| --- | --- |
| Cùng một stack, mỗi lần chạy ra văn bản khác nhau | Cùng stack vào, cùng file ra — giống tới từng byte |
| Rule nghe hợp lý nhưng chưa ai review | Mỗi dòng là một file đã commit, có tác giả và có diff |
| Hai lựa chọn xung khắc bị âm thầm hoà giải | Lần chạy **dừng lại**, nêu tên xung đột, in ra cờ bỏ qua |
| Muốn cải thiện một rule phải prompt lại, từng dự án một | Sửa file một lần; mọi dự án nhận được khi chạy lại |
| Cần gọi network và tốn token để scaffold | Generate là offline và miễn phí |

### Không có nội dung do LLM viết

<a name="không-có-nội-dung-do-llm-viết"></a>

Model trong vòng lặp chỉ có đúng hai việc: biến một câu tiếng người thành cờ CLI, và chuyển tiếp xung đột cho bạn. Ngoài ra nó không quyết định gì và không viết một dòng nội dung rule nào. Toàn bộ phần sau — mở rộng dependency, so khớp version range, chọn artifact, kết hợp, kiểm tra — là TypeScript trong `src/`, có test nạp knowledge base thật.

## Nó ghi ra những gì

```
CLAUDE.md                        hướng dẫn chung và các @-import, nằm trong cặp marker aidd
.claude/rules/NN-<id>.md         mỗi rule được chọn một file, sắp theo priority
.claude/skills/<id>/SKILL.md     mỗi skill được chọn một thư mục, kèm file của nó
.claude/commands/<id>.md         mỗi command được chọn một file
.claude/aidd-manifest.json       lần chạy này sinh ra gì, và copy từ đâu
```

`CLAUDE.md` giữ phần hướng dẫn chung dạng inline, rồi `@`-import các rule riêng cho stack. Nó được **merge chứ không bị thay thế**: chữ nằm ngoài cặp marker `aidd:begin` / `aidd:end` được giữ nguyên.

Khi chạy lại, file nào có trong manifest lần trước mà lần này không còn được chọn sẽ bị xoá — và ngoài ra không xoá gì khác. Mọi thứ ngoài manifest là của bạn.

## Command và agent

| Command | Làm gì |
| --- | --- |
| `/generate <stack>` | Phân giải stack, xem trước danh sách file, rồi ghi `CLAUDE.md` và `.claude/`. Gặp xung đột thì dừng và hỏi |
| `/catalog` | Liệt kê technology, rule, skill và command mà knowledge base đang phủ — và cả những chỗ còn trống |

Khi bạn chưa biết — hoặc chưa muốn gõ — stack của dự án, dùng agent:

| Agent | Làm gì |
| --- | --- |
| `agent-stack` | Đọc manifest và lockfile của repo để tự suy ra stack, đưa bảng cho bạn duyệt, rồi chạy tiếp đúng luồng của `/generate` |

Khác biệt nằm ở **ai xác định stack**:

| | Đầu vào | Ai xác định stack |
| --- | --- | --- |
| `/generate ruby 3.3, rails 7.1` | Bạn gõ stack | Bạn |
| `agent-stack` | Không cần gõ gì | Agent đọc repo và suy ra, bạn duyệt lại |

`agent-stack` đọc `Gemfile.lock`, `composer.lock`, `package.json`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `config/database.yml`. Nó lấy version đã resolve trong lockfile chứ không lấy khoảng version trong manifest — `Gemfile` ghi `~> 7.1` là một khoảng, `Gemfile.lock` ghi `rails (7.1.3.2)` mới là thứ đang chạy.

Mỗi dòng nó tìm được đều gắn nhãn `found` (đọc từ lockfile), `uncertain` (suy từ tín hiệu yếu) hay `missing`. Mọi dòng không phải `found` đều phải hỏi lại bạn trước khi generate. Hai thứ nó **không bao giờ tự suy**: kiến trúc (`monolith` / `microservices`) vì không file nào nói ra điều đó, và hạ tầng (`aws`, `ecs`, `rds`) trừ khi có config deploy nêu đích danh.

Việc chạy trong subagent có lý do: đọc cả chục file manifest là việc tản mát và ồn, kết quả đó không nên đổ vào context chính. Thứ trả về chỉ là stack bạn đã duyệt và báo cáo những gì đã sinh ra.

## Tham chiếu CLI

Plugin chỉ là lớp mỏng bọc một CLI mà bạn chạy trực tiếp được, trong CI hoặc bằng tay:

```bash
node dist/aidd.mjs catalog  [--json]
node dist/aidd.mjs resolve  --language ruby@3.3 --framework rails@7.1 [--json]
node dist/aidd.mjs generate --language ruby@3.3 --framework rails@7.1 --out . [--write]
```

**Các slot của stack** — mỗi cờ lặp lại được, nhận `tech` hoặc `tech@version`:

`--language` · `--framework` · `--frontend` · `--database` · `--cache` · `--testing` · `--infrastructure` · `--architecture` · `--library`

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

`knowledge/` chính là sản phẩm. Xem [knowledge/README.md](knowledge/README.md) để biết schema metadata và cách thêm rule, skill hay technology.

```
knowledge/
├── catalog.yaml            đồ thị technology: requires / conflicts_with / versions
├── upstream.yaml           nội dung import lấy từ đâu, ghim theo commit
├── rules/<layer>/<id>.md
├── skills/<layer>/<id>/SKILL.md
├── commands/<id>.md
└── claude-md/<id>.md       nội dung inline vào CLAUDE.md, không sinh ra file riêng
```

**Thư mục quyết định layer** (`global`, `language`, `framework`); tên file hoặc tên thư mục quyết định id.

Bốn loại nội dung, và phân biệt được chúng là quan trọng:

| Loại | Nó là gì | Nạp khi nào |
| --- | --- | --- |
| **Rule** | Một quy ước — *code phải viết thế nào* | Luôn ở trong context, qua `@`-import |
| **Skill** | Một quy trình — *làm việc X theo các bước nào* | Khi gặp đúng việc đó |
| **Command** | Thứ developer gõ ra | Khi được gọi |
| **Đoạn CLAUDE.md** | Hướng dẫn mọi dự án đều cần sẵn inline | Ngay từ token đầu tiên |

> Nếu bạn đang viết các bước được đánh số thì đó là **skill**, không phải rule.

<!-- MEMO(image): a layer diagram — Layer 1 global / Layer 2 language / Layer 3 framework, with the resolver pulling a slice down each column. Save as ./docs/images/layers.svg (+ layers-dark.svg) and uncomment.
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/images/layers-dark.svg">
    <img src="./docs/images/layers.svg" width="760" alt="Three knowledge base layers: global, language, framework — a resolved stack selects a slice from each">
  </picture>
</p>
-->

## Phạm vi hiện có

**Layer 1 — global.** Copy từ hai dự án MIT tại commit được ghim trong `upstream.yaml`: 25 skill và 9 command từ [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), và bộ hướng dẫn hành vi từ [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills), được inline thẳng vào `CLAUDE.md` của mọi dự án. Tất cả đã commit ở đây, nên generate không cần network. `npm run sync` copy lại tại commit đã ghim — xem [knowledge/README.md](knowledge/README.md#imported-content).

**Layer 2 và 3 — tự viết trong repo này.** Ruby, Rails, Active Record, RSpec.

**Đồ thị technology** phủ 20 technology trên chín slot — Ruby, PHP, Node, Rails, Laravel, NestJS, Sidekiq, Stimulus, React, PostgreSQL, MySQL, Redis, RSpec, Minitest, Docker, AWS, ECS, RDS, monolith, microservices. Tất cả đều phân giải và kiểm tra xung đột đúng; những cái chưa có nội dung được validator báo là `uncovered-technology` chứ không làm hỏng lần chạy.

> [!NOTE]
> Một technology có trong catalog mà chưa có rule nào là **khoảng trống đã được ghi nhận, không phải bug**. Bổ sung nội dung cho nó là đóng góp có giá trị nhất — phần dưới đây hướng dẫn từng bước.

## Đóng góp: thêm một stack mới

Phần này đi hết một ví dụ chạy được thật: bổ sung nội dung Laravel. Laravel đã có sẵn trong catalog nhưng chưa có rule hay skill nào, nên hiện tại `/generate php 8.3, laravel 11` chỉ ra được layer global.

Đọc [knowledge/README.md](knowledge/README.md) trước — nó là nguồn chuẩn cho các trường metadata. Phần này cho biết thứ tự làm và những chỗ dễ sai.

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
    kind: framework
    requires: [php]
    compatible_with: [postgresql, mysql, redis, docker]
    supported_versions: ">=10 <13"
```

| Trường | Ý nghĩa |
| --- | --- |
| `kind` | Quyết định slot CLI. `framework` → `--framework laravel@11` |
| `aliases` | Tên khác mà người dùng có thể gõ, ví dụ `["lumen"]` |
| `requires` | Kéo vào **tự động, theo chiều lên**. `laravel` kéo `php` |
| `conflicts_with` | Báo cáo, **không bao giờ tự hoà giải**. Lần chạy dừng lại |
| `compatible_with` | Chỉ để tài liệu, không được kiểm tra |
| `supported_versions` | Khoảng version mà repo này thực sự có nội dung |

Nếu stack của bạn cần một technology chưa tồn tại — ví dụ Pest, test framework của PHP — thì thêm mới. Pest và PHPUnit loại trừ nhau, nên khai `conflicts_with` để operator buộc phải chọn:

```yaml
  pest:
    name: Pest
    kind: testing
    requires: [php]
    conflicts_with: [phpunit]
    supported_versions: ">=2 <4"

  phpunit:
    name: PHPUnit
    kind: testing
    requires: [php]
    conflicts_with: [pest]
    supported_versions: ">=10 <12"
```

> [!WARNING]
> **`requires` chỉ chạy theo một chiều: lên trên.** `laravel requires php` nghĩa là chọn Laravel sẽ kéo PHP vào — **không** phải ngược lại. Đừng tạo một technology con kiểu `eloquent` rồi gate rule Eloquent bằng nó: operator không có lý do gì để gõ `--library eloquent`, và toàn bộ rule Eloquent sẽ biến mất khỏi một stack Laravel bình thường mà không báo gì. Eloquent đi kèm Laravel, nên rule của nó phải gate bằng `tech: laravel`. Lỗi này từng xảy ra thật với Active Record.

Nguyên tắc rút gọn:

- Thứ **luôn đi kèm** framework (Eloquent, Blade, Artisan) → **không** tạo technology riêng; gate bằng `tech: laravel`.
- Thứ **thay thế lẫn nhau hoặc là lựa chọn** (Pest vs PHPUnit, Livewire vs Inertia) → technology riêng, có `conflicts_with`, để operator tự chọn.

### Bước 2 — Viết rule

Rule là một quy ước: *code phải viết thế nào*. Luôn nằm trong context.

Tạo `knowledge/rules/framework/laravel.md`:

```markdown
---
id: laravel-conventions
name: Laravel Conventions
description: Quy ước phân tầng, controller và cấu hình cho ứng dụng Laravel.
type: rule
layer: framework
priority: 40
applies_to:
  - tech: laravel
    versions: ">=10 <13"
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

**Thư mục quyết định layer**, nên file phải nằm trong `rules/framework/`. Tên file không quyết định gì cả — `id` trong front matter mới là thứ thành tên file đầu ra (`.claude/rules/40-laravel-conventions.md`).

Các trường bắt buộc:

| Trường | Ghi chú |
| --- | --- |
| `id` | Duy nhất theo từng `type`, kebab-case |
| `name` | Tiêu đề cho người đọc. Với skill, dùng chính id kebab-case vì Claude nhìn thấy nó |
| `description` | Một dòng. Với skill, đây là thứ Claude dùng để khớp task |
| `type` | `rule`, `skill`, `command`, hoặc `claude-md` |
| `layer` | Phải khớp thư mục, nếu không lint sẽ báo lỗi |
| `priority` | 0–999. Mặc định theo layer: global 20, language 30, framework 40 |
| `applies_to` | Bắt buộc khi `layer` khác `global`; **cấm** khai khi là `global` |

`applies_to` là **phép AND**: mọi mục đều phải khớp. Muốn một rule chỉ áp dụng cho Laravel *và* PostgreSQL thì khai cả hai:

```yaml
applies_to:
  - tech: laravel
  - tech: postgresql
```

Cú pháp version range:

| Range | Khớp |
| --- | --- |
| `*` hoặc bỏ trống | mọi version |
| `11` | `>=11.0.0 <12.0.0` |
| `11.x` | `>=11.0.0 <12.0.0` |
| `>=10 <13` | nhiều comparator, tất cả phải đúng |
| `^10.1` / `~10.1` | `>=10.1 <11` / `>=10.1 <10.2` |
| `10 - 12.x` | bao gồm hai đầu |

> [!IMPORTANT]
> `applies_to` **có** `versions` sẽ không bao giờ khớp nếu operator không pin version. Validator báo lỗi `missing-version` và hỏi lại, chứ không đoán. Đây là chủ ý — nhưng nghĩa là nếu bạn gắn `versions` thì `/generate laravel` (không có số) sẽ **không** ra rule của bạn. Chỉ gắn `versions` khi nội dung thật sự phụ thuộc version.

### Bước 3 — Viết skill

Skill là một quy trình có các bước, chỉ nạp khi gặp đúng việc đó.

Tạo `knowledge/skills/framework/laravel-feature/SKILL.md`:

```markdown
---
id: laravel-feature
name: laravel-feature
description: Thêm một feature end-to-end vào ứng dụng Laravel — route, Form Request, action, view và test. Dùng khi bắt đầu một màn hình hoặc endpoint mới.
type: skill
layer: framework
priority: 41
applies_to:
  - tech: laravel
    versions: ">=10 <13"
tags: [laravel, feature, workflow]
---

Làm theo thứ tự. Mỗi bước chạy được trước khi sang bước sau.

1. Khai route trong `routes/web.php` hoặc `routes/api.php`, trỏ tới một
   controller đơn lẻ.
2. ...
```

Với skill, `description` là thứ Claude đọc để quyết định có nạp hay không — viết rõ **nó làm gì** *và* **khi nào dùng**. `name` nên trùng id kebab-case.

Giữ `SKILL.md` dưới ~500 dòng. Tài liệu tham chiếu dài để ra file riêng trong cùng thư mục; mọi file khác trong thư mục đó được copy tự động.

> [!WARNING]
> **`dependencies` không vượt qua được version gate.** Nếu `laravel-feature` khai `dependencies: [laravel-conventions]` mà hai artifact có `versions` khác nhau, cái bị loại vì lệch version sẽ **không** được kéo vào — nó được báo là `unmet-dependency`. Hãy cho dependency và artifact phụ thuộc nó **cùng một range**.

### Bước 4 — Viết test

Mọi hành vi mới cần test; mọi bug fix cần một test fail trước khi sửa. `tests/pipeline.test.ts` nạp knowledge base thật, nên một thay đổi nội dung phá vỡ invariant sẽ làm suite đỏ.

Thêm vào `tests/pipeline.test.ts`:

```ts
it('selects the Laravel layer for a PHP stack', async () => {
  const { selection, report } = await run({
    language: [{ tech: 'php', version: '8.3' }],
    framework: [{ tech: 'laravel', version: '11' }],
  });
  const ruleIds = selection.rules.map((entry) => entry.artifact.meta.id);
  expect(ruleIds).toContain('laravel-conventions');
  expect(selection.skills.map((entry) => entry.artifact.meta.id)).toContain('laravel-feature');
  expect(report.ok).toBe(true);
});
```

Có sẵn một test chặn đúng cái bẫy ở Bước 1 — `emits every Rails artifact from the framework alone`. Khi thêm stack mới, nên viết một bản tương tự: lọc mọi artifact có `applies_to.tech === 'laravel'` rồi khẳng định tất cả đều được chọn chỉ từ `--framework laravel`.

Lưu ý test `flags a technology the knowledge base does not cover yet` đang dùng chính PHP/Laravel làm ví dụ về khoảng trống. Khi bạn lấp khoảng trống đó, hãy đổi nó sang một technology khác còn trống.

### Bước 5 — Chạy thử bằng mắt

```bash
npm run check
npm run try -- --language php@8.3 --framework laravel@11
```

`npm run try` generate vào `.aidd-try/` (đã gitignore) để bạn đọc cây file thật thay vì đoán. Script seed sẵn một `CLAUDE.md` viết tay, nên mỗi lần chạy cũng chứng minh luôn rằng generator merge đúng block của nó mà không đụng chữ xung quanh.

```bash
npm run try -- --clean      # xoá thư mục thử
```

Mở `.aidd-try/` bằng Claude Code nếu muốn thấy rule và skill thực sự được nạp.

### Bước 6 — Mở PR

Checklist trước khi push:

- [ ] `npm run check` xanh (typecheck + test + bundle)
- [ ] Đã commit `dist/aidd.mjs` nếu có sửa gì trong `src/` — `npm run check` tự rebuild
- [ ] Có test mới cho hành vi mới, hoặc test fail-trước-khi-sửa cho bug fix
- [ ] Đã đọc output của `npm run try` bằng mắt, không chỉ tin test
- [ ] `applies_to` gate bằng technology mà operator **thực sự gõ**, không phải technology con
- [ ] Không sửa hay thêm file nào nằm dưới đường dẫn mà `upstream.yaml` ánh xạ tới
- [ ] Commit theo Conventional Commits, tiêu đề ở thể mệnh lệnh, dưới 72 ký tự; phần body giải thích **vì sao**

Ví dụ commit:

```
feat(knowledge): add Laravel conventions and feature skill

Laravel resolved but generated nothing beyond the global layer. Gate both
artifacts on `tech: laravel` so a plain `--framework laravel` run emits them.
```

### Những lỗi lint hay gặp

`npm run check` nạp knowledge base thật và fail sớm. Các thông báo bạn có thể gặp:

| Thông báo | Nguyên nhân |
| --- | --- |
| `global artifacts must not declare applies_to` | File trong `*/global/` mà có `applies_to` |
| `<layer> artifacts must declare applies_to` | File ngoài `global` mà thiếu `applies_to` |
| `applies_to references unknown technology "x"` | Chưa thêm `x` vào `catalog.yaml` |
| `dependency "x" is not a known artifact` | `dependencies` trỏ tới `id` không tồn tại |
| `duplicate <type> id "x"` | Hai file cùng `type` trùng `id` |
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
npm run try        # generate vào .aidd-try/ để đọc kết quả thật
```

> [!IMPORTANT]
> `dist/aidd.mjs` được commit để plugin chạy mà không cần cài đặt gì. **Rebuild và commit nó cùng mọi thay đổi trong `src/`** — `npm run check` lo phần rebuild.

### Pipeline

Mỗi module một mối quan tâm. Sửa gì thì đặt vào đúng chỗ mối quan tâm đó đang sống:

| Module | Sở hữu |
| --- | --- |
| `catalog.ts` | Nạp knowledge base, suy ra metadata, lint |
| `upstream.ts` | Cái gì copy từ đâu, theo giấy phép nào |
| `resolver.ts` | Mở rộng đồ thị technology qua `requires`, báo cáo xung đột |
| `selector.ts` | Artifact nào áp dụng cho một stack đã phân giải |
| `version.ts` | So khớp version range |
| `composer.ts` | Dựng output trong bộ nhớ, merge block `CLAUDE.md` |
| `validator.ts` | Các phát hiện về tính đầy đủ và nhất quán |
| `emit.ts` | Module **duy nhất** được ghi hoặc xoá |
| `cli.ts` | Cờ dòng lệnh, output cho người và `--json` |

> [!CAUTION]
> `emit.ts` chỉ được xoá những đường dẫn có trong manifest của lần chạy trước. Không bao giờ nới rộng phạm vi đó. Mọi thứ ngoài manifest thuộc về người dùng.

### Hai invariant

Mọi thứ ở đây xoay quanh hai điều này. Thay đổi nào làm yếu một trong hai phải nói thẳng ra, không được lách qua:

1. **Việc chọn là tất định.** Phân giải, kiểm tra tương thích, so khớp version, kết hợp và kiểm tra đều chạy bằng TypeScript trong `src/`. Model chỉ ánh xạ yêu cầu sang cờ CLI và chuyển tiếp xung đột cho operator. Ngoài ra nó không quyết định gì và không viết nội dung.
2. **Xung đột không bao giờ được hoà giải âm thầm.** Khi hai technology được chọn bị khai là không tương thích, lần chạy dừng lại, nêu tên xung đột, và in ra cờ để bỏ qua. Generator không tự chọn bên thắng.

Điều thứ ba đúng với knowledge base: **generate là offline.** Một lần generate chỉ đọc repository này và ghi vào thư mục đích. Chỉ `npm run sync`, chạy có chủ đích, mới đụng network.

### Tài liệu liên quan

[CONTRIBUTING.md](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md) để báo lỗ hổng bảo mật riêng tư, không qua issue công khai.

## Giấy phép

[Apache-2.0](LICENSE) · Copyright 2026 TOMOSIA VIETNAM.

Nội dung trong `knowledge/` copy từ dự án khác giữ giấy phép riêng của nó; xem [NOTICE](NOTICE). Dự án được generate ghi lại phần ghi công trong `.claude/aidd-manifest.json`.

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
