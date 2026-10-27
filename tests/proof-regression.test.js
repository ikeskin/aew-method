import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync, execFileSync } from 'node:child_process';

const cli=resolve('bin/aew.js');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe',encoding:'utf8'}).trim();
const node=(root,...args)=>spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8',timeout:30000});
const sumTest="import {test} from 'node:test'; import assert from 'node:assert/strict'; import {sum} from './sum.js'; test('sum',()=>assert.equal(sum(2,3),5));\n";
function workspace() {
 const root=mkdtempSync(join(tmpdir(),'aew-proof-'));
 git(root,'init','-q');git(root,'config','user.email','test@example.invalid');git(root,'config','user.name','Tester');
 writeFileSync(join(root,'package.json'),JSON.stringify({name:'proof-app',version:'1.0.0',type:'module',scripts:{test:'node --test'}}));
 writeFileSync(join(root,'sum.js'),'export const sum=(a,b)=>a+b;\n');
 writeFileSync(join(root,'sum.test.js'),sumTest);
 writeFileSync(join(root,'.gitignore'),'node_modules\n');
 git(root,'add','-A');git(root,'commit','-qm','baseline');
 const setup=node(root,'init','--yes','--adapters','claude');
 assert.equal(setup.status,0,setup.stderr);
 git(root,'add','-A');git(root,'commit','-qm','aew setup');
 return root;
}
function commit(root,msg) {git(root,'add','-A');git(root,'commit','--allow-empty','-qm',msg);}
function verify(root) {return node(root,'verify');}
function script(root,value) {
 const p=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
 p.scripts.test=value;writeFileSync(join(root,'package.json'),JSON.stringify(p));
 commit(root,'script update');
}
test('uploaded proof: real test passes, bug and forged QA do not',()=>{
 const root=workspace();
 try {
  const baseline=verify(root);
  assert.equal(baseline.status,0,baseline.stdout+'\n'+baseline.stderr);
  writeFileSync(join(root,'sum.js'),'export const sum=(a,b)=>a-b;\n');commit(root,'bug');
  assert.notEqual(verify(root).status,0);
  const g={schemaVersion:2,tasks:[{id:'AEW-001',status:'done',criteria:[{id:'C1',description:'sum works',status:'passed',evidence:'self claim'}],issues:[],qa:{verdict:'accepted',evidence:'self'}}]};
  writeFileSync(join(root,'.aew/gates.json'),JSON.stringify(g));commit(root,'forged approval');
  assert.notEqual(verify(root).status,0);
 } finally{rmSync(root,{recursive:true,force:true});}
});
test('uploaded proof: bogus npm commands and zero or filtered tests cannot PASS',()=>{
 const root=workspace();
 try {
  writeFileSync(join(root,'sum.js'),'export const sum=(a,b)=>a-b;\n');commit(root,'bug');
  for(const candidate of ['echo ok','exit 0','node -e 0','node -e 1','node -e ""','node sum.js',
    'jest --passWithNoTests','node --test --test-name-pattern=YOK']) {
    script(root,candidate);
    const result=verify(root);
    assert.notEqual(result.status,0,`unexpected PASS for ${candidate}: ${result.stdout}`);
  }
  script(root,'node --test');
  rmSync(join(root,'sum.test.js'));commit(root,'remove tests');
  const zero=verify(root);assert.notEqual(zero.status,0,'no tests must fail');
  assert.match(zero.stdout,/No positive test-runner count|test-integrity review/i);
 } finally{rmSync(root,{recursive:true,force:true});}
});
test('uploaded proof: hollowed tests cannot self-certify in same revision',()=>{
 const root=workspace();
 try {
  writeFileSync(join(root,'sum.js'),'export const sum=(a,b)=>a-b;\n');commit(root,'bug');
  writeFileSync(join(root,'sum.test.js'),"import {test} from 'node:test'; import assert from 'node:assert'; test('sum',()=>assert.ok(true));\n");
  commit(root,'hollow the test');
  const result=verify(root);
  assert.notEqual(result.status,0,'modified tests are review-required, not self-verified');
  assert.match(result.stdout,/test-integrity review required|Test files changed/i);
 } finally{rmSync(root,{recursive:true,force:true});}
});
test('uploaded proof: parallel per-task records merge with no conflicts',()=>{
 const root=workspace();
 try {
  const base=git(root,'rev-parse','HEAD');
  for (const [branch,id] of [['a','AEW-001'],['b','AEW-002']]) {
   git(root,'checkout','-q','-b',branch,base);
   mkdirSync(join(root,'.aew/tasks'),{recursive:true});
   writeFileSync(join(root,'.aew/tasks',id+'.json'),JSON.stringify({schemaVersion:2,id,status:'planned'}));
   commit(root,id);
  }
  git(root,'checkout','-q','a');
  git(root,'merge','-q','--no-edit','b');
  assert.equal(git(root,'status','--porcelain'),'');
 } finally{rmSync(root,{recursive:true,force:true});}
});
