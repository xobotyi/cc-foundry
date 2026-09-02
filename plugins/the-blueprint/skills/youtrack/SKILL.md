---
name: youtrack
description: >-
  Work YouTrack as an agent: what a project configures rather than fixes, what a write changes besides the field it
  names, and which failures report success. Not what a work item should say.
when_to_use: >-
  Invoke whenever YouTrack is touched at all — creating or updating an issue, searching, setting a custom field,
  linking, moving a state, tagging, logging time, or applying a command. Also invoke on the symptoms: a state change
  that reported success and did not happen, a command that answered 200 with an empty body, a search returning
  everything or nothing, a field that reverted after a write, spent time nobody logged, a tag that vanished on
  resolution. Covers YouTrack behavior; what a work item contains belongs to task-creation, and splitting work into
  items belongs to tasks.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

**Nothing about a YouTrack project is guessable.** Field names, their types, their allowed values, which of them are
required, which transitions a state accepts, which link types exist, what a tag does when the issue resolves — every one
of these is set per project or per instance, and every one changes what a write must contain. The API reference
documents the shapes; only the instance knows the values. Read the project's configuration before the first write, and
read it again after changing a field that governs another.

**Success is not evidence that anything changed.** A command request that asks for no field projection answers `200`
with an empty body by design, so the response carries nothing to check. A create can partially fail, applying the issue
and silently dropping custom-field writes. A state write on a governed field can be refused by a rule. Read the issue
back after every write, and ask for a projection wherever the endpoint offers one.

**An empty result never proves absence.** YouTrack filters projects and issues hidden from AI tools out of MCP responses
without signalling the omission, a collection read truncates at an instance cap when no explicit limit is set, and a
query naming no sort returns the most recently updated issues rather than the most relevant. A duplicate search reports
what was found, never what exists.

## Reach past the tool list

- **The tool list is narrower than YouTrack.** The MCP server built into YouTrack, at `https://<instance>/mcp` since
  2025.3, has its list reshaped by the connection URL. An operation missing from `tools/list` may be filtered out rather
  than absent, and attachments, arbitrary commands, deletion, and link removal have no tool at all. They remain ordinary
  REST calls.
- **Let the server describe its own tools.** Names, arguments, and output shapes come from `tools/list` and from each
  tool's description, never from memory. The published documentation names the tools but does not carry their full input
  schemas, and a live schema has been reported rejecting a value the prose documents as valid — so the schema the server
  returns is the authority, not the help page.
- **The issue search tool returns no custom fields.** Type, State, Priority, and Assignee need a per-issue read, so
  filtering on a field the search result omits is a two-pass operation.
- **The value shape belongs to the transport, not to YouTrack.** REST takes an object where a third-party MCP server may
  take a plain string. Read the tool's own input schema rather than carrying a shape across transports.
- **Confirm the first write on an unfamiliar instance.** The tool descriptions call the create and update tools writes;
  the security section of the same documentation set calls the predefined tools read-only. The contradiction is
  unresolved in the published material, so treat a first write as unproven until a read returns the new value.
- **A project can watch for MCP-originated changes.** An on-change workflow rule guarded by `ctx.isMcpRequest` runs only
  for requests arriving through the server, so an edit that comes back tagged or audited is configuration, not a defect.

## Discover the project before writing to it

- **Read the field schema before the first create or update.** Over MCP that read is documented as an obligation, not as
  advice. Over REST the project's custom-field resource answers types, cardinality, required status, and allowed values
  in one call.
- **A project is addressed by its entity ID, not by the short name in an issue ID.** `SP-13` carries `SP`, which is not
  the form a create call takes.
- **Required is two readable attributes on an enumerated field, not one.** The bundle defaults expose the default values
  and the can-be-empty flag separately, and the flag can only be disabled once a default is set. Read both rather than
  inferring the rule from the flag alone.
- **A schema that reports a field as optional can still refuse the create.** A workflow can require a field the schema
  does not mark, and conditional fields have been reported as globally required by the schema call. Schema discovery
  narrows the guess; it does not guarantee the write.
- **Cardinality is not derivable from the project field's type.** Single-value and multi-value forms of the same field
  report the same project-field type. Take cardinality from the field's own type descriptor, because guessing it picks
  the wrong write shape and fails the write.
- **A field is cleared with the literal the project set for its empty value** — `Unassigned`, `No Priority`, whatever
  that project chose — not with an empty string.
- **Prefer a field's full name over an alias.** Aliases collide: one alias addresses both a project and a subsystem, and
  another addresses both a version field and a build field. Where an alias is unavoidable, read the field's own alias
  list.
- **Link types are global to the instance, not per project.** An instance can carry a custom type whose names nearly
  duplicate a default one.
