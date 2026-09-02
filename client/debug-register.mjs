import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.screenshot({ path: 'debug-register.png' });

// Find the auth containers
const info = await page.evaluate(() => {
  const container = document.querySelector('#app .container');
  const signIn = document.querySelector('#app .signInContainer');
  const signUp = document.querySelector('#app .signUpContainer');
  const overlay = document.querySelector('#app .overlayContainer');

  const describe = (el, name) => {
    if (!el) return `${name}: NOT FOUND`;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return `${name}: class="${el.className}" left=${Math.round(r.left)} top=${Math.round(
      r.top,
    )} w=${Math.round(r.width)} h=${Math.round(r.height)} transform=${cs.transform} opacity=${cs.opacity} zIndex=${cs.zIndex} overflow=${cs.overflow} bg=${cs.backgroundColor}`;
  };

  // Also describe the actual form panels
  const panels = Array.from(document.querySelectorAll('#app .panel')).map((p, i) => {
    const r = p.getBoundingClientRect();
    return `panel[${i}] left=${Math.round(r.left)} top=${Math.round(
      r.top,
    )} w=${Math.round(r.width)} h=${Math.round(r.height)}`;
  });

  // List visible inputs
  const inputs = Array.from(document.querySelectorAll('input')).map((inp) => {
    const r = inp.getBoundingClientRect();
    return `input name=${inp.name || inp.getAttribute('placeholder') || inp.type} visible=${r.width > 0 && r.height > 0} left=${Math.round(
      r.left,
    )} top=${Math.round(r.top)}`;
  });

  return {
    url: location.pathname,
    container: describe(container, 'container'),
    signIn: describe(signIn, 'signIn'),
    signUp: describe(signUp, 'signUp'),
    overlay: describe(overlay, 'overlay'),
    panels,
    inputs,
  };
});

console.log(JSON.stringify(info, null, 2));
console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 2));

await browser.close();
