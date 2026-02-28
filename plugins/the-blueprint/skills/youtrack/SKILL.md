---
name: youtrack
description: >-
  YouTrack issue tracker domain knowledge — data model, custom fields, query language,
  commands, linking, state machines, and tags. Invoke whenever task involves any interaction
  with YouTrack — creating issues, searching, updating fields, linking, or querying.
---

# YouTrack

YouTrack domain knowledge for agents that interact with YouTrack through MCP tools or API.
This skill teaches the data model, conventions, and query language — the *what* and *why*
of YouTrack. The `task-creation` skill in the same plugin teaches *how* to write good task
descriptions regardless of tracker.

<prerequisite>
When creating YouTrack issues, invoke `task-creation` first for description quality, then
use this skill for YouTrack-specific field handling, linking, and categorization.
</prerequisite>

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Query language | `references/query-language.md` | Full search syntax, operators, symbols, relative dates, BNF grammar |
| Commands | `references/commands.md` | Command syntax, field updates, link/tag commands, work items |
| Workflows & state machines | `references/workflows.md` | State machine model, rule types, transition properties |

## Issue Data Model

Every YouTrack issue has:
- **Summary** — required, the issue title
- **Description** — optional, supports Markdown
- **Project** — required, determines available fields, workflows, and boards
- **Custom fields** — project-specific set of typed fields (see below)
- **Links** — typed relationships to other issues
- **Tags** — arbitrary labels, personal or shared
- **Attachments** — files, cannot be added during issue creation via API
- **Comments** — threaded discussion with visibility controls

## Custom Fields

Custom fields are the core of YouTrack's data model. Every project defines its own set of
fields with project-specific values. Never assume field names or values — always discover
them from the project configuration.

### Field Type Categories

**Simple types** store raw values:
- `string` — unformatted text
- `integer` — whole numbers
- `float` — decimal numbers
- `date` — calendar date
- `date and time` — date with time component
- `period` — time duration (e.g., `2w 3d`)
- `text` — formatted text (Markdown), displayed below description, not in sidebar

**Enumerated types** store predefined value sets:
- `enum` — arbitrary named values (e.g., Type: Bug, Feature, Task)
- `state` — issue states with resolved/unresolved property (e.g., Open, In Progress, Fixed)
- `user` — user accounts (e.g., Assignee)
- `version` — product versions with released/archived properties
- `build` — build numbers
- `ownedField` — enum values with an owner (user assigned to each value)
- `group` — user groups

Enumerated fields can store single or multiple values (`enum[1]` vs `enum[*]`).

### Default Fields

Most YouTrack projects include these fields out of the box, though names and values are
customizable:

- **Type** — `enum`: Bug, Feature, Task, Epic, Story, etc.
- **State** — `state`: Open, In Progress, Fixed, Verified, etc.
- **Priority** — `enum`: Show-stopper, Critical, Major, Normal, Minor
- **Assignee** — `user`: single user responsible for the issue
- **Subsystem** — `ownedField`: component within the project
- **Fix versions** — `version[*]`: versions where the fix ships
- **Affected versions** — `version[*]`: versions where the problem exists
- **Fixed in build** — `build`: specific build containing the fix

### Required Fields

A field is required when configured with "Cannot be empty" in the project:
- **Simple types** — field is required when Empty Value = "Cannot be empty"
- **Enumerated types** — field is required when Empty Value = "Cannot be empty" AND
  Default Value = "No value (required)"

Gotchas:
- If a required field is also private, users without private field permissions are
  blocked from creating issues entirely
- Conditional required fields are only enforced when the condition is met
- Required fields are checked on creation and direct edit only — moving an issue to
  a different project does NOT enforce the new project's requirements

### Per-Project Field Configuration

The same field name can have different value sets, defaults, visibility, and required
status in different projects. Always query the target project's field configuration
before creating or updating issues.

Fields can be:
- **Private** — visible only to users with Read/Update Issue Private Fields permission
- **Conditional** — shown only when another field matches a specific value
- **Auto-attached** — automatically added to new projects using the Default template

## Issue Links

Links express typed relationships between issues. Adding a link to issue A automatically
creates the reciprocal link on issue B.

### Link Directions

- **Directed** — subordinate relationship with inward/outward names
  (e.g., "depends on" / "is required for")
- **Undirected** — symmetric relationship, same name both ways
  (e.g., "relates to")
- **Aggregation** — combining relationship with inward/outward names
  (e.g., "subtask of" / "parent for")

### Default Link Types

