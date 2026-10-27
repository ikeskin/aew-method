import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin } from 'node:process';
import { check as executeCheck, verifyTrusted } from './trust.js';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { banner, heading, notice, step, summary, select, multiSelect, askText } from './prompts.js';

const methodRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../method');
const agents = ['analyst', 'architect', 'developer', 'qa', 'reviewer', 'devops'];
const workflows = ['feature', 'bugfix', 'review', 'deployment'];
const supported = ['codex', 'claude', 'gemini'];
const applications = ['backend', 'web', 'mobile', 'cli', 'library', 'other'];
const technologyProfiles = ['.NET', 'Node.js', 'Python', 'Go', 'React'];
const read = path => readFileSync(path, 'utf8');
const normalize = x => String(x || '').trim().toLowerCase();
const markers = { codex: 'AGENTS.md', claude: 'CLAUDE.md', gemini: 'GEMINI.md' };
const skillRoots = { codex: '.agents/skills', claude: '.claude/skills' };
const digest = content => createHash('sha256').update(content).digest('hex');
const managedManifest = '.aew/managed.json';
const isManagedTemplate = path => path.startsWith('.aew/agents/') || path.startsWith('.aew/standards/') || path.startsWith('.aew/workflows/') || path.startsWith('.aew/profiles/') || ['.aew/SYSTEM.md', '.aew/constitution.md', '.aew/routing.md', '.aew/trust-policy.json'].includes(path) || path.includes('/skills/');
const skillPath = (adapter, role) => `${skillRoots[adapter]}/aew-${role}/SKILL.md`;


export function discover(root) {
  const has = p => existsSync(join(root, p));
  let names = {};
  if (has('package.json')) { try { names = JSON.parse(read(join(root, 'package.json'))); } catch { /* Invalid manifests are reported by the project's build tools. */ } }
  const files = readdirSync(root);
  const nestedProject = (dir, suffixes) => {
    const path = join(root, dir);
    if (!existsSync(path)) return false;
    try { return readdirSync(path, { withFileTypes: true }).some(entry =>
      entry.isFile() && suffixes.some(suffix => entry.name.endsWith(suffix)) ||
      entry.isDirectory() && !['node_modules', 'bin', 'obj', '.git', '.aew'].includes(entry.name) && nestedProject(join(dir, entry.name), suffixes)
    ); } catch { return false; }
  };
  const tech = [];
  if (files.some(f => f.endsWith('.sln') || f.endsWith('.slnx') || f.endsWith('.csproj')) || ['src', 'tests'].some(dir => nestedProject(dir, ['.sln', '.slnx', '.csproj']))) tech.push('.NET');
  if (has('package.json')) tech.push('Node.js');
  if (has('pyproject.toml') || has('requirements.txt')) tech.push('Python');
  if (has('go.mod')) tech.push('Go');
  if (has('Cargo.toml')) tech.push('Rust');
  if (names.dependencies?.react || names.devDependencies?.react) tech.push('React');
  const ci = has('azure-pipelines.yml') || has('azure-pipelines.yaml') ? 'azure-devops' : has('.github/workflows') ? 'github-actions' : 'unknown';
  const meaningful = files.filter(f => !['.git', '.DS_Store', '.aew', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].includes(f));
  return { tech, ci, empty: meaningful.length === 0, existing: Object.fromEntries(supported.map(s => [s, has(markers[s])])) };
}

function installFile(root, relative, content, { dryRun = false } = {}) {
  const target = join(root, relative);
  if (existsSync(target)) return { relative, action: 'preserved' };
  if (!dryRun) { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content, 'utf8'); }
  return { relative, action: dryRun ? 'planned' : 'written' };
}

