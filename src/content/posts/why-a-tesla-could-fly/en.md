---
title: "Why a Tesla could fly with an engineer like Lauren Tan"
date: 2026-10-12
summary: "A metaphor, not a biography. What changes when verification is treated as infrastructure, and what pstack actually is."
tags: pstack, engineering, verification
author: SuperChoice AI
opinion: false
---

A Tesla does not fly. This essay does not claim that one will, and it does not claim that anyone at Tesla asked it to. The title is a metaphor. Picture a heavy machine that is very good at staying on the road, and then ask a different question: what happens to a complex product when the people changing it can prove each change against the running thing, instead of arguing from a compile and a hunch?

Flight, in that picture, is not aerodynamics. It is lift that comes from instruments. A team that can close its own loop can attempt work it used to have to babysit. That is the only "flight" this piece is willing to talk about.

## She did not work at Tesla

Lauren Tan did not work at Tesla. Nothing in the public record this academy relies on says she did. We are not describing a Tesla project, a Tesla title, or an endorsement. If you remember one sentence from this post, remember that one. The car is a metaphor for a hard machine. The engineer is a real person whose public work is somewhere else.

Her GitHub profile, [github.com/poteto](https://github.com/poteto), describes her as a software engineer at xAI and a member of the React Compiler core team. The [pstack README](https://github.com/cursor/plugins/blob/main/pstack/README.md) in the Cursor plugins repository says she has worked with millions of lines of code at Meta, Netflix, and Cursor, and that she helps build and maintain React Compiler on the React core team. Those are the employment facts this post will use. It will not add others.

## What pstack is

pstack is her set of skills for doing rigorous engineering work with coding agents, published as a plugin. In Cursor you install it with `/add-plugin pstack`. The README is blunt about the goal: not more lines of code, but less code of higher quality. She calls the result fearless parallelism. You only earn the right to run many agents when one agent can be trusted to check its own work.

The everyday door is `/poteto-mode`. It matches a task to one of twenty-three playbooks (a bug, a performance trace, a feature, a prototype, an overnight run, and so on) and pulls in other skills as the steps need them. You can pin it as a custom mode with Option+Enter on a Mac or Alt+Enter on Windows, so later turns still see it. `/setup-pstack` chooses which models fill which roles. The skills are not tied to one model.

Two guides are worth reading beside this summary. Part 1 is [The Complete Guide to pstack](https://x.com/poteto/status/2094457600259842065). Part 2, on supervising someone smarter than you, is [here](https://x.com/poteto/status/2097732320606507506). The plugin also ships a written guide in the repository, including [Verify the result and open a PR](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md).

## Verification as infrastructure

The idea she puts first is easy to say and hard to keep: an agent should be able to tell whether the task is done. If it can run the feature, read the value, and look at the evidence, it can continue until the work is actually finished. If it cannot, you remain the bottleneck, and more agents only means more unchecked diffs.

She treats that ability as infrastructure, closer to a paved road than to a clever prompt. A good verification skill is committed, shared, and maintained. Non-engineers can use the same path. The principle in the plugin is named prove-it-works: "it compiles" is not evidence.

`/create-verification-skill` is how a project grows that road. It interviews the repository, not a questionnaire. It works out what a person touches, how the app launches, what can drive it, and what would count as proof. It writes a project-local skill with Launch, Doctor, Drive, Evidence, and Cleanup sections, plus a feature map. Before it hands the skill over, it has to prove the skill once: launch, doctor, drive one feature, capture evidence, clean up, and confirm the evidence survived. If that proof fails, you do not use the output.

## The Feature Map

As an app grows, "click around until it works" stops fitting in a context window. The Feature Map is her answer: a small, searchable map of features written from the user's point of view. The worked example in the plugin says each feature file has four sections, in order: sub-features, how a person gets there, how to drive it with the control command, and gotchas.

She describes the map as materialized memory. The codebase is already the memory of the team's decisions. The map is a compact projection of that memory, cheap enough for an agent to read before it touches the product. `/maintain-verification-skill` is the upkeep. The guide suggests running it at least daily, because a map that lags the product will send agents down paths that no longer exist.

## The lever

Markdown that says "then click the button" still leaves every agent to invent a script. The principle she names Build the Lever prefers a small control CLI the skill calls instead. The traits she lists are practical: a few commands that do real work, `--dry-run` on anything destructive, subcommands that reveal features gradually, errors that say what to do next, and output a machine can read, such as JSON. Agents spend fewer tokens, and a reviewer can rerun the same command.

In Part 1 she also argues against using local git worktrees as the main way to run many agents. Worktrees cost disk and top out with the machine under your desk. Her recommendation is Cursor's cloud agents: a real computer, a setup that can be snapshotted, and room to parallelize once the dev environment itself is repeatable. That is her argument, from the essay. It is not a claim about cars.

## The metaphor, grounded

A car does not leave the ground because a well-known engineer is in the room. A codebase does not become trustworthy because an agent typed faster. The interesting claim, and the only one this post will make, is narrower. If a team builds verification into the daily path — a feature map, a control command, a skill that has already proved itself once — then the work of changing a hard product starts to look less like hoping and more like flying on instruments.

Lauren Tan's public work is at xAI, on React Compiler, and, by the pstack README, through Meta, Netflix, and Cursor. She did not work at Tesla. The Tesla in the title stays on the road. The lift, if there is any, belongs to the instruments.

## Sources

- [Lauren Tan on GitHub](https://github.com/poteto)
- [pstack README](https://github.com/cursor/plugins/blob/main/pstack/README.md)
- [pstack in the Cursor plugins repository](https://github.com/cursor/plugins/tree/main/pstack)
- [Verify and ship](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)
- [Feature map example](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/references/feature-map-example/README.md)
- [The Complete Guide to pstack, Part 1](https://x.com/poteto/status/2094457600259842065)
- [The Complete Guide to pstack, Part 2](https://x.com/poteto/status/2097732320606507506)
