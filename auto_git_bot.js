/**
 * NOIR AUDIO - GitHub Auto Sync Bot
 * بوت المزامنة التلقائية مع GitHub
 * يراقب أي تعديل ويرفعه تلقائياً - مع دعم تسجيل الدخول بـ GitHub CLI
 */

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function run(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: cwd || process.cwd() }, (err, stdout, stderr) => {
      if (err) reject({ err, stdout, stderr });
      else resolve(stdout.trim());
    });
  });
}

// ─── Check / Setup Git Auth ───────────────────────────
async function checkAndSetupAuth() {
  console.log(C.cyan('\n🔐 جاري فحص بيانات GitHub...\n'));

  // 1. Check if gh CLI is installed
  let ghAvailable = false;
  try {
    execSync('gh --version', { stdio: 'ignore' });
    ghAvailable = true;
  } catch (_) {}

  if (ghAvailable) {
    // Check if already logged in
    try {
      const user = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
      console.log(C.green(`✅ مسجّل الدخول بحساب GitHub: @${user}`));
      return true;
    } catch (_) {
      // Not logged in — open browser auth
      console.log(C.yellow('⚡ فتح صفحة تسجيل الدخول بـ GitHub...'));
      try {
        execSync('gh auth login --web --git-protocol https', { stdio: 'inherit' });
        console.log(C.green('\n✅ تم تسجيل الدخول بنجاح!'));
        return true;
      } catch (e) {
        console.log(C.red('❌ فشل تسجيل الدخول. يرجى تشغيل: gh auth login'));
      }
    }
  } else {
    // No gh CLI — check if git credential helper works
    try {
      await run('git ls-remote --heads ' + REPO_URL);
      console.log(C.green('✅ GitHub متصل بنجاح عبر Git Credentials!'));
      return true;
    } catch (_) {
      // Open GitHub login page in browser
      console.log(C.yellow('\n⚡ لم يتم اكتشاف GitHub CLI. يرجى تسجيل الدخول عبر المتصفح...'));
      console.log('   https://github.com/login\n');
      try {
        execSync('start https://github.com/login', { stdio: 'ignore' });
      } catch (_) {}
      console.log(C.yellow('💡 بعد تسجيل الدخول، تأكد أن Git credentials صحيحة وأعد تشغيل البوت.'));
    }
  }
  return false;
}

// ─── Ensure remote is set ─────────────────────────────
async function ensureRemote() {
  try {
    const remotes = await run('git remote -v');
    if (!remotes.includes('origin')) {
      await run(`git remote add origin ${REPO_URL}`);
    }
  } catch (_) {
    await run(`git remote add origin ${REPO_URL}`);
  }
}

// ─── Push to GitHub ───────────────────────────────────
let isPushing = false;
let pushTimeout = null;

async function syncToGitHub(triggerFile) {
  if (isPushing) return;
  isPushing = true;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-EG', { hour12: true });
  const dateStr = now.toISOString().split('T')[0];
  const fileName = triggerFile ? path.basename(triggerFile) : 'الملفات';
  const commitMsg = `Update [${fileName}] - ${dateStr} ${timeStr}`;

  console.log(C.yellow(`\n⏳ تعديل اكتُشف في: ${fileName}`));
  console.log(`🚀 رفع التحديثات إلى GitHub (${timeStr})...`);

  try {
    await run('git add -A');

    try {
      const commitOut = await run(`git commit -m "${commitMsg}"`);
      console.log(C.green(`✅ ${commitOut.split('\n')[0]}`));
    } catch (e) {
      if ((e.stdout || '').includes('nothing to commit') ||
          (e.stderr || '').includes('nothing to commit')) {
        console.log('ℹ️  لا توجد تغييرات جديدة.');
        isPushing = false;
        console.log(C.cyan('\n👀 البوت يراقب الملفات...\n'));
        return;
      }
      throw e;
    }

    const pushOut = await run('git push origin main');
    console.log(C.green('🎉 رُفع بنجاح إلى GitHub!'));
    if (pushOut) console.log(pushOut);

  } catch (err) {
    const msg = err.stderr || err.stdout || String(err.err || err);
    // Token/auth errors → reopen login
    if (msg.includes('Authentication') || msg.includes('403') ||
        msg.includes('could not read Username')) {
      console.log(C.red('\n❌ خطأ في المصادقة — يرجى تسجيل الدخول:'));
      try { execSync('start https://github.com/login', { stdio: 'ignore' }); } catch (_) {}
    } else {
      console.log(C.red(`\n❌ خطأ أثناء الرفع:\n${msg}`));
    }
  } finally {
    isPushing = false;
    console.log(C.cyan('\n👀 البوت يراقب الملفات...\n'));
  }
}

// ─── Watch Files ──────────────────────────────────────
function startWatcher() {
  const projectDir = process.cwd();

  fs.watch(projectDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    for (const ig of IGNORED) {
      if (filename.startsWith(ig) || filename.includes(path.sep + ig)) return;
    }
    if (pushTimeout) clearTimeout(pushTimeout);
    pushTimeout = setTimeout(() => syncToGitHub(filename), 2000);
  });

  console.log(C.cyan('👀 البوت يراقب الملفات...\n'));
}

// ─── Main ─────────────────────────────────────────────
console.log(C.bold(C.green('\n==================================================')));
console.log(C.bold(C.cyan('   🤖 بوت رفع GitHub التلقائي')));
console.log(C.bold(C.green('==================================================')));
console.log(`📌 المستودع: ${REPO_URL}`);

(async () => {
  await checkAndSetupAuth();
  await ensureRemote();
  await syncToGitHub('بدء التشغيل');
  startWatcher();
})();
