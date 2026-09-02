# YouTrack Query Language

Search syntax as documented for 2026.2. The grammar is case-insensitive. Attribute search is `attribute: value`; several
values for one attribute are comma-separated; `attribute: -value` excludes.

## Sending the query

A query is only correct if the server receives it whole. Every failure below returns `200` with the wrong rows rather
than an error.

- **URL-encode the entire query string.** `#` becomes `%23`, `{` becomes `%7B`, `}` becomes `%7D`, spaces become `%20`.
  An unencoded `#` opens a URL fragment: the server never sees it or anything after it, and the search runs with
  whatever filter survived.
- **Search is GET only.** The query travels in a `query` parameter on issue and tag collections; there is no POST search
  endpoint, so a long query has to survive as a URL query string.
- **Set an explicit page size and page until a short page returns.** Most collections cap low, and the issue collection
  caps at an instance export setting no API call reports.
- **A query naming no sort returns `updated desc`** — the most recently touched issues, not the most relevant.
- **An empty result is not proof of absence.** Requests run with the caller's permissions, and MCP responses
  additionally omit projects and issues hidden from AI tools without saying so.

## Query patterns

Shapes for the searches an agent runs most. Substitute the project short name, the field names, and the values the
project actually defines.

```
issue ID: PROJ-142                          one issue, without the text match a bare ID adds
in: PROJ #Unresolved summary: pagination    candidate duplicates of a reported defect
in: PROJ #Unresolved has: -Assignee         unassigned open work
in: PROJ for: me #Unresolved                the caller's open work in one project
in: PROJ updated: {minus 7d} .. Now         what moved in the last week
in: PROJ State: {In Progress}               a field value whose name contains a space
in: PROJ Type: Bug Priority: Critical, Major   two attributes AND, two values OR
Subtask of: PROJ-142                        direct children
aggregate Subtask of: PROJ-142              the whole subtree
in: PROJ created: * .. {minus 1y} #Unresolved   stale open work, open-ended range
in: PROJ has: attachments , -comments       carries attachments and no comments
sort by: {issue id} desc                    appended to any of the above
```

## Where a query fails quietly

- **A bare issue ID is both an ID match and a text search**, so it returns every issue mentioning the string. Quoting it
  makes it a text search alone. Use `issue ID:` or `#`.
- **Braces are a loose OR, quotes are a phrase.** `summary: {scrum board}` matches either word;
  `summary: "Agile management"` matches the words in order. Choosing braces where a phrase was meant widens the result
  set silently.
- **An hour unit filters to an hour, not to a window.** `created: {minus 48h}` returns the issues created inside one
  hour two days ago. A window is a range.
- **`#Resolved` and `#Unresolved` are not complements** where a project carries more than one state-type field.
- **An alias can address two fields.** `in` addresses both project and Subsystem; `fix for` and `fixed in` address both
  Fix versions and Fixed in build. Prefer the full field name in anything constructed rather than copied.
- **A parenthetical needs its operator written out.** `in: Kotlin #Critical (in: Ktor and for: me)` does not parse.

## Base attributes

Set automatically by YouTrack. An attribute marked with an alias accepts either form.

- **`project`** — project name or ID. Alias: `in`. Also usable as a bare single value.
- **`created`**, **`updated`**, **`resolved date`** — date or period.
- **`reporter`** — user or group. Aliases: `by`, `created by`, `reported by`.
- **`updater`** — user or group. Alias: `updated by`.
- **`commenter`** — user or group. Alias: `commented by`.
- **`commented`** — date or period the comment was added.
- **`summary`**, **`description`**, **`comments`** — word-form text match in that part of the issue.
- **`code`** — word-form match inside inline code spans, indented and fenced code blocks, and stack traces.
- **`tag`** — tag name. Alias: `tagged as`. Also `#<tag name>` or `-<tag name>`.
- **`visible to`** — user or group the issue is visible to.
- **`voter`** — user or group. Alias: `voted by`.
- **`saved search`** — saved search name. Also `#<name>` or `-<name>`.
- **`issue ID`** — exact issue. Also `#<value>` or `-<value>`.
- **`links`** — issues carrying a link of any type to the named issue.
- **`looks like`** — issues whose summary or description shares words with the named issue; summary matches weigh more
  under relevance sorting.
- **`mentions`** — issues containing an @mention of a user or an issue ID in the description or a comment.
- **`mentioned in`** — issues whose IDs appear in the description or a comment of the named issue.
- **`attachments`** — attachment filename. Wildcards apply: `attachments: *.png`.
- **`attachment text`** — text inside image attachments. Alias: `image text`.
- **`vcs changes`** — SHA-1 commit hash.
- **`Board <board name>`** — sprint name on that board. For boards with sprints disabled, use `has: <board name>`.
- **`Gantt`** — chart name.
- **`document type`** — `Issue` or `Ticket`.
- **`organization`** — organization name. Also usable as a bare single value.

