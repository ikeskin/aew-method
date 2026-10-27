#!/usr/bin/env node
// Analyze Claude Code stream-json traces. Does not invoke an agent or claim savings.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export function summarizeStream(text) {
  const usageByMessage = new Map();
  let final = null;
  let toolCalls = 0;
  let events = 0;
  let errorLines = 0;
  let turns = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let data;
    try { data = JSON.parse(line); } catch { errorLines++; continue; }
    events++;
    if (data.type === 'result' && data.usage) {
      final = data;
      if (Number.isFinite(Number(data.num_turns))) turns = Number(data.num_turns);
    }
    if (data.type === 'assistant' && data.message) {
      const msg = data.message;
      if (msg.id && msg.usage) usageByMessage.set(msg.id, msg.usage);
      for (const block of msg.content || []) if (block.type === 'tool_use') toolCalls++;
    }
    if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') toolCalls++;
  }
  const usages = final ? [final.usage] : [...usageByMessage.values()];
  const totals = {input:0, cacheWrite:0, cacheRead:0, output:0};
  for (const u of usages) {
    totals.input += n(u.input_tokens);
    totals.cacheWrite += n(u.cache_creation_input_tokens) +
      (u.cache_creation_input_tokens ? 0 : n(u.cache_creation?.ephemeral_5m_input_tokens) + n(u.cache_creation?.ephemeral_1h_input_tokens));
    totals.cacheRead += n(u.cache_read_input_tokens);
    totals.output += n(u.output_tokens);
  }
  return {tokens:totals, turns:turns||usageByMessage.size, toolCalls, events, malformedLines:errorLines,
    usageSource:final?'result':'assistant-messages', traceHasUsage:usages.length>0};
}

export function compare(base, variant, rates=null) {
  const diff={};
  for (const k of ['input','cacheWrite','cacheRead','output']) {
    const a=base.tokens[k], b=variant.tokens[k];
    diff[k]={base:a,variant:b,delta:b-a,percent:a ? Number(((b-a)*100/a).toFixed(2)):null};
  }
  const metrics = {tokens:diff,turns:{base:base.turns,variant:variant.turns,delta:variant.turns-base.turns},
    toolCalls:{base:base.toolCalls,variant:variant.toolCalls,delta:variant.toolCalls-base.toolCalls}};
  if (rates) {
    const cost=t=>Object.keys(t).reduce((sum,key)=>sum+n(t[key])*n(rates[key])/1_000_000,0);
    const a=cost(base.tokens),b=cost(variant.tokens);
    metrics.usd={base:a,variant:b,delta:b-a,percent:a?Number(((b-a)*100/a).toFixed(2)):null};
  }
  return metrics;
}

function main(args) {
  const a=args.indexOf('--baseline'),b=args.indexOf('--variant');
  if(a<0||b<0||!args[a+1]||!args[b+1]) {
    console.error('Usage: node scripts/context-benchmark.mjs --baseline before.jsonl --variant after.jsonl [--rates rates.json]');
    process.exitCode=2;return;
  }
  const base=summarizeStream(readFileSync(resolve(args[a+1]),'utf8'));
  const variant=summarizeStream(readFileSync(resolve(args[b+1]),'utf8'));
  if (!base.traceHasUsage || !variant.traceHasUsage) {
    console.error('Both traces must contain real token usage. Benchmark not verified.');
    process.exitCode=1;return;
  }
  const rateIndex=args.indexOf('--rates');
  const rates=rateIndex>=0?JSON.parse(readFileSync(resolve(args[rateIndex+1]),'utf8')):null;
  console.log(JSON.stringify({baseline:base,variant,comparison:compare(base,variant,rates)},null,2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
