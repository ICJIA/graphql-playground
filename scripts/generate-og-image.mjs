import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, '../public/og-image.png');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 1200px;
    height: 630px;
    background-color: #030712;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* Background gradient effects */
  .bg-glow-tl {
    position: absolute;
    top: -80px;
    left: -80px;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(15, 23, 42, 0.8) 0%, rgba(3, 7, 18, 0) 70%);
    pointer-events: none;
  }

  .bg-glow-tr {
    position: absolute;
    top: -100px;
    right: -80px;
    width: 550px;
    height: 550px;
    background: radial-gradient(circle, rgba(20, 40, 80, 0.35) 0%, rgba(3, 7, 18, 0) 70%);
    pointer-events: none;
  }

  .bg-glow-br {
    position: absolute;
    bottom: -120px;
    right: 250px;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(10, 25, 50, 0.4) 0%, rgba(3, 7, 18, 0) 70%);
    pointer-events: none;
  }

  .container {
    position: relative;
    width: 1200px;
    height: 630px;
    padding: 60px 72px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    z-index: 1;
  }

  /* Left column */
  .left {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 620px;
    padding-top: 6px;
  }

  /* OPEN SOURCE badge */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 20px;
    padding: 7px 16px;
    margin-bottom: 24px;
    width: fit-content;
  }

  .badge-dot {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .badge-text {
    color: #94a3b8;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  /* Main title */
  .title-line1 {
    color: #f8fafc;
    font-size: 78px;
    font-weight: 800;
    line-height: 1.0;
    letter-spacing: -0.02em;
    margin-bottom: 0px;
  }

  .title-line2 {
    font-size: 78px;
    font-weight: 800;
    line-height: 1.25;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #2dd4bf 0%, #34d399 40%, #4ade80 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    padding-bottom: 4px;
    margin-bottom: 20px;
  }

  /* Description */
  .description {
    color: #94a3b8;
    font-size: 19px;
    font-weight: 400;
    line-height: 1.55;
    max-width: 520px;
    margin-bottom: 28px;
  }

  /* Features */
  .features {
    display: flex;
    gap: 28px;
    flex-wrap: nowrap;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #cbd5e1;
    font-size: 15px;
    font-weight: 500;
    white-space: nowrap;
  }

  .check-icon {
    width: 18px;
    height: 18px;
    background: rgba(16, 185, 129, 0.15);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .check-icon svg {
    width: 11px;
    height: 11px;
  }

  /* Right column — code editor mockup */
  .editor-mockup {
    width: 420px;
    flex-shrink: 0;
    background: #0f172a;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.07);
    overflow: hidden;
    margin-top: 10px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.5);
  }

  .editor-titlebar {
    background: #1e293b;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .dot-red   { width: 12px; height: 12px; border-radius: 50%; background: #ef4444; flex-shrink: 0; }
  .dot-yellow{ width: 12px; height: 12px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; }
  .dot-green { width: 12px; height: 12px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }

  .editor-filename {
    color: #94a3b8;
    font-size: 13px;
    font-weight: 500;
    margin-left: 6px;
  }

  .editor-body {
    padding: 14px 18px;
  }

  .endpoint-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .endpoint-dot {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .endpoint-url {
    color: #94a3b8;
    font-size: 12.5px;
    font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
  }

  .code-block {
    font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
    font-size: 13px;
    line-height: 1.75;
    color: #e2e8f0;
  }

  .code-brace   { color: #e2e8f0; }
  .code-field   { color: #f87171; }
  .code-key     { color: #60a5fa; }
  .code-string  { color: #34d399; }
  .code-comment { color: #64748b; }

  .code-result {
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid rgba(255,255,255,0.05);
    font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #64748b;
    line-height: 1.65;
  }
</style>
</head>
<body>
  <div class="bg-glow-tl"></div>
  <div class="bg-glow-tr"></div>
  <div class="bg-glow-br"></div>

  <div class="container">
    <!-- Left content -->
    <div class="left">
      <div class="badge">
        <div class="badge-dot"></div>
        <span class="badge-text">Open Source</span>
      </div>

      <div class="title-line1">ICJIA GraphQL</div>
      <div class="title-line2">Playground</div>

      <p class="description">A modern, self-hosted GraphQL IDE with schema-aware autocomplete, multi-endpoint workspaces, and a built-in CORS proxy.</p>

      <div class="features">
        <div class="feature">
          <div class="check-icon">
            <svg viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          Any endpoint
        </div>
        <div class="feature">
          <div class="check-icon">
            <svg viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          Auth tokens
        </div>
        <div class="feature">
          <div class="check-icon">
            <svg viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          Schema docs
        </div>
        <div class="feature">
          <div class="check-icon">
            <svg viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          Multi-export
        </div>
      </div>
    </div>

    <!-- Right: code editor mockup -->
    <div class="editor-mockup">
      <div class="editor-titlebar">
        <div class="dot-red"></div>
        <div class="dot-yellow"></div>
        <div class="dot-green"></div>
        <span class="editor-filename">query.graphql</span>
      </div>
      <div class="editor-body">
        <div class="endpoint-row">
          <div class="endpoint-dot"></div>
          <span class="endpoint-url">countries.trevorblades.com/graphql</span>
        </div>
        <div class="code-block">
          <span class="code-brace">{</span><br>
          &nbsp;&nbsp;<span class="code-field">countries</span> <span class="code-brace">{</span><br>
          &nbsp;&nbsp;&nbsp;&nbsp;<span class="code-field">name</span><br>
          &nbsp;&nbsp;&nbsp;&nbsp;<span class="code-field">capital</span><br>
          &nbsp;&nbsp;&nbsp;&nbsp;<span class="code-field">emoji</span><br>
          &nbsp;&nbsp;&nbsp;&nbsp;<span class="code-field">currency</span><br>
          &nbsp;&nbsp;<span class="code-brace">}</span><br>
          <span class="code-brace">}</span>
        </div>
        <div class="code-result">
          <span class="code-brace">{ "data": { "countries": [</span><br>
          &nbsp;&nbsp;<span class="code-brace">{ <span class="code-key">"name"</span>: <span class="code-string">"France"</span>, <span class="code-key">"emoji"</span>: <span class="code-string">"🇫🇷"</span> },</span><br>
          &nbsp;&nbsp;<span class="code-brace">{ <span class="code-key">"name"</span>: <span class="code-string">"Germany"</span>, <span class="code-key">"emoji"</span>: <span class="code-string">"🇩🇪"</span> },</span><br>
          &nbsp;&nbsp;<span class="code-brace">{ <span class="code-key">"name"</span>: <span class="code-string">"Japan"</span>, <span class="code-key">"emoji"</span>: <span class="code-string">"🇯🇵"</span> } ...</span><br>
          <span class="code-brace">] } }</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

async function generate() {
  console.log('Launching browser...');

  // Try to find Chrome
  const chromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];

  let executablePath = null;
  for (const p of chromePaths) {
    if (fs.existsSync(p)) {
      executablePath = p;
      break;
    }
  }

  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
    console.log(`Using Chrome at: ${executablePath}`);
  }

  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1200, height: 630 });

  // Set HTML content directly
  await page.setContent(html, { waitUntil: 'networkidle' });

  // Wait for fonts
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: outputPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });

  await browser.close();
  console.log(`✓ og-image.png saved to: ${outputPath}`);
}

generate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
