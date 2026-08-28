/**
 * NOIR AUDIO - GitHub Auto Sync Bot
 * بوت المزامنة التلقائية مع GitHub (ES Module)
 */

import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_URL = 'https://github.com/lunostore/youtube.git';
const IGNORED = ['.git', 'node_modules', 'package-lock.json'];

// ─── Colors ───────────────────────────────────────────
const C = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
      if (err) reject({ err, stdout, stderr });
      else resolve(stdout.trim());
    });
  });
}

// ─── Check / Setup Git Auth ───────────────────────────
async function checkAndSetupAuth() {
  console.log(C.cyan('\n Checking GitHub credentials...\n'));

  // Check if gh CLI is installed and logged in
  let ghAvailable = false;
  try {
    execSync('gh --version', { stdio: 'ignore' });
    ghAvailable = true;
  } catch (_) {}

  if (ghAvailable) {
    try {
      const user = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
      console.log(C.green(`Connected as: @${user}`));
      return;
    } catch (_) {
      console.log(C.yellow(' Opening GitHub login in browser...'));
      try {
        execSync('gh auth login --web --git-protocol https', { stdio: 'inherit' });
        console.log(C.green('\n Login successful!'));
      } catch (e) {
        console.log(C.red(' Login failed. Run: gh auth login'));
      }
    }
  } else {
    // Test if push works without gh CLI
    try {
      await run(`git ls-remote --heads ${REPO_URL}`);
      console.log(C.green(' GitHub connected via Git Credentials!'));
    } catch (_) {
      console.log(C.yellow('\n GitHub not authenticated. Opening login page...'));
      try { execSync('start https://github.com/login', { stdio: 'ignore' }); } catch (_) {}
      console.log(C.yellow(' After login, re-run the bot.'));
    }
  }
}

// ─── Ensure remote is set ─────────────────────────────
async function ensureRemote() {
  try {
    const remotes = await run('git remote -v');
    if (!remotes.includes('origin')) {
      await run(`git remote add origin ${REPO_URL}`);
    }
  } catch (_) {
    try { await run(`git remote add origin ${REPO_URL}`); } catch (_) {}
  }
}

// ─── Push to GitHub ───────────────────────────────────
let isPushing = false;
let pushTimeout = null;

async function syncToGitHub(triggerFile) {
  if (isPushing) return;
  isPushing = true;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: true });
  const dateStr = now.toISOString().split('T')[0];
  const fileName = triggerFile ? path.basename(triggerFile) : 'files';
  const commitMsg = `Update [${fileName}] - ${dateStr} ${timeStr}`;

  console.log(C.yellow(`\n Change detected: ${fileName}`));
  console.log(`Pushing to GitHub (${timeStr})...`);

  try {
    await run('git add -A');

    try {
      const commitOut = await run(`git commit -m "${commitMsg}"`);
      console.log(C.green(` ${commitOut.split('\n')[0]}`));
    } catch (e) {
      const msg = (e.stdout || '') + (e.stderr || '');
      if (msg.includes('nothing to commit')) {
        console.log(' No changes to commit.');
        isPushing = false;
        console.log(C.cyan('\n Watching files...\n'));
        return;
      }
      throw e;
    }

    const pushOut = await run('git push origin main');
    console.log(C.green(' Pushed to GitHub successfully!'));
    if (pushOut) console.log(pushOut);

  } catch (err) {
    const msg = (err.stderr || err.stdout || String(err.err || err));
    if (msg.includes('Authentication') || msg.includes('403') || msg.includes('could not read Username')) {
      console.log(C.red('\n Auth error - opening GitHub login...'));
      try { execSync('start https://github.com/login', { stdio: 'ignore' }); } catch (_) {}
    } else {
      console.log(C.red(`\n Push error:\n${msg}`));
    }
  } finally {
    isPushing = false;
    console.log(C.cyan('\n Watching files...\n'));
  }
}

// ─── Watch Files ──────────────────────────────────────
function startWatcher() {
  fs.watch(__dirname, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    for (const ig of IGNORED) {
      if (filename.startsWith(ig) || filename.includes(path.sep + ig)) return;
    }
    if (pushTimeout) clearTimeout(pushTimeout);
    pushTimeout = setTimeout(() => syncToGitHub(filename), 2000);
  });
  console.log(C.cyan(' Watching files...\n'));
}

// ─── Main ─────────────────────────────────────────────
console.log(C.bold(C.green('\n==================================================')));
console.log(C.bold(C.cyan('    GitHub Auto-Push Bot - Noir Audio')));
console.log(C.bold(C.green('==================================================')));
console.log(`  Repo: ${REPO_URL}`);

await checkAndSetupAuth();
await ensureRemote();
await syncToGitHub('startup');
startWatcher();
