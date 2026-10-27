import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const levels = ['UNVERIFIED', 'LOCAL_PASS', 'CI_PASS', 'REVIEWED'];
const criticalMatchers = [
  /^\.github\/(?:workflows\/|actions\/|CODEOWNERS$)/i,
  /(?:^|\/)CODEOWNERS$/i,
  /^\.aew\//i,
  /^src\/(?:trust|cli)\.js$/i,
  /(?:^|\/)(?:global\.json|NuGet\.Config|pytest\.ini|tox\.ini|jest\.config\.[^/]+|vitest\.config\.[^/]+)$/i,
  /(?:^|\/)(?:auth|authentication|authorization|security|payments?|migrations)(?:\/|$)/i,
  /(?:^|\/)(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|go\.(?:mod|sum)|pyproject\.toml|requirements(?:-[^/]*)?\.txt|Cargo\.(?:toml|lock))$/i,
  /\.csproj$/i,
  /(?:^|\/)(?:AGENTS|CLAUDE|GEMINI)\.md$/i
];
const checkSensitive = p => criticalMatchers.some(pattern => pattern.test(p));

export function classifyRisk(files, declared = 'normal') {
  if (!Array.isArray(files) || files.some(p => typeof p !== 'string') || files.length === 0)
    throw new Error('Cannot classify risk without a complete changed-file list');
  const critical = files.filter(checkSensitive);
  return { risk: critical.length || declared === 'critical' ? 'critical' : 'normal', criticalPaths: critical };
}
export const rank = name => levels.indexOf(name);

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function gh(root, path) {
  return JSON.parse(execFileSync('gh', ['api', path, '--paginate', '--slurp'], {
    cwd: root, encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe']
  }));
}
const flat = pages => pages.flatMap(page => Array.isArray(page) ? page : [page]);
function repository(root) {
  const remote = git(root, 'remote', 'get-url', 'origin');
  const match = remote.match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if (!match) throw new Error('GitHub origin remote is required');
  return match[1];
}
function readPolicy(root) {
  // For minimum assurance, the check name is a fixed built-in value.
  // Repo-local policies may add stricter rules, never lower this baseline.
  const file = join(root, '.aew', 'trust-policy.json');
  if (!existsSync(file)) throw new Error('Missing trust policy: .aew/trust-policy.json (upgrade or init required)');
  const config = JSON.parse(readFileSync(file, 'utf8'));
  if (config.schemaVersion !== 1 || !Array.isArray(config.checkNames) || config.checkNames.length === 0 || config.checkNames.some(x => typeof x !== 'string' || !x.trim()))
    throw new Error('Invalid trust policy');
  return config;
}
function tasksIn(root) {
  const dir = join(root, '.aew', 'tasks');
  if (existsSync(dir)) {
    const names = readdirSync(dir).filter(name => /^AEW-\d+\.json$/.test(name));
    if (names.length) return names.sort().map(name => {const task = JSON.parse(readFileSync(join(dir, name), 'utf8')); if (task.schemaVersion !== 2) throw new Error('Legacy task schema v1 is untrusted; migrate task records to v2'); return task;});
  }
  const legacy = JSON.parse(readFileSync(join(root, '.aew/gates.json'), 'utf8'));
  if (legacy.schemaVersion !== 2 || !Array.isArray(legacy.tasks))
    throw new Error('Legacy gates schema v1 is untrusted. Migrate to v2; no previous acceptance is retained.');
  return legacy.tasks;
}
function currentSha(root) { return git(root, 'rev-parse', 'HEAD'); }
function clean(root) { return git(root, 'status', '--porcelain', '--untracked-files=all') === ''; }

