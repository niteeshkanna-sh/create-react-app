/**
 * Finds Playwright and a browser for the UI suites.
 *
 * Where Playwright and Chromium live differs between a laptop with it in the
 * project's node_modules, a container with it installed globally, and CI. A
 * hard-coded path works on exactly one of those and silently fails to even
 * load on the rest, so the candidates are tried in turn and the environment
 * gets the last word.
 *
 *   PLAYWRIGHT_MODULE    path to the playwright package, if it is somewhere odd
 *   PLAYWRIGHT_CHROMIUM  path to a chromium binary, to use instead of the
 *                        one Playwright downloaded
 */

const fs = require('fs');

const MODULE_CANDIDATES = [
    process.env.PLAYWRIGHT_MODULE,
    'playwright',
    '/opt/node22/lib/node_modules/playwright',
    '/usr/local/lib/node_modules/playwright',
    '/usr/lib/node_modules/playwright',
].filter(Boolean);

const BROWSER_CANDIDATES = [
    process.env.PLAYWRIGHT_CHROMIUM,
    '/opt/pw-browsers/chromium',
].filter(Boolean);

function playwright() {
    for (const candidate of MODULE_CANDIDATES) {
        try {
            return require(candidate);
        } catch (error) {
            if (error.code !== 'MODULE_NOT_FOUND') throw error;
        }
    }

    console.error(
        '\nPlaywright is not installed, so the browser-driven checks cannot run.\n' +
        '\n    npm install -D playwright && npx playwright install chromium\n' +
        '\nIf it is installed somewhere unusual, point PLAYWRIGHT_MODULE at it.\n'
    );
    process.exit(2);
}

/**
 * Launch options for a headless run. An explicit executable is passed only
 * when one is actually there — otherwise Playwright uses the browser it
 * downloaded, which is the ordinary case.
 */
function launchOptions() {
    const options = { args: ['--no-sandbox'] };
    const browser = BROWSER_CANDIDATES.find(path => {
        try { return fs.existsSync(path); } catch { return false; }
    });
    if (browser) {
        options.executablePath = browser;
    }
    return options;
}

module.exports = { playwright, launchOptions };
