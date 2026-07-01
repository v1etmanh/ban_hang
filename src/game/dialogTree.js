// Cây câu hỏi hội thoại chủ đề "buôn bán / mặc cả ở chợ".
// Cấu trúc dạng cây: mỗi node có 1 câu hỏi + danh sách lựa chọn.
// Mỗi lựa chọn trỏ tới `next` (id node kế tiếp) HOẶC là node lá
// (leaf: true) kết thúc hội thoại -> success: true (bán được hàng)
// hoặc success: false (khách bỏ đi, không mua).
//
// Đi được tới 1 node lá "success: true" nghĩa là NPC đó đã mua hàng.

export const DIALOG_TREE = {
  root: {
    speaker: 'npc',
    text: 'Chào cô/chú! Sạp mình có gì bán vậy?',
    options: [
      { label: 'Trái cây tươi mới hái sáng nay ạ!', next: 'ask_price' },
      { label: 'Toàn đồ ế hôm qua thôi ạ...', next: 'leaf_fail_thatthà' },
    ],
  },

  ask_price: {
    speaker: 'npc',
    text: 'Vậy bán giá bao nhiêu một ký?',
    options: [
      { label: 'Dạ 20 ngàn một ký, giá mềm lắm ạ!', next: 'ask_bargain' },
      { label: 'Tùy tâm, cô/chú trả nhiêu cũng được.', next: 'leaf_fail_gia' },
    ],
  },

  ask_bargain: {
    speaker: 'npc',
    text: 'Bớt chút được không? 15 ngàn thôi nha!',
    options: [
      { label: 'Dạ thôi được, 15 ngàn con bán mở hàng!', next: 'ask_quantity' },
      { label: 'Dạ không bớt được đâu ạ, giá vốn rồi.', next: 'ask_quantity_hard' },
    ],
  },

  ask_quantity_hard: {
    speaker: 'npc',
    text: 'Thôi được, vậy cho 1 ký đi.',
    options: [
      { label: 'Dạ con cân liền cho cô/chú!', next: 'leaf_success_full' },
      { label: 'Dạ hết hàng rồi ạ, hẹn lần sau!', next: 'leaf_fail_hethang' },
    ],
  },

  ask_quantity: {
    speaker: 'npc',
    text: 'Cho tôi 2 ký nhé, gói giúp luôn.',
    options: [
      { label: 'Dạ con gói kỹ cho cô/chú, cảm ơn đã ủng hộ!', next: 'leaf_success_full' },
      { label: 'Dạ bao ni lông hết rồi ạ.', next: 'leaf_success_partial' },
    ],
  },

  // ---- Lá (leaf) ----
  leaf_success_full: {
    leaf: true,
    success: true,
    speaker: 'npc',
    text: 'Ngon quá, lần sau ghé lại ủng hộ tiếp nha! (Bán được hàng 🎉)',
  },
  leaf_success_partial: {
    leaf: true,
    success: true,
    speaker: 'npc',
    text: 'Thôi không sao, cầm tay vậy cũng được. Cảm ơn nhé! (Bán được hàng)',
  },
  leaf_fail_thatthà: {
    leaf: true,
    success: false,
    speaker: 'npc',
    text: 'Ơ vậy thôi khỏi mua, để lúc khác vậy...',
  },
  leaf_fail_gia: {
    leaf: true,
    success: false,
    speaker: 'npc',
    text: 'Bán kiểu này chắc lỗ vốn, thôi tôi qua sạp khác.',
  },
  leaf_fail_hethang: {
    leaf: true,
    success: false,
    speaker: 'npc',
    text: 'Hết hàng hoài, lần sau ghé lại vậy.',
  },
}

export const DIALOG_ROOT_ID = 'root'
