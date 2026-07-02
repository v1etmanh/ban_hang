# PLAN — Tính cách hóa NPC bằng cây hội thoại riêng (per-NPC dialog tree)

> File kế hoạch, CHƯA implement. Mục tiêu: mỗi NPC có 1 cây hội thoại
> riêng (thay vì dùng chung `DIALOG_TREE` như hiện tại), câu trả lời của
> người chơi dẫn tới nhánh khác nhau, cuối cùng đi tới 1 trong 2 loại lá:
> `success: true` (bán được) hoặc `success: false` (không bán được).

## 1. Hiện trạng (trước khi sửa)
- `src/game/dialogTree.js` export 1 object `DIALOG_TREE` DUY NHẤT, dùng
  chung cho MỌI NPC, không phân biệt tính cách.
- `DialogBox.jsx` import thẳng `DIALOG_TREE, DIALOG_ROOT_ID` (hard-code),
  không nhận cây hội thoại qua props.
- `GameCanvas.jsx` chỉ truyền `customerName` cho `DialogBox`, không truyền
  gì về "loại nhân vật" để chọn cây hội thoại tương ứng.

## 2. Thiết kế dữ liệu (JSON) cho từng NPC

### 2.1 Vị trí lưu
Tạo thư mục mới `src/game/dialogs/`, mỗi NPC 1 file JSON riêng, đặt tên
theo `id` trong `characters.js`, ví dụ:
```
src/game/dialogs/
  ba_co_kho_tinh.json
  ba_tu.json
  boy_pho.json
  grab.json
  fan_cr_7.json
  fan_m_10.json
  le_bon_1.json
  le_bon_2.json
  phu_ho.json
  _default.json      <- fallback dùng khi 1 NPC chưa có file riêng
```
Lý do tách file JSON riêng thay vì 1 file JS lớn: dễ chỉnh sửa độc lập
từng nhân vật, dễ nhờ người không biết code (viết nội dung/kịch bản) sửa
trực tiếp, và JSON thuần (không có hàm/logic) nên tương lai có thể load
động (`fetch`) hoặc build tool ngoài (vd Excel -> JSON) nếu cần.

### 2.2 Cấu trúc 1 file JSON (schema)
Giữ đúng hình dạng cây như `dialogTree.js` hiện tại (root -> nhánh -> lá),
CHỈ khác: lá thu gọn về đúng 2 loại (`sold` / `not_sold`) thay vì nhiều
biến thể `leaf_success_full`, `leaf_success_partial`, `leaf_fail_...`
như hiện tại (những biến thể đó có thể giữ làm nhiều NODE ID khác nhau,
nhưng field `outcome` của lá chỉ có 2 giá trị).

```jsonc
{
  "characterId": "ba_co_kho_tinh",     // khớp với id trong characters.js, dùng để validate/đối chiếu
  "rootId": "root",
  "nodes": {
    "root": {
      "speaker": "npc",
      "text": "Chào cô/chú! Sạp mình có gì bán vậy?",
      "options": [
        { "label": "Trái cây tươi mới hái sáng nay ạ!", "next": "ask_price" },
        { "label": "Toàn đồ ế hôm qua thôi ạ...",        "next": "leaf_honest_fail" }
      ]
    },
    "ask_price": {
      "speaker": "npc",
      "text": "Vậy bán giá bao nhiêu một ký?",
      "options": [
        { "label": "Dạ 20 ngàn ạ!",   "next": "ask_bargain" },
        { "label": "Tùy tâm cô/chú.", "next": "leaf_price_fail" }
      ]
    },
    "leaf_honest_fail": {
      "leaf": true,
      "outcome": "not_sold",
      "speaker": "npc",
      "text": "Ơ vậy thôi khỏi mua, để lúc khác vậy..."
    },
    "leaf_price_fail": {
      "leaf": true,
      "outcome": "not_sold",
      "speaker": "npc",
      "text": "Bán kiểu này chắc lỗ vốn, thôi tôi qua sạp khác."
    }
  }
}
```

Quy ước field:
- `characterId` (string, bắt buộc) — dùng để dev tự đối chiếu file JSON
  đúng nhân vật, KHÔNG dùng để lookup lúc runtime (lookup dựa vào tên file
  = id, xem mục 3).
- `rootId` (string, bắt buộc) — id node bắt đầu, thay thế hằng số
  `DIALOG_ROOT_ID` cũ (mỗi cây giờ tự khai báo root của mình, vì các cây
  khác nhau có thể muốn đặt tên node root khác nhau khi kịch bản phức tạp).
