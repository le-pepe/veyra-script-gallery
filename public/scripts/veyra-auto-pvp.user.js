// ==UserScript==
// @name         Verya Auto PvP
// @version      3.3.1
// @description  Auto PvP matchmaking
// @icon         https://cdn.rafled.com/anime-icons/images/0QIMre8lvSv8.jpg
// @author       Qito
// @match        https://demonicscans.org/pvp.php*
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(async () => {
    'use strict';

    localStorage.removeItem("verya_auto_pvp_v1")

    const STORAGE_KEY = "verya_auto_pvp_v2";

    // STATIC
    const URLS = {
        pvpMatchmaking: "https://demonicscans.org/pvp_matchmake.php",
        pvpAttack: "https://demonicscans.org/pvp_attack.php",
    };
    const SKILLS = {
        Slash: { skill_id: 0, name: "Slash" },
        PowerSlash: { skill_id: -1, name: "PowerSlash" },
        Heal: { skill_id: 8, name: "Heal" },
        Judgement_Seal: { skill_id: 9, name: "Judgement Seal" },
        Sanctified_Breach: { skill_id: 18, name: "Sanctified Breach" },
    };
    const COMBAT_PROFILES = {
        Default: { name: "Default", decideSkill: ({ tokens }) => { return tokens >= 9 ? SKILLS.PowerSlash : SKILLS.Slash; } },
        Warrior: { name: "Warrior", decideSkill: ({ tokens }) => { return tokens >= 9 ? SKILLS.PowerSlash : SKILLS.Slash; } },
        Mage: { name: "Mage", decideSkill: ({ tokens }) => { return tokens >= 9 ? SKILLS.PowerSlash : SKILLS.Slash; } },
        Cleric: { name: "Cleric", state: { slashCount: 0 }, decideSkill: ({ tokens }) => {
                if (COMBAT_PROFILES.Cleric.state.slashCount < 5) { COMBAT_PROFILES.Cleric.state.slashCount++; return SKILLS.Slash; }
                return tokens >= 9 ? SKILLS.PowerSlash : SKILLS.Slash; },
            reset: () => { COMBAT_PROFILES.Cleric.state.slashCount = 0; }
        },
        Hunter: { name: "Hunter", decideSkill: ({ tokens }) => { return tokens >= 9 ? SKILLS.PowerSlash : SKILLS.Slash; } }
    };

    const ATTACK_COOLDOWN = 1000;
    const MAX_LOG_FIGHTS = 10;

    // STATE
    let botEnabled = false;
    let inCombat = false;
    let wins = 0;
    let losses = 0;
    let fightLogs = [];
    const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    let minimized = savedState.minimized ?? false;
    let activeCombatProfile = localStorage.getItem("autoPvPProfile") || "Default";

    function saveGuiState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            minimized,
            left: gui.offsetLeft,
            bottom: parseInt(getComputedStyle(gui).bottom, 10)
        }));
    }

    // GUI
    const gui = document.createElement("div");
    gui.style.cssText = `
        position: fixed;
        bottom: 15px;
        left: 190px;
        width: 350px;
        background: rgba(30,30,30,0.95);
        color: #fff;
        font-family: monospace;
        font-size: 13px;
        padding: 14px;
        border-radius: 1.5em;
        box-shadow: 0 0 15px rgba(0,0,0,0.6);
        z-index: 99999;
    `;
    document.body.appendChild(gui);

    if (savedState.left !== undefined) {
        gui.style.left = savedState.left + "px";
    }
    if (savedState.bottom !== undefined) {
        gui.style.bottom = savedState.bottom + "px";
    }
    gui.style.right = "auto";
    gui.style.top = "auto";

    const logBox = document.createElement("div");
    logBox.style.cssText = `
        margin-top: 10px;
        padding: 8px;
        background: rgba(20,20,20,0.95);
        border-radius: 1em;
        height: 200px;
        overflow-y: auto;
        font-size: 12px;
    `;

    function renderGUI(status = "-", data = {}) {
        gui.style.width = minimized ? "150px" : "350px";
        if (minimized) {
            gui.innerHTML = `
                <div id="mini-header" style="
                    cursor: move;
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    font-size:13px;
                ">
                    <span>Open Auto PvP</span>
                    <span id="openGui" style="cursor:pointer;">＋</span>
                </div>
            `;

            makeDraggable(gui, gui.querySelector("#mini-header"));

            document.getElementById("openGui").onclick = () => {
                minimized = false;
                saveGuiState();
                renderGUI(status, data);
            };
            return;
        }
        gui.innerHTML = `
            <div id="gui-top" style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                cursor: move;
                padding-bottom: 6px;
                border-bottom: 1px solid #2a2a2a;
                margin-bottom: 6px;
            ">
                <div>
                    <strong>Status:</strong> ${status} <span style="opacity:.6">(${activeCombatProfile})</span>
                </div>
                <div id="minimize" style="cursor:pointer;">×</div>
            </div>

            <div style="display:flex;justify-content:space-between;">
                <div>❤️ ${data.my_hp ?? "-"}</div>
                <div>💀 ${data.enemy_hp ?? "-"}</div>
                <div>⚡ ${data.tokens ?? "-"}</div>
            </div>

            <div style="margin-top:6px;">
                🏆 ${wins} | ☠️ ${losses}
            </div>

            <div style="margin-top:10px;display:flex;gap:6px;">
                <button id="toggleBot" style="
                    flex:1;
                    padding:6px;
                    border-radius:1em;
                    border:1px solid ${botEnabled ? "#f44336" : "#4caf50"};
                    background:${botEnabled ? "#b71c1c" : "#2e7d32"};
                    color:#fff;
                    cursor:pointer;
                ">
                    ${botEnabled ? "STOP (after fight)" : "START"}
                </button>

                <button id="clearLog" style="
                    padding:6px 10px;
                    border-radius:1em;
                    border:1px solid #555;
                    background:#111;
                    color:#fff;
                    cursor:pointer;
                ">
                    Clear Log
                </button>
            </div>
            <div style="margin-top:6px">
                <select id="combatProfile" style="
                    width:100%;
                    background:#111;
                    color:#fff;
                    border-radius:1em;
                    border:1px solid #333;
                    padding:4px;
                ">
                    ${Object.keys(COMBAT_PROFILES).map(p =>
            `<option value="${p}" ${p === activeCombatProfile ? "selected" : ""}>${p}</option>`
        ).join("")}
                </select>
            </div>

        `;

        gui.appendChild(logBox);

        document.getElementById("toggleBot").onclick = toggleBot;
        document.getElementById("clearLog").onclick = clearLogs;
        document.getElementById("minimize").onclick = () => { minimized = true; saveGuiState(); renderGUI(status, data); };
        document.getElementById("combatProfile").onchange = (e) => { activeCombatProfile = e.target.value; localStorage.setItem("autoPvPProfile", activeCombatProfile); addFightLog(`[${now()}] Profile switched to ${activeCombatProfile}`); };


        renderLogs();
        makeDraggable(gui, gui.querySelector("#gui-top"));
    }


    function renderLogs() {
        logBox.innerHTML = "";
        fightLogs.forEach(log => {
            const div = document.createElement("div");
            div.textContent = log;
            div.style.cssText = `
                padding: 4px 0;
                border-bottom: 1px solid #2a2a2a;
                word-wrap: break-word;
                white-space: pre-wrap;
            `;
            logBox.appendChild(div);
        });
        logBox.scrollTop = logBox.scrollHeight;
    }

    function addFightLog(entry) {
        fightLogs.push(entry);
        if (fightLogs.length > MAX_LOG_FIGHTS) {
            fightLogs.shift();
        }
        renderLogs();
    }

    function clearLogs() {
        fightLogs = [];
        addFightLog("[ ] log cleared");
    }

    // UTILS
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function post(url, data, action = "request") {
        // fetch
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: data,
                credentials: "same-origin"
            });

            const text = await res.text();

            if (!res.ok) {
                return { ok: false, source: "fetch", action, error: `HTTP ${res.status}`, raw: text }
            }

            try {
                return { ok: true, source: "fetch", action, data: JSON.parse(text) };
            } catch {
                return { ok: false, source: "fetch", action, error: "Invalid JSON", raw: text };
            }

        } catch (err) {
            // Fallback: GM.xmlHttpRequest
            return new Promise(resolve => {
                GM.xmlHttpRequest({
                    method: "POST",
                    url,
                    data,
                    anonymous: false,
                    withCredentials: true,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Referer": location.href,
                        "Origin": location.origin,
                        "User-Agent": navigator.userAgent,
                        "Cookie": document.cookie
                    },
                    onload: res => {
                        if (res.status !== 200) {
                            resolve({ ok: false, source: "GM", action, error: `HTTP ${res.status}`, raw: res.responseText });
                            return;
                        }
                        try {
                            resolve({ ok: true, source: "GM", action, data: JSON.parse(res.responseText) });
                        } catch {
                            resolve({ ok: false, source: "GM", action, error: "Invalid JSON", raw: res.responseText });
                        }
                    },
                    onerror: e => {
                        resolve({ ok: false, source: "GM", action, error: "Network error", raw: String(e) });
                    }
                });
            });
        }
    }

    function now() {
        return new Date().toLocaleTimeString("de-DE", { hour12: false });
    }

    function makeDraggable(el, handle) {
        if (!handle) return;

        let isDown = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startBottom = 0;

        handle.addEventListener("mousedown", (e) => {
            isDown = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = el.offsetLeft;
            startBottom = parseInt(getComputedStyle(el).bottom, 10);
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDown) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            el.style.left = startLeft + dx + "px";
            el.style.bottom = startBottom - dy + "px";
        });

        document.addEventListener("mouseup", () => {
            if (isDown) saveGuiState();
            isDown = false;
        });
    }


    // LOG PARSER
    function getPlayerNames(result, match) {
        // Nutze reinen Text aus dem Server-Log (ohne HTML)
        const myName = result.logs?.[1]?.USERNAME || "Unknown";
        const enemyName = result.logs?.[0]?.USERNAME || "Unknown";

        return `[${now()}] ${myName} vs ${enemyName} | match: ${match}`;
    }


    // CORE LOGIC
    async function startMatchmaking() {
        renderGUI("Looking for enemy");

        const res = await post(URLS.pvpMatchmaking, "go=1", "matchmaking");

        if (!res.ok) {
            addFightLog(`[${now()}] Matchmaking failed (${res.source}): ${res.error} -> Try to reload`);
            console.debug("matchmaking debug:", res.raw);
            return false;
        }

        const result = res.data;

        if (result.status !== "success") {
            addFightLog(`[${now()}] No PvP Tokens`);
            return false;
        }

        addFightLog(`[${now()}] Enemy found! Starting combat...`);
        return true;
    }


    async function attack(skill) {
        const res = await post(URLS.pvpAttack, `skill_id=${skill.skill_id}`, "attack");

        if (!res.ok) {
            addFightLog(`[${now()}] Attack failed (${res.source}): ${res.error} -> Try to reload`);
            console.debug("attack debug:", res.raw);
            return null;
        }

        return res.data;
    }

    async function combatLoop() {
        inCombat = true;
        let lastResult = null;

        renderGUI("In combat");

        // Reset spezialisierter Klassen-State am Kampfstart
        if (activeCombatProfile === "Cleric" && COMBAT_PROFILES.Cleric.reset) {
            COMBAT_PROFILES.Cleric.reset();
        }

        while (true) {
            const context = {
                tokens: lastResult?.attacker_tokens ?? 20, // changed from 0 to 20, 0 caused always slash for first hit
                my_hp: lastResult?.my_hp ?? 0,
                enemy_hp: lastResult?.enemy_hp ?? 0
            };

            const profile = COMBAT_PROFILES[activeCombatProfile] ?? COMBAT_PROFILES.Default;
            const skill = profile.decideSkill(context);

            addFightLog(`[${now()}] Using ${skill.name}`);
            const result = await attack(skill);
            lastResult = result;

            renderGUI("In combat", {
                my_hp: result.my_hp,
                enemy_hp: result.enemy_hp,
                tokens: result.attacker_tokens
            });

            if (result.ended === 1) {
                if (result.enemy_hp <= 0) {
                    wins++;
                    addFightLog(getPlayerNames(result, "won"));
                    renderGUI("You won");
                } else {
                    losses++;
                    addFightLog(getPlayerNames(result, "lost"));
                    renderGUI("You lost");
                }
                break;
            }

            await sleep(ATTACK_COOLDOWN);
        }

        inCombat = false;
    }

    // BOT CONTROL
    function toggleBot() {
        botEnabled = !botEnabled;
        renderGUI(botEnabled ? "Enabled" : "Stopped");
    }

    // MAIN LOOP
    renderGUI("Idle");

    while (true) {
        if (!botEnabled) {
            await sleep(500);
            continue;
        }

        try {
            const foundEnemy = await startMatchmaking();
            if (!foundEnemy) {
                toggleBot();
                continue;
            }
            await sleep(1500);
            await combatLoop();

            if (!botEnabled) {
                renderGUI("Stopped (after fight)");
                await sleep(500);
                continue;
            }

            await sleep(2000);
        } catch (err) {
            console.error(err);
            addFightLog(`[${now()}] ⚠️ error, retrying`);
            await sleep(3000);
        }
    }
})();
