/**
 * 获取当前玩家颜色
 * 原理：找到地图上代表你的“将军”的格子，提取其 class 列表中除 "general" 和 "selectable" 之外的那个颜色
 * @returns {string|null} 返回颜色字符串，如 "red"，找不到时返回 null
 */
function getMyColor() {
    const generalTile = document.querySelector(".general");
    if (!generalTile) return null;
    // classList 转数组，排除无关类，找到颜色
    return [...generalTile.classList].find(
      cls => cls !== "general" && cls !== "selectable"
    ) || null;
}
  
/**
 * 获取地图尺寸（行数和列数）
 * @returns {{rows: number, cols: number}} 返回地图大小对象
 */
function getMapSize() {
    const gameMap = document.getElementById("gameMap");
    if (!gameMap) return { rows: 0, cols: 0 };
    const rows = gameMap.children.length;        // tbody 下的 tr 数量
    const cols = rows > 0 ? gameMap.children[0].children.length : 0; // tr 下的 td 数量
    return { rows, cols };
}
  
/**
 * 统计地图上各类格子的数量
 * @returns {Object} 一个对象，key 是格子的 className，value 是该类格子数量
 */
function countTileClasses() {
    const gameMap = document.getElementById("gameMap");
    if (!gameMap) {
      console.warn("找不到地图元素 gameMap");
      return {};
    }
  
    // 如果 gameMap 是 table，通常包含 tbody，tbody 里是 tr，tr 里是 td
    const tbody = gameMap.querySelector("tbody") || gameMap;
  
    const rows = tbody.children.length;
    const cols = rows > 0 ? tbody.children[0].children.length : 0;
  
    const classCount = {};
  
    for (let x = 0; x < rows; x++) {
      for (let y = 0; y < cols; y++) {
        const tile = tbody.children[x].children[y];
        const cls = tile.className.trim();
        classCount[cls] = (classCount[cls] || 0) + 1;
      }
    }
  
    return classCount;
}

/**
 * 读取当前地图信息，返回一个字典
 * key: "x,y" 格子坐标字符串
 * value: 该格子的 className 字符串
 * @returns {Object<string, string>}
 */
function readCurrentMap() {
    const gameMap = document.getElementById("gameMap");
    if (!gameMap) {
      console.warn("找不到地图元素 gameMap");
      return {};
    }
    const tbody = gameMap.querySelector("tbody") || gameMap;
    const rows = tbody.children.length;
    const cols = rows > 0 ? tbody.children[0].children.length : 0;
  
    const mapData = {};
  
    for (let x = 0; x < rows; x++) {
      for (let y = 0; y < cols; y++) {
        const tile = tbody.children[x].children[y];
        mapData[`${x},${y}`] = tile.className.trim();
      }
    }
    return mapData;
}
  
// 发送地图数据到后端
async function sendMapToBackend() {
  const mapData = readCurrentMap();
  const response = await fetch("http://localhost:3000/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ map: mapData })
  });
  const decision = await response.json();
  console.log("后端返回的决策：", decision);
  if (decision && decision.from && decision.to) {
    simulateClick(decision.from, decision.to);
  }
}