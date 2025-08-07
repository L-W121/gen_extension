const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/turn", (req, res) => {
  const { turn } = req.body;
  console.log("📥 收到回合数:", turn);
  res.json({ ok: true, receivedTurn: turn });
});

app.post("/leaderboard", (req, res) => {
  const { leaderboard } = req.body;
  console.log("📥 收到排行榜:", leaderboard);
  res.json({ ok: true, received: leaderboard.length });
});

// 当前动作指令：可由 AI 算法生成并被 /action 获取
let currentAction = {
  action: "move",
  from: [1, 1],
  to: [0, 1],
  split: false
};

// 路由定义从这里开始
app.post("/map", (req, res) => {
  const rawMap = req.body.map;
  if (!rawMap || !Array.isArray(rawMap)) {
    console.log("❌ 地图格式不正确");
    return res.status(400).json({ error: "Invalid map format" });
  }

  console.log(`📥 收到原始地图，共 ${rawMap.length} 行`);
  console.dir(rawMap[0], { depth: null });

  // AI 或算法生成决策
  currentAction = {
    action: "move",
    from: [0, 0],
    to: [0, 1],
    split: 1
  };

  console.log("⚔️ 已生成新动作:", currentAction);

  res.json({ message: "地图接收成功", suggestion: "action generated" });
});

app.get("/action", (req, res) => {
  res.json(currentAction);
});



app.listen(port, () => {
  console.log(`✅ 后端服务器已启动: http://localhost:${port}`);
});
