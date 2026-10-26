import type { Finding } from "./finding.ts";

export type Format = "text" | "github";

/** Renders findings for a terminal, or as GitHub Actions workflow commands that annotate the files. */
export function formatFindings(findings: readonly Finding[], format: Format): string {
  const sorted = findings.toSorted((a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));
  const lines = sorted.map(format === "github" ? githubLine : textLine);
  lines.push(summary(findings));
  return lines.join("\n") + "\n";
}

function textLine(f: Finding): string {
  const where = f.line === undefined ? f.file : `${f.file}:${f.line}`;
  return `${f.severity.padEnd(7)} ${where}  [${f.rule}] ${f.message}`;
}

function githubLine(f: Finding): string {
  const props = [`file=${escapeProperty(f.file)}`];
  if (f.line !== undefined) props.push(`line=${f.line}`);
  props.push(`title=${escapeProperty(f.rule)}`);
  return `::${f.severity} ${props.join(",")}::${escapeData(f.message)}`;
}

function summary(findings: readonly Finding[]): string {
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.length - errors;
  return `${errors} ${errors === 1 ? "error" : "errors"}, ${warnings} ${warnings === 1 ? "warning" : "warnings"}`;
}

// constraint: GitHub's workflow-command syntax reserves these characters; see "Workflow commands for GitHub Actions"
function escapeData(value: string): string {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}
