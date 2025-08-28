// ==UserScript==
// @name         city counter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在游戏页面右侧显示城市数估算及战斗状态，带闪烁提示和排名，支持拖动窗口。
// @author       mx
// @match        https://*.generals.io/*
// @grant        none
// ==/UserScript==

(() => {
    // 创建 HUD 容器
    const host = document.createElement("div");
    host.id = "my-hud-container";
    Object.assign(host.style, {
        position: "fixed",
        top: "40%",
        left: "10px",
        zIndex: 99999,
        width: "auto",
        background: "white",
        color: "black",
        fontFamily: "monospace",
        fontSize: "14px",
        border: "1px solid black",
        borderRadius: "6px",
        padding: "10px",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 0 10px rgba(0,0,0,0.3)",
        cursor: "grab",
    });

    const shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    const style = document.createElement("style");
    style.textContent = `
      table {
        border-collapse: collapse;
        width: 100%;
      }
      td, th {
        border: 1px solid black;
        padding: 4px 6px;
        text-align: center;
      }
      .turn-counter {
        font-weight: bold;
        margin-bottom: 6px;
      }
    `;
    shadow.appendChild(style);

    const box = document.createElement("div");
    box.id = "my-hud-box";
    shadow.appendChild(box);

    window.myShadowBox = box;

    // 拖拽功能
    makeDraggable(host);

    // === 数据部分 ===
    let lastData = {};
    let cityEstimateData = {};
    let confusingDiffData = {};
    let lastTimestamp = Date.now();
    let lastGameTurn = 0; // 用来判断是否跨过了整回合（1秒）

    let isAlive = {};
    let landAt25Turn = {};
    const firstArmyTurn = {}; // { playerId: turnNumber }


    const knownColors = [
        "red", "lightblue", "green", "teal", "orange",
        "pink", "purple", "maroon", "yellow", "brown", "blue", "purpleblue"
    ];

    function clearHUD() {
        window.myShadowBox.innerHTML = "";
    }

    function fetchAndRenderHUD() {
        // 先检测页面是否显示了Game Over
        const gameOverElement = document.querySelector('h1');
        if (gameOverElement && gameOverElement.textContent.trim() === "Game Over") {
            // 游戏结束，清空数据和HUD
            lastData = {};
            cityEstimateData = {};
            confusingDiffData = {};
            isAlive = {};
            landAt25Turn = {};
            firstArmyTurn = {};

            clearHUD();
            const endDiv = document.createElement("div");
            endDiv.style.fontWeight = "bold";
            endDiv.style.fontSize = "16px";
            endDiv.style.color = "red";
            endDiv.textContent = "游戏结束";
            window.myShadowBox.appendChild(endDiv);
            return; // 不继续渲染其他内容
        }
        const now = Date.now();
        const rows = Array.from(document.querySelectorAll('#game-leaderboard tr'));
        if (rows.length < 2) return;

        const headerCells = Array.from(rows[0].children);
        let nameIdx = -1, armyIdx = -1, landIdx = -1;
        headerCells.forEach((cell, i) => {
            const t = cell.textContent.trim().toLowerCase();
            if (t === 'player' || t === 'name') nameIdx = i;
            if (t === 'army') armyIdx = i;
            if (t === 'land') landIdx = i; // 找land列
        });
        if (nameIdx === -1 || armyIdx === -1 || landIdx === -1) return;

        let turncounterText = document.getElementById("turn-counter")?.textContent || "";
        let gameTurn = Number(turncounterText.match(/\d+/g)?.[0] || 0);
        const turnAdvanced = (gameTurn !== lastGameTurn);
        lastGameTurn = gameTurn; // 更新上一回合

        // 只在 turn 变化时渲染 HUD


        if (gameTurn === 1) {
            // 新局开始，清空所有缓存数据
            lastData = {};
            cityEstimateData = {};
            confusingDiffData = {};
            isAlive = {};
            landAt25Turn = {};
            firstArmyTurn = {};
        }
        const players = [];

        rows.slice(1).forEach(row => {
            const cells = row.children;
            const nameCell = cells[nameIdx];
            const name = nameCell.textContent.trim();
            const army = Number(cells[armyIdx]?.textContent) || 0;
            const land = Number(cells[landIdx]?.textContent) || 0;

            // 如果 land > 0 才视为存活
            if (land > 0) {
                isAlive[name] = true;

                // 记录第一次出兵 turn
                if (land === 3) {
                    firstArmyTurn[name] = army - 1;
                }

                const color = Array.from(nameCell.classList).find(cls => knownColors.includes(cls)) || "gray";
                players.push({ name, army, land, color });
            } else {
                isAlive[name] = false; // 死亡
            }
        });


        // === 记录第25回合的land ===
        if (gameTurn === 25) {
            players.forEach(p => {
                landAt25Turn[p.name] = p.land;
            });
        }

        // 数据估算（保留原有逻辑）
        players.forEach(player => {
            const lastArmy = lastData[player.name] ?? player.army;
            const delta = player.army - lastArmy;
            const lastCityEstimate = cityEstimateData[player.name] ?? 0;
            const diff = delta - lastCityEstimate;

            let cityEstimate = lastCityEstimate;
            if (gameTurn % 25 !== 0 && delta > 0 && ((diff >= -2 && diff <= 2) || gameTurn % 11 === 0)) {
                cityEstimate = delta;
            }


            cityEstimateData[player.name] = cityEstimate;
            confusingDiffData[player.name] = delta - cityEstimate;
            lastData[player.name] = player.army;
            player.cityEstimate = cityEstimate;
            player.diff = delta - cityEstimate;
            if (!turnAdvanced) {
                player.diff = 0;
            }
        });

        // 战斗推断（保留原有逻辑）
        players.forEach(playerI => {
            playerI.fightingWith = null;
            if ((confusingDiffData[playerI.name] ?? 0) >= 0) return;
            for (let playerJ of players) {
                if (playerI.name === playerJ.name) continue;
                if (!isAlive[playerJ.name]) continue;

                if (Math.abs(confusingDiffData[playerI.name] - confusingDiffData[playerJ.name]) <= 1 && turnAdvanced) {
                    playerI.fightingWith = playerJ;
                    break;
                }
            }
        });

        // === 渲染 HUD ===
        // === 渲染 HUD ===
        clearHUD();

        const turnDiv = document.createElement("div");
        turnDiv.className = "turn-counter";
        turnDiv.textContent = `⏱ Turn ${gameTurn}`;
        window.myShadowBox.appendChild(turnDiv);

        const table = document.createElement("table");
        const header = document.createElement("tr");
        header.innerHTML = `
    <th>player</th>
    <th>city</th>
    <th>diff</th>
    <th>25</th>
    <th>turn</th>
`;
        table.appendChild(header);

        players.sort((a, b) => b.cityEstimate - a.cityEstimate);
        players.forEach(player => {
            const row = document.createElement("tr");

            const tdName = document.createElement("td");
            tdName.textContent = player.name;
            tdName.style.background = player.color;
            tdName.style.color = "black";
            tdName.style.fontWeight = "bold";

            const tdCity = document.createElement("td");
            const prevCity = cityEstimateData[player.name] ?? 0;
            const newCity = player.cityEstimate;
            tdCity.textContent = newCity;

            if (newCity > prevCity) {
                let flashCount = 0;
                const interval = setInterval(() => {
                    tdCity.style.backgroundColor = (flashCount % 2 === 0) ? player.color : "";
                    flashCount++;
                    if (flashCount >= 10) {
                        clearInterval(interval);
                        tdCity.style.backgroundColor = "";
                    }
                }, 500);
            }

            const tdDiff = document.createElement("td");
            tdDiff.textContent = player.diff;
            if (player.fightingWith) {
                tdDiff.style.background = player.fightingWith.color;
                tdDiff.title = `可能与 ${player.fightingWith.name} 战斗`;
            }

            const tdLand25 = document.createElement("td");
            tdLand25.textContent = landAt25Turn[player.name] ?? "-";

            const firstArmyCell = document.createElement("td");
            firstArmyCell.textContent = firstArmyTurn[player.name] ?? "-";

            row.appendChild(tdName);
            row.appendChild(tdCity);
            row.appendChild(tdDiff);
            row.appendChild(tdLand25);
            row.appendChild(firstArmyCell);
            table.appendChild(row);
        });

        window.myShadowBox.appendChild(table);

        lastTimestamp = now;
    }
    fetchAndRenderHUD();
    window.__deltaIntervalId = setInterval(fetchAndRenderHUD, 500);

    // 拖拽函数
    function makeDraggable(element) {
        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        element.addEventListener('mousedown', function (e) {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            element.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', function (e) {
            if (isDragging) {
                element.style.left = (e.clientX - offsetX) + 'px';
                element.style.top = (e.clientY - offsetY) + 'px';
            }
        });

        document.addEventListener('mouseup', function () {
            isDragging = false;
            element.style.cursor = 'grab';
        });

        element.style.cursor = 'grab';
        element.style.position = 'fixed';
    }
})();
