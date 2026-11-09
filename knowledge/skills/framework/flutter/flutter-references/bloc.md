# BLoC reference (bloclibrary.dev)

- **Cubit first.** Promote to Bloc when you need an event log, replay/debug of causes, or transformers.
- **Equality.** Bloc drops a state equal to the current one. Use Equatable/freezed; list/map fields must be compared by value (Equatable `props` handles collections).
- **Transformers** (`bloc_concurrency`): `sequential` (default ordering), `concurrent`, `droppable` (ignore while busy: submit buttons), `restartable` (cancel previous: search, refresh). Debounce typing with `restartable` + `Future.delayed`/`rxdart` debounce.
- **Async gaps.** In Cubit after `await`: `if (isClosed) return;`. In Bloc use `emit.isDone` / `emit.forEach`/`onEach` for streams instead of manual subscriptions.
- **Streams.** Prefer `await emit.forEach(stream, onData: ...)` — lifecycle handled for you. Manual `StreamSubscription` must be cancelled in `close()`.
- **Errors.** `addError(e, st)` → `BlocObserver.onError`; map to a failure state for the UI.
- **UI.** `BlocBuilder` for build; `BlocListener` for side effects; `BlocConsumer` only when both are needed; `BlocSelector` / `buildWhen` to scope rebuilds; `context.read` in callbacks only.
- **Provision.** `BlocProvider(create:)` auto-closes; `BlocProvider.value` does not. Provide above the widgets that need it, no higher.
- **Test.**
```dart
blocTest<FooCubit, FooState>(
  'emits [loading, loaded] on success',
  build: () => FooCubit(fakeRepo),
  act: (c) => c.load(),
  expect: () => [const FooLoading(), const FooLoaded(items)],
  verify: (_) => expect(fakeRepo.calls, 1),
);
```
