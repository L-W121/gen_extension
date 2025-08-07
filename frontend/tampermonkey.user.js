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

  function sendAllToBackend() {
    const turn = getTurn();
    const leaderboard = getLeaderboardData();
    const map = getMap();

    fetch("http://localhost:3000/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turn })
    }).catch(err => console.warn("发送 turn 失败", err));

    fetch("http://localhost:3000/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaderboard })
    }).catch(err => console.warn("发送 leaderboard 失败", err));

    fetch("http://localhost:3000/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ map })
    }).catch(err => console.warn("发送 map 失败", err));
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
