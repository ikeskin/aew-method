import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

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
  // Optional external CI policy: used only for explicit --ci, not ordinary verification.
  const file=join(root,'.aew','trust-policy.json');
  if (!existsSync(file)) throw new Error('No external CI policy configured');
  const config=JSON.parse(readFileSync(file,'utf8'));
  if (!Array.isArray(config.checkNames) || !config.checkNames.length) throw new Error('No required CI checks configured');
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
function vcsContext(root) {
  try {
    const sha=git(root,'rev-parse','HEAD');
    return {type:'git',revision:sha,clean:git(root,'status','--porcelain','--untracked-files=all')===''};
  } catch {
    // SVN and VCS-free projects are valid AEW projects. Never invent a commit identity.
    try {
      const revision=execFileSync('svn',['info','--show-item','revision'],{cwd:root,encoding:'utf8',timeout:8000,stdio:['ignore','pipe','pipe']}).trim();
      const status=execFileSync('svn',['status'],{cwd:root,encoding:'utf8',timeout:8000,stdio:['ignore','pipe','pipe']}).trim();
      return {type:'svn',revision,clean:status===''};
    } catch { return {type:'none',revision:null,clean:null}; }
  }
}
function isDotnet(root) {
  const candidates=['.', 'src','tests'];
  return candidates.some(dir=> {
    const p=join(root,dir);
    if (!existsSync(p)) return false;
    try { return readdirSync(p,{recursive:true}).some(name=>/\.(?:slnx?|csproj)$/.test(name)); }
    catch { return false; }
  });
}
export function inferCheck(root) {
  // Fixed built-in commands: agent-editable configuration never directly supplies an executable.
  const candidates=[];
  if (isDotnet(root)) candidates.push(['dotnet',['test']]);
  if (existsSync(join(root,'package.json'))) {
    const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
    const script=pkg.scripts?.test;
    if (!script || /^\s*(?:echo\b|true\b|exit\s+0\b|:)\s*/i.test(script))
      throw new Error('Missing or trivial npm test script; cannot verify tests');
    candidates.push(['npm',['test']]);
  }
  if (existsSync(join(root,'pyproject.toml')) || existsSync(join(root,'pytest.ini')))
    candidates.push(['python',['-m','pytest']]);
  if (existsSync(join(root,'go.mod'))) candidates.push(['go',['test','./...']]);
  if (!candidates.length) throw new Error('No supported test project detected. Cannot claim verification.');
  // Use all detected ecosystems in polyglot repositories.
  return candidates;
}
export function check(root,{execute=spawnSync}={}) {
  const before=vcsContext(root);
  const commands=inferCheck(root);
  const results=[];
  for (const [command,args] of commands) {
    const out=execute(command,args,{cwd:root,encoding:'utf8',timeout:180000,stdio:'inherit',shell:false});
    results.push({command:[command,...args],exitCode:out.status,signal:out.signal||null,error:out.error?.message||null,passed:out.status===0 && !out.error});
  }
  const after=vcsContext(root);
  const stable=before.type===after.type && before.revision===after.revision && before.clean===after.clean;
  const passed=stable && results.every(x=>x.passed);
  return {schemaVersion:2,result:passed?'LOCAL_PASS':'UNVERIFIED',source:'executed-by-aew',advisoryOnly:true,
    vcs:after,sourceChangedDuringRun:!stable,tests:results};
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
  // Host-provided CI evidence is optional; risk findings are advisory, not an approval gate.
  return {level:'CI_PASS',risk,pr:pr.number};
}
export function verifyTrusted(root,{taskId=null,ci=false,github=githubEvidence,execute=spawnSync}={}) {
  const errors=[];
  let tasks=[];
  const hasTasks=existsSync(join(root,'.aew','gates.json')) ||
    existsSync(join(root,'.aew','tasks'));
  if (hasTasks) {
    try { tasks=tasksIn(root); }
    catch(e){ return {ok:false,level:'UNVERIFIED',errors:[e.message],tasks:[]}; }
    if (taskId && !tasks.some(t=>t?.id===taskId)) errors.push('Requested task not found');
    const chosen=taskId?tasks.filter(t=>t?.id===taskId):tasks;
    for (const t of chosen) {
      if (!t || !/^AEW-\d+$/.test(t.id||'') ||
        !Array.isArray(t.criteria) || !t.criteria.length ||
        t.criteria.some(c=>!c?.id||!c.description) ||
        !Array.isArray(t.issues) || t.issues.some(i=>i?.status==='open') ||
        t.status!=='done')
        errors.push(`Invalid or incomplete task record: ${t?.id||'unknown'}`);
    }
    tasks=chosen;
  } else if (taskId) errors.push('No task records available');
  let evidence=null,level='UNVERIFIED',risk=null,revision=null;
  try {
    evidence=check(root,{execute});
    revision=evidence.vcs.revision;
    if (evidence.result==='LOCAL_PASS') level='LOCAL_PASS';
    else errors.push('Required local test execution did not pass');
  } catch(e) { errors.push(e.message); }
  if (ci) {
    try {
      if (evidence?.vcs.type!=='git' || !evidence.vcs.clean)
        throw new Error('GitHub CI provider requires a clean Git commit');
      const proof=github(root,revision,readPolicy(root));
      risk=proof.risk;
      if (level==='LOCAL_PASS') level=proof.level;
    } catch(e){ errors.push(e.message); }
  }
  return {ok:errors.length===0,level,required:ci?'CI_PASS':'LOCAL_PASS',risk,revision,
    independentApproval:level==='REVIEWED',errors,evidence,tasks:tasks.map(t=>({id:t.id,recordedStatus:t.status}))};
}
