// Renders public/apple-touch-icon.png (180 x 180) from the owl as supplied, on white.
// Run once when the logo changes: node scripts/make-touch-icon.mjs
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const svg = await readFile('public/brand/owl.svg', 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
await page.setContent(
  `<body style="margin:0;background:#fff;display:grid;place-items:center;height:180px">
   <div style="height:150px">${svg.replace('<svg ', '<svg style="height:150px;width:auto" ')}</div></body>`,
);
await page.screenshot({ path: 'public/apple-touch-icon.png' });
await browser.close();
