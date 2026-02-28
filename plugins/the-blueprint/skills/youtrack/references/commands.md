# YouTrack Command Reference

Commands apply changes to one or more issues. Unlike search queries, commands do not use
colons, braces, or `#` symbols.

Format: `<attribute> <value>` — e.g., `Priority Critical`, `for me`.

## Simple Commands

| Command | Description |
|---------|-------------|
| `comment` | Add a comment (text entered separately) |
| `delete` | Delete selected issues |
| `clone` | Create a copy of selected issues |

## Custom Field Commands

Set or change field values:

```
<field name> <value>
```

- If the value is unambiguous, the field name can be omitted
- For state fields governed by state machines, use the transition event name
- To clear a field, use the name of the empty value (e.g., `Unassigned`)
- Escape special characters in string values with `\`
  (e.g., `Published assets for \"Expressive Kotlin\" webinar`)
- Date fields accept relative parameters (e.g., `Due Date Next month`)

**Multi-value fields:**

| Command | Description |
|---------|-------------|
| `add <field> <value>` | Add value without removing existing values |
| `remove <field> <value>` | Remove single value from field |

## Assignee Commands

The Assignee field has special aliases:

| Command | Effect |
|---------|--------|
| `for <username>` | Assign to user |
| `for me` / `assigned to me` | Assign to current user |
| `<username>` | Assign to user (as single value) |
| `me` / `my` | Assign to current user (as single value) |
| `Unassigned` | Clear the assignee |
| `add <username>` | Assign (multi-assignee) |
| `remove <username>` | Unassign (multi-assignee) |

## Default Field Aliases

| Alias | Field |
|-------|-------|
| `for`, `assigned to` | Assignee |
| `in` | Subsystem |
| `affects`, `affecting` | Affected versions |
| `fix for`, `fixed in` | Fix versions |
| `fixed in build` | Fixed in build |

## Link Commands

Add or remove typed links:

```
<link type> <issue ID>
add <link type> <issue ID>
remove <link type> <issue ID>
```

Default link type commands:

| Command | Creates link | Reciprocal link |
|---------|-------------|-----------------|
| `depends on <ID>` | Depends on | Is required for |
| `is required for <ID>` | Is required for | Depends on |
| `subtask of <ID>` | Subtask of | Parent for |
| `parent for <ID>` | Parent for | Subtask of |
| `duplicates <ID>` | Duplicates | Is duplicated by |
| `is duplicated by <ID>` | Is duplicated by | Duplicates |
| `relates to <ID>` | Relates to | Relates to |

Custom link types use their outward/inward names as commands.

## Tag Commands

| Command | Effect |
|---------|--------|
| `tag <name>` | Add tag (creates if doesn't exist) |
| `add tag <name>` | Add tag (alternative syntax) |
| `untag <name>` | Remove tag |
| `remove tag <name>` | Remove tag (alternative syntax) |

## Work Item Commands

Log time spent:

```
work <type> <date> <duration> <description>
```

| Parameter | Required | Format |
|-----------|----------|--------|
| work item type | Optional | Work type name |
| date | Optional | `YYYY-MM-DD` (defaults to today) |
| duration | **Mandatory** | Time period (e.g., `2h 30m`) |
| description | Optional | Text description |

Also: `add work <work item>`. The `remove` command is not supported for work items.

## Visibility Commands

| Command | Effect |
|---------|--------|
| `visible to <group/user>` | Set issue visibility |
| `add visible to <group/user>` | Add to visibility list |
| `remove visible to <group/user>` | Remove from visibility list |

## Board and Sprint Commands

| Command | Effect |
|---------|--------|
| `Board <name> <sprint>` | Assign to sprint on board |
| `Board <name> {current sprint}` | Assign to current sprint |
| `add Board <name> <sprint>` | Add to sprint |
| `add Board <name>` | Add to board (current sprint if sprints enabled) |
| `remove Board <name> <sprint>` | Remove from sprint |
| `remove Board <name>` | Remove from all sprints on board |

## Voter and Watcher Commands

| Command | Effect |
|---------|--------|
| `vote` / `+1` | Vote for issue |
| `unvote` | Remove vote |
| `star <username>` | Add Star tag for user (adds to watchers) |
| `unstar <username>` | Remove Star tag for user |

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