Helpdesk-facing, meaningful only in a helpdesk project:

- **`submitter`** — user or group who submitted on behalf of another. Alias: `submitted by`.
- **`cc recipients`** — users added as CC on a ticket.
- **`customer groups`** — customer group a ticket is shared with.

## Default custom field attributes

Field names, values, and aliases are per project and can be renamed. Aliases collide across fields, so prefer the full
field name in anything constructed rather than copied.

- **`Assignee`** — aliases `for`, `assigned to`.
- **`State`** — value, or the `Resolved` / `Unresolved` keywords.
- **`Priority`**, **`Type`** — value.
- **`Subsystem`** — alias `in`, which also addresses `project`.
- **`Affected versions`** — aliases `affects`, `affecting`, `that affect`.
- **`Fix versions`** — aliases `fix for`, `fixed in`, `version`.
- **`Fixed in build`** — aliases `build`, `fix build`, `fix for`, `fixed in`. The last two are shared with
  `Fix versions`.

Any custom field is searchable as `<field name>: <value>`; brace a name that contains spaces, `{My Field}: value`.

Empty values: where the field defines an empty value, search it as a value — `Assignee: Unassigned` or `#Unassigned`.
Otherwise use `<field name>: {No <field name>}` or `has: -<field name>`.

## Issue links

`<link type>: <issue ID>` returns issues linked to that issue with that type. `<link type>: (<sub-query>)` returns
issues linked to any issue matching the sub-query. Either the outward or the inward name works, including the names of
custom link types.

- `Depends on`, `Is required for`
- `Duplicates`, `Is duplicated by`
- `Subtask of`, `Parent for`
- `Relates to`
- **`links: <issue ID>`** — any link type.
- **`aggregate <aggregation link type>: <issue ID>`** — issues linked directly or indirectly, for example
  `aggregate Subtask of: JT-5072`. Only aggregation link types are compatible.

## `has`

`has: <attribute>` returns issues carrying a value; `has: -<attribute>` returns issues with an empty one. Several
attributes are comma-separated: `in: TST for: me has: duplicates , attachments , -comments`.

Supported attributes: `attachments`, `boards`, `Board <board name>`, `comments`, `description`, `<field name>`, `Gantt`,
`<link type name>`, `links`, `star`, `underestimation`, `vcs changes`, `votes`, `work`.

`underestimation` returns issues whose total spent time exceeds the original estimation. Brace names containing spaces:
`has: {Subtask of}`, `has: -{Subtask of}`.

## Time tracking

- **`work`** — text inside a work item.
- **`work author`** — user who added the work item.
- **`work type`** — work type value. `work type: {No type}` finds work items with no type.
- **`work date`** — date or period the work item records.
- **`work <attribute name>`** — a custom work item attribute.

## Keywords

Prefixed with `#` or `-`, used without an attribute.

- **`me`**, alias **`my`** — the current user; valid as a value for any user-type attribute. Alone, `#me` returns issues
  assigned to, reported by, or commented by the current user, plus any custom user-type field referencing them.
- **`Resolved`** — true only when every state-type field on the issue holds a resolved value. Resolved by default:
  Fixed, Won't fix, Duplicate, Incomplete, Obsolete, Can't reproduce.
- **`Unresolved`** — true when any state-type field holds an unresolved value. Unresolved by default: Submitted, Open,
  In Progress, Reopened, To be discussed.
- **`Released`** — the Released property of a version value. Only usable with a version field's name or alias, never as
  a bare single value. On a multi-value field, matches when at least one stored version is released.
- **`Archived`** — the Archived property of a value. On a multi-value version field, matches only when every stored
  version is archived. **The source contradicts itself on where this works.** The keyword entry restricts it to version
  fields and forbids bare single-value use, while the per-attribute Values rows on the same page list `Archived` as
  accepted for Priority, State, Type, Subsystem, and Fixed in build. Treat it as reliable on version fields and verify
  before relying on it elsewhere.

## Operators

Defaults, applied where no operator is written:

- Values for **different attributes** combine conjunctively (AND). This extends to `has:` — `has: assignee Assignee: me`
  returns only issues where an assignee is set and it is you.
- **Several words of text** combine conjunctively.
- **Several values of one attribute** combine disjunctively (OR).

Explicit operators: `and` binds tighter than `or`. Parentheses group and are processed first — and every operator
joining a parenthetical to its neighbors must be written out. `in: Kotlin #Critical (in: Ktor and for: me)` cannot be
parsed; `in: Kotlin #Critical or (in: Ktor and for: me)` can.