- `nodes` (object, bắt buộc) — map `nodeId -> node`.
- Node THƯỜNG (không phải lá): `speaker`, `text`, `options[]`
  (`{ label, next }`). Giữ nguyên hình dạng như cũ.
- Node LÁ: `leaf: true`, `outcome: "sold" | "not_sold"` (THAY THẾ field
  `success: true/false` cũ bằng `outcome` dạng string 2 giá trị cố định —
  rõ nghĩa hơn boolean khi đọc JSON thuần, và validate dễ hơn: chỉ chấp
  nhận đúng 2 chuỗi, không chấp nhận `null`/thiếu field).
  `speaker`, `text` giữ nguyên.

### 2.3 Ràng buộc/validate (áp dụng lúc dev, có thể viết 1 script nhỏ kiểm
tra, không bắt buộc chạy lúc runtime để tránh crash game nếu lỗi):
- Mọi `next` trong `options[]` phải trỏ tới 1 key tồn tại trong `nodes`.
- Mọi node lá bắt buộc có `outcome` là `"sold"` hoặc `"not_sold"`, không
  được thiếu, không được giá trị khác.
- Mọi node KHÔNG lá bắt buộc có `options.length >= 1`.
- Không có chu trình vô hạn (graph phải là cây/DAG hội tụ về lá, không
  vòng lặp quay lại node đã đi qua) — nếu cần "vòng lặp cố ý" (vd node
  mặc cả lặp lại nhiều lần) thì đó là lựa chọn thiết kế, không phải bug,
  nhưng vẫn phải đảm bảo LUÔN có ít nhất 1 nhánh dẫn ra lá để không kẹt
  người chơi vĩnh viễn.

## 3. Cơ chế load / chọn cây hội thoại đúng NPC

### 3.1 Tạo `src/game/dialogRegistry.js`
```js
import fallbackTree from './dialogs/_default.json'
// import.meta.glob (Vite) load toàn bộ file JSON trong dialogs/ 1 lần,
// tránh phải sửa file này mỗi khi thêm NPC mới
const modules = import.meta.glob('./dialogs/*.json', { eager: true })

const REGISTRY = {}
for (const path in modules) {
  const id = path.match(/([^/]+)\.json$/)[1]
  if (id === '_default') continue
  REGISTRY[id] = modules[path].default ?? modules[path]
}

export function getDialogTreeFor(characterId) {
  return REGISTRY[characterId] ?? fallbackTree
}
```
Dùng `import.meta.glob` (tính năng có sẵn của Vite, dự án đã dùng Vite 5)
để tự động nạp mọi file JSON trong `dialogs/` mà KHÔNG cần liệt kê tay
từng import — quan trọng vì mục tiêu là "mỗi NPC 1 cây riêng" và số NPC
sẽ tăng dần, không muốn phải sửa registry mỗi lần thêm 1 nhân vật.

### 3.2 Sửa `GameCanvas.jsx`
- Khi `setActiveCustomer({...})`, truyền thêm `characterId: n.character.id`
  vào object (bên cạnh `uid`, `name` hiện có).
- Truyền `characterId` xuống `<DialogBox characterId={...} .../>`.

### 3.3 Sửa `DialogBox.jsx`
- Nhận thêm prop `characterId`.
- Thay vì import cứng `DIALOG_TREE, DIALOG_ROOT_ID`, gọi
  `const tree = getDialogTreeFor(characterId)` (dùng `useMemo` theo
  `characterId` để không load lại mỗi render) rồi dùng `tree.nodes`,
  `tree.rootId` thay cho `DIALOG_TREE`, `DIALOG_ROOT_ID`.
- Đổi chỗ gọi `onFinish(node.success)` -> `onFinish(node.outcome === 'sold')`
  (giữ nguyên kiểu boolean cho `onFinish` vì `handleFinishDialog` trong
  `GameCanvas.jsx` đang nhận `success: boolean` — không cần sửa
  `GameCanvas.jsx` phần này, chỉ đổi chỗ tạo ra giá trị đó tại `DialogBox`).

## 4. Về nội dung/tính cách từng NPC (thiết kế kịch bản)
Không phải việc code, nhưng liệt kê ở đây để không quên khi viết JSON
thật cho từng nhân vật — mỗi cây nên phản ánh đúng tính cách theo TÊN
nhân vật đã có sẵn trong `characters.js`:
- `ba_co_kho_tinh` (Bà Cô Khó Tính): cây nên có NHIỀU nhánh dẫn tới
  `not_sold` hơn, câu hỏi xoáy sâu (chê giá, chê hàng), khó chiều.
