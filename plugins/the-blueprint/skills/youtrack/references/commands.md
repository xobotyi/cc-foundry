# YouTrack Commands

Command syntax as documented for 2026.2. A command is a series of attribute-and-value pairs applied to one or more
issues at once. The grammar is case-insensitive.

Commands are not queries. Colons, braces, and `#` do not apply. The query `for: me tag: {YouTrack Mobile} #critical`
becomes the command `for me tag YouTrack Mobile critical`.

Transmission is `POST /api/commands` with the command text in `query` and an `issues` array of `id` or `idReadable`. A
request that names no field projection answers `200` with an empty body by design; ask for a projection to get the
applied state back. `muteUpdateNotifications=true` suppresses the request's own notifications, needs Apply Commands
Silently permission in every affected project, and never mutes notifications raised by workflow rules.

## Simple commands

- **`comment`** — adds a comment; the text goes in a separate field, with an optional visibility group.
- **`delete`** — deletes the selected issues.
- **`clone`** — copies the selected issues. Also written `action clone`.
- **`move to <project name>`**, alias **`project <project name>`** — moves the selected issues. The project name alone
  works as a single value.

## Custom fields

`<field name> <value>` sets a field. The field name is omissible where the value is unambiguous — YouTrack resolves
which fields use that value.

- **A field managed by a state-machine rule takes the transition name**, not the target value: `<field name> <event>`.
  The names come from `possibleEvents(id)` on the issue's custom field, never from the field's value set.
- **The empty value's own name clears the field**, where the field defines one. `Unassigned` clears Assignee.
- **Escape reserved characters in a string value with a backslash**:
  `Published assets for \"Expressive Kotlin\" webinar`.
- **A date field accepts a relative parameter**, resolved to the first value in the range: `Due Date Next month` sets
  the first day of next month.
- **`State Duplicates` is the only command taking extra parameters** — it needs the duplicates link type and the target
  issue ID in the same command.

Multi-value fields:

- **`add <field name> <value>`** — adds one value, leaving the others in place.
- **`remove <field name> <value>`** — removes one value, leaving the others in place.

With Update Project permission, a value absent from the field's set can be added from the command dialog.

Default field aliases — these collide, so prefer the full field name in a constructed command:

- **`for`, `assigned to`** → Assignee
- **`in`** → Subsystem
- **`affects`, `that affect`, `affecting`** → Affected versions
- **`fix for`, `fixed in`, `version`** → Fix versions
- **`fixed in build`, `build`** → Fixed in build

## Assignee

- **`for <username>`** or **`assigned to <username>`** — assigns.
- **`for me`**, **`assigned to me`**, or the bare **`me`** / **`my`** — assigns to the current user.
- **`<username>`** alone — assigns to that user.
- **`Unassigned`** — clears the field.
- **`add <username>`** / **`remove <username>`** — for a multi-value assignee field.

## Links

`<link type> <issue ID>` adds a link, with `add` and `remove` variants: `add <link type> <issue ID>`,
`remove <link type> <issue ID>`. Custom link types use their outward and inward names the same way.

Each command writes both sides:

- **`depends on <ID>`** — adds Depends on to the target; adds Is required for on the target issue.
- **`is required for <ID>`** — adds Is required for; adds Depends on on the target issue.
- **`subtask of <ID>`** — adds Subtask of; adds Parent for on the target issue.
- **`parent for <ID>`** — adds Parent for; adds Subtask of on the target issue.
- **`duplicates <ID>`** — adds Duplicates; adds Is duplicated by on the target issue.
- **`is duplicated by <ID>`** — adds Is duplicated by; adds Duplicates on the target issue.
- **`relates to <ID>`** — adds Relates to on both.

## Tags

- **`tag <tag name>`**, also **`add tag <tag name>`** or the bare tag name as a single value — adds the tag. **A tag
  that does not exist is created**, so a typo silently produces a new tag.
- **`untag <tag name>`**, also **`remove tag <tag name>`** — removes the tag.

## Work items

`work <work item type> <date> <time period> <description>`, in that order.

- **work item type** — optional.
- **date** — optional, `yyyy-mm-dd`, defaulting to today.
- **time period** — mandatory.
- **description** — optional.

Also `add work <work item>`. `remove` is not supported for work items.

## Visibility

- **`visible to <group|username>`** — sets issue visibility.
- **`add visible to <group|username>`** / **`remove visible to <group|username>`** — edits the list.

## Voters and watchers

- **`vote`**, alias **`+1`** — votes for the issue. **`unvote`** removes the vote.
- **`star <username>`**, alias **`watcher <username>`** — adds the Star tag on that user's behalf, which adds them to
  the watchers. Also `add star <username>`.
- **`unstar <username>`** — removes the Star tag. The user can still remain a watcher for other reasons.

## Boards

- **`Board <board name> <sprint name>`** — assigns to that sprint. `{current sprint}` substitutes for the name. On a
  board using Add new issues to sprint, `Default` names the sprint chosen in the board settings.
- **`add Board <board name> <sprint name>`** — adds to that sprint.
- **`add Board <board name>`** — adds to the board, and to the current sprint where sprints are enabled.
- **`remove Board <board name> <sprint name>`** — removes from that sprint.
- **`remove <board name>`** — removes from every sprint on the board. Two configurations behave differently: a board
  with sprints enabled and Link sprints to custom field reassigns the issues to the sprint matching the field's empty
  value instead of removing them, and a board with sprints disabled using Filter cards to match a query rejects the
  command — the issue leaves that board only by ceasing to match the query.

## Gantt charts

- **`Gantt <chart name>`** — assigns to the chart. Also `add Gantt <chart name>` and `remove Gantt <chart name>`.

## Grammar

```
<CommandList>              ::= <Command> (<Command>)*
<Command>                  ::= <Comment> | <Value> | <LinkCommand> | <TagCommand>
                             | <AttributeCommand> | <MultipleCommand>
<Comment>                  ::= 'comment'
<LinkCommand>              ::= <LinkType> <IssueId>
<TagCommand>               ::= 'tag' (<TagName> | <NewTagName>) | 'untag' <TagName>
<StarCommand>              ::= ('unstar' | 'star') [<Username>]
<AttributeCommand>         ::= <Attribute> <Value>
<MultipleCommand>          ::= ('add' | 'remove') (<Value> | <LinkCommand>
                             | <MultipleAttributeCommand>)
<MultipleAttributeCommand> ::= <MultipleAttribute> <Value>
```
