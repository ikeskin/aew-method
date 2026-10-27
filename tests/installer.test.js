import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as analysisModule from '../src/cli.js';
const { discover, install, doctor } = analysisModule;

const sandbox = fn => { const dir = mkdtempSync(join(tmpdir(), 'aew-test-')); try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); } };
test('discovers project and CI', () => sandbox(root => {
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: { react: '*' } }));
  writeFileSync(join(root, 'azure-pipelines.yml'), 'trigger: none');
  assert.deepEqual(discover(root).tech, ['Node.js', 'React']);
  assert.equal(discover(root).ci, 'azure-devops');
}));
test('installs methodology and selected adapters', () => sandbox(root => {
  const result = install(root, { adapters: ['codex', 'claude'] });
  assert.ok(result.results.length > 10);
  assert.ok(existsSync(join(root, 'AGENTS.md')));
  assert.ok(existsSync(join(root, 'CLAUDE.md')));
  assert.ok(!existsSync(join(root, 'GEMINI.md')));
  assert.equal(doctor(root).ok, true);
}));
test('preserves existing user files', () => sandbox(root => {
  writeFileSync(join(root, 'AGENTS.md'), 'my own instructions');
  install(root, { adapters: ['codex'] });
  assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), 'my own instructions');
  const second = install(root, { adapters: ['codex'] });
  assert.ok(second.results.every(x => x.action === 'preserved'));
}));
test('dry run does not mutate repository', () => sandbox(root => {
  install(root, { dryRun: true });
  assert.equal(existsSync(join(root, '.aew')), false);
}));
test('rejects unknown adapter', () => sandbox(root => {
  assert.throws(() => install(root, { adapters: ['unknown'] }), /Supported adapters/);
}));
test('empty workspace defaults to new and does not ask for DevOps', () => sandbox(root => {
  assert.equal(discover(root).empty, true);
  install(root, { adapters: ['codex'], project: { application: 'backend', purpose: 'Sample API', architecture: 'simple-first' } });
  const config = JSON.parse(readFileSync(join(root, '.aew/config.json'), 'utf8'));
  assert.equal(config.projectType, 'new');
  assert.equal(config.project.application, 'backend');
  assert.equal(config.devops, 'unknown');
  assert.match(readFileSync(join(root, '.aew/project-brief.md'), 'utf8'), /Sample API/);
}));
test('analyze does not pretend to run a deep quality assessment', () => sandbox(root => {
  const { analyze } = analysisModule;
  const report = analyze(root);
  assert.equal(report.empty, true);
  assert.ok(report.limitations[0].includes('Static shallow scan'));
}));

test('doctor reports missing methodology files', () => sandbox(root => {
  assert.equal(doctor(root).ok, false);
  assert.ok(doctor(root).missing.includes('.aew/config.json'));
}));
test('multi-adapter configuration records all selected adapters', () => sandbox(root => {
  install(root, { adapters: ['codex', 'claude', 'gemini'] });
  const config = JSON.parse(readFileSync(join(root, '.aew/config.json'), 'utf8'));
  assert.deepEqual(config.adapters, ['codex', 'claude', 'gemini']);
  assert.ok(existsSync(join(root, 'GEMINI.md')));
}));

test('installs routing, profiles and human-readable code standards', () => sandbox(root => {
  install(root, { adapters: ['codex', 'claude'], project: { application: 'backend', technology: '.NET', purpose: 'Subscription API' } });
  for (const path of ['.aew/routing.md', '.aew/profiles/project/backend.md', '.aew/profiles/technology/.NET.md', '.aew/standards/readability.md', '.aew/standards/comments.md', '.aew/standards/engineering-scope.md']) {
    assert.ok(existsSync(join(root, path)), path);
  }
  assert.match(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /routing\.md/);
  assert.match(readFileSync(join(root, 'CLAUDE.md'), 'utf8'), /routing\.md/);
  assert.match(readFileSync(join(root, '.aew/project-brief.md'), 'utf8'), /profiles\/project\/backend\.md/);
  assert.match(readFileSync(join(root, '.aew/project-brief.md'), 'utf8'), /profiles\/technology\/\.NET\.md/);
}));

