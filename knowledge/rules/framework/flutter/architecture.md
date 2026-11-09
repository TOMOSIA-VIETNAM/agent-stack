---
paths:
  - "lib/**"
---

# Architecture

- Feature-first: `lib/features/<feature>/{data,domain,ui}`; shared code in `lib/core/` (theme, l10n, network, di, utils). `domain/` only when it earns its place (see core rule 1).
- Dependency direction: `ui → state → repository → service`. Never upward, never sideways between repositories. Features do not reach into each other's internals; cross-feature use goes only through the other feature's public barrel.
- Each feature exposes one public barrel (`<feature>.dart`); other features import only that.
- Naming: `*_repository.dart`, `*_service.dart`, `*_bloc.dart` / `*_cubit.dart` / `*_notifier.dart` / `*_view_model.dart`, `*_page.dart` (route target), `*_view.dart` / `*_widget.dart`.
- One responsibility per class. Logic used in 2+ places moves to `core/` or a repository/mapper.
- Navigation via a single router config (go_router). Routes are typed or constants; redirect guards read auth state and use `refreshListenable`. No `Navigator.push` with inline widgets in feature code.
- Platform/plugin calls are wrapped in a service interface so they can be faked in tests.
