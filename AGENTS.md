# Working Agreement — AI-Assisted Development

These are rules, not suggestions. They exist because LLMs make predictable,
repeatable mistakes. Follow them and you get code that ships; ignore them and you
get code that looks impressive and breaks in review or production.

Drop this file into a project (many tools auto-read a file like this, e.g. as
`CLAUDE.md` / `AGENTS.md` / a system prompt). Adapt the "Hard rules" and the
document set to your stack; the rest is stack-agnostic.

---

## The document set

Keep a small, durable set of documents so intent lives next to the code and
nothing important survives only in a chat log:

- **A canonical spec** (`SPEC.md`) — the architecture, the data/interfaces, and a
  numbered **build order**. This is *settled*. It's the source of truth.
- **A decisions log** (`DECISIONS.md`) — a running list of decisions made during
  the build and the rationale, plus anything deliberately deferred (with the step
  it's deferred to). New decisions get appended; old ones aren't rewritten.
- **This rules file** — how we work (the methodology below). Rarely changes.
- **A per-task plan** (`tasks/todo.md`) — the checklist for the task in flight.
  Created at the start of a task, checked off as it proceeds, cleared/replaced
  per task.
- **A lessons log** (`tasks/lessons.md`) — patterns learned from corrections, so
  the same mistake isn't repeated across sessions. Reviewed at the start of a
  session.

The spec and decisions log are **settled** — don't silently re-architect or
reopen them during unrelated work. If something looks wrong, stop and flag it —
don't change it alone.

---

## The two-AI (planner / builder) setup

Run the AI in two distinct roles, with **you as the gate between them**:

- **Planner** — helps you interview the problem, draft/refine the spec, and
  pressure-test decisions. Stays read-only: it explores, questions, and proposes;
  it does **not** write code. Use it to think.
- **Builder** — implements the *approved* spec. Writes code and tests, runs them,
  and reports back. It works from the plan, not from a fresh guess.

These can be two different models, two sessions, or one model you switch between.
The point is the **separation of concerns**: planning pressure and building
pressure pull in different directions, and keeping them apart stops "helpful"
mid-build re-architecting. **You approve the spec before building starts and you
review the diff after** — the AI never crosses that gate on its own.

---

## Plan mode vs. Edit mode

Two explicit modes, and you control the switch:

- **Plan mode** — no code is written. Interview, design, surface assumptions and
  tradeoffs, produce a short spec. Anything with 3+ steps or an architectural
  decision starts here.
- **Edit mode** — implement the approved plan, and *only* that plan. If the work
  reveals the plan was wrong, **stop and go back to Plan mode** — don't keep
  pushing a broken approach.

The transition is a deliberate, human "go," never an assumption.

---

## How we build each new part

1. **Stay in Plan mode.** Before writing code, interview me about the component:
   the core problem it solves, who/what it's for and *not* for, and the key
   implementation decisions — **one at a time**, not a wall of questions.
2. **Summarize it back** as a short implementation spec, captured in
   `tasks/todo.md` as checkable items.
3. **Wait for my approval.** Only then switch to Edit mode and build, marking
   items done as you go.
4. **After building, update the relevant doc** so the spec stays the source of
   truth.

One step at a time, and **verify before advancing** to the next step — don't
batch five steps and hope.

### Reviewing parts already built

When I explicitly ask to review an existing component, run the same interview on
it — question the decisions, surface anything off, propose changes — then wait
for my approval before touching code.

---

## Read Before You Write

The biggest source of bad output is generating from training-data patterns
instead of reading the code in front of you.

- Read the files you're about to modify. Not skim — read.
- Follow existing patterns. If there's a utility that does half of what you need,
  use it. Don't introduce a new library when the project already has one.
- Look at the tests — they tell you the expected behavior.
- If you're unsure how something is done here, ask: "I don't see a pattern for X —
  follow Y, or do something different?" Always better than guessing.

## Think Before You Code

- **State assumptions.** A vague request could mean five things. Say "assuming X —
  tell me if not." Wrong and stated costs 10 seconds; wrong and silent costs an
  hour.
- **Name tradeoffs.** "This trades memory for speed and adds cache invalidation to
  worry about." Let me see the cost before 200 lines exist.
- **If it's confusing, stop and ask.** Don't paper over unclear requirements with
  plausible-looking code.

## Simplicity

Write the minimum code that solves *this* problem right now — not the minimum that
could theoretically solve the general case. Favor what the owner can understand
and extend, with the fewest moving parts.

- No speculative error handling. Handle errors that can actually occur; don't
  null-check values that are never null.
- No premature abstraction. If asked for `sendWelcomeEmail(user)`, write that —
  not an `EmailService` with pluggable providers. Ask when more is needed.
- No config nobody requested. Every option is something someone must set
  correctly. Hardcode until there's a real reason not to.
- Test: if someone unfamiliar has to ask "why is this abstracted like this?" —
  it's over-engineered.

## Surgical Changes

Your diff should be as small as the task allows. Every changed line is something
to review and lives in `git blame` forever.

- Don't touch what you weren't asked to touch. Fixing function A? Leave the weird
  variable name in function B alone.
- Match existing style. Consistency within a file beats your preference.
- Don't reformat or reorder things you didn't otherwise change — it hides the real
  diff and makes review painful.
- Look at your diff before finishing. Can you justify every changed line as
  connected to the task? If a line is there because "while I was in here I thought
  I'd..." — revert it.

## Verification

- **Bugs: write the failing test first.** Reproduce the bug, watch the test fail,
  fix it, watch it pass. That proves you fixed the actual thing, not a symptom.
- **Run existing tests before and after** your change. If a test was already
  failing, say so — don't let your change get blamed for it.
- Never mark a task done without proving it works: run the tests, check the logs,
  or diff behavior against the unchanged version. **Demonstrate correctness, don't
  assert it.**

## Debugging

When something breaks, investigate — don't guess.

- **Read the whole error**, including the stack trace. The message tells you which
  of a hundred causes it is.
- **Reproduce first.** If you can't reproduce it, you can't verify a fix.
- **Change one thing at a time.** Change three and the bug goes away, you don't
  know which did it.
- **Find the root cause.** A check that silences a crash usually just hides the
  real bug so it resurfaces somewhere worse.
- **If you're stuck, say so.** "I tried X and Y, here's what I'm seeing, I think
  it might be Z but I'm not sure" beats silently trying random fixes for 20
  iterations.

## Dependencies

Every dependency is code you don't control that becomes permanent. Before adding
one: can the standard library or an existing dep do this? Is it maintained? Is it
big? "I'm adding it because this genuinely needs X and nothing here does that" is
a fine reason. Silently adding a package to format a date is not.

## Communication

- Say what you did and why, briefly. "Moved validation into its own function — it
  was duplicated in three places and this makes it testable." Now I don't have to
  read every line to understand the change.
- Flag uncertainty precisely. "I'm not sure this library supports streaming" is
  useful. "This should work" when you're guessing is not.
- Don't explain things I already know. Match the explanation to my demonstrated
  level.

---

## Common Failure Modes

Stop and reconsider if you catch yourself doing any of these:

- **Kitchen Sink** — restructuring half the codebase "while you're at it." Do the
  one thing.
- **Wrong Abstraction** — a generic solution for a problem that exists in one
  place. Duplication is cheaper than the wrong abstraction; copy-paste twice
  before you abstract.
- **Invisible Decision** — picking a schema, API shape, or strategy without
  flagging it as a decision the owner should know about.
- **Knowledge Hallucination** — confidently using an API/parameter/feature that
  doesn't exist. If you're not sure a method exists with that exact signature, say
  so and check.
- **Style Drift** — writing in your preferred style instead of the project's.
- **Runaway Refactor** — one fix touches another file, which touches another.
  Twenty minutes later 15 files changed. If a fix is cascading, stop and get
  buy-in before continuing.

---

## Capturing lessons

After any correction from me, append the pattern to `tasks/lessons.md`: what the
mistake was and the rule that prevents it. Review that file at the start of a
session. This is how you stop repeating the same errors across sessions.

---

## Hard rules

Adapt these to the project; keep the list short and absolute.

- **Never commit secrets.** Keys, tokens, and credentials live only in
  environment variables / a secret manager — never in the repo or any committed
  file.
- _(Add the project's non-negotiable invariants here — the handful of properties
  that must always hold, stated plainly.)_
