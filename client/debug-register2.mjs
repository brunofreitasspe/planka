import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const info = await page.evaluate(() => {
  // Find the outermost auth wrapper divs by looking at all divs with inline flex/absolute layout
  const all = Array.from(document.querySelectorAll('div'));
  // The wrapper is likely a large container. Find divs whose children include the 2 form panels
  const panels = Array.from(document.querySelectorAll('div')).filter((d) =>
    d.className && typeof d.className === 'string' && d.className.includes('panel'),
  );

  const describe = (el, label) => {
    if (!el) return `${label}: N/A`;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return `${label}: cls="${el.className}" left=${Math.round(r.left)} top=${Math.round(
      r.top,
    )} w=${Math.round(r.width)} h=${Math.round(r.height)} pos=${cs.position} transform=${cs.transform} opacity=${cs.opacity} z=${cs.zIndex} overflow=${cs.overflow}`;
  };

  const out = { panels: panels.map((p, i) => describe(p, `panel${i}`)) };

  // Find ancestor chain of the first register input
  const nameInput = Array.from(document.querySelectorAll('input')).find((i) => i.name === 'name');
  if (nameInput) {
    const chain = [];
    let el = nameInput;
    let depth = 0;
    while (el && depth < 6) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      chain.push(
        `[${depth}] tag=${el.tagName} cls="${el.className}" left=${Math.round(
          r.left,
        )} top=${Math.round(r.top)} w=${Math.round(r.width)} h=${Math.round(
          r.height,
        )} pos=${cs.position} transform=${cs.transform} opacity=${cs.opacity} z=${cs.zIndex}`,
      );
      el = el.parentElement;
      depth += 1;
    }
    out.nameInputChain = chain;
  }

  // Same for login emailOrUsername input
  const loginInput = Array.from(document.querySelectorAll('input')).find(
    (i) => i.name === 'emailOrUsername',
  );
  if (loginInput) {
    const chain = [];
    let el = loginInput;
    let depth = 0;
    while (el && depth < 6) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      chain.push(
        `[${depth}] tag=${el.tagName} cls="${el.className}" left=${Math.round(
          r.left,
        )} top=${Math.round(r.top)} w=${Math.round(r.width)} h=${Math.round(
          r.height,
        )} pos=${cs.position} transform=${cs.transform} opacity=${cs.opacity} z=${cs.zIndex}`,
      );
      el = el.parentElement;
      depth += 1;
    }
    out.loginInputChain = chain;
  }

  // Text content visible per half
  const texts = Array.from(document.querySelectorAll('h1, h2, button, .header'))
    .map((el) => ({
      text: (el.textContent || '').trim().slice(0, 40),
      left: Math.round(el.getBoundingClientRect().left),
    }))
    .filter((t) => t.text);
  out.headings = texts;

  return out;
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
