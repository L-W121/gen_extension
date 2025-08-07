(() => {
    // 创建 HUD 容器
    const host = document.createElement("div");
    host.id = "my-hud-container";
    Object.assign(host.style, {
        position: "fixed",
        top: "60%",
        right: "10px",
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
    //makeDraggable(host); 

    // === 数据部分 ===
    let lastData = {};
    let cityEstimateData = {};
    let confusingDiffData = {};
    let lastTimestamp = Date.now();
    let isAlive = {};

    const knownColors = [
        "red", "lightblue", "green", "teal", "orange",
        "pink", "purple", "maroon", "yellow", "brown", "blue", "purpleblue"
    ];

    function clearHUD() {
        window.myShadowBox.innerHTML = "";
    }

    function fetchAndRenderHUD() {
        const now = Date.now();
        const rows = Array.from(document.querySelectorAll('#game-leaderboard tr'));
        if (rows.length < 2) return;

        const headerCells = Array.from(rows[0].children);
        let nameIdx = -1, armyIdx = -1;
        headerCells.forEach((cell, i) => {
            const t = cell.textContent.trim().toLowerCase();
            if (t === 'player' || t === 'name') nameIdx = i;
            if (t === 'army') armyIdx = i;
        });
        if (nameIdx === -1 || armyIdx === -1) return;

        let turncounterText = document.getElementById("turn-counter")?.textContent || "";
        let gameTurn = Number(turncounterText.match(/\d+/g)?.[0] || 0);

        isAlive = {};
        const players = [];

        rows.slice(1).forEach(row => {
            const cells = row.children;
            const nameCell = cells[nameIdx];
            const name = nameCell.textContent.trim();
            const army = Number(cells[armyIdx].textContent) || 0;
            isAlive[name] = true;

            const color = Array.from(nameCell.classList).find(cls => knownColors.includes(cls)) || "gray";
            players.push({ name, army, color });
        });

        // 数据估算
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
        });

        // 战斗推断
        players.forEach(playerI => {
            playerI.fightingWith = null;
            if ((confusingDiffData[playerI.name] ?? 0) >= 0) return;
            for (let playerJ of players) {
                if (playerI.name === playerJ.name) continue;
                if (!isAlive[playerJ.name]) continue;

                if (Math.abs(confusingDiffData[playerI.name] - confusingDiffData[playerJ.name]) <= 1) {
                    playerI.fightingWith = playerJ;
                    break;
                }
            }
        });

        // 渲染 HUD
        clearHUD();

        // 显示当前回合
        const turnDiv = document.createElement("div");
        turnDiv.className = "turn-counter";
        turnDiv.textContent = `⏱ Turn ${gameTurn}`;
        window.myShadowBox.appendChild(turnDiv);

        // 渲染表格
        const table = document.createElement("table");
        const header = document.createElement("tr");
        header.innerHTML = `
        <th>玩家</th>
        <th>城市数</th>
        <th>diff</th>
      `;
        table.appendChild(header);
        players.sort((a, b) => b.cityEstimate - a.cityEstimate);
        players.forEach(player => {
            const row = document.createElement("tr");

            const tdName = document.createElement("td");
            tdName.textContent = player.name;
            tdName.style.background = player.color;
            tdName.style.color = "black";  // 避免白字在浅色背景上看不清
            tdName.style.fontWeight = "bold";

            const tdCity = document.createElement("td");

            // 检测城市数量是否上升，做闪烁
            const prevCity = cityEstimateData[player.name] ?? 0;
            const newCity = player.cityEstimate;

            tdCity.textContent = newCity;

            // 只有城市数增加才触发动画
            if (newCity > prevCity) {
                let flashCount = 0;
                const maxFlashes = 10; // 5 秒闪烁：10次 × 500ms

                const interval = setInterval(() => {
                    tdCity.style.backgroundColor = (flashCount % 2 === 0) ? player.color : "";
                    flashCount++;
                    if (flashCount >= maxFlashes) {
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

            row.appendChild(tdName);
            row.appendChild(tdCity);
            row.appendChild(tdDiff);
            table.appendChild(row);
        });
        
        window.myShadowBox.appendChild(table);
        lastTimestamp = now;
    }

    fetchAndRenderHUD();
    window.__deltaIntervalId = setInterval(fetchAndRenderHUD, 1000);
})();

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
