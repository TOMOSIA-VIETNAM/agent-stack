# Riverpod 3 reference (riverpod.dev/docs/whats_new)

Verify the current major on pub.dev before pinning (3.0.0 shipped 2025-09-10).

## Rules
- `@riverpod` generator + `riverpod_lint`; autoDispose is the default.
- `ref.watch` in `build`; `ref.read` in callbacks; `ref.listen` for side effects.
- After `await`: `if (!ref.mounted) return;` (use after dispose throws in v3).
- Notifiers are recreated on every rebuild of their provider; do not stash mutable fields expecting persistence.
- Update filtering uses `==`: always produce a new immutable state object.
- `AsyncValue.valueOrNull` removed → `.value`. `Ref` subclasses removed → use `Ref`.
- `StateProvider` / `StateNotifierProvider` / `ChangeNotifierProvider` → `package:riverpod/legacy.dart` (do not use in new code).
- `ProviderObserver` methods receive `ProviderObserverContext`.
- Automatic retry with backoff on failed provider init (v3). Configure/disable per provider when retry is wrong (e.g. 401).
- Experimental (APIs may change without major bump): mutations, offline persistence. Don't build on them without user sign-off.

## Shape
```dart
@riverpod
class Items extends _$Items {
  @override
  Future<List<Item>> build() => ref.watch(itemRepositoryProvider).fetch();

  Future<void> add(Item i) async {
    final repo = ref.read(itemRepositoryProvider);
    state = const AsyncLoading();
    final next = await AsyncValue.guard(() async { await repo.add(i); return repo.fetch(); });
    if (!ref.mounted) return;
    state = next;
  }
}
```

## Tests
```dart
final c = ProviderContainer(overrides: [itemRepositoryProvider.overrideWithValue(FakeItemRepo())]);
addTearDown(c.dispose);
expect(await c.read(itemsProvider.future), isNotEmpty);
```
Widget tests: wrap in `ProviderScope(overrides: [...])`.
