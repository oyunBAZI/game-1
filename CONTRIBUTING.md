# Contributing

## Before coding

Read:

- docs/ARCHITECTURE.md
- docs/SIMULATION.md
- docs/EXTENDING.md
- docs/TESTING.md

Run the validation script before changing behavior.

## Keep the seams intact

Physics and rules code must remain browser-independent. Rendering is allowed to consume snapshots, never to own a gameplay result. New high-frequency systems should reuse state objects and document their allocation behavior.

## A good change

A good pull request has:

- one coherent behavior change;
- a small deterministic test or smoke assertion;
- a note about affected units and timing;
- a measured performance impact when a hot loop changes;
- no generated assets committed without a reason;
- no secrets or service tokens.

## Commit style

Use short imperative messages such as:

- feat: add backspin contact calibration
- fix: prevent duplicate net contacts
- test: cover deuce service cadence
- perf: reduce prediction allocations
- docs: explain replay contract

## Browser testing

Test the dev server in a current Chromium browser and at least one other engine when the change touches input, audio, WebGL, or pointer behavior. The game must still render a usable procedural scene when optional assets are unavailable.

## Review checklist

- Does the change preserve fixed-step behavior?
- Does it make a hidden assumption about coordinate orientation?
- Can a replay reproduce it?
- Is a new event necessary, typed, and documented?
- Does the UI degrade when audio or gamepad APIs are unavailable?
- Does the build remain free of untracked local assets?