- **A field can be hidden, conditional, or private.** A conditional field is required only when its condition holds, and
  a required private field blocks every user without private-field permission from creating issues at all.

## Write a field by the shape its category takes

- **Take the write-time type from a read of the issue, not from a remembered mapping.** A write names the field, the
  type of the issue's custom field, and a value whose shape follows the field's category; reading the issue's current
  custom fields returns that type for every field, already correct for this issue including any rule governing it.
- **Sending the project-field type where the issue-field type belongs returns a 500** carrying a raw Java cast message.
  That 500 is the caller's mistake, not a server fault — correct the type rather than retrying.
- **The mapping has exceptions, which is why it is read and never inferred.** The single-value state type carries no
  `Single` prefix, unlike every other single-value enumerated field, and `date` has a dedicated type while the more
  specific `date and time` falls back to the simple one. A name assembled by pattern is wrong often enough to matter.
- **A state-machine rule overrides the mapping entirely, and not only for state fields.** A governed field reports
  `StateMachineIssueCustomField` whatever its underlying type, because a rule can govern any enumerated field. Take the
  type from the issue rather than deriving it from the field.
- **The value shape follows the field's category.** A single-value enumerated field takes one object and its multi-value
  form an array of them; integer, float, and string take primitives; date and date-and-time take epoch milliseconds; a
  period takes minutes or a presentation string; text takes an object. Users are addressed by login, everything else
  enumerated by name.
- **A field under a state-machine rule is written through its transition, not its value.** Send the transition
  identifier as the field's event. That event is write-only and reads back empty, so confirm the change through the
  field's value or through a refreshed list of available transitions.
- **A create can apply the issue and drop the field writes.** JetBrains' own agent guidance tells its agents to re-read
  the issue after creation and to check the response for the fields that failed to update, because custom-field writes
  can partially fail while the create reports success.
- **Updates are partial and there is no PATCH.** Posting a subset of fields updates those fields; it does not replace
  the issue.
- **Moving an issue between projects enforces nothing.** Required fields are checked on create and on direct edit only,
  so a moved issue can sit in a project violating that project's own rules with no call reporting it. Set the
  destination's required fields explicitly after a move.
- **An issue cannot be created with attachments in one request.** Attach to an issue that already exists.

## Send the query in a form the server receives

- **URL-encode the whole query value, and never put a literal `#` in a constructed URL.** A `#` opens a URL fragment,
  which the client does not transmit, so the server receives a truncated query and answers it. What comes back is a
  successful search over the wrong filter.
- **Search is GET only.** There is no POST search endpoint, so a long query has to survive as a URL query string.
- **Always set an explicit page size and page until a short page returns.** Most collections cap low; the issue
  collection caps at an instance export setting that is unknowable without an administrator.
- **Address one issue by an ID term, never by the bare ID and never in quotes.** A bare ID is parsed as an ID match
  _and_ a text search, returning every issue that mentions the string; quoting it makes it a text search alone.
- **Braces are a loose OR, quotes are a phrase.** `summary: {scrum board}` matches either word;
  `summary: "Agile management"` matches the words in order. Choosing braces where a phrase was meant silently widens the
  result set.
- **An hour unit filters to an hour, not to a window.** `created: {minus 48h}` returns issues created inside one hour
  two days ago; a window is a range. Units are `y M w d h` only.
- **`#Resolved` and `#Unresolved` are not complements** in a project with more than one state-type field. Resolved holds
  when _all_ state fields carry a resolved value; Unresolved holds when _any_ one does not.
- **Aggregation queries work only with aggregation link types**, which among the defaults means subtasks and duplicates.

The forms a simple search needs:

```
in: PROJ #Unresolved for: me              attribute filters and a keyword
State: {In Progress}                      braces wrap a value containing spaces
Priority: Critical, Major                 several values of one attribute are OR
in: PROJ has: -Assignee                   has: -x finds an empty field
updated: {minus 7d} .. Now                a window is a range, never a single unit
issue ID: PROJ-142                        one issue, without the text match a bare ID adds
sort by: {issue id} desc                  default without this is updated desc
```

Attributes and their aliases, keywords, link and sub-query forms, date parameters, sorting, the query patterns for the
searches an agent runs most, the transmission rules, and the grammar:
`${CLAUDE_SKILL_DIR}/references/query-language.md`. Read it before writing any query beyond the forms above.

## Change a state by its transition name

- **A state-machine rule prohibits every transition it does not define.** Reachable values depend on the current value,
  so a state cannot be set arbitrarily; it moves one defined transition at a time.
- **The transition, not the target value, is what a command names.** On a governed project `State fix` may be correct
  where `State Fixed` is not. Transition names come from the rule, are project-specific, and cannot be guessed — read
  the issue's own list of currently available transitions, where the identifier doubles as the command word and the
  presentation is the label a person sees.
