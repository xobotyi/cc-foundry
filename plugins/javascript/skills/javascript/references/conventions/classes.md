# Classes and Objects

## Initialization order

A class body executes in a fixed order, and getting it wrong produces `undefined` with no error:

1. The base constructor runs to completion, including any method it calls.
2. `super()` returns.
3. Derived-class field initializers run, in declaration order.
4. The rest of the derived constructor body runs.

So a base constructor that calls an overridden method sees the derived class's fields unassigned:

```js
class Base {
	constructor() {
		this.render();
	}
}
class Derived extends Base {
	label = "ready";
	render() {
		console.log(this.label); // undefined
	}
}
```

Never call an overridable method from a constructor. A field initializer may read `this` and call methods, but only
fields declared above it are assigned.

## Fields against prototype methods

- A **method** lives on the prototype: one function shared by every instance, `this` bound by the call site.
- An **arrow-function field** is an own property: one closure per instance, `this` bound lexically at construction.

`Object.hasOwn(instance, "method")` is `false`; `Object.hasOwn(instance, "arrowField")` is `true`. The arrow field is
the right tool only when the function is detached from its receiver — passed as a callback, registered as a listener.
Everywhere else it costs memory per instance and cannot be overridden through the prototype.

## Private fields

- **`#x` is hard encapsulation.** Reading `#x` on an object that does not have it throws `TypeError` rather than
  returning `undefined`. `_x` is a naming convention and provides nothing.
- **`#x in obj` is the only reliable same-class test.** `instanceof` walks a prototype chain that a caller can forge and
  that differs across realms:

  ```js
  class Point {
  	#x;
  	static isPoint(v) {
  		return #x in v;
  	}
  }
  ```

- **Private fields do not appear in `Object.keys`, spread, `JSON.stringify`, or `structuredClone`.** An object whose
  state is private needs an explicit `toJSON`.

## Inheritance

- **Extend only for a genuine "is-a" with a shared contract.** Two classes that share code and not a contract want a
  function or composition.
- **Extending a built-in preserves the subclass inconsistently.** `Array.prototype.map` on a subclass returns the
  subclass, because array methods consult `Symbol.species`; the ES2025 `Set` methods return a plain `Set` regardless of
  the receiver; and `structuredClone` discards the prototype on any of them. Never rely on a built-in method to hand
  back your type.
- **`super.m()` resolves against the [[HomeObject]] of the method it appears in**, fixed at definition. Copying a method
  that uses `super` onto another object keeps it pointing at the original prototype.
- **`new.target` is `undefined` when a function is called without `new`**, which is how a factory detects misuse.
- **A constructor that only calls `super(...args)` is noise.** Omit it.

## Freezing and copying

- **`Object.freeze` is shallow.** `Object.freeze({ a: { b: 1 } })` still allows `o.a.b = 2`. Freeze recursively, or do
  not claim immutability.
- **A frozen object fails silently in sloppy mode and throws in strict mode.** Module code is always strict, so the
  assignment throws there.
- **Spread and `Object.assign` copy own enumerable properties only** and drop the prototype: `{ ...instance }` is a
  plain object with no methods.

## Prototype hygiene

- **Never extend a built-in prototype.** `Array.prototype.foo = …` is visible to every library in the process and breaks
  `for...in` over arrays everywhere.
- **`Object.create(null)` for a dictionary keyed by external input.** It has no `constructor`, `toString`, or
  `__proto__` accessor to collide with. `Object.groupBy` returns one for exactly this reason, which is why
  `result.hasOwnProperty` is `undefined` on its output.
- **`{ __proto__: x }` in a literal sets the prototype**, while `JSON.parse('{"__proto__": …}')` creates an ordinary own
  property. The pollution risk lives in a recursive merge that copies that own property onto a target with assignment.

## When not to write a class

A class holding one method and no state is a function. A class whose constructor only assigns its arguments to fields is
an object literal. Reach for a class when a type has invariants to protect, several methods over shared state, or a
lifecycle to manage.
