---
title: "Supervising someone smarter than you"
summary: "How to aim a capable agent without micromanaging it: restate, teach, prototype, and throw away a design the evidence rejects."
order: 2
minutes: 16
source: "https://x.com/poteto/status/2097732320606507506"
sourceLabel: "The Complete Guide to pstack, Part 2"
---

This lesson is a community summary by SuperChoice AI. It is not affiliated with or endorsed by Cursor, xAI, or Lauren Tan. The original essay is hers: [Part 2](https://x.com/poteto/status/2097732320606507506). When this course was written, that page returned HTTP 403, so what follows is original prose from the pstack docs and from public mirrors of the essay. It is not a transcript.

Part 1 argued that nothing else matters if the agent cannot check its own work. Part 2 asks the next question: once it can, how do you decide what it should build? Her title for that problem is the art of supervising someone smarter than you, on a codebase no single person still holds in their head.

## Two ways capable models still fail

She names two failure modes she keeps seeing. The model does not understand the intent, because the ask was thin or badly put. Or it does not have enough context to do the work correctly. The two are related. Working well with an agent is mostly the work of putting high-quality context in the window. You can get code that runs without that work. She finds the result better when the context is doing part of the job.

## Say it back

Older models invited micromanagement. Current ones can write the code better than the person prompting, which creates a different problem: you need to say what outcome you want without painting the only path you happen to see.

One technique she uses is the indirect prompt. Instead of stating the bug, she asks the agent to read the thread and restate the underlying issue in plain words before it edits anything. A prompt in that shape, under `/poteto-mode`, does three things. It forces a noisy conversation into a problem statement. It lets you catch a fixation on a side issue before any code exists. And it avoids leading the agent with your own hypothesis, which might be wrong or might be smaller than the fix it would have found.

Asking to have the work explained back is also how you keep your own model of the system current. That is the job of `/teach`. Under the hood, the essay says, `/teach` calls `/how` and `/why`.

`/how` traces how a subsystem actually runs. If the area spans many directories or services, it fans out to faster models. `/why` looks for motive. Code says what happens. It rarely says why someone wrote it that way. `/why` queries history in parallel: git and review comments, tickets, design docs, chat, monitors, error trackers, and analytics, whatever of those the environment can reach. The research helps you, and it helps the agent, which otherwise states mechanisms it has not read.

`/recall` is the piece for work that spans chats. Past transcripts are context you already paid for. A fresh agent can be handed a tight brief of yesterday's virtualization work, then the new bug report, instead of starting from zero.

## Work backward from the reader

She is skeptical of plan modes that specify the implementation and skip everything else. The README jokes that she does not believe in planning. The essay's correction is that she does plan, through code.

For shared libraries she favors README-driven development: write the tutorial a caller would follow, then build backward to that document. When she tried this for an internal client framework, the first README was painful because it mixed a tutorial, a how-to, an architecture essay, and an API reference, in mannered prose. `/technical-writing` is the knife she sharpened first. It uses Diátaxis to keep four modes apart:

- Tutorial: a newcomer builds something visible
- How-to: an experienced person solves one real task
- Reference: dry, complete description of the machinery
- Explanation: the tradeoffs and the background

`/unslop` is part of that pass so the document stays readable. A plan written this way is also a target the agent can check itself against.

## Do not take the first design

Two planning mistakes show up constantly. Accepting the first design the agent returns. And overcooking an abstract plan that has no evidence under it. When humans wrote design docs, several rounds were normal. Agents make it easy to skip the rounds and also easy to replace them with a longer document that still has not touched the system.

Playbooks in pstack are not separate skills. They are reference files inside `/poteto-mode`, loaded when the task matches, partly so unused workflows do not spend tokens. The README lists twenty-three. You usually do not name them. You say `/poteto-mode` and describe the work.

The prototyping playbook is her favorite form of planning. Ask for a few options, and ask the verification skill to drive them and bring back screenshots or timings. For a visual change, the variants can sit behind a switcher in the app or in a scratch directory. The point is empirical: the agent answers its own open questions by running something, and it has room to surprise you.

`/architect` is the heavier loop, for a boundary other code will depend on. The phases in the essay:

- Ground the problem with `/how` and `/why`
- Sketch: independent runners, often across model families, each draft a call-site, the core types, the public signatures, and a short rationale, then screen the draft for shallow interfaces and known design failures
- Cross-judge with a different model than the one that sketched
- Implement against the sketch, and surface it if a function suddenly needs state the sketch did not have
- Scrap the design when the evidence says it is wrong

The empirical tells she names: the same workaround appearing at unrelated call sites, or types that need escape hatches such as `any` or forced casts. Those are signs to start over, not to add another hatch.

She does not bother adversarially reviewing an abstract plan. Agents invent theoretical risks for that kind of document. Let open questions get answered by a prototype and a verification run.

## A plan, after the design is real

When she does want a written plan, it comes after a design she believes, via the multi-phase planning playbook: `/poteto-mode` and a request to turn the design into a plan. Every item is built around proof. The playbook tells the agent that tests alone are not verification. The code has to have been run. A script checks the plan's structure. Each pull request stays small. For a very large effort she might commit the plan temporarily so other agents can see it, then delete it when the work is done. She does not keep plans around as permanent docs.

Most days the interface is shorter than all of the above. A thread that already has the context gets `/poteto-mode do it`, or a request to reproduce with the verification skill and to show a video if it reproduces on the main branch. The other skills fire because the mode routes to them.

## What the exam will assume you can say

You should be able to name the two failure modes, explain why a restatement comes before a patch, say what `/teach`, `/how`, `/why`, and `/recall` are for, list the four Diátaxis modes, and describe prototyping and `/architect` as planning done in code. You should also be able to say that babysitting a pull request stops at merge-ready, and that shipping is the separate decision to land a stack that a fresh agent has verified.
