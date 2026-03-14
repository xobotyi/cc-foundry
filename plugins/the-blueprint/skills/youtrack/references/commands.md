# YouTrack Command Reference

Commands apply changes to one or more issues. Unlike search queries, commands do not use colons, braces, or `#` symbols.

Format: `<attribute> <value>` — e.g., `Priority Critical`, `for me`.

## Simple Commands

- **`comment`** — add a comment (text entered separately)
- **`delete`** — delete selected issues
- **`clone`** — create a copy of selected issues

## Custom Field Commands

Set or change field values:

```
<field name> <value>
```

- If the value is unambiguous, the field name can be omitted
- For state fields governed by state machines, use the transition event name
- To clear a field, use the name of the empty value (e.g., `Unassigned`)
- Escape special characters in string values with `\` (e.g., `Published assets for \"Expressive Kotlin\" webinar`)
- Date fields accept relative parameters (e.g., `Due Date Next month`)

**Multi-value fields:**

- **`add <field> <value>`** — add value without removing existing values
- **`remove <field> <value>`** — remove single value from field

## Assignee Commands

The Assignee field has special aliases:

- **`for <username>`** — assign to user
- **`for me` / `assigned to me`** — assign to current user
- **`<username>`** — assign to user (as single value)
- **`me` / `my`** — assign to current user (as single value)
- **`Unassigned`** — clear the assignee
- **`add <username>`** — assign (multi-assignee)
- **`remove <username>`** — unassign (multi-assignee)

## Default Field Aliases

- **`for`, `assigned to`** → Assignee
- **`in`** → Subsystem
- **`affects`, `affecting`** → Affected versions
- **`fix for`, `fixed in`** → Fix versions
- **`fixed in build`** → Fixed in build

## Link Commands

Add or remove typed links:

```
<link type> <issue ID>
add <link type> <issue ID>
remove <link type> <issue ID>
```

Default link type commands:

- **`depends on <ID>`** — creates "Depends on" / reciprocal "Is required for"
- **`is required for <ID>`** — creates "Is required for" / reciprocal "Depends on"
- **`subtask of <ID>`** — creates "Subtask of" / reciprocal "Parent for"
- **`parent for <ID>`** — creates "Parent for" / reciprocal "Subtask of"
- **`duplicates <ID>`** — creates "Duplicates" / reciprocal "Is duplicated by"
- **`is duplicated by <ID>`** — creates "Is duplicated by" / reciprocal "Duplicates"
- **`relates to <ID>`** — creates "Relates to" / reciprocal "Relates to"

Custom link types use their outward/inward names as commands.

## Tag Commands

- **`tag <name>`** — add tag (creates if doesn't exist)
- **`add tag <name>`** — add tag (alternative syntax)
- **`untag <name>`** — remove tag
- **`remove tag <name>`** — remove tag (alternative syntax)

## Work Item Commands

Log time spent:

```
work <type> <date> <duration> <description>
```

- **work item type** (optional) — work type name
- **date** (optional) — `YYYY-MM-DD`, defaults to today
- **duration** (mandatory) — time period (e.g., `2h 30m`)
- **description** (optional) — text description

Also: `add work <work item>`. The `remove` command is not supported for work items.

## Visibility Commands

- **`visible to <group/user>`** — set issue visibility
- **`add visible to <group/user>`** — add to visibility list
- **`remove visible to <group/user>`** — remove from visibility list

## Board and Sprint Commands

- **`Board <name> <sprint>`** — assign to sprint on board
- **`Board <name> {current sprint}`** — assign to current sprint
- **`add Board <name> <sprint>`** — add to sprint
- **`add Board <name>`** — add to board (current sprint if sprints enabled)
- **`remove Board <name> <sprint>`** — remove from sprint
- **`remove Board <name>`** — remove from all sprints on board

## Voter and Watcher Commands

- **`vote` / `+1`** — vote for issue
- **`unvote`** — remove vote
- **`star <username>`** — add Star tag for user (adds to watchers)
- **`unstar <username>`** — remove Star tag for user

## Move Command

```
move to <project name>
```

Also accepts just the project name as a single value.

## Command Grammar (BNF)

```
<CommandList>   ::= <Command> (<Command>)*
<Command>       ::= <Comment> | <Value> | <LinkCommand> | <TagCommand>
                   | <AttributeCommand> | <MultipleCommand>
<Comment>       ::= 'comment'
<LinkCommand>   ::= <LinkType> <IssueId>
<TagCommand>    ::= 'tag' (<TagName> | <NewTagName>) | 'untag' <TagName>
<StarCommand>   ::= ('unstar' | 'star') [<Username>]
<AttributeCommand>      ::= <Attribute> <Value>
<MultipleCommand>       ::= ('add' | 'remove') (<Value> | <LinkCommand>
                           | <MultipleAttributeCommand>)
<MultipleAttributeCommand> ::= <MultipleAttribute> <Value>
```
