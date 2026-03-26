import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const htmlPath = path.join(root, 'docs', 'webui-full-business-test-plan.html');
const pdfPath = path.join(root, 'docs', 'webui-full-business-test-plan.pdf');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' },
});
await browser.close();

console.log(`PDF generated: ${pdfPath}`);
