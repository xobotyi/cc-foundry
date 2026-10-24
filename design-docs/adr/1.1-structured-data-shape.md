# 0001 — KV lists over tables for independent-entry data

- **Status:** accepted
- **Date:** 2026-06-02

## Context

Structured-data format affects LLM accuracy by up to 16pp on identical content. Benchmarks show key-value / bullet lists
outperform markdown tables by ~8.8pp on lookup tasks — cases where each entry is read independently and no cross-row
comparison happens. Tables only help when the reader scans across columns to compare alternatives.

Wide tables have a second failure mode: a description column with long cells overflows terminal and viewer widths and
renders incorrectly (observed in plugin `CLAUDE.md` skill registries, where a Purpose column carried 200+ character
cells).

## Decision

Independent-entry data — skill registries, route-to-reference lists, tool references, configuration mappings, hook
events, permission modes — uses KV or bullet lists (`- **key** — value`).

Reserve markdown tables for genuine 2D comparisons where removing a column loses comparative meaning: decision matrices,
feature comparisons, static-vs-dynamic dispatch tables, cost comparisons.

The test: if removing a column would lose comparative meaning, it is a table; otherwise it is a KV list.

## Consequences

- A standing migration converts legacy independent-entry tables to KV lists across existing skills and plugin docs.
  Genuine 2D comparison tables stay as tables.
- New and reviewed skill content is audited for table misuse. Converting a misused table to a KV list is a mechanical
  change with a measurable accuracy gain.
