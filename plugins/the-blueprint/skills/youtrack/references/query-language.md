# YouTrack Query Language Reference

Complete syntax for searching issues in YouTrack. The query language is case-insensitive
and uses `attribute: value` syntax for structured search.

## Issue Attributes

Base attributes set automatically by YouTrack:

| Attribute | Value | Returns |
|-----------|-------|---------|
| `project` | project name or ID | Issues in the specified project |
| `created` | date or period | Issues created on date or within period |
| `updated` | date or period | Issues last changed on date or within period |
| `resolved date` | date or period | Issues resolved on date or within period |
| `reporter` | user or group | Issues created by the specified user |
| `updater` | user or group | Issues last updated by the specified user |
| `commenter` | user or group | Issues commented by the specified user |
| `commented` | date or period | Issues with comments added on date or within period |
| `summary` | text | Issues matching text in summary |
| `description` | text | Issues matching text in description |
| `comments` | text | Issues matching text in comments |
| `code` | text | Issues matching text in code-formatted blocks |
| `tag` | tag name | Issues with the specified tag |
| `visible to` | user or group | Issues visible to the specified user/group |
| `voter` | user or group | Issues voted on by the specified user |
| `saved search` | name | Issues matching a saved search |
| `issue ID` | issue ID | Exact issue by ID |
| `links` | issue ID | Issues linked to the specified issue |
| `looks like` | issue ID | Issues with similar summary/description text |
| `mentions` | issue ID or user | Issues mentioning the specified issue or user |
| `mentioned in` | issue ID | Issues referenced in the target issue |
| `attachments` | filename | Issues with matching attachment filenames |
| `attachment text` | text | Issues with matching text in image attachments |
| `vcs changes` | commit hash | Issues linked to the specified commit |
| `Board <name>` | sprint name | Issues assigned to the specified sprint |
| `Gantt` | chart name | Issues assigned to the specified Gantt chart |
| `document type` | Issue or Ticket | Filter by document type |

## Default Custom Field Attributes

These correspond to default fields — actual names may be customized per-project:

| Attribute | Value | Aliases |
|-----------|-------|---------|
| `Assignee` | user or group | `for`, `assigned to` |
| `State` | value, `Resolved`, `Unresolved` | — |
| `Priority` | value | — |
| `Type` | value | — |
| `Subsystem` | value | `in` |
| `Affected versions` | value | `affects`, `affecting` |
| `Fix versions` | value | `fix for`, `fixed in` |
| `Fixed in build` | value | `fixed in build` |

Any custom field can be searched with `<field name>: <value>`. Enclose names with spaces
in braces: `{My Custom Field}: value`.

Empty field search: `<field name>: {No <field name>}` or `has: -<field name>`.

## Issue Link Search

Search by link type using inward or outward names:

| Syntax | Returns |
|--------|---------|
| `depends on: PROJ-123` | Issues that depend on PROJ-123 |
| `is required for: PROJ-123` | Issues required for PROJ-123 |
| `subtask of: PROJ-123` | Subtasks of PROJ-123 |
| `parent for: PROJ-123` | Parent issues of PROJ-123 |
| `duplicates: PROJ-123` | Issues that duplicate PROJ-123 |
| `relates to: PROJ-123` | Issues related to PROJ-123 |
| `links: PROJ-123` | Issues linked to PROJ-123 (any type) |

**Sub-query syntax** — find issues linked to issues matching a query:
```
subtask of: (State: Open and project: PROJ)
depends on: (for: me and #Unresolved)
```

**Aggregate search** — find indirectly linked issues:
```
aggregate subtask of: PROJ-123
```

## has Keyword

`has: <attribute>` returns issues containing a value for the attribute.
`has: -<attribute>` returns issues with empty values.

Supported with: `attachments`, `boards`, `Board <name>`, `comments`, `description`,
`<field name>`, `Gantt`, `<link type>`, `links`, `star`, `votes`, `vcs changes`, `work`.

Example: `has: {subtask of}` — issues that are subtasks.
Example: `has: -{subtask of}` — issues that are NOT subtasks.

## Time Tracking Search

| Attribute | Value | Returns |
|-----------|-------|---------|
| `work` | text | Issues with matching text in work items |
| `work author` | user | Issues with work items by user |
| `work type` | value | Issues with work items of specified type |
| `work date` | date or period | Issues with work items in timeframe |
| `work <attribute>` | value | Issues with custom work item attribute |

## Keywords

Keywords are used as single values with `#` or `-` prefix:

