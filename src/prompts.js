import { emitKeypressEvents } from 'node:readline';
import { stdin, stdout } from 'node:process';

const enabled = stream => Boolean(stream.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb');
const paint = (s, code, value) => enabled(s) ? `\x1b[${code}m${value}\x1b[0m` : value;
const cyan = (s, t) => paint(s, '1;36', t);
const dim = (s, t) => paint(s, '2', t);
const green = (s, t) => paint(s, '1;32', t);
const bold = (s, t) => paint(s, '1', t);
const line = (s, t = '') => s.write(`${t}\n`);

export function banner({ output = stdout, version = '0.4.0' } = {}) {
  line(output);
  line(output, cyan(output, '  ┌──────────────────────────────────────────────────┐'));
  line(output, cyan(output, '  │') + bold(output, '   ◆  AEW METHOD') + dim(output, `                          v${version}  `) + cyan(output, '│'));
  line(output, cyan(output, '  │') + dim(output, '   Engineering standards for AI-assisted teams    ') + cyan(output, '│'));
  line(output, cyan(output, '  └──────────────────────────────────────────────────┘'));
  line(output);
}
export function heading(title, subtitle = '') {
  line(stdout, `\n${cyan(stdout, '  ◆')} ${bold(stdout, title)}`);
  if (subtitle) line(stdout, dim(stdout, `    ${subtitle}`));
  line(stdout);
}
export function notice(message) { line(stdout, `  ${green(stdout, '✓')} ${message}`); }
export function step(index, total, title, { output = stdout } = {}) {
  const progress = Array.from({ length: total }, (_, i) => i < index ? '●' : '○').join(' ');
  line(output, `\n  ${cyan(output, `[${index}/${total}]`)} ${bold(output, title)}   ${dim(output, progress)}`);
}
export function summary(items, { output = stdout, title = 'Setup summary' } = {}) {
  line(output, `\n  ${cyan(output, '◆')} ${bold(output, title)}`);
  for (const [label, value] of items) line(output, `  ${dim(output, label.padEnd(17))} ${bold(output, String(value || 'Not specified'))}`);
  line(output);
}
export async function select({ title, hint, options, initial = 0, input = stdin, output = stdout }) {
  if (!input.isTTY || !output.isTTY || !input.setRawMode) throw new Error('Interactive selection requires a TTY; use --yes for automation.');
  if (!Array.isArray(options) || !options.length) throw new Error('At least one option is required.');
  let index = Math.max(0, Math.min(initial, options.length - 1));
  const height = 2 + (hint ? 1 : 0) + options.length * 2 + 1;
  let drawn = false;
  const render = () => {
    if (drawn) output.write(`\x1b[${height}A\x1b[0J`);
    line(output, `  ${cyan(output, '◇')} ${bold(output, title)}`);
    if (hint) line(output, dim(output, `    ${hint}`));
    line(output);
    for (const [i, option] of options.entries()) {
      const selected = i === index;
      line(output, `    ${selected ? cyan(output, '❯ ◉') : dim(output, '  ○')} ${selected ? cyan(output, option.label) : option.label}${option.recommended ? green(output, '  ★ recommended') : ''}`);
      line(output, `      ${dim(output, option.description || ' ')}`);
    }
    line(output, dim(output, '    ↑ ↓ navigate  ·  Enter select  ·  Ctrl+C cancel'));
    drawn = true;
  };
  return new Promise((resolve, reject) => {
    const wasRaw = input.isRaw;
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    const cleanup = () => { input.off('keypress', onKey); input.setRawMode(Boolean(wasRaw)); if (!wasRaw) input.pause(); output.write('\x1b[?25h'); };
    const onKey = (_str, key = {}) => {
      if (key.ctrl && key.name === 'c') { cleanup(); reject(new Error('Setup cancelled.')); return; }
      if (key.name === 'return') {
        cleanup();
        output.write(`\x1b[${height}A\x1b[0J`);
        line(output, `  ${green(output, '✓')} ${title} ${dim(output, '→')} ${cyan(output, options[index].label)}`);
        resolve(options[index].value); return;
      }
      if (['up', 'down', 'j', 'k'].includes(key.name)) {
        index = (index + (['up', 'k'].includes(key.name) ? -1 : 1) + options.length) % options.length;
        render();
      }
    };
    input.on('keypress', onKey);
    output.write('\x1b[?25l');
    render();
  });
}
export async function multiSelect({ title, hint, options, initial = [], input = stdin, output = stdout }) {
  if (!input.isTTY || !output.isTTY || !input.setRawMode) throw new Error('Interactive selection requires a TTY; use --yes for automation.');
  if (!Array.isArray(options) || !options.length) throw new Error('At least one option is required.');
  let index = 0;
  const selected = new Set(initial);
  const height = 2 + (hint ? 1 : 0) + options.length * 2 + 1;
  let drawn = false;
  const render = () => {
    if (drawn) output.write(`\x1b[${height}A\x1b[0J`);
    line(output, `  ${cyan(output, '◇')} ${bold(output, title)}`);
    if (hint) line(output, dim(output, `    ${hint}`));
    line(output);
    for (const [i, option] of options.entries()) {
      const cursor = i === index ? cyan(output, '❯') : ' ';
      const mark = selected.has(option.value) ? green(output, '◉') : dim(output, '○');
      line(output, `    ${cursor} ${mark} ${i === index ? cyan(output, option.label) : option.label}`);
      line(output, `      ${dim(output, option.description || ' ')}`);
    }
    line(output, dim(output, '    ↑ ↓ navigate  ·  Space toggle  ·  Enter confirm  ·  Ctrl+C cancel'));
    drawn = true;
  };
  return new Promise((resolve, reject) => {
    const wasRaw = Boolean(input.isRaw);
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    const cleanup = () => { input.off('keypress', onKey); input.setRawMode(wasRaw); if (!wasRaw) input.pause(); output.write('\x1b[?25h'); };
    const onKey = (str, key = {}) => {
      if (key.ctrl && key.name === 'c') { cleanup(); reject(new Error('Setup cancelled.')); return; }
      if (key.name === 'return') {
        if (!selected.size) { output.write('\x07'); return; }
        cleanup();
        output.write(`\x1b[${height}A\x1b[0J`);
        const values = options.filter(o => selected.has(o.value));
        line(output, `  ${green(output, '✓')} ${title} ${dim(output, '→')} ${cyan(output, values.map(v => v.label).join(', '))}`);
        resolve(values.map(v => v.value)); return;
      }
      if (key.name === 'space' || str === ' ') {
        const value = options[index].value;
        if (selected.has(value)) selected.delete(value); else selected.add(value);
        render(); return;
      }
      if (['up', 'down', 'j', 'k'].includes(key.name)) {
        index = (index + (['up', 'k'].includes(key.name) ? -1 : 1) + options.length) % options.length;
        render();
      }
    };
    input.on('keypress', onKey);
    output.write('\x1b[?25l');
    render();
  });
}
export async function askText(title, { placeholder = '', defaultValue = '' } = {}) {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(`  ${cyan(stdout, '◇')} ${bold(stdout, title)}${placeholder ? dim(stdout, ` (${placeholder})`) : ''}\n    ❯ `)).trim();
    return answer || defaultValue;
  } finally { rl.close(); }
}
export async function confirm(title, defaultYes = true) {
  return select({ title, options: [
    { label: 'Yes, continue', description: 'Create setup files', value: true },
    { label: 'No, cancel', description: 'Make no changes', value: false }
  ], initial: defaultYes ? 0 : 1 });
}
