---
name: skill-powerups
description: >
  Interactive tutorial-style lessons for AI agent skills. Instead of passively reading SKILL.md,
  invoke /powerup <skill> for a guided walkthrough with examples, exercises, and knowledge checks.
  Trigger: When onboarding to a new skill, teaching a concept interactively, or when a user says
  "powerup", "teach me", "walkthrough", or "tutorial".
license: MIT
metadata:
  author: JNZader
  version: "1.0"
  tags: [skills, teaching, interactive, tutorials, onboarding]
  category: skill-authoring
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

## Purpose

Reading a SKILL.md is passive — the user absorbs rules but never practices them. Power-ups turn skills into interactive lessons: the agent teaches concepts step by step, presents exercises, checks understanding, and only advances when the user demonstrates competence. This is the difference between reading a recipe and actually cooking.

---

## When to Activate

- User invokes `/powerup <skill-name>`
- User says "teach me", "walkthrough", "tutorial", or "how does X skill work"
- Onboarding a new team member to project-specific skills
- User repeatedly makes mistakes that a skill covers — suggest a power-up

---

## Power-Up Structure

### POWERUP.md Format

Each skill can include an optional `POWERUP.md` alongside its `SKILL.md`:

```
my-skill/
  SKILL.md        # Reference (rules and patterns)
  POWERUP.md      # Interactive lesson (optional)
  INSTALL.md      # Setup recipe (optional)
```

### POWERUP.md Template

```markdown
---
name: my-skill-powerup
skill: my-skill
difficulty: beginner | intermediate | advanced
estimated-time: 15min
prerequisites: [other-skill]
---

## Lesson: {Skill Name}

### Learning Objectives

By the end of this power-up, you will:
1. Understand WHY {concept} matters
2. Recognize {anti-pattern} in real code
3. Apply {pattern} correctly

---

### Module 1: {Concept Name}

#### Explanation

{2-3 paragraphs explaining the concept. Use analogies.}

#### Example — Bad

\`\`\`typescript
// This code has a problem. Can you spot it?
{bad code example}
\`\`\`

#### Example — Good

\`\`\`typescript
// Here's the corrected version
{good code example}
\`\`\`

#### Exercise 1

{Present a code snippet or scenario}

**Your task**: {What the user needs to do}

**Check**: {How the agent verifies the answer}

---

### Module 2: {Next Concept}

{Same structure: Explanation → Bad Example → Good Example → Exercise}

---

### Knowledge Check

{3-5 questions that test understanding, not memorization}

1. Given this code, what anti-pattern is present?
2. How would you refactor this to follow the skill rules?
3. When would you choose approach A over approach B?

---

### Summary

{Key takeaways — what to remember}

### Next Steps

- Practice: Apply this in your current project
- Deep dive: Read SKILL.md for the full reference
- Related: Check out {related-skill} power-up
```

---

## Agent Execution Protocol

### Step 1 — Load the power-up

```
Read POWERUP.md for the requested skill
If no POWERUP.md exists:
  - Generate an ad-hoc lesson from SKILL.md content
  - Warn: "No dedicated power-up exists. Generating from SKILL.md rules."
```

### Step 2 — Present the lesson plan

```
"Power-Up: {Skill Name}
 Difficulty: {level}
 Time: ~{estimated-time}
 Modules: {count}

 Ready to start? (y/n)"
```

ALWAYS wait for user confirmation before starting.

### Step 3 — Teach module by module

For each module:

1. **Explain** the concept (keep it concise, use analogies)
2. **Show** the bad example — ask the user to identify the problem
3. **Wait** for the user's response
4. **Reveal** the good example with explanation
5. **Present** the exercise
6. **Wait** for the user's attempt
7. **Evaluate** — provide feedback, correct mistakes, explain WHY
8. **Only advance** when the user demonstrates understanding

### Step 4 — Knowledge check

Present questions one at a time. For each:
- Show the question
- Wait for the answer
- Provide detailed feedback (not just right/wrong)
- If wrong, re-explain the concept before moving on