test('analyze distinguishes configured technology from detected code', () => sandbox(root => {
  install(root, { project: { application: 'backend', technology: '.NET', purpose: 'Subscription API' } });
  const report = analysisModule.analyze(root);
  assert.deepEqual(report.tech, []);
  assert.equal(report.configured.technology, '.NET');
  assert.equal(report.configured.purpose, 'Subscription API');
  assert.ok(report.observations.some(x => x.includes('project purpose')));
}));

test('routing and standards are preserved on reinstall', () => sandbox(root => {
  install(root);
  const file = join(root, '.aew/routing.md');
  writeFileSync(file, 'custom routing');
  const result = install(root);
  assert.equal(readFileSync(file, 'utf8'), 'custom routing');
  assert.ok(result.results.some(x => x.relative === '.aew/routing.md' && x.action === 'preserved'));
}));

test('installs valid discoverable skills for selected adapters', () => sandbox(root => {
  install(root, { adapters: ['codex', 'claude'] });
  for (const base of ['.agents/skills', '.claude/skills']) {
    for (const role of ['analyst', 'architect', 'developer', 'qa', 'reviewer', 'devops']) {
      const file = join(root, base, `aew-${role}`, 'SKILL.md');
      assert.ok(existsSync(file), file);
      assert.match(readFileSync(file, 'utf8'), new RegExp(`name: aew-${role}`));
    }
  }
  assert.equal(doctor(root).ok, true);
}));
test('doctor flags missing skill and preserves existing skill on reinstall', () => sandbox(root => {
  install(root, { adapters: ['codex'] });
  const file = join(root, '.agents/skills/aew-developer/SKILL.md');
  writeFileSync(file, 'custom skill');
  install(root, { adapters: ['codex'] });
  assert.equal(readFileSync(file, 'utf8'), 'custom skill');
  assert.equal(doctor(root).ok, false);
  assert.ok(doctor(root).missing.some(x => x.includes('aew-developer/SKILL.md')));
}));
test('environment safety prohibits host package downloads and installation', () => sandbox(root => {
  install(root);
  const rules = readFileSync(join(root, '.aew/standards/environment-safety.md'), 'utf8');
  assert.match(rules, /apt download/);
  assert.match(rules, /explicit user approval/);
}));


test('v0.5.2 skills and adapters avoid eager full-context reads', () => sandbox(root => {
  install(root, { adapters: ['codex', 'claude'] });
  const skill = readFileSync(join(root, '.agents/skills/aew-developer/SKILL.md'), 'utf8');
  const adapter = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(skill, /do not preload/i);
  assert.match(adapter, /Do not preload/i);
  assert.ok(existsSync(join(root, '.aew/standards/token-efficiency.md')));
  assert.equal(doctor(root).ok, true);
}));

test('critical missing dependencies trigger approval request rather than silent skip', () => sandbox(root => {
  install(root, { adapters: ['codex', 'claude'] });
  const safety = readFileSync(join(root, '.aew/standards/environment-safety.md'), 'utf8');
  const routing = readFileSync(join(root, '.aew/routing.md'), 'utf8');
  const codex = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  const claudeSkill = readFileSync(join(root, '.claude/skills/aew-qa/SKILL.md'), 'utf8');
  assert.match(safety, /ask the user for explicit approval/i);
  assert.match(safety, /PostgreSQL/);
  assert.match(safety, /Pause only the blocked step/i);
  assert.match(safety, /apt download/);
  assert.match(routing, /await the answer/i);
  assert.match(codex, /ask specific approval/i);
  assert.match(claudeSkill, /approval question/i);
}));

