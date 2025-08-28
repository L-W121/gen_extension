// ai/expansion.js
export function hasManualMove(map) {
  for (let row of map) {
    for (let cell of row) {
      if (cell.text && /[↑↓←→]/.test(cell.text)) {
        return true; // 发现箭头 → 手动操作中
      }
    }
  }
  return false;
}
export function findExpandableMove(map) {
  const rows = map.length;
  const cols = map[0].length;

  for (let x = 0; x < rows; x++) {
    for (let y = 0; y < cols; y++) {
      const cell = map[x][y];
      if (cell.className && cell.className.includes("selectable") && cell.className.includes("neutral") && +cell.text > 1) {
        const dirs = [
          [1,0], [-1,0], [0,1], [0,-1]
        ];
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx >=0 && nx < rows && ny >=0 && ny < cols) {
            const neighbor = map[nx][ny];
            if (!neighbor.className.includes("selectable") && neighbor.className.includes("neutral") && +cell.text > +neighbor.text + 1) {
              return {
                action: "move",
                from: [x, y],
                to: [nx, ny],
                split: false
              };
            }
            if (!neighbor.className.includes("mountain") && neighbor.text === "" && +cell.text < 4) {
              return {
                action: "move",
                from: [x, y],
                to: [nx, ny],
                split: false
              };
            }
          }
        }
      }
    }
  }

  return null;
}
