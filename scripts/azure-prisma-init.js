// [ducksat] Restore .prisma/client/ from prisma_dot_prisma/ at first boot on Azure.
// This runs before the Next.js standalone server starts.
// Azure Files SMB cannot create hidden-named directories (.prisma) during zip extraction,
// so the build renames .prisma -> prisma_dot_prisma. This script reverses that at runtime.
(function () {
  var fs = require('fs');
  var path = require('path');
  var src = path.join(__dirname, 'node_modules', 'prisma_dot_prisma', 'client');
  var dstParent = path.join(__dirname, 'node_modules', '.prisma');
  var dst = path.join(dstParent, 'client');
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    try {
      fs.mkdirSync(dstParent, { recursive: true });
      fs.mkdirSync(dst, { recursive: true });
      fs.readdirSync(src).forEach(function (f) {
        fs.copyFileSync(path.join(src, f), path.join(dst, f));
      });
      console.log('[ducksat] Prisma engine restored to .prisma/client/');
    } catch (e) {
      console.error('[ducksat] Prisma init error:', e.message);
    }
  }
})();