test('v0.5.3 creates persistent project state and code quality rules', () => sandbox(root => {
  install(root, { adapters: ['codex', 'claude'], project: { technology: '.NET' } });
  for (const name of ['stack.json', 'STATE.md', 'TASKS.md', 'DECISIONS.md', 'VALIDATION.md', 'standards/code-organization.md']) assert.ok(existsSync(join(root, '.aew', name)), name);
  assert.equal(analysisModule.configShow(root).stack.technology, '.NET');
  assert.match(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /STATE.md/);
  assert.match(readFileSync(join(root, '.aew/standards/code-organization.md'), 'utf8'), /composition root/);
  assert.equal(doctor(root).ok, true);
}));
test('v0.5.3 config edits are restricted and preserve history', () => sandbox(root => {
  install(root);
  writeFileSync(join(root, '.aew/STATE.md'), 'Work in progress');
  assert.equal(analysisModule.configSet(root, 'config.output.verbosity', 'detailed'), 'detailed');
  assert.equal(analysisModule.configSet(root, 'stack.frameworkVersion', '10.0'), '10.0');
  assert.equal(analysisModule.configShow(root).config.output.verbosity, 'detailed');
  assert.throws(() => analysisModule.configSet(root, 'config.__proto__.polluted', 'yes'), /Invalid/);
  assert.throws(() => analysisModule.configSet(root, 'config.adapters', 'bad'), /Unsupported/);
  install(root);
  assert.equal(readFileSync(join(root, '.aew/STATE.md'), 'utf8'), 'Work in progress');
}));

test('v0.5.4 installs evidence-based handoff and QA acceptance rules', () => sandbox(root => {
  install(root, { adapters: ['codex', 'claude'] });
  const handoff = readFileSync(join(root, '.aew/standards/handoff.md'), 'utf8');
  const developer = readFileSync(join(root, '.agents/skills/aew-developer/SKILL.md'), 'utf8');
  const qa = readFileSync(join(root, '.aew/agents/qa.md'), 'utf8');
  assert.match(handoff, /qa-pending/);
  assert.match(handoff, /changes-requested/);
  assert.match(handoff, /verification-blocked/);
  assert.match(handoff, /Only after QA `accepted`/);
  assert.match(developer, /HANDOFFS.md/);
  assert.match(qa, /independently inspect/);
  assert.ok(existsSync(join(root, '.aew/HANDOFFS.md')));
  assert.equal(doctor(root).ok, true);
}));

test('v0.5.4 preserves handoff history on reinstall', () => sandbox(root => {
  install(root);
  const file = join(root, '.aew/HANDOFFS.md');
  writeFileSync(file, '# Handoffs\nAEW-001 accepted');
  install(root);
  assert.match(readFileSync(file, 'utf8'), /AEW-001 accepted/);
}));

test('security and acceptance gate files installed', () => sandbox(root => {
  install(root);
  for (const name of ['.aew/ISSUES.md', '.aew/gates.json', '.aew/standards/security.md', '.aew/standards/acceptance.md']) assert.ok(existsSync(join(root, name)), name);
  assert.equal(doctor(root).ok, true);
}));

test('verify blocks missing acceptance evidence and QA approval', () => sandbox(root => {
  install(root);
  writeFileSync(join(root, '.aew/gates.json'), JSON.stringify({schemaVersion:1,tasks:[{id:'AEW-001',status:'done',criteria:[{id:'AC-1',description:'Works',status:'passed'}],issues:[],qa:{verdict:'accepted',evidence:'HANDOFFS.md'}}]}));
  const result = analysisModule.verify(root, 'AEW-001');
  assert.equal(result.ok, false);
  assert.match(result.tasks[0].reasons.join(' '), /not verified/);
}));

test('verify blocks open high security issue even if flagged nonblocking', () => sandbox(root => {
  install(root);
  writeFileSync(join(root, '.aew/gates.json'), JSON.stringify({schemaVersion:1,tasks:[{id:'AEW-001',status:'done',criteria:[{id:'AC-1',description:'Works',status:'passed',evidence:'VALIDATION.md'}],issues:[{id:'SEC-1',severity:'high',status:'open',blocksAcceptance:false}],qa:{verdict:'accepted',evidence:'HANDOFFS.md'}}]}));
  assert.equal(analysisModule.verify(root).ok, false);
}));

test('verify passes fully evidenced task and fails unresolved rework', () => sandbox(root => {
  install(root);
  const task = {id:'AEW-001',status:'done',criteria:[{id:'AC-1',description:'Works',status:'passed',evidence:'VALIDATION.md'}],issues:[{id:'ISSUE-1',severity:'medium',status:'resolved',evidence:'VALIDATION.md'}],qa:{verdict:'accepted',evidence:'HANDOFFS.md'}};
  writeFileSync(join(root, '.aew/gates.json'), JSON.stringify({schemaVersion:1,tasks:[task]}));
  assert.equal(analysisModule.verify(root).ok, true);
  task.status = 'rework';
  writeFileSync(join(root, '.aew/gates.json'), JSON.stringify({schemaVersion:1,tasks:[task]}));
  assert.equal(analysisModule.verify(root).ok, false);
}));

