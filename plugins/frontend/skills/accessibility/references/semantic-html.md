# Semantic HTML for Accessibility

Semantic HTML is the foundation of accessible web content. Native elements provide
built-in keyboard support, screen reader announcements, and focus management that
ARIA can only approximate.

## The Core Principle

**Use the right element for the right job.** A `<button>` gives you keyboard
activation, focus management, and screen reader announcements for free. A
`<div role="button">` requires you to manually implement all of that.

## Page Structure

### Landmarks

Use HTML sectioning elements to create landmark regions. Screen readers expose
these as navigation shortcuts.

| HTML Element | Implicit ARIA Role | Purpose |
|--------------|-------------------|---------|
| `<header>` (top-level) | `banner` | Site-wide header, logo, primary nav |
| `<nav>` | `navigation` | Navigation link groups |
| `<main>` | `main` | Primary page content (one per page) |
| `<aside>` | `complementary` | Supporting content related to main |
| `<footer>` (top-level) | `contentinfo` | Site-wide footer, copyright, links |
| `<section>` (with accessible name) | `region` | Generic labeled region |
| `<search>` | `search` | Search functionality container |

**Rules:**
- Every page must have exactly one `<main>`.
- `<header>` and `<footer>` only map to `banner`/`contentinfo` when they are
  direct children of `<body>` -- nested inside `<article>`, `<section>`, etc.
  they have no landmark role.
- If multiple `<nav>` elements exist, label each with `aria-label` or
  `aria-labelledby` to distinguish them.
- Do not duplicate implicit roles -- never write `<main role="main">`.
- Include all perceivable content within a landmark region.

### Headings

Headings (`<h1>`--`<h6>`) create a document outline. Screen reader users navigate
by headings more than any other method.

**Rules:**
- One `<h1>` per page identifying the primary content.
- Do not skip heading levels -- `<h1>` then `<h3>` breaks the outline.
- Use headings to structure content, not for visual styling.
- Every `<section>` and major content area should begin with a heading.

```html
<!-- Good: logical heading hierarchy -->
<h1>Product Catalog</h1>
  <h2>Electronics</h2>
    <h3>Laptops</h3>
    <h3>Phones</h3>
  <h2>Clothing</h2>

<!-- Bad: skipped heading level, heading for styling -->
<h1>Products</h1>
<h3>Electronics</h3>  <!-- skipped h2 -->
<h5 class="small-heading">Note</h5>  <!-- heading for styling -->
```

## Interactive Elements

### Buttons vs Links

| Element | Purpose | Keyboard |
|---------|---------|----------|
| `<button>` | Triggers an action (submit, toggle, open dialog) | Enter, Space |
| `<a href>` | Navigates to a URL or anchor | Enter |

**Never use `<a href="#" onclick="...">` for actions.** Use `<button>`.
**Never use `<button>` for navigation.** Use `<a href>`.

### Form Controls

Native form elements provide built-in accessibility:
- `<input>`, `<select>`, `<textarea>` -- keyboard operable, screen reader
  announced with type and state
- `<fieldset>` + `<legend>` -- groups related controls with a group label
- `<label>` + `for`/`id` association -- connects label text to control

```html
<!-- Good: explicit label association -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" required />

<!-- Good: grouped radio buttons -->
<fieldset>
  <legend>Notification preference</legend>
  <label><input type="radio" name="notify" value="email" /> Email</label>
  <label><input type="radio" name="notify" value="sms" /> SMS</label>
</fieldset>

<!-- Bad: no label association -->
<span>Email</span>
<input type="email" name="email" />
```

### Tables

Data tables require proper markup for screen readers to associate cells with
headers.

```html
<table>
  <caption>Quarterly revenue by region</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Q1</th>
      <th scope="col">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North</th>
      <td>$1.2M</td>
      <td>$1.4M</td>
    </tr>
  </tbody>
</table>
```

**Rules:**
- Use `<th>` with `scope="col"` or `scope="row"` for headers.
- Add `<caption>` to describe the table's purpose.
- Never use tables for layout.

## Text Alternatives

### Images

| Image Type | `alt` Attribute |
|------------|----------------|
| Informative | Describe the content and function |
| Decorative | `alt=""` (empty string, not omitted) |
| Functional (link/button) | Describe the action, not the image |
| Complex (chart/graph) | Brief `alt` + detailed description nearby |

```html
<!-- Informative -->
<img src="chart.png" alt="Sales increased 25% from Q1 to Q4 2025" />

<!-- Decorative -->
<img src="divider.png" alt="" />

<!-- Functional -->
<a href="/home"><img src="logo.png" alt="Acme Corp home page" /></a>

<!-- Complex: brief alt + linked description -->
<figure>
  <img src="org-chart.png" alt="Organization structure" aria-describedby="org-desc" />
  <figcaption id="org-desc">CEO at top, three VPs reporting...</figcaption>
</figure>
```

**Rules:**
- Every `<img>` must have an `alt` attribute -- even if empty.
- Do not start alt text with "Image of" or "Picture of" -- screen readers
  already announce it as an image.
- Keep alt text concise -- typically under 125 characters.
- For decorative images, prefer CSS `background-image` over `<img alt="">`.

## Lists

Use semantic list elements for groups of related items:
- `<ul>` for unordered lists
- `<ol>` for ordered/sequential lists
- `<dl>`, `<dt>`, `<dd>` for term/description pairs

Screen readers announce list type and item count, enabling users to decide
whether to traverse or skip.

## Language

- Set the page language: `<html lang="en">`.
- Mark language changes inline: `<span lang="fr">bonjour</span>`.
- Use clear, simple language. Expand abbreviations on first use with `<abbr>`.
