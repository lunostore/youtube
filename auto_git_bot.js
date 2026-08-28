/**
 * GitHub Auto-Push Bot
 * - يراقب الملفات
 * - يفتح نافذة اختيار حساب GitHub عند الحاجة
 * - يرفع تلقائياً عند أي تغيير
 */

import { exec } from 'child_process';
import { watch } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = 'https://github.com/lunostore/youtube.git';
const IGNORED = ['.git', 'node_modules'];

// ── Helpers ──────────────────────────────────────────
const run = (cmd) =>
  new Promise((res, rej) =>
    exec(cmd, { cwd: __dirname }, (err, out, stderr) =>
      err ? rej(stderr || out) : res(out.trim())
    )
  );

const log = {
  ok:   (m) => console.log(`\x1b[32m✅ ${m}\x1b[0m`),
  warn: (m) => console.log(`\x1b[33m⚡ ${m}\x1b[0m`),
  err:  (m) => console.log(`\x1b[31m❌ ${m}\x1b[0m`),
  info: (m) => console.log(`\x1b[36mℹ️  ${m}\x1b[0m`),
};

// ── Open GitHub login in browser ─────────────────────
function openGitHubLogin() {
  log.warn('فتح صفحة اختيار حساب GitHub في المتصفح...');
  exec('start https://github.com/login');
}

// ── Test if push works ────────────────────────────────
async function testAuth() {
  try {
    await run(`git ls-remote --heads ${REPO}`);
    return true;
  } catch {
    return false;
  }
}

// ── Push to GitHub ────────────────────────────────────
let busy = false;
let timer = null;

async function push(file) {
  if (busy) return;
  busy = true;

  const name = file ? path.basename(file) : 'ملفات المشروع';
  const date = new Date().toLocaleString('ar-EG');
  const msg  = `Update [${name}] - ${date}`;

  log.warn(`تغيير في: ${name}`);
  console.log(`   الرفع إلى GitHub...`);

  try {
    await run('git add -A');

    // commit — if nothing changed, skip silently
    try {
      const out = await run(`git commit -m "${msg}"`);
      log.ok(out.split('\n')[0]);
    } catch (e) {
      if (String(e).includes('nothing to commit')) {
        log.info('لا يوجد تغييرات.');
        busy = false;
        return;
      }
      throw e;
    }

    await run('git push origin main --force');
    log.ok('تم الرفع إلى GitHub بنجاح! 🎉');

  } catch (e) {
    const msg = String(e);
    if (
      msg.includes('Authentication') ||
      msg.includes('403') ||
      msg.includes('could not read') ||
      msg.includes('repository not found')
    ) {
      log.err('مشكلة في المصادقة — افتح المتصفح وسجّل الدخول:');
      openGitHubLogin();
    } else {
      log.err(`خطأ في الرفع:\n${msg}`);
    }
  } finally {
    busy = false;
    log.info('يراقب الملفات...\n');
  }
}

// ── Watch ─────────────────────────────────────────────
function startWatcher() {
  watch(__dirname, { recursive: true }, (_, filename) => {
    if (!filename) return;
    for (const ig of IGNORED) {
      if (filename.startsWith(ig)) return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => push(filename), 2000);
  });
}

// ── Main ──────────────────────────────────────────────
console.log('\x1b[1m\x1b[36m');
console.log('================================================');
console.log('   GitHub Auto-Push Bot');
console.log(`   Repo: ${REPO}`);
console.log('================================================\x1b[0m\n');

// Check auth first
const authed = await testAuth();
if (!authed) {
  log.err('لا يوجد اتصال بـ GitHub!');
  openGitHubLogin();
  console.log('\n  بعد تسجيل الدخول، أعد تشغيل البوت.\n');
  process.exit(1);
}

log.ok('GitHub متصل!');

// Initial push of any pending changes
await push(null);

// Start watching
startWatcher();
log.info('البوت يراقب الملفات — سيرفع تلقائياً عند أي تغيير.\n');
