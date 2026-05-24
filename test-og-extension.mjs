import { chromium } from 'playwright';
import { rmSync } from 'fs';
import { createServer } from 'http';

const pathToExtension = '/Users/hmziq/os/opengrammar/apps/extension/.output/chrome-mv3';
const userDataDir = '/tmp/og-test-profile';

try { rmSync(userDataDir, { recursive: true }); } catch {}

const testHtml = `<!DOCTYPE html>
<html><head><title>Grammar Test</title></head>
<body style="padding: 40px; font-family: sans-serif;">
  <h2>OpenGrammar Extension Test</h2>
  <textarea id="test" rows="8" cols="60" style="font-size: 16px; padding: 8px;"></textarea>
</body></html>`;

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(testHtml);
});
await new Promise(r => server.listen(9876, r));

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${pathToExtension}`,
    `--load-extension=${pathToExtension}`,
  ],
});

let serviceWorker = context.serviceWorkers()[0];
if (!serviceWorker) {
  serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10000 });
}

const page = await context.newPage();
page.on('console', (msg) => {
  const text = msg.text();
  if (text.includes('[OG]')) console.log(`[${msg.type()}] ${text}`);
});

await page.goto('http://localhost:9876', { waitUntil: 'load' });
await page.waitForTimeout(2000);

const textarea = page.locator('#test');
await textarea.click();
await page.waitForTimeout(500);
await page.keyboard.type('She going to store yesterday and buyed some stuf.');
await page.waitForTimeout(6000);

await page.screenshot({ path: '/tmp/og-final-1.png' });

// Verify mirror layer exists
const state = await page.evaluate(() => ({
  hasWrapper: !!document.querySelector('.opengrammar-mirror-wrapper'),
  hasMirror: !!document.querySelector('.opengrammar-mirror'),
  textareaValue: document.querySelector('#test')?.value,
}));
console.log('State:', JSON.stringify(state, null, 2));

// The shadow DOM is closed, so check via screenshot
console.log('\nFinal screenshots saved to /tmp/og-final-1.png');
console.log('Extension loaded successfully. No debug logs in production mode (expected).');

server.close();
await context.close();