| Keyword | Meaning |
|---------|---------|
| `me` / `my` | Current user — works with any user-type attribute |
| `Resolved` | Issues where all state-type fields are in resolved values |
| `Unresolved` | Issues where any state-type field is unresolved |
| `Released` | Version field values marked as released (use with version attributes) |
| `Archived` | Version field values marked as archived (use with version attributes) |

`#me` alone returns issues assigned to, reported by, or commented by the current user
(including custom user-type fields).

Default resolved states: Fixed, Won't fix, Duplicate, Incomplete, Obsolete, Can't reproduce.
Default unresolved states: Submitted, Open, In Progress, Reopened, To be discussed.

## Operators

**Default behavior** (no explicit operators):
- Multiple attributes → conjunctive (AND)
- Multiple values for one attribute → disjunctive (OR)
- Multiple text words → conjunctive (AND)

**Explicit operators:**
- `and` — both conditions must match, higher priority than `or`
- `or` — either condition matches
- `( )` — group conditions, processed first. All operators joining parenthetical
  statements to neighbors must be explicit.

Examples:
```
in: Ktor #Critical or in: Kotlin #Major and for: me
(in: Kotlin #Critical or in: Ktor #Major) and for: me
```

## Symbols

| Symbol | Purpose | Example |
|--------|---------|---------|
| `-` | Exclude value | `#unresolved -minor` |
| `#` | Single value reference | `#me #Unresolved` |
| `,` | Separate values | `State: Open, {In Progress}` |
| `..` | Range | `created: 2024-01-01 .. 2024-12-31` |
| `*` | Wildcard (zero+ chars) | `tag: refactoring*`, `created: * .. 2024-01-01` |
| `?` | Single char wildcard (text only) | `description: prioriti?e` |
| `{ }` | Enclose values with spaces | `tag: {to be tested}` |

## Date and Period Values

**Formats:** `YYYY-MM-DD`, `YYYY-MM`, `MM-DD`, `HH:MM:SS`, `HH:MM`,
`YYYY-MM-DDThh:mm:ss`

**Predefined relative dates:**

| Parameter | Meaning |
|-----------|---------|
| `Now` | Current instant |
| `Today` / `Tomorrow` / `Yesterday` | Calendar day |
| `Monday` .. `Sunday` | Day of current week |
| `{Last working day}` | Most recent working day per time tracking settings |
| `{This week}` / `{Last week}` / `{Next week}` | Mon 00:00 – Sun 23:59 |
| `{Two weeks ago}` / `{Three weeks ago}` | Calendar week periods |
| `{This month}` / `{Last month}` / `{Next month}` | Full calendar months |
| `Older` | Jan 1, 1970 to end of month two months ago |

**Custom relative dates:**
- Past: `{minus <duration>}` — e.g., `{minus 7d}`, `{minus 1y 6M}`
- Future: `{plus <duration>}` — e.g., `{plus 5d}`
- Duration units: `y` (years), `M` (months), `w` (weeks), `d` (days), `h` (hours)
- Minutes and seconds are not supported

Examples:
```
commented: {minus 7d} .. Today
updated: {minus 2h} .. *
created: * .. {minus 1y 6M} #Unresolved
Due Date: {plus 5d}
```

## Sort

`sort by: <attribute> asc|desc` — append to any query.
Multiple sort keys: `sort by: priority asc, created desc`.

## Search Query Grammar (BNF)

```
<SearchRequest>    ::= <OrExpression>
<OrExpression>     ::= <AndExpression> ('or' <AndExpression>)*
<AndExpression>    ::= <AndOperand> ('and' <AndOperand>)*
<AndOperand>       ::= '(' <OrExpression>? ')' | <Term>
<Term>             ::= <TermItem>*
<TermItem>         ::= <QuotedText> | <NegativeText> | <PositiveSingleValue>
                     | <NegativeSingleValue> | <Sort> | <Has>
                     | <CategorizedFilter> | <Text>
<CategorizedFilter>::= <Attribute> ':' <AttributeFilter> (',' <AttributeFilter>)*
<AttributeFilter>  ::= ('-'? <Value>) | ('-'? <ValueRange>) | <LinkedIssuesQuery>
<LinkedIssuesQuery>::= '(' <OrExpression> ')'
<ValueRange>       ::= <Value> '..' <Value>
<PositiveSingleValue> ::= '#' <SingleValue>
<NegativeSingleValue> ::= '-' <SingleValue>
<Sort>             ::= 'sort by:' <SortField> (',' <SortField>)*
<SortField>        ::= <SortAttribute> ('asc' | 'desc')?
<Has>              ::= 'has:' <Attribute> (',' <Attribute>)*
<Value>            ::= <ComplexValue> | <SimpleValue>
<SimpleValue>      ::= <value without spaces>
<ComplexValue>     ::= '{' <value with spaces> '}'
```
