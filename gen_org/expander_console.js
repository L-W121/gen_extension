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
        w: 87, a: 65, s: 83, d: 68
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


  