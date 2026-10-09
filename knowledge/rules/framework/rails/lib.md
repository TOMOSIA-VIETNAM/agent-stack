---
paths:
  - "lib/**/*.rb"
  - "lib/**/*.rake"
  - "config/initializers/core_ext.rb"
---

# Rails lib/, Monkey Patches and Rake Tasks

## lib/

- `lib/<name>/` holds code with no Rails dependency, grouped by concern (`jwt/`,
  `alarm/`). A client object exposes `.call(...)`.
- Home-grown model macros (`acts_as_*`) go in `lib/extensions/`.

## Monkey patches

- One place: `lib/core_ext/<class>/<feature>.rb` → `module CoreExt::<Class>::<Feature>`.
- Never reopen a class to define methods (`class String; def x`). Write a module and
  `include` or `prepend` it, so the patch has a name and a file.
- Exclude `lib/core_ext` from autoload (`config.autoload_lib(ignore: %w[assets tasks core_ext])`)
  and load it in one initializer that refuses to overwrite an existing method:
  ```ruby
  # frozen_string_literal: true

  Dir[Rails.root.join('lib/core_ext/**/*.rb')].each { |f| require f }

  {
    String => [CoreExt::String::Slug]
  }.each do |klass, mods|
    mods.each do |mod|
      clash = mod.instance_methods & klass.instance_methods
      raise "core_ext clash on #{klass}: #{clash.join(', ')}" if clash.any?

      klass.include(mod)
    end
  end
  ```

## Rake tasks

- `lib/tasks/<namespace>.rake` with `namespace :<namespace> do`. Every task has `desc`
  and depends on `:environment`.
- A task body longer than about 20 lines moves to a runner,
  `lib/task_runners/<namespace>/<name>_runner.rb`, whose only public method is
  `.call(...)`. The task parses its arguments and calls the runner:
  ```ruby
  desc 'Backfill article comment counters'
  task backfill_comment_counts: :environment do
    TaskRunners::Articles::BackfillCommentCountsRunner.call(batch_size: ENV.fetch('BATCH_SIZE', 1000).to_i)
  end
  ```
- ENV and task arguments are read only in the rake file and passed as keywords.
- A task that changes data processes in batches, logs progress, and is safe to run twice.