## Symbols

- **`-`** — excludes. With a single value, used instead of `#`: `#unresolved -minor`.
- **`#`** — marks a single value: `#my #unresolved in: MRK`.
- **`,`** — separates values of one attribute, and combines with a range: `fixed in: 1.2.1, 1.3 .. 1.5`.
- **`..`** — inclusive range: `created: 2018-03-10 .. 2018-03-13`.
- **`*`** — context-dependent wildcard. As a range bound it is open-ended (`created: * .. 2018-03-10`); in an attribute
  search it matches zero or more characters at the end of a value (`tag: refactoring*`); in text search it matches zero
  or more characters anywhere.
- **`?`** — one character, text attributes only: `description: prioriti?e`.
- **`{ }`** — encloses a value containing spaces: `tag: {to be tested}`.
- **`" "`** — a quoted phrase, matching the words in that order. `summary: {scrum board}` finds either word;
  `summary: "Agile management"` finds the phrase.

## Dates and periods

Formats: `YYYY-MM-DD`, `YYYY-MM`, `MM-DD`, `HH:MM:SS`, `HH:MM`, and `YYYY-MM-DDTHH:MM:SS` for both together.

Predefined relative parameters, resolved in the current user's time zone: `Now`, `Today`, `Tomorrow`, `Yesterday`,
`Monday` through `Sunday` (the named day of the current week), `{Last working day}`, `{This week}`, `{Last week}`,
`{Next week}`, `{Two weeks ago}`, `{Three weeks ago}`, `{This month}`, `{Last month}`, `{Next month}`, and `Older` (1
January 1970 to the last day of the month two months back). Week parameters run 00:00 Monday to 23:59 Sunday.

Custom parameters: `{minus <duration>}` for the past, `{plus <duration>}` for the future. A duration is whole numbers
with unit letters, space-separated: `2y 3M 1w 2d 12h`. Units are `y M w d h`; minutes and seconds are unsupported.

Hour precision behaves differently from day precision. At 15:35, `created: {minus 48h}` returns issues created two days
ago between 15:00 and 16:00, while `created: {minus 2d}` returns that whole day. `14d` and `2w` are identical.

```
commented: {minus 7d} .. Today
updated: {minus 2h} .. *
created: * .. {minus 1y 6M} #Unresolved
Due Date: {plus 5d}
```

## Sorting

`sort by: <attribute> asc|desc`, alias `order by`. Several keys are comma-separated:
`sort by: priority asc, created desc`.

Sortable attributes: `star`, `updated`, `updater`, `created`, `{resolved date}`, `project`, `reporter`, `{issue id}`,
`votes`, `summary`, `comments`, `<custom field>`, `{attachment size}`. `priority` sorts because it is a custom field,
not because it is a base attribute. Relevance cannot be named as a sort attribute, though a text search can be sorted by
it in the interface.

A query naming no sort returns `updated desc`.

## Grammar

```
<SearchRequest>       ::= <OrExpression>
<OrExpression>        ::= <AndExpression> ('or' <AndExpression>)*
<AndExpression>       ::= <AndOperand> ('and' <AndOperand>)*
<AndOperand>          ::= '(' <OrExpression>? ')' | <Term>
<Term>                ::= <TermItem>*
<TermItem>            ::= <QuotedText> | <NegativeText> | <PositiveSingleValue>
                        | <NegativeSingleValue> | <Sort> | <Has>
                        | <CategorizedFilter> | <Text>
<CategorizedFilter>   ::= <Attribute> ':' <AttributeFilter> (',' <AttributeFilter>)*
<Attribute>           ::= <name of issue field>
<AttributeFilter>     ::= ('-'? <Value>) | ('-'? <ValueRange>) | <LinkedIssuesQuery>
<LinkedIssuesQuery>   ::= '(' <OrExpression> ')'
<ValueRange>          ::= <Value> '..' <Value>
<PositiveSingleValue> ::= '#' <SingleValue>
<NegativeSingleValue> ::= '-' <SingleValue>
<SingleValue>         ::= <Value>
<Sort>                ::= 'sort by:' <SortField> (',' <SortField>)*
<SortField>           ::= <SortAttribute> ('asc' | 'desc')?
<Has>                 ::= 'has:' <Attribute> (',' <Attribute>)*
<QuotedText>          ::= '"' <text without quotes> '"'
<NegativeText>        ::= '-' <QuotedText>
<Text>                ::= <text without parentheses>
<Value>               ::= <ComplexValue> | <SimpleValue>
<SimpleValue>         ::= <value without spaces>
<ComplexValue>        ::= '{' <value that can contain spaces> '}'
```
