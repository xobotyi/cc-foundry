# WCAG 2.2 Reference

The Web Content Accessibility Guidelines (WCAG) 2.2 define success criteria
organized under four principles: Perceivable, Operable, Understandable, and
Robust. Each criterion has a conformance level: A (minimum), AA (standard
target), or AAA (enhanced).

**Target AA conformance** unless the project explicitly specifies otherwise.
AA includes all A criteria.

## Perceivable

Content must be presentable in ways users can perceive.

### Text Alternatives (1.1)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 1.1.1 Non-text Content | A | All non-text content has a text alternative. Decorative images use `alt=""`. |

### Time-Based Media (1.2)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 1.2.1 Audio/Video Only | A | Transcripts for audio-only; transcript or audio description for video-only |
| 1.2.2 Captions | A | Synchronized captions for prerecorded video with audio |
| 1.2.3 Audio Description or Transcript | A | Audio description or text transcript for prerecorded video |
| 1.2.4 Captions (Live) | AA | Captions for live audio content |
| 1.2.5 Audio Description | AA | Audio description for prerecorded video |

### Adaptable (1.3)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 1.3.1 Info and Relationships | A | Structure/relationships conveyed programmatically (headings, labels, lists) |
| 1.3.2 Meaningful Sequence | A | Reading order determinable from DOM order |
| 1.3.3 Sensory Characteristics | A | Instructions do not rely solely on shape, size, position, or sound |
| 1.3.4 Orientation | AA | Content works in both portrait and landscape |
| 1.3.5 Identify Input Purpose | AA | Use `autocomplete` for user data inputs |

### Distinguishable (1.4)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 1.4.1 Use of Color | A | Color is not the sole means of conveying information |
| 1.4.2 Audio Control | A | Mechanism to pause/stop/mute auto-playing audio > 3s |
| 1.4.3 Contrast (Minimum) | AA | Text: 4.5:1; Large text (18pt+ or 14pt bold+): 3:1 |
| 1.4.4 Resize Text | AA | Page usable at 200% zoom |
| 1.4.5 Images of Text | AA | Use real text, not images of text |
| 1.4.10 Reflow | AA | No horizontal scroll at 320px width (400% zoom at 1280px) |
| 1.4.11 Non-text Contrast | AA | UI components and graphical objects: 3:1 contrast |
| 1.4.12 Text Spacing | AA | No content loss when user adjusts line-height, spacing |
| 1.4.13 Content on Hover/Focus | AA | Dismissible, hoverable, persistent |

## Operable

UI components and navigation must be operable.

### Keyboard (2.1)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 2.1.1 Keyboard | A | All functionality available via keyboard |
| 2.1.2 No Keyboard Trap | A | Focus can always be moved away from any component |
| 2.1.4 Character Key Shortcuts | A | Single-character shortcuts can be disabled or remapped |

### Enough Time (2.2)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 2.2.1 Timing Adjustable | A | Time limits can be turned off, adjusted, or extended |
| 2.2.2 Pause, Stop, Hide | A | Moving/blinking content can be paused; auto-updating can be controlled |

### Seizures (2.3)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 2.3.1 Three Flashes | A | Nothing flashes more than 3 times per second |

### Navigable (2.4)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 2.4.1 Bypass Blocks | A | Skip navigation mechanism provided |
| 2.4.2 Page Titled | A | Descriptive page `<title>` |
| 2.4.3 Focus Order | A | Focus order is logical and intuitive |
| 2.4.4 Link Purpose (In Context) | A | Link purpose determinable from link text or context |
| 2.4.5 Multiple Ways | AA | Multiple ways to locate pages (search, sitemap, nav) |
| 2.4.6 Headings and Labels | AA | Headings and labels are descriptive |
| 2.4.7 Focus Visible | AA | Keyboard focus indicator is visible |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Focused element is not entirely hidden by other content |

### Input Modalities (2.5)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 2.5.1 Pointer Gestures | A | Multipoint gestures have single-pointer alternatives |
| 2.5.2 Pointer Cancellation | A | Down-event activation can be aborted |
| 2.5.3 Label in Name | A | Accessible name contains the visible label text |
| 2.5.4 Motion Actuation | A | Motion-triggered functions have UI alternatives |
| 2.5.7 Dragging Movements | AA | Drag operations have click alternatives |
| 2.5.8 Target Size (Minimum) | AA | Pointer targets are at least 24x24px (with spacing exceptions) |

## Understandable

Content and operation must be understandable.

### Readable (3.1)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 3.1.1 Language of Page | A | `<html lang="...">` set correctly |
| 3.1.2 Language of Parts | AA | Language changes marked with `lang` attribute |

### Predictable (3.2)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 3.2.1 On Focus | A | Receiving focus does not trigger unexpected changes |
| 3.2.2 On Input | A | Changing input does not trigger unexpected changes |
| 3.2.3 Consistent Navigation | AA | Navigation order is consistent across pages |
| 3.2.4 Consistent Identification | AA | Same-function components are consistently identified |
| 3.2.6 Consistent Help | A | Help mechanisms appear in consistent locations |

### Input Assistance (3.3)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 3.3.1 Error Identification | A | Errors identified and described in text |
| 3.3.2 Labels or Instructions | A | Labels or instructions provided for input |
| 3.3.3 Error Suggestion | AA | Suggested corrections for detected errors |
| 3.3.4 Error Prevention (Legal, Financial) | AA | Submissions are reversible, checked, or confirmed |
| 3.3.7 Redundant Entry | A | Previously entered info auto-populated or selectable |
| 3.3.8 Accessible Authentication | AA | No cognitive function test required for auth |

## Robust

Content must be robust enough for diverse user agents and assistive technology.

### Compatible (4.1)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 4.1.2 Name, Role, Value | A | Custom components expose name, role, and state via ARIA |
| 4.1.3 Status Messages | AA | Status messages announced without receiving focus |

## Quick Compliance Checklist (AA)

When writing or reviewing code, verify:

- [ ] All images have appropriate `alt` text
- [ ] All form controls have associated labels
- [ ] Heading hierarchy is logical (no skipped levels)
- [ ] Color contrast meets minimums (4.5:1 text, 3:1 large text, 3:1 UI)
- [ ] All functionality is keyboard accessible
- [ ] Focus order matches visual order
- [ ] Focus indicator is visible
- [ ] Skip link is present
- [ ] Page has a descriptive `<title>` and `lang` attribute
- [ ] Error messages are associated with their fields
- [ ] Status messages use live regions
- [ ] Content reflows at 320px width without horizontal scroll
- [ ] Touch targets are at least 24x24px
