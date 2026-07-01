// Thông số cắt khung hình (sprite slicing) cho từng nhân vật + từng state,
// lấy theo dữ liệu Sprite Editor bạn cung cấp:
// cols/rows = số khung ngang/dọc, frameW/frameH = kích thước 1 khung,
// sepX/sepY = khoảng cách giữa các khung, offX/offY = lề bắt đầu cắt.
// Thứ tự khung: trái->phải, hết hàng thì xuống hàng dưới (row-major).

export const SPRITE_SLICE = {
  fan_m_10: {
    walk_right: { cols: 4, rows: 1, frameW: 125, frameH: 300, sepX: 0, sepY: 0, offX: 0, offY: 100 },
    walk_down:  { cols: 4, rows: 1, frameW: 125, frameH: 300, sepX: 0, sepY: 0, offX: 0, offY: 100 },
  },
  fan_cr_7: {
    walk_right: { cols: 4, rows: 1, frameW: 125, frameH: 300, sepX: 0, sepY: 0, offX: 0, offY: 100 },
    walk_down:  { cols: 4, rows: 1, frameW: 100, frameH: 220, sepX: 30, sepY: 0, offX: 50, offY: 100 },
  },
  grab: {
    walk_down: { cols: 4, rows: 1, frameW: 150, frameH: 230, sepX: 0, sepY: 0, offX: 10, offY: 80 },
    walk_left: { cols: 2, rows: 2, frameW: 192, frameH: 270, sepX: 0, sepY: 0, offX: 10, offY: 40 },
  },
  ba_ban_da: {
    walk_right: { cols: 2, rows: 2, frameW: 209, frameH: 220, sepX: 0, sepY: 30, offX: 0, offY: 70 },
  },
  ba_co_kho_tinh: {
    walk_down: { cols: 4, rows: 1, frameW: 160, frameH: 300, sepX: 10, sepY: 0, offX: 30, offY: 0 },
    walk_left: { cols: 4, rows: 1, frameW: 197, frameH: 316, sepX: 0, sepY: 0, offX: 0, offY: 0 },
  },
  ba_ban_mit: {
    walk_right: { cols: 2, rows: 2, frameW: 209, frameH: 240, sepX: 0, sepY: 20, offX: 0, offY: 60 },
  },
  ba_tu: {
    walk_down: { cols: 4, rows: 1, frameW: 153, frameH: 280, sepX: 0, sepY: 0, offX: 0, offY: 60 },
    walk_left: { cols: 4, rows: 1, frameW: 153, frameH: 280, sepX: 0, sepY: 0, offX: 0, offY: 60 },
  },
  boy_pho: {
    walk_down: { cols: 4, rows: 1, frameW: 130, frameH: 280, sepX: 40, sepY: 0, offX: 30, offY: 30 },
    walk_left: { cols: 4, rows: 1, frameW: 160, frameH: 249, sepX: 100, sepY: 0, offX: 50, offY: 0 },
  },
  le_bon_1: {
    walk_down:  { cols: 4, rows: 1, frameW: 120, frameH: 200, sepX: 20, sepY: 0, offX: 40, offY: 100 },
    walk_right: { cols: 4, rows: 1, frameW: 125, frameH: 300, sepX: 0, sepY: 0, offX: 0, offY: 100 },
  },
  le_bon_2: {
    walk_down:  { cols: 4, rows: 1, frameW: 110, frameH: 250, sepX: 15, sepY: 0, offX: 60, offY: 80 },
    walk_right: { cols: 4, rows: 1, frameW: 125, frameH: 360, sepX: 0, sepY: 0, offX: 0, offY: 60 },
  },
  ninja_lead: {
    walk_right: { cols: 2, rows: 2, frameW: 209, frameH: 220, sepX: 0, sepY: 30, offX: 0, offY: 60 },
  },
  phu_ho: {
    walk_right: { cols: 2, rows: 2, frameW: 216, frameH: 288, sepX: 0, sepY: 0, offX: 0, offY: 0 },
    walk_down:  { cols: 4, rows: 1, frameW: 176, frameH: 280, sepX: 0, sepY: 0, offX: 0, offY: 30 },
  },
}

export function getSliceConfig(characterId, state) {
  const cfg = SPRITE_SLICE[characterId]?.[state]
  if (!cfg) return null
  return { ...cfg, frameCount: cfg.cols * cfg.rows }
}