function skillContent(role) {
  const triggers = {
    analyst: 'Clarify ambiguous requirements, constraints, or acceptance criteria before implementation.',
    architect: 'Evaluate consequential architecture changes or significant technical trade-offs.',
    developer: 'Implement a feature or bug fix and run relevant checks.',
    qa: 'Review acceptance evidence, regression risks, and test gaps; do not self-certify independent approval.',
    reviewer: 'Review code changes for correctness, maintainability, and security.',
    devops: 'Review CI, deployment, infrastructure, or operational changes.'
  };
  return `---
name: aew-${role}
description: ${triggers[role]}
---

# AEW ${role}

${triggers[role]}
Follow .aew/SYSTEM.md and inspect only relevant source, tests, and role guidance; do not preload all AEW documents. For missing critical tools ask one concrete approval question before provisioning; do not silently skip tests.
Roles are responsibilities, not independent agents. Record real test results; never claim an independent review unless one occurred.
Use light mode without task paperwork for small changes. Use per-task records for tracked work. For explicit handoffs, consult .aew/HANDOFFS.md; no handoff is implied otherwise.
`;
}

function adapterContent(adapter) {
  const entry = adapter === 'gemini' ? 'Gemini CLI' : adapter === 'claude' ? 'Claude Code' : 'Codex';
  return `# AEW — ${entry}

Read .aew/SYSTEM.md when starting relevant engineering work. Read .aew/STATE.md only if it contains relevant context. Follow the project's existing conventions and the user's instructions.
Use light mode by default; consult .aew/routing.md only for workflow selection; read additional guidance only when needed. For missing critical dependencies ask specific approval before provisioning; never silently skip essential verification. Track larger work in .aew/tasks/<ID>.json.
Do not preload all AEW files. Do not imply independent QA based on self-authored records. Run actual tests and report limitations.
`;
}

export function install(root, { adapters = ['codex'], projectType, project = {}, devops = 'detect', dryRun = false } = {}) {
  const info = discover(root);
  const selected = [...new Set(adapters.map(normalize))];
  if (selected.length === 0 || selected.some(s => !supported.includes(s))) throw new Error(`Supported adapters: ${supported.join(', ')}`);
  const type = projectType || (info.empty ? 'new' : 'existing');
  const results = [];
  const put = (rel, content) => results.push(installFile(root, rel, content, { dryRun }));
  put('.aew/SYSTEM.md', read(join(methodRoot, 'SYSTEM.md')));
  put('.aew/constitution.md', read(join(methodRoot, 'constitution.md')));
  put('.aew/routing.md', read(join(methodRoot, 'routing.md')));
  for (const application of applications) put(`.aew/profiles/project/${application}.md`, read(join(methodRoot, 'profiles', 'project', `${application}.md`)));
  for (const tech of [...technologyProfiles, 'generic']) put(`.aew/profiles/technology/${tech}.md`, read(join(methodRoot, 'profiles', 'technology', `${tech}.md`)));
  for (const standard of ['readability', 'comments', 'engineering-scope', 'environment-safety', 'progressive-discovery', 'token-efficiency']) put(`.aew/standards/${standard}.md`, read(join(methodRoot, 'standards', `${standard}.md`)));
  for (const a of agents) put(`.aew/agents/${a}.md`, read(join(methodRoot, 'agents', `${a}.md`)));
  for (const w of workflows) put(`.aew/workflows/${w}.md`, read(join(methodRoot, 'workflows', `${w}.md`)));
  put('.aew/standards/quality-gates.md', read(join(methodRoot, 'standards/quality-gates.md')));
  const config = { schemaVersion: 1, workflow: { mode: 'light' }, routing: { mode: 'adaptive' }, environment: { systemChanges: 'ask' }, output: { verbosity: 'concise' }, research: { mode: 'when-needed' }, quality: { tests: 'required' }, projectType: type, adapters: selected, devops: devops === 'detect' ? info.ci : devops, detected: info.tech, project };
  put('.aew/config.json', JSON.stringify(config, null, 2) + '\n');
  put('.aew/project-brief.md', projectBrief(config));
  put('.aew/stack.json', JSON.stringify({ schemaVersion: 1, technology: project.technology || (info.tech.length === 1 ? info.tech[0] : 'undecided'), frameworkVersion: null, database: null, testing: null, codeStyle: { comments: 'rationale-and-business-rules', complexity: 'proportional', ...(project.technology === '.NET' || info.tech.includes('.NET') ? { programCs: 'composition-root', endpointOrganization: 'feature-grouped', dataAccess: 'separate-from-http' } : {}) } }, null, 2) + '\n');
  put('.aew/STATE.md', '# AEW Project State\n\nStatus: idle\nCurrent task: none\nLast completed: none\n\n## Focus\nNot started.\n\n## Verified\nNo verification recorded.\n\n## Blockers\nNone recorded.\n\n## Next\nSelect a task.\n');
  put('.aew/TASKS.md', '# AEW Tasks\n\nUse IDs AEW-001 onward. Keep tasks small and acceptance criteria observable.\n\n## Open\n\n## Completed\n');
  put('.aew/DECISIONS.md', '# AEW Decisions\n\nRecord consequential decisions only: ID, date, context, decision, rationale and trade-off. Do not manufacture decisions.\n');
  put('.aew/VALIDATION.md', '# AEW Validation\n\nAppend actual command, date, environment, passed/failed/skipped and blockers. Never describe unexecuted tests as passed.\n');
  put('.aew/standards/code-organization.md', read(join(methodRoot, 'standards/code-organization.md')));
  put('.aew/standards/handoff.md', read(join(methodRoot, 'standards/handoff.md')));
  put('.aew/HANDOFFS.md', '# AEW Handoffs\n\nRecord role transitions with task ID, owner, evidence, review verdict and next action. No implied approvals.\n');
  put('.aew/ISSUES.md', '# AEW Open Issues\n\nRecord each issue ID, linked task, severity, status, impact, resolution and verification. Keep this narrative synchronized with gates.json.\n');
  put('.aew/gates.json', JSON.stringify({ schemaVersion: 2, tasks: [] }, null, 2) + '\n');
  // CI integration is optional and intentionally not installed for every project.
  for (const standard of ['security', 'acceptance']) put(`.aew/standards/${standard}.md`, read(join(methodRoot, 'standards', `${standard}.md`))); 
  for (const a of selected) {
    put(markers[a], adapterContent(a));
    if (skillRoots[a]) for (const role of agents) put(skillPath(a, role), skillContent(role));
  }
  if (!dryRun && !existsSync(join(root, managedManifest))) {
    const files = Object.fromEntries(results.filter(r => r.action === 'written' && isManagedTemplate(r.relative)).map(r => [r.relative, digest(read(join(root, r.relative)))]));
    mkdirSync(join(root, '.aew'), { recursive: true });
    writeFileSync(join(root, managedManifest), JSON.stringify({ schemaVersion: 1, files }, null, 2) + '\n');
  }
  return { info, results, config };
}