- **Under a per-issue-type rule, changing the type changes which transitions are legal.** Re-read the available
  transitions after any write touching the governing field.
- **A guard can refuse a transition that the option list still offers.** Whether an explanation reaches the caller
  depends on the rule author having written one, and how a refusal surfaces to an API caller is not documented. Never
  read the absence of an error as evidence the state moved — read the value back.
- **A final state has no outbound transitions and cannot be changed once set.** Resolving an issue on such a project is
  potentially irreversible and is treated as such.
- **A read-back can legitimately differ from what was sent.** Entry and exit actions run immediately as the calling
  user; timed transitions run later as the workflow account. A field that "reverted" is usually a workflow, not a lost
  write.

## Record time through work items, not through the field

- **Spent time is not a field to set.** It reports the total of the work items attached to the issue, so time is
  recorded by adding a work item and never by writing the field.
- **A state change can book time under the caller's identity.** Where time tracking is enabled, a `date and time` field
  named `Timer time` exists on the project, and the In Progress Work Timer workflow is attached, entering the
  in-progress state stamps `Timer time` and leaving it adds a work item for the elapsed period, on behalf of the user
  who made the change. An agent moving issues through states on someone's token books hours against that account.
- **The accrued value is not the wall-clock difference between two transitions.** Workflow timers follow the instance's
  global time-tracking settings: they record on workdays only, stop at the configured working period for a day, and
  resume the next workday.
- **Whether a project does this is invisible on the issue.** Attached workflows are project configuration, not issue
  data, so spent time appearing after a state write is a workflow acting, not a stray edit.
- **Estimation is an ordinary field and spent time is not**, though they sit together in the field list and read alike.

## Link issues by link type, not by description

- **A link type carries several names and they are not interchangeable.** The type's own name is a singular noun, while
  every command and every search term uses the directional name, and the two directions have separate names.
- **Directedness and aggregation are independent properties.** Duplicates and subtasks are both, so the Directed /
  Undirected / Aggregation labelling in the end-user documentation is a lossy presentation of two flags. Classify a
  custom link type by reading both.
- **Adding a link writes both sides.** Writing the reciprocal by hand creates nothing and costs a call.
- **Links and hierarchy are read-only attributes of an issue.** A parent or subtask is readable there but writable only
  as a link, and no link can be set in a create or update body.
- **Reading an issue's links returns one entry per link type on the instance**, most with an empty list. The number of
  entries is the number of link types, not the number of links.
- **The duplicate and subtask types cannot be edited** even by an administrator.
- **Relationships belong in links, not in description text.** A link is queryable, bidirectional, and survives renames
  and moves; a sentence naming an issue ID is none of those.

## Apply commands with a pre-flight and a read-back

- **Validate an assembled command before applying it.** The command-assist endpoint returns the parse error and
  suggestions evaluated in the target issue's context. Assist first whenever the command text was constructed rather
  than copied.
- **A 200 proves acceptance, not effect**, because a request that asks for no field projection answers with an empty
  body by design. Ask for the applied state in the projection, or read the issue afterwards.
- **Command syntax is not query syntax.** Commands use no colons, no braces, and no `#`. The query
  `for: me tag: {YouTrack Mobile} #critical` becomes the command `for me tag YouTrack Mobile critical`.
- **A relative date resolves to the first value in its range.** `Due Date Next month` sets the first day of next month.
- **Marking a duplicate takes the link and the target in the same command** — setting the state alone leaves the work
  half done.
- **Silencing notifications on bulk work needs a permission** in every affected project, and it never mutes
  notifications sent by workflow rules.
- **Prefer the issue write for field values and a command for links.** The issue write returns the applied state and
  reports required-field and conditional-field errors in a structured body; the command endpoint does neither.

Every command form with its `add` and `remove` variants and the grammar: `${CLAUDE_SKILL_DIR}/references/commands.md`.
Read it before sending a command whose exact form this section does not give.

## Treat a tag as an impermanent marker

- **A tag can remove itself.** A tag configured to untag on resolution drops off the issue when the issue resolves, with
  no further call. A tag is therefore not a durable marker on anything heading toward a resolved state.
- **The two transports disagree on a missing tag.** The tag tool returns an error with suggestions when no tag matches;
  the tag command silently creates the tag and applies it, turning a typo into a new near-duplicate tag on the project.
- **A tag applied by name matches the first tag with that name.** Another user's personal tag is invisible to the caller
  and cannot be the match, so the collision that matters is the caller's own personal tag against a shared tag of the
  same name.
- **Tags are writable in an issue write body, unlike links.**

No documented request-rate limit and no canonical 403 body were found in JetBrains' published material — which is not
the same as their absence. Batch reads with an explicit field list and page size rather than issuing many small calls,
and do not write retry logic around a throttling contract nobody has published.
