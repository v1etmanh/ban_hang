# ARCHITECTURE.md — Chợ Quê - Bán Hàng

## Kiến trúc tổng quan
```
main.jsx
  └─ App.jsx                 (shell UI, không giữ state game)
       └─ GameCanvas.jsx      (component duy nhất chứa toàn bộ logic game)
            ├─ <canvas>        vẽ bằng Canvas 2D API (không dùng React để
            │                  render từng NPC — NPC sống trong ref, không
            │                  phải React state, để tránh re-render mỗi frame)
            └─ <DialogBox>     component React "thường", chỉ mount khi có
                               activeCustomer (React state) — đây là chỗ
                               DUY NHẤT trong game dùng React state để điều
                               khiển UI hiển thị/ẩn
```

Nguyên tắc cốt lõi: **tách biệt "world state" (canvas, chạy bằng
`requestAnimationFrame`, lưu trong `useRef`) khỏi "React state"** (chỉ dùng
React state cho những gì cần re-render DOM, ở đây là bật/tắt DialogBox qua
`activeCustomer`). Toàn bộ vị trí/animation/hướng đi của NPC nằm trong
`npcsRef.current` (mảng object thường, mutate trực tiếp mỗi frame) — KHÔNG
đưa NPC vào `useState` vì sẽ gây re-render 60 lần/giây, rất tốn.

## Vòng lặp game (trong GameCanvas.jsx, useEffect chính)
```
requestAnimationFrame(loop)
  loop(ts):
    dt = clamp(ts - lastTs, 50)   // clamp để tránh nhảy khung khi đổi tab
    update(dt)                    // cập nhật logic: spawn, pick khách, di chuyển, animation frame
    draw(dt)                      // vẽ lại toàn bộ canvas mỗi frame (không diff/dirty-rect)
    requestAnimationFrame(loop)
```
- `update(dt)`:
  - đếm ngược `spawnTimerRef` → gọi `spawnStroller()` theo chu kỳ ngẫu nhiên
    trong `SPAWN_INTERVAL`
  - đếm ngược `pickTimerRef` → gọi `pickCustomer()` mỗi `PICK_CUSTOMER_INTERVAL`
  - với mỗi NPC: cập nhật frame animation (nếu đang `stroll`/`approach`/
    `leaving`), rồi cập nhật vị trí `x`/`y` theo `mode` hiện tại
  - lọc bỏ NPC đã ra khỏi biên canvas khỏi `npcsRef.current`
- `draw()`:
  1. vẽ nền (`background.png`)
  2. vẽ NPC, sắp xếp theo `y` tăng dần (NPC ở dưới vẽ sau → ảo giác chiều sâu)
  3. vẽ quầy hàng foreground (`drawCounterForeground`) — vẽ SAU CÙNG để che
     bớt chân NPC đứng gần quầy (hiệu ứng "đứng sau quầy")
  4. nếu `DEBUG_GRID` bật, vẽ lưới tọa độ debug đè lên trên cùng

## State machine của 1 NPC (field `mode` trong object NPC)
```
 spawnStroller()
        │
        ▼
     stroll ──── pickCustomer() (ngẫu nhiên, mỗi PICK_CUSTOMER_INTERVAL) ───▶ approach
        │                                                                       │
        │ (ra khỏi biên canvas → bị lọc bỏ khỏi npcsRef)                        │ đến STALL_X/STALL_Y
        ▼                                                                       ▼
     (removed)                                                              talking
                                                                                 │
                                                             DialogBox trả kết quả (leaf node)
                                                                                 ▼
                                                                             leaving
                                                                                 │
                                                              ra khỏi biên canvas theo x
                                                                                 ▼
                                                                            (removed)
```
- `stroll`: đi ngang theo `vx` cố định (spawn từ mép trái hoặc phải)
- `approach`: đi chéo về `(STALL_X, STALL_Y)`; hướng vẽ ưu tiên `walk_down`
  khi còn lệch y đáng kể, chuyển `walk_left/right` khi đã gần ngang hàng
- `talking`: đứng yên hoàn toàn, animation dừng ở frame 0; state hội thoại do
  `DialogBox.jsx` tự quản lý nội bộ (không liên quan `npcsRef`)
- `leaving`: đi ngang trái/phải ngẫu nhiên (không quay lại vào giữa màn hình)

## Hệ thống animation / sprite
- Mỗi nhân vật, mỗi "state" (walk_down/walk_left/walk_right) tương ứng 1 file
  PNG spritesheet riêng tại `public/characters/<id>/<state>.png`.
- `spriteSlice.js` khai báo cách cắt khung cho từng file: `cols`/`rows` (số
  khung ngang/dọc), `frameW`/`frameH` (kích thước 1 khung), `sepX`/`sepY`
  (khoảng cách giữa khung), `offX`/`offY` (lề bắt đầu cắt). Thứ tự khung là
  row-major (trái→phải, hết hàng xuống hàng dưới).
- `resolveDirection(character, wantedDir)` trong `characters.js` là điểm vào
  duy nhất để lấy `{ src, flip, slice }` cho 1 hướng mong muốn:
  1. nếu nhân vật có sẵn đúng state đó → dùng thẳng
  2. nếu thiếu `walk_left` nhưng có `walk_right` (hoặc ngược lại) → dùng ảnh
     kia rồi lật ngang (`flip: true`)
  3. nếu vẫn không có gì khớp → fallback về `states[0]` của nhân vật
  4. `FACING_FIX` đảo ngược cờ `flip` cho từng nhân vật cụ thể, dùng khi ảnh
     gốc vẽ mặt ngược so với tên file (bug ở khâu tạo ảnh, không phải bug code)
- Tốc độ đổi frame cố định `ANIM_FPS = 8`, tính bằng `frameTime` cộng dồn
  theo `dt` mỗi vòng `update()`.

## Ràng buộc quan trọng khi thêm nhân vật mới
- Muốn nhân vật có thể được `pickCustomer()` chọn làm khách ghé sạp, bắt buộc
  phải có state `walk_down` (để đi vào sạp không bị gãy animation). Nếu
  không, phải thêm id vào `CUSTOMER_EXCLUDED_IDS`.
- Phải khai báo `spriteSlice.js` cho MỌI state ảnh có của nhân vật, nếu không
  `getSliceConfig()` trả `null` và sprite sẽ vẽ nguyên file ảnh (không cắt
  khung) → animation bị sai.

## Rủi ro / nợ kỹ thuật đã biết
- `draw()` vẽ lại toàn bộ canvas mỗi frame (không tối ưu dirty-rect) — chấp
  nhận được ở quy mô hiện tại (tối đa `MAX_NPCS = 4` NPC cùng lúc).
- Không có test tự động nào trong dự án.
- `DEBUG_GRID` đang bật mặc định (`true`) trong code — cần tắt trước khi
  coi là bản release/demo cho người dùng cuối.


