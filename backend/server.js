const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

let currentGameDir = null;

// 当前动作指令：可由 AI 算法生成并被 /action 获取
let currentAction = {
  action: "move",
  from: [1, 1],
  to: [0, 1],
  split: false
};

app.use(cors());
app.use(express.json());

// 单一接口处理地图 + 回合 + 排行榜
app.post("/map", (req, res) => {
  const { map, turn, leaderboard } = req.body;

  console.log("📥 收到请求:", {
    mapType: Array.isArray(map) ? "array" : typeof map,
    turn,
    turnType: typeof turn,
    leaderboardLength: Array.isArray(leaderboard) ? leaderboard.length : 0
  });

  // 🚨 turn 未定义 → 忽略
  if (turn === undefined || turn === null) {
    console.warn("⚠️ turn 未定义，忽略本次请求");
    return res.json({ message: "忽略无效的回合（turn 未定义）" });
  }

  // 🚨 游戏结束检测
  if (turn < 0) {
    console.log("🏁 检测到游戏结束，关闭当前存档。");
    currentGameDir = null;
    return res.json({ message: "游戏结束，存档已关闭" });
  }

  // 🎮 新开局：turn = 0 或当前没有存档文件夹
  if (turn === 0 || !currentGameDir) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    currentGameDir = path.join(__dirname, "data", `game-${timestamp}`);
    fs.mkdirSync(currentGameDir, { recursive: true });
    console.log(`📂 新建存档文件夹: ${currentGameDir}`);
  }

  // 构造文件名并保存
  const filename = `turn-${String(turn).padStart(3, "0")}.json`;
  const filePath = path.join(currentGameDir, filename);

  const dataToSave = { turn, leaderboard: leaderboard || [], map };

  try {
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
    console.log(`💾 已保存: ${filename}`);
    res.json({ message: `地图已保存: ${filename}` });
  } catch (err) {
    console.error("❌ 保存失败:", err);
    res.status(500).json({ error: "保存失败", details: err.message });
  }
});

// 获取当前动作指令
app.get("/action", (req, res) => {
  //res.json(currentAction);
});

// 启动服务器
app.listen(port, () => {
  console.log(`✅ 后端服务器已启动: http://localhost:${port}`);
});
