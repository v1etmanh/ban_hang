import man from './dialogs/man.json'
import oi from './dialogs/oi.json'
import xoai from './dialogs/xoai.json'
import khoai from './dialogs/khoai.json'

// Mỗi loại trái cây có 1 cây hội thoại "chung" (không phân biệt NPC) - dùng
// làm FALLBACK cho NPC nào chưa có file riêng trong dialogs/npc/, xem bên dưới.
//
// Lá (leaf) của mỗi cây chỉ có 2 loại outcome:
//   - "buy"    : khách ĐỒNG Ý mua, kèm weightKg (số ký khách yêu cầu, khớp
//                với câu thoại) -> GameCanvas sẽ mở màn hình cân hàng.
//   - "no_buy" : khách bỏ đi luôn, không mua -> không cân, khách rời sạp.
// Lưu ý: "buy" ở đây chỉ là khách ĐỒNG Ý MUA nếu cân đúng, KHÔNG có nghĩa
// là đã bán được hàng - kết quả "bán được" thật sự chỉ xác định sau khi
// người chơi cân xong ở WeighingScreen (xem GameCanvas.jsx).
export const FRUIT_DIALOG_TREES = { man, oi, xoai, khoai }
export const FRUIT_DIALOG_IDS = Object.keys(FRUIT_DIALOG_TREES)

export function pickRandomFruitDialog() {
  const fruitId = FRUIT_DIALOG_IDS[Math.floor(Math.random() * FRUIT_DIALOG_IDS.length)]
  return { fruitId, tree: FRUIT_DIALOG_TREES[fruitId] }
}

// ----- Cây hội thoại RIÊNG theo từng NPC (tính cách hóa) -----
// Mỗi file trong dialogs/npc/<characterId>.json có dạng:
//   { characterId, fruits: { <fruitId>: { rootId, nodes } } }
// KHÔNG bắt buộc có đủ 4 loại trái cây - NPC nào chỉ viết vài loại thì chỉ
// vài loại đó thôi (xem pickDialogForCharacter bên dưới).
// Dùng import.meta.glob (Vite) để tự nạp toàn bộ file, không cần sửa file
// này mỗi khi thêm 1 NPC mới.
const npcModules = import.meta.glob('./dialogs/npc/*.json', { eager: true })
const NPC_DIALOG_REGISTRY = {}
for (const p in npcModules) {
  const mod = npcModules[p].default ?? npcModules[p]
  NPC_DIALOG_REGISTRY[mod.characterId] = mod
}

// Chọn cây hội thoại cho 1 NPC cụ thể khi nó ghé sạp (mode='talking').
// Quy tắc:
//   - Nếu NPC có file riêng (dialogs/npc/<id>.json): CHỈ random trong số
//     các loại trái cây mà NPC ĐÓ đã có kịch bản riêng (không rơi vào loại
//     NPC chưa viết, tránh lộ nội dung không đúng tính cách).
//   - Nếu NPC hoàn toàn CHƯA có file riêng: fallback dùng full 4 cây hội
//     thoại chung theo trái cây (như hành vi cũ) - đảm bảo NPC nào cũng
//     nói được, không bị "câm"/crash.
export function pickDialogForCharacter(characterId) {
  const npcEntry = NPC_DIALOG_REGISTRY[characterId]
  const npcFruitIds = npcEntry ? Object.keys(npcEntry.fruits) : []

  if (npcFruitIds.length === 0) {
    return pickRandomFruitDialog()
  }

  const fruitId = npcFruitIds[Math.floor(Math.random() * npcFruitIds.length)]
  return { fruitId, tree: npcEntry.fruits[fruitId] }
}
