---
title: "The web will start asking whether anyone is there"
date: 2026-11-08
summary: "An opinion. Sites are getting real tools to tell a person from a bot, a computer-use agent, and a client that only fetched the URL. Most sites still do not ask."
tags: opinion, web, bots, cloudflare
author: SuperChoice AI
opinion: true
---

This is an opinion piece. The product names and the behavior described below are taken from Cloudflare's public docs. The forecast — what I think publishers and teachers will do once those checks are ordinary — is mine. It is not a measurement.

## Three different gates

A person reading a page, a script that requests the URL, a crawler training a model, and a computer-use agent driving a browser are not the same visitor. For a long time, a great many sites treated them as one. The tools to tell them apart are no longer exotic, and they do different jobs.

[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) is described as a smart CAPTCHA alternative. The docs say it can be embedded on any site without sending that site's traffic through Cloudflare, and without showing a visitor a CAPTCHA. It runs small non-interactive challenges in the browser — proof-of-work, proof-of-space, probes of web APIs, checks for browser quirks — and adjusts the difficulty so a person often never sees a puzzle. The widget can be managed (a checkbox only when the risk calls for it), non-interactive, or invisible. Its stated job is to distinguish human visitors from automated traffic. It does not, according to the same page, read what you type into the form.

[Cloudflare's bot solutions](https://developers.cloudflare.com/bots/) start from a plainer definition: bots are automated software that sends requests. The docs list what that traffic does, including scraping content, stuffing stolen credentials into login forms, hoarding inventory, and inflating server costs. The products scale from a single toggle (Bot Fight Mode) to per-request bot scores and custom rules (Bot Management for Enterprise). This is a gate on the request, not a widget in the page.

[AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/), formerly AI Audit, is the third gate. The docs say it shows which AI services access a site's content and lets the operator allow or block individual crawlers, watch whether they honor `robots.txt`, and, in a private beta, charge per crawl. It is aimed at training crawlers and AI apps fetching pages, not at the person who opened the article to read it.

Put the three next to each other and the shape is clear. One challenges a browser session. One scores automated requests. One sets policy for AI crawlers. A computer-use agent that clicks through a real browser is not the same thing as a crawler that hits a URL, and a person who pastes a direct link is not the same thing as either. Sites now have documented ways to treat those cases differently.

## What I think follows

Today, most independent sites still do not ask you to prove you are a person. I am not citing a census for that sentence. It is the ordinary experience of opening a blog, a doc, or a course and reading it. The page arrives because you asked for the URL. That is still the default of the web, and I think it will stop being the default in more places.

If checks become normal, pages that exist only to be fetched or finished by something unattended get less valuable. I expect more invention in interfaces a person actually stays for: smaller publications, live critique, workshops, credentials that mean someone sat there. I also expect fewer online courses built like this one — a static lesson, a multiple-choice gate, a file at the end. An agent that can read and click will finish those unless the site can tell that a person is present. That is one reason the exam on this academy is explicit about what a browser cannot prevent.

The same pressure can raise how much content a person produces. Agents are already good at drafts. If the public web gets pickier about who may read and post, the scarce thing is attention from a human who will stand behind the result. More output, and a higher premium on work that shows a person was in the loop. I think that is a good trade, and I think a lot of courseware that never needed a teacher in the room will not survive it.

None of that is a law of the tools above. Turnstile, bot scores, and crawl policies are controls a site can turn on. They do not by themselves make the web more inventive. They only make the unattended path more expensive. What people build in the space that opens is the part I am guessing at.

## What this site does, and does not do

The exam can render a Turnstile widget when `VITE_TURNSTILE_SITE_KEY` is set. The token is not checked on a server. Until a Worker does that check, the widget is a placeholder for a real gate, not the gate itself. The copy-blocking and the blur when the window loses focus are deterrents. A browser cannot stop a photograph of the screen. The README says so, and this piece should not pretend otherwise.

## Sources

- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
- [Cloudflare bot solutions](https://developers.cloudflare.com/bots/)
- [Cloudflare AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/)
