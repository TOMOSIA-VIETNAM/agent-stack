# Architecture (after docs.flutter.dev/app-architecture)

## Layers
- **UI layer** = View + ViewModel (Bloc/Cubit/Notifier). View: layout, animation, trivial show/hide. ViewModel: turns repository data into UI state, exposes commands; 1:1 with a screen-level view.
- **Data layer** = Repository + Service.
  - Repository: source of truth for one data type; caching, retry, refresh, DTO→domain mapping. Repositories do **not** depend on each other.
  - Service: stateless wrapper over one source (REST, platform API, file); returns `Future`/`Stream`.
- **Domain layer (optional)**: use-cases only when logic merges several repositories, is complex, or is shared by several ViewModels. Otherwise skip the boilerplate.

## Result pattern
```dart
sealed class Result<T> { const Result(); }
final class Ok<T> extends Result<T> { const Ok(this.value); final T value; }
final class Err<T> extends Result<T> { const Err(this.error, [this.stackTrace]); final Object error; final StackTrace? stackTrace; }
```
- Name it `Err`, not `Error` (shadows `dart:core`).
- Services catch and wrap. Repositories compose. State holders `switch` exhaustively:
```dart
switch (await repo.load()) {
  case Ok(:final value): emit(Loaded(value));
  case Err(:final error): emit(Failed(error));
}
```
- Use a typed failure (`sealed class AppFailure`) instead of raw `Object` once errors need UX mapping (offline, unauthorized, validation).

## Folder shape
```
lib/
  core/{network,di,theme,l10n,utils,router}
  features/<f>/{data/{dto,service,repository},domain?,ui/{page,widgets},state}
  main_<flavor>.dart
```

## Smells
View calling a service; Bloc constructing its repository; repository importing another repository; DTO used in widgets; `try/catch` in widgets; global singletons reached via static access in feature code.