function localEvidence(root, sha) {
  const file = join(root, git(root, 'rev-parse', '--git-path', 'aew/local-check.json'));
  if (!existsSync(file)) return false;
  const evidence = JSON.parse(readFileSync(file, 'utf8'));
  return evidence.schemaVersion === 1 && evidence.result === 'LOCAL_PASS' &&
    evidence.sha === sha && evidence.clean === true && clean(root);
}
function inferCheck(root) {
  let preferred = '';
  try { preferred = JSON.parse(readFileSync(join(root, '.aew/stack.json'), 'utf8')).technology || ''; } catch { /* fall back to manifest detection */ }
  const dotnet = () => {
    const atRoot = readdirSync(root).some(name => /\\.(?:slnx?|csproj)$/.test(name));
    const nested = ['src', 'tests'].some(dir => existsSync(join(root, dir)) &&
      readdirSync(join(root, dir), {recursive:true}).some(name => /\\.(?:slnx?|csproj)$/.test(name)));
    return atRoot || nested;
  };
  if (preferred === '.NET' && dotnet()) return ['dotnet', ['test']];
  if (preferred === 'Python' && existsSync(join(root, 'pyproject.toml'))) return ['python', ['-m', 'pytest']];
  if (preferred === 'Go' && existsSync(join(root, 'go.mod'))) return ['go', ['test', './...']];
  if (existsSync(join(root, 'package.json'))) return ['npm', ['test']];
  if (existsSync(join(root, 'pyproject.toml'))) return ['python', ['-m', 'pytest']];
  if (existsSync(join(root, 'go.mod'))) return ['go', ['test', './...']];
  if (dotnet()) return ['dotnet', ['test']];
  throw new Error('No recognized test command. Define tests through a reviewed project configuration.');
}
export function check(root, { execute = spawnSync } = {}) {
  const sha = currentSha(root);
  const wasClean = clean(root);
  const [command, args] = inferCheck(root);
  const run = execute(command, args, {cwd:root, encoding:'utf8', timeout:180000, stdio:'inherit', shell:false});
  const stillClean = clean(root);
  const result = run.status === 0 && !run.error && wasClean && stillClean ? 'LOCAL_PASS' : 'UNVERIFIED';
  const evidence = { schemaVersion:1, result, sha, clean:wasClean && stillClean, command:[command,...args], exitCode:run.status, generatedAt:new Date().toISOString(), advisoryOnly:true };
  const path = join(root, git(root, 'rev-parse', '--git-path', 'aew/local-check.json'));
  mkdirSync(join(path, '..'), {recursive:true});
  writeFileSync(path, JSON.stringify(evidence,null,2)+'\n');
  return evidence;
}
export function githubEvidence(root, sha, policy, api = gh) {
  const repo = repository(root);
  const prs = flat(api(root, `repos/${repo}/pulls?state=open&per_page=100`));
  const pr = prs.find(item => item.head?.sha === sha && item.head?.repo?.full_name === repo);
  if (!pr) throw new Error('No open PR matching HEAD commit');
  // Full server-side PR diff is mandatory. Any API failure or truncation blocks verification.
  const files = flat(api(root, `repos/${repo}/pulls/${pr.number}/files?per_page=100`));
  if (!files.length || files.length >= 3000 || files.some(f => !f.filename)) throw new Error('Incomplete PR file list');
  const risk = classifyRisk(files.map(f => f.filename), policy.minimumRisk);
  const checks = flat(api(root, `repos/${repo}/commits/${sha}/check-runs?per_page=100`)).flatMap(x => x.check_runs || []);
  const matches = checks.filter(run => policy.checkNames.includes(run.name) && run.head_sha === sha && run.app?.slug === 'github-actions' && run.conclusion === 'success');
  if (!policy.checkNames.every(name => matches.some(check => check.name === name))) throw new Error('Trusted CI check not successful for HEAD');
  // A self-modified workflow requires a separate human approval, not just green CI.
  if (risk.risk === 'normal') return {level:'CI_PASS',risk,pr:pr.number};
  const commit = flat(api(root, `repos/${repo}/commits/${sha}`))[0];
  const commitAuthor = commit?.author?.login;
  if (!commitAuthor) throw new Error('Cannot verify GitHub identity of commit author');
  const reviews = flat(api(root, `repos/${repo}/pulls/${pr.number}/reviews?per_page=100`));
  const valid = reviews.filter(r => r.state === 'APPROVED' && r.commit_id === sha &&
    r.user?.type === 'User' && r.user.login !== pr.user?.login && r.user.login !== commitAuthor &&
    !/\[bot\]$/i.test(r.user.login || ''));
  const approvals = new Map();
  for (const r of reviews) if (r.user?.login) approvals.set(r.user.login, r);
  const approved = valid.some(r => approvals.get(r.user.login)?.id === r.id);
  return {level:approved ? 'REVIEWED':'CI_PASS',risk,pr:pr.number};
}
export function verifyTrusted(root, {taskId=null, ci=false, github=githubEvidence} = {}) {
  const errors=[];
  let tasks;
  try { tasks=tasksIn(root); } catch(e) {
    return {ok:false,level:'UNVERIFIED',errors:[e.message],tasks:[]};
  }
  if (!tasks.length) errors.push('No tasks available for verification');
  const selected=taskId ? tasks.filter(t=>t?.id===taskId) : tasks;
  if (taskId && !selected.length) errors.push('Requested task not found');
  for (const t of selected) {
    if (!t || !/^AEW-\d+$/.test(t.id||'') || !Array.isArray(t.criteria) || !t.criteria.length ||
      t.criteria.some(c=>!c.id || !c.description) || !Array.isArray(t.issues) ||
      t.issues.some(i=>i.status==='open' || (i.status==='accepted-risk' && !i.approval)) ||
      t.status!=='done') errors.push(`Invalid or incomplete task record: ${t?.id||'unknown'}`);
  }
  let level='UNVERIFIED', required='CI_PASS', risk=null, sha=null;
  try {
    sha=currentSha(root);
    if (!clean(root)) throw new Error('Working tree is dirty; cannot verify a commit');
    if (localEvidence(root,sha)) level='LOCAL_PASS';
    if (ci) {
      const policy=readPolicy(root);
      const proof=github(root,sha,policy);
      risk=proof.risk;
      level=proof.level;
      if (risk.risk==='critical') required='REVIEWED';
    }
  } catch(e) { errors.push(e.message); }
  if (!ci) errors.push('Independent CI verification not requested (use --ci)');
  if (rank(level)<rank(required)) errors.push(`Required ${required}; attained ${level}`);
  return {ok:errors.length===0,level,required,risk,sha,errors,tasks:selected.map(t=>({id:t?.id||null,level,verified:errors.length===0}))};
}
