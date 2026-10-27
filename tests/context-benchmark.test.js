import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStream, compare } from '../scripts/context-benchmark.mjs';

test('benchmark uses result usage without double-counting assistant usage', () => {
  const data=[
    {type:'assistant',message:{id:'msg1',usage:{input_tokens:100,cache_read_input_tokens:30,output_tokens:20},content:[{type:'tool_use'}]}},
    {type:'assistant',message:{id:'msg1',usage:{input_tokens:100,cache_read_input_tokens:30,output_tokens:30},content:[]}},
    {type:'result',num_turns:2,usage:{input_tokens:150,cache_creation_input_tokens:40,cache_read_input_tokens:200,output_tokens:60}}
  ].map(x=>JSON.stringify(x)).join('\n');
  const metrics=summarizeStream(data);
  assert.deepEqual(metrics.tokens,{input:150,cacheWrite:40,cacheRead:200,output:60});
  assert.equal(metrics.turns,2);
  assert.equal(metrics.toolCalls,1);
  assert.equal(metrics.usageSource,'result');
});
test('benchmark can deduplicate per-message usage and compute optional real-price totals', () => {
  const baseline=summarizeStream([
    {type:'assistant',message:{id:'a',usage:{input_tokens:200,output_tokens:40,cache_creation_input_tokens:10},content:[]}},
    {type:'assistant',message:{id:'a',usage:{input_tokens:200,output_tokens:50,cache_creation_input_tokens:10},content:[]}}
  ].map(JSON.stringify).join('\n'));
  const variant=summarizeStream(JSON.stringify({type:'result',num_turns:1,usage:{input_tokens:100,output_tokens:30,cache_creation_input_tokens:5}}));
  assert.equal(baseline.tokens.output,50);
  const result=compare(baseline,variant,{input:3,cacheWrite:4,cacheRead:0.3,output:15});
  assert.equal(result.tokens.input.delta,-100);
  assert.ok(result.usd.delta<0);
});
test('benchmark rejects missing evidence rather than inventing a saving', () => {
  const missing=summarizeStream('{"type":"system"}\nmalformed\n');
  assert.equal(missing.traceHasUsage,false);
  assert.equal(missing.malformedLines,1);
});
