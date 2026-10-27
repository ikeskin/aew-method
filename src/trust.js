import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const levels = ['UNVERIFIED', 'LOCAL_PASS', 'CI_PASS'];
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
const excludedDirs = new Set(['node_modules','bin','obj','.git','.aew','.svn','dist','build','coverage','TestResults']);
function isDotnet(root) {
  const scan = (dir, depth = 0) => {
    if (depth > 12) return false;
    try {
      for (const entry of readdirSync(dir, {withFileTypes:true})) {
        if (entry.isFile() && /\.(?:slnx?|csproj)$/.test(entry.name)) return true;
        if (entry.isDirectory() && !excludedDirs.has(entry.name) && scan(join(dir,entry.name),depth+1)) return true;
      }
    } catch { /* unreadable paths cannot be inferred */ }
    return false;
  };
  return scan(root);
}
function availablePython() {
  for (const cmd of ['python3','python']) {
    try {
      const r=spawnSync(cmd,['--version'],{encoding:'utf8',timeout:3000,stdio:'ignore'});
      if (r.status===0) return cmd;
    } catch { /* try alternative */ }
  }
  return 'python3';
}
function supportedNodeRunner(script) {
  if (typeof script !== 'string') return false;
  const normalized=script.trim();
  // A known test runner is required; arbitrary npm commands do not prove tests ran.
  if (/^(?:node|nodejs)\s+--test(?:\s+--test-reporter=tap)?$/.test(normalized)) return true;
  if (/^(?:jest|vitest\s+run|mocha)(?:\s+--(?:runInBand|ci|reporter=(?:tap|default)))?$/.test(normalized)) return true;
  return false;
}
function nodeTestSummary(output) {
  const text=String(output||'');
  const total=text.match(/^# tests\s+(\d+)\s*$/m);
  const pass=text.match(/^# pass\s+(\d+)\s*$/m);
  const fail=text.match(/^# fail\s+(\d+)\s*$/m);
  if (total && pass && fail) return {total:Number(total[1]),passed:Number(pass[1]),failed:Number(fail[1])};
  // Third-party runners with machine-readable totals when present.
  const jest=text.match(/Tests:\s*(?:(\d+) failed,?\s*)?(\d+) passed,?\s*(\d+) total/);
  if (jest) return {total:Number(jest[3]),passed:Number(jest[2]),failed:Number(jest[1]||0)};
  const vitest=text.match(/Tests\s+(?:(\d+) failed\s*\|\s*)?(\d+) passed\s*\((\d+)\)/);
  if (vitest) return {total:Number(vitest[3]),passed:Number(vitest[2]),failed:Number(vitest[1]||0)};
  const mocha=text.match(/\b(\d+) passing\b/);
  if (mocha) return {total:Number(mocha[1]),passed:Number(mocha[1]),failed:0};
  return null;
}
function gitTestChanges(root) {
  try {
    const files=git(root,'diff-tree','--no-commit-id','--name-only','-r','HEAD').split('\n').filter(Boolean);
    return files.filter(path=>/(?:^|\/)(?:__tests__\/|tests?\/)|(?:\.|_)(?:test|spec)\.[cm]?[jt]sx?$/.test(path));
  } catch { return []; }
}
export function inferCheck(root) {
  const candidates=[];
  if (isDotnet(root)) candidates.push(['dotnet',['test']]);
  if (existsSync(join(root,'package.json'))) {
    const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
    const script=pkg.scripts?.test;
    if (script != null) {
      if (!supportedNodeRunner(script)) throw new Error('Unknown or unsafe npm test command; only supported test runners can provide test-count evidence');
      candidates.push(['npm',['test']]);
    } else if (!candidates.length && !existsSync(join(root,'pyproject.toml')) &&
      !existsSync(join(root,'pytest.ini')) && !existsSync(join(root,'go.mod'))) {
      throw new Error('Missing npm test script; cannot verify tests');
    }
  }
  if (existsSync(join(root,'pyproject.toml')) || existsSync(join(root,'pytest.ini')))
    candidates.push([availablePython(),['-m','pytest']]);
  if (existsSync(join(root,'go.mod'))) candidates.push(['go',['test','./...']]);
  if (!candidates.length) throw new Error('No supported test project detected. Cannot claim verification.');
  return candidates;
}
export function check(root,{execute=spawnSync,timeoutMs=180000}={}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs<1000 || timeoutMs>3600000)
    throw new Error('Test timeout must be between 1000 and 3600000 ms');
  const before=vcsContext(root);
  const commands=inferCheck(root);
  const results=[];
  for (const [command,args] of commands) {
    const out=execute(command,args,{cwd:root,encoding:'utf8',timeout:timeoutMs,stdio:['ignore','pipe','pipe'],shell:false,maxBuffer:16*1024*1024,
      env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('NODE_TEST_')))});
    const timedOut=out.error?.code==='ETIMEDOUT';
    const output=String(out.stdout||'')+'\\n'+String(out.stderr||'');
    const summary=command==='npm'?nodeTestSummary(output):null;
    const validCount=command!=='npm' || Boolean(summary && summary.total>0 && summary.passed>0 && summary.failed===0);
    const passed=out.status===0 && !out.error && validCount;
    results.push({command:[command,...args],exitCode:out.status,signal:out.signal||null,
      error:out.error?.message||null,timedOut,testCounts:summary,
      passed,reason:command==='npm' && !validCount?'No positive test-runner count verified (empty, skipped or unrecognized output); output tail: '+output.slice(-450).replaceAll('\\n',' | '):null});
  }
  const after=vcsContext(root);
  const revisionStable=before.type===after.type && before.revision===after.revision;
  const workingTreeChanged=before.clean===true && after.clean===false;
  const changedTests=before.type==='git'?gitTestChanges(root):[];
  // A newly changed or removed test cannot independently validate itself.
  // Require a follow-up verification decision rather than returning a green gate.
  const testIntegrityUnverified=changedTests.length>0;
  const passed=revisionStable && !testIntegrityUnverified && results.every(x=>x.passed);
  const warnings=[];
  if (workingTreeChanged) warnings.push('Tests left uncommitted/untracked files; inspect git status or svn status and ignore generated output if appropriate');
  if (before.clean===false || after.clean===false) warnings.push('Working tree is dirty; LOCAL_PASS is not evidence for a clean commit');
  if (changedTests.length) warnings.push('Test files changed in HEAD: '+changedTests.join(', ')+'; test-integrity review required');
  if (results.some(x=>x.timedOut)) warnings.push('Test command timed out; increase --timeout-ms and rerun');
  if (results.some(x=>x.reason)) warnings.push(...results.filter(x=>x.reason).map(x=>x.reason));
  return {schemaVersion:2,result:passed?'LOCAL_PASS':'UNVERIFIED',source:'executed-by-aew',advisoryOnly:true,
    vcs:after,sourceChangedDuringRun:!revisionStable,workingTreeChanged,changedTests,testIntegrityUnverified,
    cleanCommitEvidence:passed && before.clean===true && after.clean===true,
    warnings,tests:results};
}
export function githubEvidence(root, sha, policy, api = gh) {
  const repo = repository(root);
  const prs = flat(api(root, `repos/${repo}/pulls?state=open&per_page=100`));
  const pr = prs.find(item => item.head?.sha === sha && item.head?.repo?.full_name === repo);
  // Merge commits without an open PR can still be verified using SHA-bound CI results.
  if (!pr) {
    const checks = flat(api(root, `repos/${repo}/commits/${sha}/check-runs?per_page=100`)).flatMap(x=>x.check_runs||[]);
    const trusted=checks.filter(run=>policy.checkNames.includes(run.name) && run.head_sha===sha && run.app?.slug==='github-actions' && run.conclusion==='success');
    if (!policy.checkNames.every(name=>trusted.some(c=>c.name===name))) throw new Error('Trusted CI check not successful for HEAD');
    return {level:'CI_PASS',risk:{risk:'unknown',criticalPaths:[],warning:'No open PR: critical paths cannot be evaluated from PR diff'},pr:null};
  }
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
export function verifyTrusted(root,{taskId=null,ci=false,github=githubEvidence,execute=spawnSync,timeoutMs=180000}={}) {
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
    evidence=check(root,{execute,timeoutMs});
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