| Inward | Outward | Direction | Use |
|--------|---------|-----------|-----|
| depends on | is required for | Directed | Issue must be resolved before dependent |
| subtask of | parent for | Aggregation | Parent-child task hierarchy |
| duplicates | is duplicated by | Aggregation | Same condition, resolving one resolves the other |
| relates to | relates to | Undirected | Related but not dependent |

Always use native links instead of mentioning issue IDs in descriptions. Native links are
visible in dedicated UI, enable dependency tracking, and stay current when issues move.

A single pair of issues can have multiple link types — add every relationship that applies.

## State Machines

Projects can enforce state transitions through workflow rules. When a state machine is
active, only defined transitions are allowed — all undefined transitions are prohibited
at every level (manual, command, automation).

### Key Concepts

- **Initial state** — the state assigned to new issues (exactly one per machine)
- **Transitions** — named paths between states, optionally with guards and actions
- **Guards** — conditions that must be true for a transition to execute
- **Per-issue-type machines** — different state transitions based on the Type field
  (e.g., Bugs can go to "Can't Reproduce", Features can go to "Rejected")

Before setting state values, check whether the project has state machine rules — attempting
a prohibited transition will fail silently or error.

## Tags

Tags are arbitrary labels independent of custom fields. Key properties:

- **Personal vs shared** — personal tags are visible only to the creator; shared tags
  have configurable visibility, usage, and edit permissions
- **Auto-remove on resolution** — tags can be configured to drop automatically when
  an issue transitions to a resolved state
- **Search integration** — `tag: {tag name}` or `#{tag name}` in queries
- **Command syntax** — `tag <name>` to add, `untag <name>` to remove

Tags are useful for cross-project categorization and temporary workflow markers
(e.g., "needs-review", "blocked-by-external") without creating custom fields.

## Query Language Essentials

YouTrack has its own query language — not Lucene, not JQL. Working-resolution rules:

- **Attribute search** — `attribute: value` (e.g., `State: Open`, `for: me`)
- **Single value shorthand** — `#value` or `-value` (e.g., `#Unresolved`, `-Minor`)
- **Multi-value** — comma-separated: `State: Open, {In Progress}`
- **Braces for spaces** — `{In Progress}`, `{to be tested}`
- **Negation** — `-` before value: `Priority: -Minor`
- **Boolean** — `and`, `or`, parentheses for grouping
- **has/lacks** — `has: attachments`, `has: -comments`
- **Link search** — `depends on: PROJ-123`, `subtask of: (State: Open)`
- **Date ranges** — `created: 2024-01-01 .. 2024-12-31`, `updated: {minus 7d} .. Today`
- **Sort** — `sort by: priority asc, created desc`
- **Resolved/Unresolved** — keywords, not field values: `#Resolved`, `#Unresolved`

For the full syntax, operators, relative date parameters, and BNF grammar, see
`references/query-language.md`.

## Command Essentials

Commands apply changes to one or more issues. Unlike search queries, commands do not use
colons, braces, or `#` symbols.

- **Set field** — `<field name> <value>` (e.g., `Priority Critical`)
- **Assign** — `for <username>` or `for me`
- **State change** — `State <value>` or just `<value>` if unambiguous
- **Add/remove multi-value** — `add <field> <value>`, `remove <field> <value>`
- **Link** — `<link type> <issue ID>` (e.g., `subtask of PROJ-123`)
- **Tag** — `tag <name>`, `untag <name>`
- **Work item** — `work <type> <date> <duration> <description>`
- **Sprint** — `Board <name> <sprint>`, or `Board <name> {current sprint}`

For the full command reference and BNF grammar, see `references/commands.md`.

## Discovery Protocol

Before creating or updating issues in a YouTrack project, always:

1. **Query the project** — discover available fields, their types, and valid values.
   Do not hardcode field names or assume default configurations.
2. **Check required fields** — identify which fields must be set during creation.
   Missing required fields will block issue creation.
3. **Check state machines** — determine whether the project enforces state transitions.
   Attempting an invalid transition will fail.
4. **Check link types** — the project may have custom link types beyond the defaults.
   Use the correct link type names.
5. **Check existing issues** — before creating, search for duplicates or related issues
   using YouTrack's query language.

## Integration with task-creation

This skill provides YouTrack domain knowledge. The `task-creation` skill provides
tracker-agnostic writing discipline. Use them together:

- **task-creation** → title format, description structure, acceptance criteria quality
- **youtrack** → field discovery, correct field types, valid state transitions, proper
  linking, query syntax for duplicate search

## Related Skills

- **task-creation** — Writing discipline for task descriptions, acceptance criteria, and
  description patterns (bug reports, implementation tasks, investigations)
- **task-decomposition** — Breaking technical designs into task hierarchies that map to
  YouTrack's parent/subtask linking model
