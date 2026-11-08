---
title: "Verification is the infrastructure"
summary: "What it means for an agent to check its own work, and how a Feature Map plus a control CLI make that check repeatable."
order: 1
minutes: 14
source: "https://x.com/poteto/status/2094457600259842065"
sourceLabel: "The Complete Guide to pstack, Part 1"
---

This lesson is a community summary by SuperChoice AI. It is not affiliated with or endorsed by Cursor, xAI, or Lauren Tan. The original essay is hers: [Part 1](https://x.com/poteto/status/2094457600259842065). When this course was written, that page returned HTTP 403, so the lesson is original prose drawn from the pstack repository and from public mirrors of the essay. It is not a transcript. Read hers when you can.

In the essay she writes that this way of working let her land on the order of 2,000 pull requests in a month. That figure is her report. This course did not audit it. What the course will ask you to remember is the mechanism, not the number.

## Close the loop

Verification, in this course, means the agent can tell whether the task is done by checking the real artifact. It runs the feature, reads the value, looks at the screenshot or the trace, and continues until the check passes. If it cannot do that, you are still the bottleneck. More agents then means more work you have to review by hand.

She treats a good verification skill as infrastructure. A paved road amplifies everyone who uses it, including people who do not write the code. A clever prompt that lives in one chat does not. The plugin states the same idea as a principle, prove-it-works: do not declare success because the project compiled or because the reply sounded sure.

## Build the skill from the repo

`/create-verification-skill` interviews the repository. It works out what a user touches, how the app starts, what can drive it (an existing harness if one exists, otherwise a browser, a terminal, or plain HTTP), and what evidence would prove a behavior. It asks you only what the code cannot answer.

The skill it writes is agent-facing. The sections to remember are Launch, Doctor, Drive, Evidence, and Cleanup, plus a feature map under a features directory. Before the handoff, the generator has to prove the skill once: launch, run the doctor check, drive one feature, capture evidence, clean up, and confirm the evidence is still there. If that rehearsal fails, do not use the output.

She also ships Dr Eggbot with pstack, a bot for making bots. One path she describes is to ask that bot for an engineer bot, then ask the engineer bot to run `/create-verification-skill` and to schedule `/maintain-verification-skill`. You do not have to use that path. The command itself is the part this exam cares about.

## The Feature Map

Agents get lost once the product has more doors than the prompt can list. The Feature Map is a compact index written from the user's side. The worked example in the plugin is strict about shape. Each feature file opens with a title and a paragraph of user-visible behavior, then exactly four H2 sections:

- Sub-features, short ids with one line each
- How to get to it (user POV), every entry point a person has
- Driving it with the control command, preconditions first, then a user action paired with an exact command and an observable result
- Gotchas, the traps that waste a run

Keep implementation details out. The map names paths, handles, required state, commands, and proof.

She calls this materialized memory. Chat memory and vector stores go stale in ways that are hard to see. The codebase is already the record of what the team decided. The map is a short projection of that record, small enough to spend tokens on. Because it lives in the skill, every contributor shares it.

`/maintain-verification-skill` is the upkeep. Run it at least daily. The maintenance skill reads each feature from source, drives each mapped feature once, and ends in one of three outcomes: clean, one pull request of corrections inside the skill directory, or blocked. It does not edit product code to hide a regression. If the live pass finds a product bug, it reports the bug.

## The control CLI

"Build the lever" means giving the agent a tool instead of a paragraph. For verification, the tool is a small CLI. Agents stop rewriting throwaway click scripts, and every run is the same run. The traits she wants:

- A few commands that each do real work
- `--dry-run` on anything destructive
- Subcommands, so the surface appears gradually
- Errors that say what to do instead
- Machine-readable output, such as JSON

Spend time making that CLI boring and correct before you add cleverness. Also make the dev environment repeatable: seeded data, test users, one command that brings the stack up the same way. A verification skill that depends on a laptop in a particular mood is not infrastructure.

## Where the agents run

After a few pull requests land this way, the temptation is to parallelize with local git worktrees. Her Part 1 argument is to skip that as the main plan. Worktrees consume disk and top out with the machine you are sitting at. Cursor cloud agents run on a remote computer that can install dependencies, start the app, and record video. The first environment build can be snapshotted so later runs start fast. Parallelism is a consequence of verification, not a substitute for it.

## How you invoke it

Start the task with `/poteto-mode`, and name the verification skill when you want a specific kind of proof. A feature prompt asks for a video and screenshots. A bug prompt asks the agent to reproduce on the main branch first, then fix, then show the video. A performance prompt asks for a trace of the status quo before any fix, then a check that the win is real.

In Cursor, picking the skill from the slash menu and pressing Option+Enter (Alt+Enter on Windows) pins it as a custom mode. Plain Enter attaches it to one message only.

Install, from the README, is `/add-plugin pstack` in Cursor.

## What the exam will assume you can say

You should be able to say what verification is for, name the sections of the generated skill, name the four feature-file headings, list the CLI traits, and distinguish a Feature Map from a sitemap or a vector store. You should also be able to say, without hedging, that Lauren Tan's public profile is xAI and React Compiler, that the README describes Meta, Netflix, and Cursor, and that she did not work at Tesla.