### Step 5 — Summary and next steps

```
"Power-Up Complete!
 Score: {correct}/{total}
 Key takeaways:
   1. ...
   2. ...
   3. ...

 Suggested next: {related power-up or practice task}"
```

---

## Generating Power-Ups from SKILL.md

When no POWERUP.md exists, the agent generates a lesson dynamically:

### Extraction Rules

1. Each **rule** in SKILL.md becomes a **module**
2. Each **anti-pattern** becomes a **bad example**
3. Each **correct pattern** becomes a **good example**
4. **Critical Rules** become **knowledge check questions**
5. Related skills become **next steps**

### Generation Template

```
For each rule in SKILL.md:
  Module: {rule name}
  Explanation: Rephrase the rule as a teaching moment
  Bad Example: Take the anti-pattern code from the skill
  Good Example: Take the correct code from the skill
  Exercise: Create a variation the user must fix themselves
```

---

## Difficulty Levels

### Beginner

- Focus on WHAT and WHY
- Simple examples, one concept at a time
- Exercises have hints
- Knowledge check is multiple choice

### Intermediate

- Focus on HOW and WHEN
- Real-world examples with multiple interacting concepts
- Exercises require applying patterns to existing code
- Knowledge check requires written explanations

### Advanced

- Focus on TRADEOFFS and EDGE CASES
- Production scenarios with competing concerns
- Exercises involve designing solutions, not just fixing code
- Knowledge check presents ambiguous situations

---

## Examples

### Power-Up Invocation

```
User: /powerup ai-coding-discipline

Agent: "Power-Up: AI Coding Discipline
 Difficulty: Intermediate
 Time: ~20min
 Modules: 6 (one per anti-pattern rule)

 You'll learn to spot and fix the 6 most common AI code generation failures.
 Ready to start? (y/n)"

User: y

Agent: "Module 1: No Silent Fallbacks

 AI agents LOVE the nullish coalescing operator. They sprinkle ?? and || everywhere
 like salt on fries. The problem? Every fallback is a lie — it tells the code
 'pretend nothing went wrong' when something clearly did.

 Look at this code. What's the problem?

 const port = process.env.PORT ?? 3000;

 Take a moment. What could go wrong here?"

User: If PORT is not set, it silently uses 3000 without logging

Agent: "Exactly. The fallback hides a missing config. In dev, fine.
 In production, this could mean your service binds to the wrong port
 and you spend 3 hours debugging network issues.

 Here's the fix:

 const port = process.env.PORT;
 if (!port) {
   logger.warn('PORT not set, defaulting to 3000');
 }
 const resolvedPort = port ?? 3000;

 Exercise: Fix this code — what's the silent fallback?

 const user = await getUser(id) ?? { name: 'Anonymous', role: 'guest' };

 How would you rewrite it?"
```

---

## Anti-Patterns

### 1. Wall of text

BAD: Dumping the entire SKILL.md as a "lesson".
FIX: Break into digestible modules. One concept per module.

### 2. No waiting for responses

BAD: Presenting exercise and immediately showing the answer.
FIX: ALWAYS stop and wait after presenting an exercise.

### 3. Binary feedback

BAD: "Correct!" or "Wrong, the answer is X."
FIX: Explain WHY the answer is right or wrong. Connect back to the concept.

### 4. Skipping difficulty calibration

BAD: Advanced exercises for beginners, trivial exercises for experts.
FIX: Ask about experience level first, or start with a calibration question.

---

## Critical Rules

1. ALWAYS wait for user responses after exercises and questions — never auto-answer.
2. One module at a time. NEVER present multiple modules in a single message.
3. Provide WHY-focused feedback, not just correct/incorrect.
4. If the user struggles with a module, re-explain with a different analogy before advancing.
5. Generated power-ups from SKILL.md must cover ALL Critical Rules from the skill.
6. The agent MUST track score (correct/total) and present it at the end.
7. If the user says "skip" or "next", advance without judgment — they can come back later.
