# Component Design

Pure components, composition patterns, refs, document metadata, and JSX conventions.

## Thinking in React

Build UI in five steps:

1. **Break UI into component hierarchy.** Each component does one thing.
   If it grows, decompose into subcomponents.
2. **Build a static version first.** Render UI from data with props only —
   no state, no interactivity. Lots of typing, no thinking.
3. **Find minimal state.** For each piece of data, ask: does it change over
   time? Is it passed from a parent? Can it be computed? If all yes → not state.
4. **Identify where state lives.** Find every component that renders based on
   the state. Find their closest common parent. Put state there.
5. **Add inverse data flow.** Pass state-setter callbacks down so children
   can update parent state through event handlers.

## Component Purity

**React assumes every component is a pure function.**

A pure component:
- **Minds its own business.** Does not change objects or variables that
  existed before it was called.
- **Same inputs, same output.** Given the same props + state + context,
  always returns the same JSX.

```tsx
// BAD — mutates external variable during render
let guest = 0;
function Cup() {
  guest = guest + 1;  // Side effect during render!
  return <h2>Tea cup for guest #{guest}</h2>;
}

// GOOD — pure, uses props
function Cup({ guest }: { guest: number }) {
  return <h2>Tea cup for guest #{guest}</h2>;
}
```

### Local Mutation Is Fine

Creating and mutating objects/arrays **within** the same render is safe:

```tsx
function TeaGathering() {
  const cups = [];  // Created during this render
  for (let i = 1; i <= 12; i++) {
    cups.push(<Cup key={i} guest={i} />);
  }
  return cups;  // Local mutation — perfectly fine
}
```

### Where Side Effects Belong

| Side effect type | Where to put it |
|-----------------|-----------------|
| User clicks, form submits | Event handlers |
| Sync with external system (DOM, network) | `useEffect` (last resort) |
| Data transformation | Compute during render |
| Shared logic between handlers | Extract a function, call from handlers |

**Event handlers don't need to be pure** — they run outside of rendering.

## Ref as a Prop

Function components accept `ref` directly as a prop. Do not use `forwardRef`.

```tsx
// GOOD — ref is a regular prop
function MyInput({ placeholder, ref }: {
  placeholder: string;
  ref?: React.Ref<HTMLInputElement>;
}) {
  return <input placeholder={placeholder} ref={ref} />;
}

// Usage
<MyInput ref={inputRef} />
```

**Never use `forwardRef`.** It is deprecated. Pass `ref` as a regular prop.

### Ref Cleanup Functions

Ref callbacks can return a cleanup function, called when the element unmounts:

```tsx
<input
  ref={(node) => {
    // Setup: element attached to DOM
    node.focus();

    // Cleanup: element removed from DOM
    return () => {
      // cleanup logic here
    };
  }}
/>
```

Avoid implicit returns in ref callbacks — use block body `{}` not parentheses:

```tsx
// BAD — implicit return confuses TypeScript (looks like cleanup)
<div ref={current => (instance = current)} />

// GOOD — explicit block body
<div ref={current => { instance = current }} />
```

## Document Metadata

Render `<title>`, `<meta>`, and `<link>` tags directly in components. React
hoists them to `<head>` automatically:

```tsx
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="author" content={post.author} />
      <meta name="keywords" content={post.keywords} />
      <link rel="author" href={post.authorUrl} />
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

This works with client-only apps, streaming SSR, and Server Components.
For complex metadata needs (route-based overrides), a metadata library
may still be useful.

## Custom Elements

React provides full support for custom elements with proper attribute and
property handling:

- **Server rendering:** primitive props (`string`, `number`, `true`) render
  as attributes. Non-primitive props (`object`, `function`, `false`) are omitted.
- **Client rendering:** props matching a property on the element instance are
  assigned as properties; others are assigned as attributes.

```tsx
<my-component custom-attr="value" items={complexArray} />
```

## Composition Patterns

### Children as Props

Reduce prop drilling by passing JSX as children:

```tsx
// BAD — drilling someState through Layout
<Layout someState={someState} onStateChange={setSomeState} />

// GOOD — compose at the call site
<Layout>
  <Sidebar>
    <SomeLink someState={someState} />
  </Sidebar>
  <MainContent>
    <SomeComponent someState={someState} />
  </MainContent>
