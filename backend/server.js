import { findExpandableMove , hasManualMove} from "./ai/expansion.js";

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 替代 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

let currentGameDir = null;

app.use(cors());
app.use(express.json());

app.post("/map", (req, res) => {
  const { map, turn, leaderboard } = req.body;

  if (turn === undefined || turn === null) {
    console.warn("⚠️ turn 未定义，忽略本次请求");
    return res.json({ message: "忽略无效的回合（turn 未定义）" });
  }

  if (turn < 0) {
    console.log("🏁 游戏结束，关闭存档");
    currentGameDir = null;
    return res.json({ message: "游戏结束" });
  }

  if (turn === 0 || !currentGameDir) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    currentGameDir = path.join(__dirname, "data", `game-${timestamp}`);
    fs.mkdirSync(currentGameDir, { recursive: true });
    console.log(`📂 新建存档文件夹: ${currentGameDir}`);
  }

  const filename = `turn-${String(turn).padStart(3, "0")}.json`;
  const filePath = path.join(currentGameDir, filename);

  const dataToSave = { turn, leaderboard: leaderboard || [], map };
  try {
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
    //console.log(`💾 已保存: ${filename}`);
  } catch (err) {
    console.error("❌ 保存失败:", err);
    return res.status(500).json({ error: "保存失败", details: err.message });
  }

  // ===== AI 动作 =====
  let action = null;
  // 使用
  if (turn > 5){
    if (hasManualMove(map)) {
    console.log("✋ 手动操作中，跳过 AI");
    } else {
      try {
        action = findExpandableMove(map); // 调用 AI 函数
        if (action) console.log("turn ", turn, "🎮 AI 决策动作:", action);
        
      } catch (e) {
        console.error("❌ AI 生成动作失败:", e);
      }
    }
  }
  

  // 返回给前端：保存信息 + 动作
  res.json({
    message: `地图已保存: ${filename}`,
    action, // 这里直接返回 AI 动作
  });
});

app.listen(port, () => {
  console.log(`✅ 后端服务器已启动: http://localhost:${port}`);
});