test('central SYSTEM.md is installed and referenced by adapter bootstrap', () => {
  const root = mkdtempSync(join(tmpdir(), 'aew-system-'));
  try {
    install(root, { adapters: ['codex', 'claude', 'gemini'] });
    const system = readFileSync(join(root, '.aew/SYSTEM.md'), 'utf8');
    assert.match(system, /Engineering discipline without engineering bureaucracy/);
    for (const marker of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
      assert.match(readFileSync(join(root, marker), 'utf8'), /\.aew\/SYSTEM\.md/);
    }
    assert.equal(doctor(root).ok, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('empty verification fails rather than reporting a false PASS', () => sandbox(root => {
  install(root);
  const result = analysisModule.verify(root);
  assert.equal(result.ok, false);
  assert.deepEqual(result.tasks, []);
  assert.match(result.errors.join(' '), /No tasks available/);
}));

test('nested .NET projects are detected without changing initial project type', () => sandbox(root => {
  install(root);
  mkdirSync(join(root, 'src', 'Api'), { recursive: true });
  writeFileSync(join(root, 'src', 'Api', 'Api.csproj'), '<Project />');
  assert.ok(discover(root).tech.includes('.NET'));
  const report = doctor(root);
  assert.equal(report.ok, true);
  assert.equal(report.config.projectType, 'new');
  assert.ok(report.diagnostics.some(message => message.includes('Detected technologies differ')));
  assert.ok(report.diagnostics.some(message => message.includes('initialized as new')));
}));

test('doctor diagnoses missing files and preserves existing project records', () => sandbox(root => {
  install(root);
  rmSync(join(root, '.aew', 'gates.json'));
  const result = doctor(root);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(message => message.includes('Installation incomplete')));
  install(root);
  assert.equal(doctor(root).ok, true);
}));

test('project brief does not demand approval for every scaffold', () => sandbox(root => {
  install(root);
  const brief = readFileSync(join(root, '.aew/project-brief.md'), 'utf8');
  assert.match(brief, /minimal plan before scaffolding/);
  assert.doesNotMatch(brief, /without an approved plan/);
}));

test('v0.5.8 distinguishes recorded evidence from independent verification', () => sandbox(root => {
  install(root);
  const task = {id:'AEW-001',status:'done',criteria:[{id:'AC-1',description:'Works',status:'passed',evidence:'tests passed'}],issues:[],qa:{verdict:'accepted',evidence:'self-reported'}};
  writeFileSync(join(root, '.aew/gates.json'), JSON.stringify({schemaVersion:1,tasks:[task]}));
  const result = analysisModule.verify(root);
  assert.equal(result.ok, true);
  assert.equal(result.verification, 'recorded-only');
  assert.equal(result.independentlyVerified, false);
}));

test('v0.5.8 uses light workflow by default and validates workflow mode', () => sandbox(root => {
  install(root);
  assert.equal(analysisModule.configShow(root).config.workflow.mode, 'light');
  assert.equal(analysisModule.configSet(root, 'config.workflow.mode', 'strict'), 'strict');
  assert.throws(() => analysisModule.configSet(root, 'config.workflow.mode', 'unsafe'), /light, standard or strict/);
}));

test('v0.5.8 does not install .NET-specific style settings for other stacks', () => sandbox(root => {
  install(root, {project:{technology:'Python'}});
  const stack = analysisModule.configShow(root).stack;
  assert.equal(stack.technology, 'Python');
  assert.equal(stack.codeStyle.programCs, undefined);
  assert.equal(stack.codeStyle.comments, 'rationale-and-business-rules');
}));

test('v0.5.8 preserves .NET style guidance when .NET is selected', () => sandbox(root => {
  install(root, {project:{technology:'.NET'}});
  assert.equal(analysisModule.configShow(root).stack.codeStyle.programCs, 'composition-root');
}));