</Layout>
```

When a wrapper component updates its own state, React knows its `children`
props haven't changed, so children skip re-rendering.

### Compound Components

Group related components that share implicit state:

```tsx
const FlyOutContext = createContext<{
  open: boolean;
  toggle: (v: boolean) => void;
} | null>(null);

function FlyOut({ children }: { children: React.ReactNode }) {
  const [open, toggle] = useState(false);
  return (
    <FlyOutContext value={{ open, toggle }}>
      {children}
    </FlyOutContext>
  );
}

FlyOut.Toggle = function Toggle() {
  const { open, toggle } = use(FlyOutContext)!;
  return <button onClick={() => toggle(!open)}>Menu</button>;
};

FlyOut.List = function List({ children }: { children: React.ReactNode }) {
  const { open } = use(FlyOutContext)!;
  return open ? <ul>{children}</ul> : null;
};

// Usage
<FlyOut>
  <FlyOut.Toggle />
  <FlyOut.List>
    <li>Edit</li>
    <li>Delete</li>
  </FlyOut.List>
</FlyOut>
```

### Controlled vs Uncontrolled

- **Controlled:** Parent owns the state, passes value + onChange.
  Full control, more wiring.
- **Uncontrolled:** Component manages its own state internally.
  Less wiring, less flexibility.

Prefer controlled components when parent needs to coordinate state across
siblings. Prefer uncontrolled for isolated, self-contained UI.

## Component Body Organization

Separate logic from rendering. The component body handles computation, state, and handler
definitions. JSX is declarative — it references results, not processes.

### Named Prop Types

Every component with props must have a dedicated named type. Never define prop types
inline in the function signature:

```tsx
// BAD — inline prop type
function SavePopover({ names, onCreate }: {
  names: ReadonlySet<string>;
  onCreate: (name: string) => void;
}) { ... }

// GOOD — dedicated named type
interface SavePopoverProps {
  readonly names: ReadonlySet<string>;
  readonly onCreate: (name: string) => void;
}

function SavePopover({ names, onCreate }: SavePopoverProps) { ... }
```

### Handler Object

Group all event handlers in a single `handle` object. This creates a clear boundary
between logic and rendering:

```tsx
const handle = {
  submit() {
    if (!canSubmit) return;
    onSubmit(value);
    reset();
  },
  inputChange(e: ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  },
  keyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handle.submit();
  },
};

return <input onChange={handle.inputChange} onKeyDown={handle.keyDown} />;
```

Never inline handler logic in JSX. Reference handlers from the `handle` object.

### Pre-render Computation

Move list rendering and derived JSX out of the return statement into component body
variables:

```tsx
// BAD — iteration logic inside JSX
return (
  <TabList>
    {allTabs.map((tab) => (
      <Tab key={tab.id}>{tab.name}</Tab>
    ))}
  </TabList>
);

// GOOD — computed before the return
const tabElements: ReactNode[] = [];
for (const tab of allTabs) {
  tabElements.push(<Tab key={tab.id}>{tab.name}</Tab>);
}

return <TabList>{tabElements}</TabList>;
```

### Conditional Rendering

Simple conditions are acceptable inline in JSX:

```tsx
{isModified && <SaveButton />}
```

When the condition is complex or involves multiple branches, compute in the body:

```tsx
// BAD — complex logic in JSX
{items.length > 0 && hasPermission && !isLoading && <ItemList items={items} />}

// GOOD — computed in body
const showItems = items.length > 0 && hasPermission && !isLoading;
// ...
{showItems && <ItemList items={items} />}
```

## JSX Conventions

- **Self-closing tags** for components without children: `<Input />`.
- **Boolean attributes** without value: `<Input disabled />` not
  `disabled={true}`.
- **Fragments** to avoid wrapper divs: `<>...</>` or `<Fragment key={id}>`.
- **Avoid `&&` with numbers.** `count && <List />` renders `0`.
  Use `count > 0 && <List />` or ternary.
- **Never inline handler logic in JSX.** Group all handlers in a `handle`
  object in the component body (see Handler Object above).
- **Spread props sparingly.** `{...props}` makes it unclear what a
  component accepts. Prefer explicit props.
