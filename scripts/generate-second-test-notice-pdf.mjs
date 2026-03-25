import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const htmlPath = path.join(root, 'docs', 'qa-second-test-release-notice-template.html');
const pdfPath = path.join(root, 'docs', 'qa-second-test-release-notice-template.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' }
});
await browser.close();

console.log(`PDF generated: ${pdfPath}`);
