# Bug Report Structure

Distilled from Mozilla Bug Writing Guidelines, Chromium Bug Reporting Guidelines, web.dev "How to file a good browser
bug", Stack Overflow Minimal Reproducible Example guide, and the CONTRIBUTING.md Generator template.

## Title

Write a clear, concise summary (~10 words / under 60 characters) that uniquely identifies the problem. Describe the
problem, not a solution.

- Good: "Cancelling a File Copy dialog crashes File Manager"
- Good: "Down-arrow scrolling doesn't work in `<textarea>` styled with `overflow:hidden`"
- Bad: "Software crashes"
- Bad: "Browser should work with my web site"
- Bad: "Bug in authentication" (too vague, no observable behavior)

## Body Structure

### 1. Description

A one-paragraph overview expanding the title. State what is broken and in what context. Include the software version and
environment details (OS, platform, runtime version, relevant configuration).

### 2. Steps to Reproduce

Numbered, precise steps another developer can follow to trigger the bug on their own system. Each step describes both
the action and the intent.

**Good:**

```
1. Start the application with default configuration
2. Navigate to Settings > Notifications
3. Toggle "Email notifications" to ON
4. Click "Save"
5. Observe the console output
```

**Bad:**

```
Open settings and try to change notifications. It breaks.
```

Rules:

- State whether the bug is reproducible at will, occasionally, or only once
- Include special setup steps (environment variables, specific data, feature flags)
- If intermittent, describe the frequency and any patterns observed
- One issue per report — do not combine multiple bugs

### 3. Expected Result

What the software should have done if the bug were not present. Be concrete.

- Good: "The notification preference should persist and a success toast should appear."
- Bad: "It should work."

### 4. Actual Result

What the software actually did. Separate facts (observations) from speculation. Include error messages verbatim.

- Good: "The page returns a 500 error. Console shows: `TypeError: Cannot read property 'email' of undefined` at
  `notifications.js:42`."
- Bad: "It doesn't work."

### 5. Environment

- OS and version (e.g., macOS 14.2, Ubuntu 22.04, Windows 11)
- Software version or commit hash
- Runtime/interpreter version if applicable
- Browser and version for web issues
- Relevant hardware details if applicable (display DPI, architecture)

### 6. Supporting Evidence

Attach supporting materials when relevant:

- **Screenshots or screen recordings** — especially for visual bugs or multi-step reproduction
- **Stack traces / crash logs** — for crashes, panics, or unhandled exceptions
- **Performance profiles** — for slowness or high resource usage
- **Minimal reproducible example** — the single most impactful thing you can provide (see below)

## Minimal Reproducible Example (MRE)

A minimal reproducible example contains the least amount of code or configuration needed to demonstrate the problem —
the most effective way to get a bug fixed quickly.

Properties of a good MRE:

- **Minimal** — remove everything not needed to trigger the bug. Start from scratch or strip down by removing code until
  the bug disappears, then add the last piece back.
- **Complete** — include all parts someone else needs to reproduce the problem. No missing imports, no "insert your code
  here."
- **Reproducible** — verify your example actually triggers the bug before submitting. Test in a clean environment.

Construction approaches:

- **Bottom-up**: Create a new minimal project, add only what's needed to trigger the bug
- **Top-down**: Start with the full project, remove code until the bug disappears, add back the last removal

For web issues, host on a service (CodePen, JSFiddle, Glitch) or provide a self-contained HTML file.

## Regression Information

If the bug worked correctly in a previous version:

- State the last known working version
- State the first known broken version
- If possible, bisect to find the specific commit that introduced the regression

Regressions with clear version boundaries are fixed faster because they narrow the root cause search space.

## What Not to Do

- Do not include AI-generated analysis or speculation about root cause unless you have verified it by reading the source
  code
- Do not claim severity levels you cannot justify with evidence
- Do not reference functions, files, or APIs without verifying they exist in the current version
- Do not combine multiple bugs into a single report
- Do not suggest fixes unless you have tested them
