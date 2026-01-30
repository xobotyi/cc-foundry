# Long Context Prompting

Strategies for working with Claude's 200K token context window
effectively.

## Core Principles

### 1. Document Placement Matters

**Put longform data at the top** — above your query, instructions,
and examples.

```
[Documents/data here - 20K+ tokens]

---

[Instructions]

[Query]
```

Queries at the end can improve response quality by up to 30%,
especially with complex multi-document inputs.

### 2. Structure with XML

Wrap documents in clear tags with metadata:

```xml
<documents>
  <document index="1">
    <source>annual_report_2023.pdf</source>
    <document_content>
      {{ANNUAL_REPORT}}
    </document_content>
  </document>
  <document index="2">
    <source>competitor_analysis_q2.xlsx</source>
    <document_content>
      {{COMPETITOR_ANALYSIS}}
    </document_content>
  </document>
</documents>

Analyze the annual report and competitor analysis.
Identify strategic advantages and recommend Q3 focus areas.
```

### 3. Ground Responses in Quotes

For long document tasks, ask Claude to quote relevant parts first:

```xml
<documents>
  <document index="1">
    <source>patient_symptoms.txt</source>
    <document_content>{{SYMPTOMS}}</document_content>
  </document>
  <document index="2">
    <source>patient_records.txt</source>
    <document_content>{{RECORDS}}</document_content>
  </document>
</documents>

Find quotes from the patient records relevant to diagnosing
the reported symptoms. Place these in <quotes> tags.
Then, based on these quotes, list diagnostic information
in <info> tags.
```

Quote grounding helps Claude cut through document "noise" and
anchor its analysis in specific evidence.

---

## Document Organization Patterns

### Multiple Documents

```xml
<documents>
  <document index="1">
    <source>filename.pdf</source>
    <type>report</type>
    <date>2024-01</date>
    <document_content>...</document_content>
  </document>
  <!-- more documents -->
</documents>
```

Use metadata attributes that help Claude understand relationships:
- `source` — filename or URL
- `type` — report, email, code, transcript
- `date` — temporal ordering
- `author` — attribution

### Hierarchical Content

```xml
<codebase>
  <module name="auth">
    <file path="auth/login.py">...</file>
    <file path="auth/session.py">...</file>
  </module>
  <module name="api">
    <file path="api/routes.py">...</file>
  </module>
</codebase>
```

### Conversation History

```xml
<conversation>
  <message role="customer" timestamp="10:30">
    I can't log in to my account.
  </message>
  <message role="agent" timestamp="10:32">
    I'll help you with that. What error do you see?
  </message>
  <!-- ... -->
</conversation>

Summarize the key issues raised in this support conversation.
```

---

## Query Patterns

### Analysis with Citations

```
Based on the documents above:
1. What are the three main risks identified?
2. For each risk, quote the relevant passage that supports it.
3. Recommend mitigation strategies.
```

### Comparison Tasks

```
Compare Document 1 and Document 2:
- Where do they agree?
- Where do they contradict?
- What does each cover that the other doesn't?

Support each point with specific quotes.
```

### Synthesis

```
Synthesize the information across all documents to answer:
[specific question]

Cite which document supports each part of your answer.
```

---

## Performance Optimization

### Reduce Noise

Before including documents:
- Remove boilerplate (headers, footers, navigation)
- Strip formatting artifacts
- Summarize or truncate irrelevant sections

### Chunking Strategy

If total content exceeds context window:
1. Identify most relevant sections
2. Include full text for critical parts
3. Summarize less critical sections
4. Mention what was omitted

### Progressive Detail

```
First, skim all documents and identify the 3 most relevant
sections for answering: [question]

Then, analyze those sections in detail.
```

---

## Common Pitfalls

### Buried Query

**Bad:**
```
What are the key findings?

[50K tokens of documents]
```

**Good:**
```
[50K tokens of documents]

What are the key findings?
```

### Missing Structure

**Bad:**
```
Here's some data:
[raw dump of multiple files concatenated]
```

**Good:**
```xml
<documents>
  <document index="1" source="file1.txt">...</document>
  <document index="2" source="file2.txt">...</document>
</documents>
```

### Vague Grounding Request

**Bad:**
```
Use the documents to answer.
```

**Good:**
```
Quote the specific passages that support your answer.
Use the format: [Document X]: "quote"
```

---

## Checklist for Long Context Prompts

- [ ] Documents placed at top, query at bottom
- [ ] Each document wrapped with identifying tags
- [ ] Metadata (source, type, date) included where helpful
- [ ] Query requests specific citations/quotes
- [ ] Irrelevant content removed or summarized
- [ ] Clear instructions on how to handle multiple documents
