# Browser Mode

Depth on running tests in a real browser: the provider packages, locators, visual regression, and the limits the browser
imposes on mocking.

Browser mode became stable in Vitest 4. It runs tests in an actual browser rather than a DOM emulation, which removes
the class of bug where `jsdom` and the browser disagree about layout, focus, pointer events or CSS.

## Packages and provider

Vitest 4 split the browser runtime into per-provider packages, and dropped the `@vitest/browser` package.

- **`@vitest/browser-playwright`** — `chromium`, `firefox`, `webkit`. Runs instances in parallel. The default choice.
- **`@vitest/browser-webdriverio`** — `chrome`, `firefox`, `edge`, `safari`, over the WebDriver protocol.
- **`@vitest/browser-preview`** — no automation, simulated events, no headless mode. For looking at tests locally, not
  for CI.

`browser.provider` takes a factory, not a string, since Vitest 4. The factory's option names follow Playwright's own
naming, and launch options moved from the instance up into the factory.

```ts
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright({ launchOptions: { slowMo: 100 } }),
      instances: [{ browser: 'chromium' }], // at least one is required
      headless: true,
    },
  },
})
```

Context imports moved too: `page`, `userEvent`, `commands` and `utils` come from `vitest/browser`, not
`@vitest/browser/context`. That specifier and `@vitest/browser/utils` still resolve at runtime in Vitest 4.1 and are
slated for removal.

`vitest init browser` writes the config and installs the packages.

`--browser=<name>` on the CLI fails unless the config already has a `browser` block — since Vitest 3.2, Vitest will not
assume a Node config was meant for the browser. Dot notation reaches nested options: `--browser.headless`.

Headless mode needs `playwright` or `webdriverio`; `preview` cannot do it. Vitest serves on port `63315` so a dev server
can run beside it, and prints the URL when `b` is pressed in watch mode.

Supported browsers follow Vite's dev server plus `BroadcastChannel`: Chrome 87, Firefox 78, Safari 15.4, Edge 88 and
later.

## Locators

Query the page through semantic locators rather than CSS selectors, so the test breaks when the accessible contract
breaks and not when a class name changes.

`getByRole`, `getByLabelText`, `getByPlaceholder`, `getByText`, `getByAltText`, `getByTitle`, `getByTestId`. Narrow a
set with `nth`, `first`, `last`, `and`, `or`, and `filter` (with `has`, `hasNot`, `hasText`, `hasNotText`).

Actions are asynchronous and must be awaited: `click`, `dblClick`, `tripleClick`, `fill`, `clear`, `hover`, `unhover`,
`selectOptions`, `dropTo`, `screenshot`, `wheel` (Vitest 4.1). `element()` and `elements()` drop to the DOM node when a
locator cannot express the assertion.

## Visual regression

`toMatchScreenshot(name)` captures the element and compares it against a reference image. The first run writes the
reference and fails, which is deliberate — a reference committed without being looked at asserts nothing.

**Screenshots are environment-dependent by nature.** Font rendering, GPU drivers, headless versus headed, and browser
version all change the pixels. Vitest encodes the browser and platform into the file name (`button-chromium-darwin.png`)
so the mismatch is visible rather than silent, but stable results still require running the comparison in one fixed
environment — a container or a hosted browser grid — for both the reference and the check.

Playwright traces (Vitest 4) write a trace file inspectable in Playwright's Trace Viewer, which is the fastest route
into a failure that only reproduces in CI.

`toMatchAriaSnapshot` (experimental, Vitest 4.1.4) asserts the accessibility tree instead of pixels. It survives styling
changes that break a screenshot, so it is the cheaper default where the concern is structure.

## Mocking limits

The browser loads modules through native ESM. The module namespace object is sealed, so `vi.spyOn(module, 'method')`
throws — there is no runtime seam to patch, unlike the Node module runner.

```js
vi.mock('./module.js', { spy: true })
vi.mocked(module.method).mockImplementation(() => {})
```

`{ spy: true }` is the supported substitute: it wraps every export while keeping the implementation. An exported `let`
cannot be replaced at all; export a function that mutates the internal value.

Mocking works because Vitest intercepts the module request — through Playwright's `page.route`, or a Vite plugin under
`preview` and `webdriverio` — and serves rewritten source. The rewritten module is visible in devtools.

## Blocking dialogs

`alert`, `confirm` and `prompt` block the page, which stops Vitest communicating with it and hangs the run. Vitest
installs default mocks returning fixed values so an accidental call does not hang, but a test that depends on a dialog
should mock it explicitly rather than rely on the fallback.

## Configuration

`browser.instances` runs several browser configurations in one project. `browser.isolate`, `browser.viewport`,
`browser.screenshotFailures`, `browser.screenshotDirectory`, `browser.trace`, `browser.connectTimeout`,
`browser.locators`, `browser.expect`, `browser.trackUnhandledErrors`, `browser.ui` and `browser.detailsPanelPosition`
tune the rest.

Keep browser tests in their own project so the Node suite is not slowed by a browser it does not need — the split is
what `projects` exists for.
