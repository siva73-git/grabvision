const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('https://maps.grab.com/developer/documentation/skills', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('grabmaps_skills.txt', text);
    await browser.close();
    console.log('Success');
  } catch (err) {
    console.error(err);
  }
})();
