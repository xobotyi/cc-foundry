# YouTrack Workflows and State Machines

Workflows are rule sets attached to projects that automate issue lifecycle management.
This reference covers the conceptual model and rule types — not the JavaScript API for
writing custom workflows.

## Rule Types

YouTrack supports four workflow rule types:

### On-change Rules

Trigger when an issue is created or updated. Use for:
- Auto-assigning issues based on type or field values
- Setting default field values (e.g., Due Date = created + 2 weeks)
- Enforcing constraints (e.g., can't reopen without unassigning)

Structure: Prerequisites (conditions) → Actions (field updates, notifications).
Prerequisites combine with AND logic. Use NOT blocks to exclude specific changes.

### On-schedule Rules

Run on a recurring schedule against issues matching a filter query. Use for:
- Tagging overdue issues
- Escalating stale issues
- Periodic cleanup or notification

Structure: Schedule + Filter Query → Prerequisites → Actions.
The filter query uses standard YouTrack search syntax (e.g., `Type: {Purchase request}`).

### State-machine Rules

Regulate transitions between values of a state-type field. When active, only defined
transitions are allowed — all undefined transitions are **prohibited** at every level
(manual, command, automation).

Two variants:
- **Basic** — single set of transitions for all issues
- **Per-issue-type** — different transition sets based on the value of a type field

### Action Rules

Define custom commands that users can apply to issues. Appear in the issue toolbar's
"Show more" menu and can be invoked via the command dialog.

Structure: Action name → Prerequisites (optional) → Actions.

## State Machine Model

### Basic State Machine

Properties:

| Property | Description |
|----------|-------------|
| `fieldName` | The custom field managed by the state machine |
| `states` | Map of field values to their transition definitions |
| `requirements` | Fields required for the rule to work (auto-checked on attachment) |

Each state defines:

| Property | Description |
|----------|-------------|
| `initial` | Boolean — exactly one state must be `true` (set on issue creation) |
| `onEnter` | Action executed when the state is entered |
| `onExit` | Action executed when leaving the state |
| `transitions` | Named paths to target states |

Each transition defines:

| Property | Description |
|----------|-------------|
| `targetState` | The state value to set |
| `guard` | Condition that must be true for the transition to execute |
| `action` | Action to perform during the transition |
| `after` | Time delay before executing the action (in milliseconds) |

#### Example: Basic State Machine

```
Open (initial)
  → In Progress (transition: "start")
  → Open (transition: "reminder", after: 2 days — notify project leader)

In Progress
  → Fixed (transition: "fix")
  → Open (transition: "reopen", guard: must be unassigned)
  onEnter: assign to current user

Fixed
  (no transitions — final state)
```

### Per-Issue-Type State Machine

Extends the basic model with type-specific transition sets:

| Property | Description |
|----------|-------------|
| `stateFieldName` | The field managed by the state machine (alias for `fieldName`) |
| `typeFieldName` | The field that determines which machine applies (e.g., `Type`) |
| `defaultMachine` | Default transitions (alias for `states`) — applies when no alternative matches |
| `alternativeMachines` | Map of type values to their dedicated state machines |

The type field acts as a switch: issues with a type defined in `alternativeMachines`
use that machine; all others use `defaultMachine`.

#### Example: Per-Issue-Type Machines

**Default (Task and others):**
```
Open → In Progress → Fixed
```

**Bug:**
```
Open → In Progress → Fixed → Open (reopen)
Open → Can't Reproduce → Open
In Progress → Can't Reproduce
```

**Feature:**
```
Open → In Progress → Fixed → Open (reopen)
Open → Rejected → Open (reopen)
```

### Key Behaviors

- The managed field and its values are derived from the `states` / `defaultMachine`
  property — they do not need to be listed in `requirements`
- For per-type machines, the `typeFieldName` field is implicitly added to requirements
- Guards block transitions — the field value cannot change if the guard returns false
- `after` transitions execute on a timer by the workflow user account, not the human user
- `onEnter` / `onExit` execute as the user who changes the field value

## Practical Implications for Issue Creation

When creating or updating issues in a project with workflows:

- **State machines restrict transitions** — setting a State value directly may fail if
  the transition from the initial state is not defined. Always check available transitions.
- **On-change rules may override fields** — a workflow might auto-set Assignee, Due Date,
  or other fields after creation. Set only what you need; don't fight the automation.
- **Required fields may come from workflows** — beyond the project's field configuration,
  workflows can enforce additional field requirements via `require()` calls.
- **Custom actions are project-specific** — the set of available actions depends on which
  workflows are attached to the project.
