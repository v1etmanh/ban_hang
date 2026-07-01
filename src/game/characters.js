// Danh sách nhân vật NPC và các "trạng thái" (state PNG) hiện có của từng người.
// Mỗi state là 1 file PNG duy nhất (không phải spritesheet nhiều khung hình),
// nên "animation" ở đây là animation chuyển động (di chuyển vị trí) chứ không
// phải animation đổi khung hình. Với hướng còn thiếu (vd chỉ có walk_right),
// ta lật ảnh (flip ngang) bằng canvas để suy ra hướng đối diện.

export const CHARACTERS = [
  { id: 'ba_ban_da',      name: 'Bà Bán Dừa',     states: ['walk_right'] },
  { id: 'ba_ban_mit',     name: 'Bà Bán Mít',     states: ['walk_right'] },
  { id: 'ba_co_kho_tinh', name: 'Bà Cô Khó Tính',  states: ['walk_down', 'walk_left'] },
  { id: 'ba_tu',          name: 'Bà Tư',           states: ['walk_down', 'walk_left'] },
  { id: 'boy_pho',        name: 'Cậu Bé Bán Phở',  states: ['walk_down', 'walk_left'] },
  { id: 'fan_cr_7',       name: 'Fan CR7',         states: ['walk_down', 'walk_right'] },
  { id: 'fan_m_10',       name: 'Fan Messi',       states: ['walk_down', 'walk_right'] },
  { id: 'grab',           name: 'Anh Grab',        states: ['walk_down', 'walk_left'] },
  { id: 'le_bon_1',       name: 'Lê Bốn (1)',      states: ['walk_down', 'walk_right'] },
  { id: 'le_bon_2',       name: 'Lê Bốn (2)',      states: ['walk_down', 'walk_right'] },
  { id: 'ninja_lead',     name: 'Ninja Lead',      states: ['walk_right'] },
  { id: 'phu_ho',         name: 'Chú Phụ Hồ',      states: ['walk_down', 'walk_right'] },
]

import { getSliceConfig } from './spriteSlice.js'

// Nếu 1 nhân vật đi bộ mà quay mặt/ đi NGƯỢC hướng di chuyển thực tế
// (do ảnh AI-gen vẽ mặt ngược so với tên file walk_left/walk_right),
// thêm id của nhân vật đó vào đây để tự động lật lại cho đúng.
// VD: nếu "grab" đi bên phải mà mặt quay qua trái -> thêm 'grab': true.
export const FACING_FIX = {
  ba_ban_da: true,
  ba_ban_mit: true,
  ba_co_kho_tinh: true,
  ba_tu: true,
  boy_pho: true,
  fan_cr_7: true,
  fan_m_10: true,
  grab: true,
  le_bon_1: true,
  le_bon_2: true,
  ninja_lead: true,
  phu_ho: true,
}

export function statePath(characterId, state) {
  return `/characters/${characterId}/${state}.png`
}

// Trả về { src, flip, slice } cho 1 hướng mong muốn, tự suy ra từ ảnh có sẵn
// bằng cách lật ngang nếu cần. `slice` là thông số cắt khung hình dùng để
// chạy animation đi bộ (spritesheet nhiều frame).
export function resolveDirection(character, wantedDir) {
  const fix = FACING_FIX[character.id] || false
  const build = (state, flip) => ({
    src: statePath(character.id, state),
    flip: fix ? !flip : flip,
    slice: getSliceConfig(character.id, state),
  })

  if (character.states.includes(wantedDir)) {
    return build(wantedDir, false)
  }
  if (wantedDir === 'walk_left' && character.states.includes('walk_right')) {
    return build('walk_right', true)
  }
  if (wantedDir === 'walk_right' && character.states.includes('walk_left')) {
    return build('walk_left', true)
  }
  return build(character.states[0], false)
}
