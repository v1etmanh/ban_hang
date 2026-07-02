# CONTEXT.md — Chợ Quê - Bán Hàng

## Dự án là gì
Mini-game bán hàng chợ quê, 2D, vẽ bằng **HTML Canvas** bên trong **React**.
NPC đi dạo ngang màn hình; thỉnh thoảng 1 NPC tự động ghé vào sạp, người chơi
trả lời hội thoại dạng cây (mặc cả) để "bán được hàng" hoặc NPC bỏ đi.

Đường dẫn gốc dự án: `D:\dream_project\ban_hang`

## Stack kỹ thuật
- React 18 (function component + hooks, không dùng state management ngoài)
- Vite 5 làm dev server / build tool (`npm run dev`, `npm run build`, `npm run preview`)
- Không dùng thư viện game engine ngoài (Phaser, PixiJS...) — toàn bộ vòng lặp
  game, sprite animation, va chạm... tự viết tay bằng Canvas 2D API thuần
  (`requestAnimationFrame`, `ctx.drawImage`, cắt khung sprite thủ công).
- Không có TypeScript, không có test framework, không có CSS framework (chỉ
  `App.css` + inline style object trong JSX).

## Chạy dự án
```
npm install
npm run dev      # dev server (Vite, HMR)
npm run build    # build production vào dist/
npm run preview  # xem thử bản build
```

## Cấu trúc thư mục chính
```
index.html              entry HTML, mount #root
src/main.jsx             entry React (ReactDOM.createRoot)
src/App.jsx               shell UI: tiêu đề + <GameCanvas /> + dòng hint
src/App.css                style toàn cục cơ bản
src/components/
  GameCanvas.jsx          TOÀN BỘ logic game: vòng lặp update/draw, spawn NPC,
                          state machine di chuyển NPC, vẽ quầy hàng foreground,
                          debug grid tọa độ. Đây là file "trái tim" của dự án.
  DialogBox.jsx           UI hộp thoại (overlay), điều khiển bằng DIALOG_TREE
src/game/
  characters.js           danh sách nhân vật NPC (id, tên, các "state" ảnh có
                          sẵn) + FACING_FIX (nhân vật nào cần lật ảnh) +
                          resolveDirection() — hàm suy luận hướng vẽ/flip
  spriteSlice.js          thông số cắt khung hình (cols/rows/frameW/frameH/
                          sep/off) cho từng nhân vật + từng state, dùng để
                          chạy animation đi bộ (spritesheet nhiều frame)
  dialogTree.js            cây hội thoại mặc cả (root -> ... -> leaf
                          success/fail)
public/
  background.png, table.png, man.png, tomato.png, mango.png, apple.png
                          asset nền + quầy hàng + giỏ hoa quả
  characters/<id>/<state>.png
                          spritesheet của từng NPC theo từng state di chuyển
                          (không phải mọi NPC có đủ walk_down/walk_left/
                          walk_right — xem bảng bên dưới)
```

## Danh sách nhân vật NPC hiện có (từ `characters.js` + `public/characters/`)
| id | tên | state ảnh có sẵn | ghi chú |
|---|---|---|---|
| ba_ban_da | Bà Bán Dừa | walk_right | chỉ 1 state -> KHÔNG dùng làm khách (xem CUSTOMER_EXCLUDED_IDS) |
| ba_ban_mit | Bà Bán Mít | walk_right | chỉ 1 state -> KHÔNG dùng làm khách |
| ninja_lead | Ninja Lead | walk_right | chỉ 1 state -> KHÔNG dùng làm khách |
| ba_co_kho_tinh | Bà Cô Khó Tính | walk_down, walk_left | |
| ba_tu | Bà Tư | walk_down, walk_left | |
| boy_pho | Cậu Bé Bán Phở | walk_down, walk_left | |
| grab | Anh Grab | walk_down, walk_left | |
| fan_cr_7 | Fan CR7 | walk_down, walk_right | |
| fan_m_10 | Fan Messi | walk_down, walk_right | |
| le_bon_1 | Lê Bốn (1) | walk_down, walk_right | |
| le_bon_2 | Lê Bốn (2) | walk_down, walk_right | |
| phu_ho | Chú Phụ Hồ | walk_down, walk_right | |

Hướng còn thiếu được suy ra bằng cách lật ảnh ngang (flip) trong
`resolveDirection()` — vd nhân vật chỉ có `walk_right` thì khi cần
`walk_left` sẽ lấy ảnh `walk_right` rồi flip.

## Vòng đời 1 NPC (state machine trong GameCanvas.jsx)
`stroll` (đi dạo ngang từ mép trái/phải) → `approach` (được chọn ngẫu nhiên,
đi chéo về phía sạp `STALL_X/STALL_Y`) → `talking` (đứng yên, DialogBox hiện
ra, chờ người chơi trả lời) → `leaving` (rời sạp) → bị dọn khỏi mảng NPC khi
ra ngoài biên canvas.

## Quy ước code / lưu ý khi sửa
- Toàn bộ hằng số cấu hình gameplay (kích thước canvas, tốc độ, khoảng spawn,
  vị trí quầy...) khai báo ở đầu `GameCanvas.jsx`, viết UPPER_SNAKE_CASE.
- `DEBUG_GRID = true` trong `GameCanvas.jsx` bật lưới tọa độ debug (vẽ đè lên
  canvas) — hữu ích khi chỉnh vị trí quầy/NPC, nhớ tắt trước khi release.
- Comment trong code viết bằng tiếng Việt, nên giữ văn phong đó khi sửa/thêm.
- Nhân vật mới muốn làm "khách ghé sạp" bắt buộc phải có tối thiểu state
  `walk_down` (để animation tiến vào sạp không bị gãy) — nếu thiếu, thêm id
  vào `CUSTOMER_EXCLUDED_IDS` trong `GameCanvas.jsx`.
- Không có backend/API — mọi state chỉ tồn tại trong bộ nhớ trình duyệt,
  mất khi reload.

## Lịch sử thay đổi
Xem chi tiết từng thay đổi (thời gian, hành động, tác động) tại `PROJECT_LOG.md`.
