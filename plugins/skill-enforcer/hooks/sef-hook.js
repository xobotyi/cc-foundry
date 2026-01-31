#!/usr/bin/env node

const FRAMEWORK = `<skill-enforcement-framework id="SEF">
SEF governs skill invocation throughout this session.

## Protocol

<constraint>
Proceeding without completing the action is FORBIDDEN.
Acknowledging tags without acting is a violation.
You MUST state your evaluation result in thinking before tool use.
</constraint>

<verification>
After invoking skills, verify: Did I call Skill() for each identified
skill, or only acknowledge them in text? If acknowledge-only, invoke NOW.
</verification>

## Tags

<SEF_PROMPT>
User prompt received. Evaluate skills BEFORE any tool use.
1. CLASSIFY: Task domain?
2. MATCH: Skills whose coverage INCLUDES this task?
3. CHECK: Already invoked vs missing?
4. INVOKE: Call Skill() for each missing
5. RE-EVALUATE: New context may reveal more skills

Output in thinking: "SEF: [domain] → invoke [skills] | none needed"
</SEF_PROMPT>

<SEF_EVAL>
Context gathered. Evaluate skills NOW.
1. Review context to understand task domain
2. Identify skills whose coverage matches
3. If missing, invoke BEFORE continuing
4. Multiple may apply—invoke ALL in batch

Output in thinking: "SEF: [domain] → invoke [skills] | none needed"
</SEF_EVAL>

<SEF_PHASE>
Code modified. Phase may have shifted.
1. Assess phase: coding → testing → review
2. If changed, re-read skill references for new phase
3. Check phase-specific guidance (testing docs, validation)
4. Consider if quality-validation now applies

Output in thinking: "SEF: phase [current] → re-read [refs] | same phase"
</SEF_PHASE>

<SEF_REFS>
Skill loaded. Check batch opportunities.
1. Need more skills? Invoke together NOW
2. Read loaded skill's references/ for current phase

Output in thinking: "SEF: batch [additional skills] | complete"
</SEF_REFS>
</skill-enforcement-framework>`;

const RESPONSES = {
    'session-start': { event: 'SessionStart', context: FRAMEWORK },
    'prompt': { event: 'UserPromptSubmit', context: '<SEF_PROMPT/>' },
    'read': { event: 'PostToolUse', context: '<SEF_EVAL/>' },
    'write': { event: 'PostToolUse', context: '<SEF_PHASE/>' },
    'skill': { event: 'PostToolUse', context: '<SEF_REFS/>' }
};

const action = process.argv[2];
const response = RESPONSES[action];

if (!response) {
    console.log(JSON.stringify({
        continue: true,
        systemMessage: `SEF hook error: Unknown action "${action}". Valid: ${Object.keys(RESPONSES).join(', ')}`
    }));
    process.exit(0);
}

console.log(JSON.stringify({
    hookSpecificOutput: {
        hookEventName: response.event,
        additionalContext: response.context
    }
}));