- `ba_tu` (Bà Tư): trung tính, cây "mẫu" gần giống `dialogTree.js` hiện
  tại (mặc cả bình thường).
- `boy_pho` (Cậu bé bán phở — đây là KHÁCH chứ không phải người bán, xem
  lại tên gọi cho hợp ngữ cảnh khi viết `text`): có thể vui vẻ, dễ tính,
  thiên vị nhánh `sold`.
- `grab` (Anh Grab): vội vàng, ít lựa chọn hội thoại hơn (cây nông/ngắn
  hơn — ít node trung gian, nhanh tới lá), phù hợp tính cách "đang giao
  hàng, không có nhiều thời gian".
- `fan_cr_7`, `fan_m_10`: có thể cài easter egg liên quan bóng đá trong
  `text` (không bắt buộc, chỉ ý tưởng).
- `le_bon_1`, `le_bon_2`, `phu_ho`: chưa có ý tưởng cụ thể, dùng
  `_default.json` tạm thời cho tới khi thiết kế riêng.

`_default.json` = bản sao gần như nguyên `dialogTree.js` hiện tại (đổi
`success` -> `outcome: "sold"/"not_sold"`), dùng làm fallback cho NPC nào
chưa kịp viết cây riêng, đảm bảo game không bao giờ crash vì thiếu file.

## 5. Các bước implement theo thứ tự (để không phá vỡ game đang chạy)
1. Tạo `src/game/dialogs/_default.json` — convert nguyên `dialogTree.js`
   hiện tại sang schema mới (`outcome` thay `success`, gộp vào `nodes`).
2. Tạo `src/game/dialogRegistry.js` như mục 3.1.
3. Sửa `DialogBox.jsx` để nhận `characterId` + dùng `getDialogTreeFor()`
   thay vì import cứng `DIALOG_TREE`. TEST: game vẫn chạy y hệt như cũ
   (vì mọi NPC đều fallback về `_default.json` = bản chép của cây cũ).
4. Sửa `GameCanvas.jsx` truyền `characterId` qua `activeCustomer` +
   xuống `DialogBox`. TEST lại như bước 3.
5. Xóa `src/game/dialogTree.js` cũ SAU KHI đã confirm bước 3-4 chạy đúng
   (không xóa sớm, để còn đối chiếu nội dung gốc khi viết `_default.json`).
6. Viết dần từng file JSON riêng cho từng NPC theo mục 4 (có thể làm
   từng nhân vật 1, không cần làm hết 1 lần — registry tự fallback cho
   NPC chưa có file).
7. (Tùy chọn, không bắt buộc ngay) Viết 1 script Node nhỏ
   (`scripts/validate-dialogs.mjs`) chạy `node scripts/validate-dialogs.mjs`
   để check schema theo mục 2.3, chạy tay trước khi commit — KHÔNG tích
   hợp vào build vì dự án hiện chưa có test framework/CI (xem
   `CONTEXT.md`: "Không có test framework").

## 6. Rủi ro / lưu ý khi implement
- `import.meta.glob` là API của Vite, chỉ hoạt động đúng trong build/dev
  qua Vite (`npm run dev`/`npm run build`) — dự án đã dùng Vite nên không
  vấn đề, nhưng lưu ý KHÔNG dùng `fs.readdirSync` (Node API, không chạy
  được trong browser/Vite client code).
- `DialogBox.jsx` hiện là component "thường" (không phải phần canvas),
  nên việc sửa nó KHÔNG ảnh hưởng tới nguyên tắc tách "world state (ref)
  / React state" đã nêu trong `ARCHITECTURE.md` — vẫn giữ nguyên nguyên
  tắc đó, chỉ thêm 1 props mới.
- Nếu 1 NPC có tên xuất hiện 2 lần với 2 `id` khác nhau (vd `le_bon_1`,
  `le_bon_2` — cùng tên "Lê Bốn" nhưng khác id), mỗi id vẫn cần file JSON
  riêng theo ĐÚNG id (không theo tên), vì registry lookup bằng
  `character.id`, không phải `character.name`.
- Khi thêm NPC hoàn toàn mới vào `characters.js` trong tương lai, nhớ:
  (a) thêm file `<id>.json` trong `dialogs/`, HOẶC (b) chấp nhận NPC đó
  dùng tạm `_default.json` — không cần sửa gì thêm ở `dialogRegistry.js`
  nhờ `import.meta.glob`.
- Cập nhật lại `CONTEXT.md`/`ARCHITECTURE.md` sau khi implement xong (ghi
  chú trong 2 file đó: "cấu trúc dữ liệu mới... cần cập nhật lại 2 file
  này" — xem `PROJECT_LOG.md`).
