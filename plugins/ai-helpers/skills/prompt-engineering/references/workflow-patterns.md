# Workflow Patterns

Techniques for structuring multi-step prompting workflows.

## Prompt Chaining

Decompose complex tasks into a sequence of simpler prompts, where
each prompt's output feeds the next.

### Why Chain Prompts

**Single complex prompt problems:**
- Error propagation — one mistake ruins everything
- Hard to debug — unclear where things went wrong
- Inconsistent quality — too many requirements at once

**Chaining benefits:**
- Validate at each step
- Clear failure points
- Modular, reusable components
- Better quality control

### Chain Architecture

```
[Input] → Prompt 1 → [Output 1]
                         ↓
         Prompt 2 ← [Input 2]
              ↓
         [Output 2] → Prompt 3 → [Final Output]
```

### Example: Document Analysis

**Monolithic (problematic):**
```
Read this document. Extract key facts, identify the main argument,
assess the quality of evidence, note any logical fallacies, and
write a 200-word critical summary.
```

**Chained (better):**
```
Chain 1: "Extract the 5 most important facts from this document."
     → [facts]

Chain 2: "Based on these facts, what is the author's main argument?"
     → [argument]

Chain 3: "Evaluate the evidence quality: strong, moderate, or weak.
          List supporting and contradicting points."
     → [evaluation]

Chain 4: "Using this analysis, write a 200-word critical summary."
     → [final summary]
```

### Design Principles

**Single responsibility:** Each prompt does one thing well.

**Clear interfaces:** Define what each step receives and produces.

**Validation points:** Check output before passing to next step.

**Graceful degradation:** Handle failures at each step.

### Chain Patterns

**Sequential:** A → B → C (most common)

**Branching:** A → (B₁ | B₂) based on A's output

**Aggregating:** (A₁, A₂, A₃) → B (combine multiple outputs)

**Looping:** A → B → validate → (pass | retry A)

---

## Iterative Prompting

Refine outputs through cycles of generation, evaluation, and adjustment.

### The Iteration Cycle

```
1. Initial Prompt → First Output
         ↓
2. Evaluate Output (accuracy, relevance, format)
         ↓
3. Identify Gaps
         ↓
4. Refine Prompt → Better Output
         ↓
   Repeat until convergence
```

### Evaluation Dimensions

- **Accuracy:** Is the information correct?
- **Completeness:** Is anything missing?
- **Relevance:** Is everything on-topic?
- **Format:** Does it match requirements?
- **Tone:** Appropriate style and voice?

### Refinement Strategies

**Add specificity:**
```
v1: "Summarize this article"
v2: "Summarize this article in 3 bullet points"
v3: "Summarize this article in 3 bullet points, each under 20 words,
     focusing on business implications"
```

**Add constraints:**
```
v1: "Write a product description"
v2: "Write a product description. Do not use superlatives.
     Focus on specifications, not marketing claims."
```

**Add examples:**
```
v1: "Format the output as JSON"
v2: "Format the output as JSON like this: {\"name\": \"...\", ...}"
```

### Avoiding Prompt Drift

Drift occurs when refinements stray from the original goal.

**Track intent:** Document what you're trying to achieve.

**Compare to baseline:** Does each change serve the original purpose?

**Version control:** Keep history of prompt versions and rationale.

### Convergence Criteria

Know when to stop:
- Output meets quality threshold (e.g., >90% accuracy)
- Iterations reach diminishing returns
- Human validation passes
- Automated tests pass

---

## Meta Prompting

Create reusable templates for categories of problems, not individual
instances.

### Concept

Instead of: "Solve 2x + 3 = 7"
Template: "For any linear equation ax + b = c, follow these steps..."

The model receives a **methodology**, not just a task.

### Template Structure

```markdown
You are solving [problem category].

## Methodology
1. First, [identify key components]
2. Then, [apply technique]
3. Next, [verify step]
4. Finally, [format output]

## Constraints
- [Rule 1]
- [Rule 2]

## Output Format
[Exact structure]

## Problem
[Specific instance goes here]
```

### Example: Code Review Template

```markdown
You are reviewing code for quality issues.

## Review Methodology
1. Read the code to understand its purpose
2. Check for: bugs, security issues, performance problems
3. Assess: readability, maintainability, test coverage
4. Prioritize findings: critical > major > minor > suggestion

## Output Format
### Summary
[One paragraph overview]

### Critical Issues
- [Issue]: [Location] — [Why it matters]

### Recommendations
1. [Highest priority fix]
2. [Next priority]

## Code to Review
[Code goes here]
```

### Benefits

**Consistency:** Same methodology across all instances.

**Reusability:** One template, many problems.

**Quality:** Refined methodology over time.

**Scalability:** Non-experts can use expert methodology.

### Types of Meta Prompts

**User-provided:** Human creates the template (most control).

**Recursive (RMP):** Model generates its own template, then solves
(two-pass: design methodology, then apply it).

**Conductor:** One model creates templates for specialist models
(multi-agent orchestration).

---

## Combining Patterns

Patterns compose for complex workflows:

```
Meta Prompt (methodology)
    ↓
Prompt Chain (step 1 → step 2 → step 3)
    ↓
Iterative Refinement (polish final output)
```

### Example: Report Generation

1. **Meta:** Template for business reports
2. **Chain:**
   - Gather data points
   - Analyze trends
   - Generate insights
   - Draft sections
   - Assemble report
3. **Iterate:** Refine clarity, check facts, adjust tone

### Anti-Patterns

**Over-chaining:** Breaking things too small creates overhead.

**Premature templates:** Creating meta prompts before understanding
the problem space.

**Iteration without criteria:** Endless refinement with no stopping
point.

**Rigid chains:** No error handling or branching for edge cases.
