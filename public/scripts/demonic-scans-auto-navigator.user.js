// ==UserScript==
// @name         Demonic Scans Auto Navigator Pro
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Automates chapter navigation and reactions while reading manga. Tracks stamina and farm limits, skips already-reacted chapters.
// @author       LePepe
// @match        https://demonicscans.org/title/*/chapter/*
// @grant        none
// @icon         https://demonicscans.org/favicon.ico
// ==/UserScript==

(function () {
    'use strict';

    /* =========================
       CONFIG
    ========================== */
    const PREFERRED_REACTION = '1'; // 👍=1 ❤️=2 😡=3 😢=4 😂=5
    const STATE_KEY = 'demonic-auto-nav-state';
    const STATS_CACHE_KEY = 'demonic-stats-cache';

    let stopWhile = false;
    let paused = false;

    /* =========================
       STATE (NORMALIZED)
    ========================== */
    const state = JSON.parse(localStorage.getItem(STATE_KEY)) || {
        reacted: {},          // { title: { chapter-X: true } }
        chaptersVisited: 0
    };

    const saveState = () =>
        localStorage.setItem(STATE_KEY, JSON.stringify(state));

    function ensureTitleState(title) {
        if (!state.reacted[title]) {
            state.reacted[title] = {};
        }
    }

    function isAlreadyReacted(title, chapter) {
        return !!state.reacted?.[title]?.[`chapter-${chapter}`];
    }

    function markReacted(title, chapter) {
        ensureTitleState(title);
        state.reacted[title][`chapter-${chapter}`] = true;
        state.chaptersVisited++;
        saveState();
    }

    /* =========================
       TITLE / CHAPTER
    ========================== */
    function getTitleSlug() {
        const match = location.pathname.match(/\/title\/([^/]+)/);
        return match
            ? decodeURIComponent(match[1]).toLowerCase()
            : 'unknown-title';
    }

    function getChapterInfoElement() {
        const infos = document.querySelectorAll('.chapter-info');
        return infos.length ? infos[infos.length - 1] : null;
    }

    function getChapterNumber() {
        const info = getChapterInfoElement();
        if (!info) return null;

        const selected = info.querySelector('select option[selected]');
        if (!selected) return null;

        const m = selected.textContent.match(/Chapter:?([\d.]+)/i);
        return m ? m[1] : null;
    }

    /* =========================
       SCROLL / NAV
    ========================== */
    function scrollToChapterInfo() {
        const el = getChapterInfoElement();
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function clickNextChapter() {
        const info = getChapterInfoElement();
        if (!info) return false;

        const next = info.querySelector('.nextchap');
        if (!next) return false;

        next.scrollIntoView({ behavior: 'smooth', block: 'center' });
        next.click();
        return true;
    }

    /* =========================
       SESSION
    ========================== */
    function isUserLoggedIn() {
        return document.querySelector('.user-info') !== null;
    }

    /* =========================
       STATS (CACHE + DOM)
    ========================== */
    function getStatsFromCache() {
        const raw = localStorage.getItem(STATS_CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function saveStatsToCache(stats) {
        localStorage.setItem(
            STATS_CACHE_KEY,
            JSON.stringify({ ...stats, updatedAt: Date.now() })
        );
    }

    function readStatsFromDOM() {
        const pills = document.querySelectorAll(
            '.user-info .stamina-pill .val'
        );
        if (pills.length < 2) return null;

        const parse = txt =>
            txt.replace(/\s+/g, '')
                .split('/')
                .map(v => parseInt(v.replace(',', '')));

        const [stamina, staminaMax] = parse(pills[0].textContent);
        const [farmed, farmedMax]   = parse(pills[1].textContent);

        return { stamina, staminaMax, farmed, farmedMax };
    }

    function getStats() {
        if (!isUserLoggedIn()) return { loggedOut: true };

        const cached = getStatsFromCache();
        if (cached) updateHudStats(cached);

        const fromDOM = readStatsFromDOM();
        if (fromDOM) {
            saveStatsToCache(fromDOM);
            updateHudStats(fromDOM);
            return fromDOM;
        }

        return cached || null;
    }

    /* =========================
       REACTION (OBSERVER)
    ========================== */
    function hasActiveReaction() {
        return document.querySelector(
            '.chapter-reactions .reaction.active-reaction'
        ) !== null;
    }

    function react() {
        const r = document.querySelector(
            `.chapter-reactions .reaction[data-reaction="${PREFERRED_REACTION}"]`
        );
        if (r) r.click();
    }

    function waitForReactionConfirmation(timeout = 3000) {
        return new Promise(resolve => {
            if (hasActiveReaction()) return resolve(true);

            const container = document.querySelector('.chapter-reactions');
            if (!container) return resolve(false);

            const obs = new MutationObserver(() => {
                if (hasActiveReaction()) {
                    obs.disconnect();
                    resolve(true);
                }
            });

            obs.observe(container, { childList: true, subtree: true });

            setTimeout(() => {
                obs.disconnect();
                resolve(false);
            }, timeout);
        });
    }

    /* =========================
       HUD (CLEAN)
    ========================== */
    const hud = document.createElement('div');
    hud.innerHTML = `
        <div style="background:#1e1e2e;padding:15px;border-radius:10px;color:white;font-family:Arial;min-width:220px">
            <b>🤖 Auto Navigator</b><hr>
            <div>Status: <span id="hud-status">Starting...</span></div>
            <div>⚡ Stamina: <span id="hud-stamina">-/-</span></div>
            <div>🌾 Farmed: <span id="hud-farmed">-/-</span></div>
            <button id="hud-pause">⏸️ Pause</button>
            <button id="hud-stop">⏹️ Stop</button>
        </div>
    `;
    hud.style.cssText =
        'position:fixed;bottom:20px;right:20px;z-index:999999';
    document.body.appendChild(hud);

    const hudStatus  = hud.querySelector('#hud-status');
    const hudStamina = hud.querySelector('#hud-stamina');
    const hudFarmed  = hud.querySelector('#hud-farmed');

    function updateStatus(text) {
        hudStatus.textContent = text;
    }

    function updateHudStats({ stamina, staminaMax, farmed, farmedMax }) {
        hudStamina.textContent = `${stamina}/${staminaMax}`;
        hudFarmed.textContent  = `${farmed}/${farmedMax}`;
    }

    const cachedStats = getStatsFromCache();
    if (cachedStats) updateHudStats(cachedStats);

    hud.querySelector('#hud-stop').onclick = () => {
        stopWhile = true;
        updateStatus('Stopped manually');
    };

    hud.querySelector('#hud-pause').onclick = () => {
        paused = !paused;
        updateStatus(paused ? 'Paused' : 'Resumed');
    };

    const wait = s => new Promise(r => setTimeout(r, s * 1000));

    /* =========================
       MAIN LOOP (ORDERED)
    ========================== */
    async function autoNavigate() {
        updateStatus('Active');

        while (!stopWhile) {
            if (paused) {
                await wait(1);
                continue;
            }

            const title   = getTitleSlug();
            const chapter = getChapterNumber();

            // 1️⃣ storage
            if (chapter && isAlreadyReacted(title, chapter)) {
                updateStatus('Skipping reacted chapter');
                if (!clickNextChapter()) break;
                await wait(2);
                continue;
            }

            // 2️⃣ scroll
            scrollToChapterInfo();
            await wait(0.5);

            // 3️⃣ session + stats
            const stats = getStats();
            if (stats?.loggedOut) {
                updateStatus('Stopped: Session expired 🔒');
                break;
            }
            if (!stats) {
                updateStatus('Stopped: Stats unavailable ❌');
                break;
            }

            const { stamina, staminaMax, farmed, farmedMax } = stats;

            // 4️⃣ limits
            if (stamina >= staminaMax) {
                updateStatus('Stopped: Stamina full ⚡');
                break;
            }
            if (farmed >= farmedMax) {
                updateStatus('Stopped: Farm limit reached 🌾');
                break;
            }

            // 5️⃣ react
            if (!hasActiveReaction()) {
                updateStatus('Reacting...');
                react();
                await waitForReactionConfirmation();
                markReacted(title, chapter);
            }

            updateStatus('Next chapter');
            if (!clickNextChapter()) {
                updateStatus('Stopped: Last chapter');
                break;
            }

            await wait(2);
        }

        console.log('Auto Navigator finished');
    }

    setTimeout(autoNavigate, 3000);
})();
