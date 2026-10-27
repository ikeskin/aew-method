# AEW v0.5.9 context benchmark

This is an experiment protocol, not a claim of measured token savings.

## Comparison

Compare three configurations: A = v0.5.8 with original adapter/skills; B = v0.5.9 Lite with minimal adapter and lazy skills; C = no AEW. Use identical pinned source commit, same Claude model/settings, same task, same permissions, independent fresh sessions and environment. Repeat each variant at least three times, randomizing run order. Test resulting code against the same independent regression suite.

Capture real traces:

    claude -p "Fix the failing test without unrelated changes" --output-format stream-json --verbose > run.jsonl

Analyze token usage and optional USD cost:

    node scripts/context-benchmark.mjs --baseline a.jsonl --variant b.jsonl
    node scripts/context-benchmark.mjs --baseline a.jsonl --variant b.jsonl --rates rates.json

The rates JSON has the fields input, cacheWrite, cacheRead, and output, in actual USD per million tokens for the chosen model and billing terms. Without rates, only token usage is compared. Inspect any secrets before storing trace output.

## Success measurements

Record actual input, cache creation, cache read, output tokens, turns, tool calls, wall time, test pass/fail and QA findings. Compare medians over repeated independent runs and cost **per passing task**, not token counts alone.

Startup budget below 300 tokens, no extra turn for simple tasks and 15% cost reduction against v0.5.8 are experimental **targets**, not measured achievements. Never claim savings from byte count alone.

The comparator prefers aggregate result.usage when present; otherwise it deduplicates assistant usage by message ID. Incomplete traces cannot establish cost savings. Optional host hooks are out of scope for this release. Loading SYSTEM.md via @ import is intentionally avoided; existing customized adapter files need manual review or aew upgrade --dry-run.
