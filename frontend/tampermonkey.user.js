// ==UserScript==
// @name         Generals.io 数据发送器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动将回合数、排行榜和地图数据发送到本地后端，并提供手动发送按钮
// @author       mx
// @match        https://*.generals.io/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  let intervalId = null;

  const knownColors = [
    "red", "lightblue", "green", "teal", "orange",
    "pink", "purple", "maroon", "yellow", "brown", "blue", "purpleblue"
  ];

  function getTurn() {
    const turnText = document.getElementById("turn-counter")?.textContent || "";
    const match = turnText.match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  function getLeaderboardData() {
    const tables = Array.from(document.querySelectorAll("table"));
    let targetTable = null;

    for (let table of tables) {
      const text = table.textContent;
      if (text.includes("Player") && text.includes("Army")) {
        targetTable = table;
        break;
      }
    }

    if (!targetTable) return [];

    const rows = Array.from(targetTable.querySelectorAll("tr"));
    const headerCells = Array.from(rows[0]?.children || []);
    const nameIdx = headerCells.findIndex(cell => cell.textContent.includes("Player"));
    const armyIdx = headerCells.findIndex(cell => cell.textContent.includes("Army"));
    const landIdx = headerCells.findIndex(cell => cell.textContent.includes("Land"));

    const leaderboard = [];

    rows.slice(1).forEach(row => {
      const cells = row.children;
      const nameCell = cells[nameIdx];
      if (!nameCell) return;

      const name = nameCell.textContent.trim();
      const army = Number(cells[armyIdx]?.textContent.trim()) || 0;
      const land = Number(cells[landIdx]?.textContent.trim()) || 0;
      const color = Array.from(nameCell.classList).find(cls => knownColors.includes(cls)) || "unknown";

      leaderboard.push({ name, color, army, land });
    });

    return leaderboard;
  }

  function getMap() {
    return [...document.querySelectorAll("#gameMap tr")].map(row =>
      [...row.querySelectorAll("td")].map(td => ({
        className: td.className,
        text: td.textContent.trim()
      }))
    );
  }

  async function sendAllToBackend() {
      const turn = getTurn();
      const leaderboard = getLeaderboardData();
      const map = getMap();

      try {
          const res = await fetch("http://localhost:3000/map", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ turn, leaderboard, map })
          });

          if (res.ok) {
              console.log("📬 数据发送成功，尝试获取指令...");
              await fetchAndExecuteAction();
          } else {
              console.warn("❌ 数据发送失败");
          }

      } catch (err) {
          console.warn("❌ 发送数据失败", err);
      }
  }


  // 模拟鼠标点击元素
  function simulateRealClick(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    el.dispatchEvent(new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      view: window
    }));
    el.dispatchEvent(new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      view: window
    }));
  }

  // 模拟键盘方向键或 wasd 移动
  function simulateKey(direction = "ArrowUp") {
    const keyMap = {
      ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
      w: 87, a: 65, s: 83, d: 68, z: 90
    };
    const keyCode = keyMap[direction] || 38;

    const keyEvent = new KeyboardEvent("keydown", {
      key: direction,
      code: direction,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(keyEvent);
  }

  // 从 (x, y) 向某个方向发出移动键盘指令
  function simulateMoveByKey(fromX, fromY, direction) {
    const tile = document.querySelector(`#gameMap tbody tr:nth-child(${fromX + 1}) td:nth-child(${fromY + 1})`);
    if (!tile) {
      console.warn("起始格子未找到");
      return;
    }
    simulateRealClick(tile);

    const keyMap = {
      up: "w", down: "s", left: "a", right: "d"
    };
    const key = keyMap[direction];
    if (key) simulateKey(key);
    else console.warn("未知方向:", direction);
  }

  // 从 (fromX, fromY) 移动到 (toX, toY)，自动推断方向
  function simulateMoveByCoord(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;

    let direction = null;
    if (dx === -1 && dy === 0) direction = "up";
    else if (dx === 1 && dy === 0) direction = "down";
    else if (dx === 0 && dy === -1) direction = "left";
    else if (dx === 0 && dy === 1) direction = "right";
    else {
      console.warn("只能移动到四邻格，非法坐标对");
      return;
    }

    simulateMoveByKey(fromX, fromY, direction);
  }

  // 查找可移动的 selectable 格子army
  function findMovableSelectable() {
    const gameMap = document.getElementById("gameMap") || document.querySelector(".gameMap");
    const tbody = gameMap?.querySelector("tbody") || gameMap;

    const rows = tbody?.children.length || 0;
    const cols = rows > 0 ? tbody.children[0].children.length : 0;

    function isValid(x, y) {
      return x >= 0 && x < rows && y >= 0 && y < cols;
    }

    const mapData = {};
    for (let x = 0; x < rows; x++) {
      for (let y = 0; y < cols; y++) {
        const tile = tbody.children[x].children[y];
        mapData[`${x},${y}`] = tile.className.trim();
      }
    }

    for (const [key, cls] of Object.entries(mapData)) {
      if (cls.includes("selectable")) {
        const [x, y] = key.split(",").map(Number);
        const tile = tbody.children[x].children[y];
        const armyCount = parseInt(tile.innerText.trim(), 10);

        if (isNaN(armyCount) || armyCount <= 1) continue; // ⛔ 跳过兵力不足的格子

        const neighbors = [
          [x - 1, y, "up"],
          [x + 1, y, "down"],
          [x, y - 1, "left"],
          [x, y + 1, "right"]
        ];

        for (const [nx, ny, dir] of neighbors) {
          if (isValid(nx, ny) && mapData[`${nx},${ny}`] === "") {
            console.log(`✅ 可以从 (${x},${y}) 移动到 (${nx},${ny})，方向：${dir}`);
            return { from: [x, y], to: [nx, ny], direction: dir };
          }
        }
      }
    }

    console.warn("❌ 没有找到可移动的 selectable 格子（兵力 > 1）。");
    return null;
  }

  // 调用后端动作
  async function fetchAndExecuteAction() {
    try {
      const res = await fetch("http://localhost:3000/action");
      const action = await res.json();
      console.log("🎮 收到行动指令:", action);

      if (action.action === "move") {
        const { from, to, split } = action;
        if (split) {
          // 先按 z 分兵
          simulateKey("z");
        }
        simulateMoveByCoord(from[0], from[1], to[0], to[1]);
      } else {
        console.warn("未知动作类型:", action.action);
      }

    } catch (e) {
      console.error("❌ 获取动作失败:", e);
    }
  }

  // 创建浮动控制面板
  const host = document.createElement("div");
  host.id = "data-sender-panel";
  Object.assign(host.style, {
    position: "fixed",
    top: "60%",
    right: "10px",
    zIndex: 99999,
    background: "white",
    border: "1px solid gray",
    borderRadius: "8px",
    padding: "10px",
    boxShadow: "0 0 8px rgba(0,0,0,0.3)",
    fontFamily: "sans-serif"
  });

  const shadow = host.attachShadow({ mode: "open" });

  const html = `
    <style>
      button {
        margin: 4px 0;
        padding: 6px 12px;
        border: none;
        background: #007bff;
        color: white;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background: #0056b3;
      }
    </style>
    <div>
      <button id="start-btn">▶️ 开始发送</button><br>
      <button id="stop-btn">⏸️ 停止发送</button><br>
      <button id="once-btn">📤 发送一次</button>
    </div>
  `;

  shadow.innerHTML = html;
  document.body.appendChild(host);

  const $ = sel => shadow.querySelector(sel);

  $("#start-btn").onclick = () => {
    if (intervalId !== null) return;
    intervalId = setInterval(sendAllToBackend, 500);
    console.log("✅ 开始定时发送数据");
  };

  $("#stop-btn").onclick = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
      console.log("⛔ 停止发送");
    }
  };

  $("#once-btn").onclick = () => {
    console.log("📤 发送一次数据");
    sendAllToBackend();
  };
})();
