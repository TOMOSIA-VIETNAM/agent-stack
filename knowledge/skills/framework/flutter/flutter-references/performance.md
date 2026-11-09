# Performance reference

Measure first: run in **profile** mode, DevTools Performance + Widget rebuild tracking. Never optimize from guesses.

- Rebuild scope: split widgets, `const`, `BlocSelector` / `ref.watch(provider.select(...))`, keep `setState` low in the tree.
- Lists: `ListView.builder`/`SliverList`, `itemExtent`/`prototypeItem` when uniform, stable keys, no `shrinkWrap` in large lists.
- Images: right-sized assets, `cacheWidth/Height`, cached network image with placeholder/error, precache hero images.
- `build` must be cheap and pure: no sorting/filtering/regex/JSON in build.
- Heavy CPU (large JSON, image processing): `Isolate.run` / `compute`.
- `RepaintBoundary` around frequently-animating subtrees only after profiling shows repaint cost. Avoid `Opacity` on large animated trees (use `FadeTransition`/`AnimatedOpacity`).
- Avoid `saveLayer` triggers (clip + opacity combos) in scrolling content.
- Startup: defer non-critical init after first frame; lazy-register DI singletons.
- Impeller is the default renderer on current Flutter; shader jank guidance from Skia era mostly no longer applies — check release notes for your target.
- Memory: dispose controllers, cancel streams, avoid retaining `BuildContext` in long-lived objects.
