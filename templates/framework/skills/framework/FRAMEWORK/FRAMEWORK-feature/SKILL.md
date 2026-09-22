---
name: your-framework-feature
description: Implement a new user-facing feature in a <Framework> application — route, controller, model, view, and tests — in the order that keeps the app deployable at every step. Use when adding or changing a screen, endpoint, or user-visible behaviour in a <Framework> codebase.
argument-hint: <feature-or-issue>
---

<!-- TEMPLATE: xoá khối này trước khi commit, và thay hết placeholder `<…>`.
     Skill = quy trình có các bước, chỉ nạp khi gặp việc.
     `name` phải khớp tên thư mục. `description` là thứ Claude đối chiếu với
     task — nói nó làm gì VÀ khi nào dùng, nếu không skill không bao giờ được
     tự gọi. `argument-hint` hiện lúc autocomplete; không nhận tham số thì xoá.

     Tuỳ chọn, thêm khi đúng:
       disable-model-invocation: true   chỉ người gõ `/name` mới gọi được
       user-invocable: false            ẩn khỏi menu `/`, Claude vẫn tự gọi
       allowed-tools: Read Grep         tool không cần hỏi quyền trong turn đó
       when_to_use                      thêm trigger phrase cho `description`
     Id skill = tên thư mục của chính nó, một namespace phẳng: tự viết framework
     vào tên (`django-feature`). Trùng tên là lỗi lúc load.
     Dùng được `$ARGUMENTS`, !`<shell command>`, `${CLAUDE_SKILL_DIR}`.
     Giữ dưới ~500 dòng; file cạnh SKILL.md được copy theo.
-->

Work through the steps in order. Do not skip ahead to code.

## 1. Locate before you build

The feature to build is `$ARGUMENTS`.

- Read …

State what you found before writing anything. If the behaviour already exists, extend it
instead of adding a parallel path.

## 2. Build it in a deployable order

1. …

## 3. Test it

- Run `…`.

Use checklist.md in this skill directory before you report the work done.

## 4. Report

Say which files changed, which tests were run and their result, and what you left out.
