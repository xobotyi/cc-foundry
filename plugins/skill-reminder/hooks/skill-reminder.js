#!/usr/bin/env node
/**
 * Skill Reminder Hook
 *
 * Injects a reminder for Claude to evaluate and invoke relevant skills
 * before taking actions. Runs on UserPromptSubmit event.
 */

const MESSAGE = `<skill-evaluation-required>
MANDATORY: Evaluate skills in your thinking BEFORE any tool use or response.

<evaluation-steps>
1. CLASSIFY TASK: What is the task domain?
2. FIND SKILLS BY COVERAGE: Each skill has a coverage domain.
   Find skills whose coverage domain INCLUDES your task.
   Do not search for exact task name - find skills that COVER it.
3. CHECK INVOCATION STATE: Which covering skills invoked? Which missing?
4. CHECK PHASE-SPECIFIC REFERENCES: If task phase changed (coding→testing),
   READ reference files from already-invoked skills for that phase.
5. RE-EVALUATE AFTER DISCOVERY: New context may require additional skills.
</evaluation-steps>

<constraint>
Proceeding without skill evaluation is FORBIDDEN.
Find skills by coverage domain, not by literal name match.
If covering skills exist, invoke them FIRST.
</constraint>

<action-required>
Evaluation alone is NOT compliance. You MUST call Skill() tool for each
missing skill BEFORE any other tool use. Acknowledging skills without
invoking them is a violation.
</action-required>
</skill-evaluation-required>`;

function main() {
  // Consume stdin (required by hook protocol)
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    const output = {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: MESSAGE
      }
    };
    console.log(JSON.stringify(output));
  });
}

main();
