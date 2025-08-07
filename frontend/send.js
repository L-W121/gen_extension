function sendAllToBackend() {
    sendTurnToBackend();
    sendLeaderboardToBackend();
    sendMapToBackend();
  }

  //const intervalId = setInterval(sendAllToBackend, 500);
  function stopSending() {
    clearInterval(intervalId);
    console.log("⏹️ 已停止定时发送");
  }
    

function sendMapToBackend() {
  const map = [...document.querySelectorAll("#gameMap tr")].map(row =>
    [...row.querySelectorAll("td")].map(td => ({
      className: td.className,
      text: td.textContent.trim()
    }))
  );
  
  fetch("http://localhost:3000/map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ map })
  });
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
  
    if (!targetTable) {
      console.warn("⚠️ 未找到排行榜表格");
      return [];
    }
  
    const rows = Array.from(targetTable.querySelectorAll("tr"));
    const headerCells = Array.from(rows[0]?.children || []);
    const nameIdx = headerCells.findIndex(cell => cell.textContent.includes("Player"));
    const armyIdx = headerCells.findIndex(cell => cell.textContent.includes("Army"));
    const landIdx = headerCells.findIndex(cell => cell.textContent.includes("Land"));
  
    const knownColors = [
      "red", "lightblue", "green", "teal", "orange",
      "pink", "purple", "maroon", "yellow", "brown", "blue", "purpleblue"
    ];
  
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
  function sendLeaderboardToBackend() {
    const leaderboard = getLeaderboardData();
    fetch("http://localhost:3000/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaderboard }),
    }).then(res => {
      console.log("✅ 排行榜已发送");
    }).catch(err => {
      console.error("❌ 发送排行榜失败", err);
    });
  }

  function sendTurnToBackend() {
    const turnText = document.getElementById("turn-counter")?.textContent || "";
    const match = turnText.match(/\d+/);
    const turn = match ? Number(match[0]) : null;
  
    console.log("📤 发送回合数:", turn);
  
    fetch("http://localhost:3000/turn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ turn })
    }).then(res => {
      if (!res.ok) {
        throw new Error("请求失败");
      }
      return res.json();
    }).then(data => {
      console.log("✅ 后端返回:", data);
    }).catch(err => {
      console.error("❌ 发送回合失败:", err);
    });
  }
  