/** Update only files whose installed checksum still matches the prior managed version. */
export function upgrade(root, { dryRun = false } = {}) {
  const manifestPath = join(root, managedManifest);
  if (!existsSync(manifestPath)) return { ok: false, results: [], errors: ['No managed manifest; legacy files cannot be safely overwritten. Run aew init to add missing files, then review existing templates manually.'] };
  let manifest;
  try { manifest = JSON.parse(read(manifestPath)); } catch { return { ok: false, results: [], errors: ['Invalid managed manifest'] }; }
  if (manifest?.schemaVersion !== 1 || !manifest.files || typeof manifest.files !== 'object') return { ok: false, results: [], errors: ['Invalid managed manifest'] };
  const config = jsonAt(root, 'config.json');
  const temp = mkdtempSync(join(tmpdir(), 'aew-upgrade-'));
  const results = [];
  try {
    install(temp, { adapters: config.adapters || ['codex'], projectType: config.projectType, project: config.project || {} });
    const generated = JSON.parse(read(join(temp, managedManifest))).files;
    const next = { ...manifest.files };
    for (const [relative, newHash] of Object.entries(generated)) {
      if (!isManagedTemplate(relative)) continue;
      const target = join(root, relative);
      const oldHash = manifest.files[relative];
      if (existsSync(target) && !oldHash) { results.push({ relative, action: 'untracked' }); continue; }
      if (existsSync(target) && digest(read(target)) !== oldHash) { results.push({ relative, action: 'conflict' }); continue; }
      if (existsSync(target) && digest(read(target)) === newHash) { results.push({ relative, action: 'unchanged' }); next[relative] = newHash; continue; }
      results.push({ relative, action: dryRun ? 'planned' : 'updated' });
      if (!dryRun) { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, read(join(temp, relative))); next[relative] = newHash; }
    }
    if (!dryRun) writeFileSync(manifestPath, JSON.stringify({ schemaVersion: 1, files: next }, null, 2) + '\n');
    return { ok: !results.some(r => ['conflict', 'untracked'].includes(r.action)), results, errors: [] };
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

/** One-way, non-destructive migration from shared legacy gates to per-task records. */
export function migrateTasks(root, { dryRun = false } = {}) {
  const legacy = jsonAt(root, 'gates.json');
  if (legacy?.schemaVersion !== 1 || !Array.isArray(legacy.tasks)) throw new Error('Invalid legacy gates schema');
  const results = [];
  const ids = new Set();
  for (const task of legacy.tasks) {
    if (!task || typeof task.id !== 'string' || !/^AEW-\d+$/.test(task.id) || ids.has(task.id)) throw new Error('Invalid or duplicate legacy task ID');
    ids.add(task.id);
    const relative = `.aew/tasks/${task.id}.json`;
    if (existsSync(join(root, relative))) { results.push({ relative, action: 'preserved' }); continue; }
    results.push({ relative, action: dryRun ? 'planned' : 'written' });
    if (!dryRun) { mkdirSync(dirname(join(root, relative)), { recursive: true }); writeFileSync(join(root, relative), JSON.stringify({ ...task, schemaVersion: 2 }, null, 2) + '\n'); }
  }
  return { ok: true, results, legacyPreserved: true };
}

function projectBrief(config) {
  const p = config.project;
  return `# Project Brief\n\n- **Project type:** ${config.projectType}\n- **Purpose:** ${p.purpose || 'To be clarified before implementation'}\n- **Application:** ${p.application || 'Undecided'}\n- **Technology preference:** ${p.technology || 'Undecided'}\n- **Architecture:** ${p.architecture || 'Prefer the simplest suitable design; validate against actual requirements'}
- **Project profile:** .aew/profiles/project/${applications.includes(p.application) ? p.application : 'other'}.md
- **Technology profile:** .aew/profiles/technology/${technologyProfiles.includes(p.technology) ? p.technology : 'generic'}.md\n\n## Engineering guidance\n\n- Establish a minimal plan before scaffolding. Ask for approval only for unresolved high-impact decisions or operations requiring explicit authorization.\n- Ask about missing domain rules and acceptance criteria before implementing features.\n- Avoid speculative abstractions and premature infrastructure.\n- Deployment choices are deferred until deployment requirements exist.\n`;
}

export function analyze(root) {
  const info = discover(root);
  const has = p => existsSync(join(root, p));
  const files = readdirSync(root);
  const tests = files.some(f => /^(test|tests|__tests__)$/i.test(f)) || files.some(f => /\.Tests\.csproj$/.test(f));
  let config;
  if (has('.aew/config.json')) { try { config = JSON.parse(read(join(root, '.aew/config.json'))); } catch { /* doctor reports invalid config */ } }
  const notes = [];
  if (info.empty) notes.push('Workspace is empty; establish product goals and acceptance criteria before scaffolding.');
  if (!tests && !info.empty) notes.push('No root-level test directory detected; nested test projects may still exist.');
  if (info.ci === 'unknown') notes.push('CI/CD is not detected; no deployment setup is required during initialization.');
  if ((has('AGENTS.md') || has('CLAUDE.md') || has('GEMINI.md')) && !config) notes.push('Agent instructions detected; review for conflicts.');
  if (config?.project?.purpose) notes.push('Configured project purpose is available in .aew/project-brief.md; domain questions require an AI-assisted workflow, not this static scan.');
  return { ...info, configured: config ? { application: config.project?.application, technology: config.project?.technology, architecture: config.project?.architecture, purpose: config.project?.purpose } : null, testsDetectedAtRoot: tests, observations: notes, limitations: ['Static shallow scan only; no architecture or code-quality conclusions are inferred.'] };
}

export function doctor(root) {
  const required = ['.aew/SYSTEM.md', '.aew/config.json', '.aew/constitution.md', '.aew/project-brief.md', '.aew/workflows/feature.md', '.aew/workflows/deployment.md', '.aew/routing.md', '.aew/standards/readability.md', '.aew/standards/comments.md', '.aew/standards/engineering-scope.md', '.aew/standards/environment-safety.md', '.aew/standards/progressive-discovery.md', '.aew/stack.json', '.aew/STATE.md', '.aew/TASKS.md', '.aew/DECISIONS.md', '.aew/VALIDATION.md', '.aew/standards/code-organization.md', '.aew/standards/handoff.md', '.aew/HANDOFFS.md', '.aew/ISSUES.md', '.aew/gates.json', '.aew/standards/security.md', '.aew/standards/acceptance.md'];
  const missing = required.filter(p => !existsSync(join(root, p)));
  let config;
  if (!missing.includes('.aew/config.json')) {
    try { config = JSON.parse(read(join(root, '.aew/config.json'))); }
    catch { missing.push('valid .aew/config.json'); }
  }
  if (config?.adapters && Array.isArray(config.adapters)) {
    for (const adapter of config.adapters) {
      if (markers[adapter] && !existsSync(join(root, markers[adapter]))) missing.push(markers[adapter]);
      if (skillRoots[adapter]) for (const role of agents) {
        const path = skillPath(adapter, role);
        if (!existsSync(join(root, path))) missing.push(path);
        else {
          const content = read(join(root, path));
          if (!content.startsWith('---\n') || !content.includes(`name: aew-${role}`) || !content.includes('description:')) missing.push(`valid ${path}`);
        }
      }
    }
  }
  const diagnostics = [];
  if (missing.length) diagnostics.push('Installation incomplete: run aew init to add missing files without overwriting existing files.');
  if (config && discover(root).tech.some(t => !config.detected?.includes(t))) diagnostics.push('Detected technologies differ from saved configuration; run aew analyze and review .aew/config.json.');
  if (config?.projectType === 'new' && discover(root).tech.length > 0) diagnostics.push('Project was initialized as new but now contains source files; projectType records the original setup choice.');
  return { ok: missing.length === 0, missing, config, diagnostics };
}

const projectFile = (root, file) => join(root, '.aew', file);
function jsonAt(root, file) { return JSON.parse(read(projectFile(root, file))); }
function assertKey(key) { if (!/^[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*$/.test(key) || ['__proto__', 'prototype', 'constructor'].some(x => key.split('.').includes(x))) throw new Error('Invalid config key'); }
export function configShow(root) { return { config: jsonAt(root, 'config.json'), stack: jsonAt(root, 'stack.json') }; }
export function configSet(root, key, value) {
  assertKey(key);
  const [scope, ...parts] = key.split('.');
  if (!['config', 'stack'].includes(scope) || !parts.length) throw new Error('Use config.<key> or stack.<key>');
  const filename = scope === 'config' ? 'config.json' : 'stack.json';
  const obj = jsonAt(root, filename);
  const allowed = scope === 'config' ? ['workflow.mode', 'routing.mode', 'environment.systemChanges', 'output.verbosity', 'research.mode', 'quality.tests'] : ['technology', 'frameworkVersion', 'database', 'testing', 'codeStyle.programCs', 'codeStyle.endpointOrganization', 'codeStyle.dataAccess', 'codeStyle.comments', 'codeStyle.complexity'];
  const path = parts.join('.');
  if (!allowed.includes(path)) throw new Error(`Unsupported setting: ${key}`);
  if (scope === 'config' && path === 'workflow.mode' && !['light', 'standard', 'strict'].includes(value)) throw new Error('workflow.mode must be light, standard or strict');
  const parsed = ['database', 'testing'].includes(path) ? (() => { try { return JSON.parse(value); } catch { return value; } })() : value;
  if (typeof parsed !== 'string' && parsed !== null && !['database', 'testing'].includes(path)) throw new Error('Expected a string setting');
  let cursor = obj;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
  cursor[parts.at(-1)] = parsed;
  writeFileSync(projectFile(root, filename), JSON.stringify(obj, null, 2) + '\n');
  return parsed;
}
export function projectStatus(root) {
  return { state: read(projectFile(root, 'STATE.md')), tasks: read(projectFile(root, 'TASKS.md')) };
}


// Legacy v1 records are never trusted as a quality gate.
export function verify(root, taskId = null, options = {}) {
  return verifyTrusted(root, { taskId, ...options });
}

const option = (args, flag, fallback) => { const i = args.indexOf(flag); return i >= 0 ? (args[i + 1] || fallback) : fallback; };

async function interview(info, defaults) {
  banner();
  heading('Project setup', 'Start with the project. CI/CD can be configured later.');
  notice(info.empty ? 'Empty workspace detected' : `Technologies: ${info.tech.join(', ') || 'Not detected yet'}`);
  step(1, 5, 'Project status');
  const projectType = await select({ title: 'What is the current project status?', options: [
    { label: 'New project', description: 'No source code yet', value: 'new' },
    { label: 'Existing project', description: 'Preserve the existing structure', value: 'existing' },
    { label: 'Library / SDK', description: 'Focus on public API compatibility', value: 'library' }
  ], initial: info.empty ? 0 : 1 });
  step(2, 5, 'Application type');
  const application = await select({ title: 'What are you building?', options: [
    { label: 'Web API / Backend', description: 'Services, API contracts, and data access', value: 'backend' }, { label: 'Web application', description: 'Frontend or full-stack web product', value: 'web' },
    { label: 'Mobile application', description: 'iOS / Android application', value: 'mobile' }, { label: 'CLI / Developer tool', description: 'Terminal tools and automation', value: 'cli' },
    { label: 'Library / SDK', description: 'Reusable package and public API', value: 'library' }, { label: 'Other / Not decided yet', description: 'Can be decided later', value: 'other' }
  ] });
  step(3, 5, 'Project purpose');
  const purpose = await askText('What is the primary purpose of the project?', { placeholder: 'One short sentence; optional' });
  step(4, 5, 'Technology and architecture');
  const technology = await select({ title: 'What technology do you prefer?', options: [
    { label: 'Preserve existing technology / Decide later', value: 'undecided' },
    { label: '.NET / C#', value: '.NET' }, { label: 'Node.js / TypeScript', value: 'Node.js' },
    { label: 'Python', value: 'Python' }, { label: 'Go', value: 'Go' },
    { label: 'Other', value: 'other' }
  ], initial: 0 });
  const architecture = await select({ title: 'Architecture approach?', hint: 'AEW does not impose an architecture.', options: [
    { label: 'Recommend the simplest suitable design', description: 'Start with actual needs; add abstractions only when needed', recommended: true, value: 'simple-first' },
    { label: 'Preserve existing architecture', value: 'preserve-existing' },
    { label: 'Decide later', value: 'undecided' }
  ] });
  step(5, 5, 'AI tool integration');
  const adapters = await multiSelect({ title: 'Which AI tools do you use?', hint: 'You can select multiple tools.', options: [
    { label: 'Codex', value: 'codex' }, { label: 'Claude Code', value: 'claude' },
    { label: 'Gemini CLI', value: 'gemini' }
  ], initial: defaults.adapters.filter(a => supported.includes(a)) });
  return { projectType, project: { application, purpose, technology, architecture }, adapters };
}

export async function run(args, root = process.cwd()) {
  const [command = 'help', ...rest] = args;
  if (command === 'help' || args.includes('--help')) {
    console.log('AEW Method v0.5.8\n  aew init [--yes] [--dry-run] [--adapters codex,claude,gemini]\n  aew analyze [--json]\n  aew inspect\n  aew doctor [--json]\n  aew upgrade [--dry-run]\n  aew migrate-tasks [--dry-run]\n  aew status\n  aew tasks\n  aew handoffs\n  aew issues\n  aew check\n  aew verify [--json] [--task AEW-001] [--ci (optional GitHub)]\n  aew config show\n  aew config set config.output.verbosity concise\n  aew config set stack.technology .NET\n  aew configure'); return;
  }
  if (command === 'upgrade') { const result = upgrade(root, { dryRun: rest.includes('--dry-run') }); console.log(JSON.stringify(result, null, 2)); if (!result.ok) process.exitCode = 1; return; }
  if (command === 'migrate-tasks') { console.log(JSON.stringify(migrateTasks(root, { dryRun: rest.includes('--dry-run') }), null, 2)); return; }
  if (command === 'check') { const result = executeCheck(root); console.log(JSON.stringify(result, null, 2)); if (result.result !== 'LOCAL_PASS') process.exitCode = 1; return; }
  if (command === 'verify') { const result = verify(root, option(rest, '--task', null), {ci:rest.includes('--ci')}); if (rest.includes('--json')) console.log(JSON.stringify(result, null, 2)); else { console.log(`${result.ok ? '✓' : '✗'} AEW trust verification: ${result.level} (required ${result.required || 'CI_PASS'})`); for (const error of result.errors) console.log(`  ERROR: ${error}`); } if (!result.ok) process.exitCode = 1; return; }
  if (command === 'issues') { console.log(read(projectFile(root, 'ISSUES.md'))); return; }
  if (command === 'handoffs') { console.log(read(projectFile(root, 'HANDOFFS.md'))); return; }
  if (command === 'status' || command === 'tasks') { const status = projectStatus(root); console.log(command === 'status' ? status.state : status.tasks); return; }
  if (command === 'config') {
    if (rest[0] === 'show') { console.log(JSON.stringify(configShow(root), null, 2)); return; }
    if (rest[0] === 'set' && rest.length >= 3) { console.log(`${rest[1]} = ${JSON.stringify(configSet(root, rest[1], rest.slice(2).join(' ')))}`); return; }
    throw new Error('Usage: aew config show | aew config set <config.key|stack.key> <value>');
  }
  if (command === 'configure') { console.log('Edit .aew/stack.json and .aew/config.json or use aew config set; existing values are preserved.'); return; }
  if (command === 'inspect') { console.log(JSON.stringify(discover(root), null, 2)); return; }
  if (command === 'analyze') {
    const report = analyze(root);
    if (rest.includes('--json')) console.log(JSON.stringify(report, null, 2));
    else {
      heading('AEW · Project analysis');
      console.log(`Technology: ${report.tech.join(', ') || 'Not detected'}\nConfigured technology: ${report.configured?.technology || 'Not specified'}\nProject profile: ${report.configured?.application || 'Not specified'}\nWorkspace: ${report.empty ? 'Empty' : 'Existing'}\nCI/CD: ${report.ci}\nTests at root: ${report.testsDetectedAtRoot ? 'Detected' : 'Not detected'}`);
      for (const note of report.observations) console.log(`• ${note}`);
      console.log(`\nNote: ${report.limitations.join(' ')}`);
    }
    return;
  }
  if (command === 'doctor') { const result = doctor(root); if (rest.includes('--json')) console.log(JSON.stringify(result, null, 2)); else { console.log(result.ok ? '✓ AEW installation healthy' : '✗ AEW installation incomplete'); console.log(`  Missing files: ${result.missing.length}`); console.log(`  Adapters: ${result.config?.adapters?.join(', ') || 'unknown'}`); console.log(`  Project: ${result.config?.projectType || 'unknown'}`); if (result.missing.length) console.log(`  Missing: ${result.missing.join(', ')}`); } if (!result.ok) process.exitCode = 1; return; }
  if (command !== 'init') throw new Error(`Unknown command: ${command}`);
  const yes = rest.includes('--yes');
  const dryRun = rest.includes('--dry-run');
  const info = discover(root);
  const defaults = { adapters: option(rest, '--adapters', 'codex').split(','), projectType: option(rest, '--project-type', info.empty ? 'new' : 'existing'), devops: option(rest, '--devops', 'detect') };
  let settings = { ...defaults, project: {} };
  if (!yes && stdin.isTTY && process.stdout.isTTY) {
    settings = { ...settings, ...await interview(info, defaults) };
    summary([['Project', `${settings.projectType} / ${settings.project.application}`], ['Purpose', settings.project.purpose], ['Technology', settings.project.technology], ['Architecture', settings.project.architecture], ['AI tools', settings.adapters.join(', ')], ['Deployment', 'Configure when needed']]);
  } else if (!yes) throw new Error('Interactive setup requires a terminal; use --yes for automation.');
  const result = install(root, { ...settings, dryRun });
  const counts = Object.fromEntries(['written', 'preserved', 'planned'].map(action => [action, result.results.filter(r => r.action === action).length]));
  console.log(dryRun ? `AEW preview complete: ${counts.planned} planned, ${counts.preserved} preserved. No files changed.` : `AEW setup complete: ${counts.written} written, ${counts.preserved} preserved, 0 errors.`);
  if (rest.includes('--verbose')) for (const item of result.results) console.log(`  ${item.action.padEnd(9)} ${item.relative}`);
}
