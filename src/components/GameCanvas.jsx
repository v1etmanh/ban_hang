import React, { useEffect, useRef, useState, useCallback } from 'react'
import { CHARACTERS, resolveDirection } from '../game/characters.js'
import DialogBox from './DialogBox.jsx'

const CANVAS_W = 960
const CANVAS_H = 600

// ----- Quầy hàng foreground (bàn full-width + giỏ hoa quả) -----
const COUNTER_H = 190                       // chiều cao vùng vẽ quầy trên canvas
const COUNTER_TOP_Y = CANVAS_H - COUNTER_H +100 // đỉnh mặt bàn (410)
const BASKETS = [
  { src: '/man.png',  label: 'Mận 10k' },
  { src: '/tomato.png', label: 'Ổi 5k' },
  { src: '/mango.png',  label: 'Xoài 150k' },
  { src: '/apple.png',  label: 'Khoai lang 10k' },
]

const STALL_X = CANVAS_W / 2        // vị trí khách "ghé" tới (trung tâm màn hình)
const STALL_Y = COUNTER_TOP_Y + 70 // hơi lấn vào quầy để bị quầy che bớt chân (hiệu ứng đứng sau quầy); +50 so với trước để đứng gần quầy/người bán hơn khi trò chuyện
const ARRIVE_DIST = 10          // khoảng cách coi như "đã tới sạp"
const STROLL_Y_MIN = 340           // NPC dạo qua dạo lại - nằm TRÊN quầy (chưa bị che)
const STROLL_Y_MAX = COUNTER_TOP_Y - 20 // mép dưới, ngay phía trên quầy
const SPAWN_INTERVAL = [1800, 3500]   // ms, random giữa 2 mốc
const MAX_NPCS = 4                    // số lượng NPC tối đa xuất hiện cùng lúc trên màn hình
const PICK_CUSTOMER_INTERVAL = 6000   // ms, mỗi khoảng này thử chọn 1 khách ghé sạp
const CHAR_SCALE = 2             // hệ số phóng to nhân vật
const SPRITE_H = 110 * CHAR_SCALE   // chiều cao vẽ nhân vật (canvas), width tự scale theo tỉ lệ frame
const ANIM_FPS = 8    // tốc độ chạy animation (frame/giây) khi đang di chuyển
const DEBUG_GRID = true // bật/tắt lưới toạ độ y để canh chỉnh mặt đường cho đúng

// Các NPC chỉ có state 'walk_right' (không có walk_down/walk_left...) nên
// không đủ animation để đi vào sạp trò chuyện -> loại khỏi danh sách được chọn làm khách
const CUSTOMER_EXCLUDED_IDS = new Set([
  'ba_ban_da',
  'ba_ban_mit',
  'ninja_lead',
])

let uidCounter = 0
const nextUid = () => ++uidCounter

export default function GameCanvas() {
  const canvasRef = useRef(null)
  const imgCache = useRef(new Map()) // src -> HTMLImageElement
  const bgRef = useRef(null)
  const tableRef = useRef(null)
  const npcsRef = useRef([]) // danh sách NPC đang sống trên canvas
  const rafRef = useRef(null)
  const lastTsRef = useRef(0)
  const spawnTimerRef = useRef(0)
  const pickTimerRef = useRef(0)
  const [activeCustomer, setActiveCustomer] = useState(null) // {uid, name}

  const getImg = useCallback((src) => {
    let img = imgCache.current.get(src)
    if (!img) {
      img = new Image()
      img.src = src
      imgCache.current.set(src, img)
    }
    return img
  }, [])

  // ----- Khởi tạo ảnh nền, bàn, giỏ hoa quả -----
  useEffect(() => {
    bgRef.current = getImg('/background.png')
    tableRef.current = getImg('/table.png')
    BASKETS.forEach((b) => getImg(b.src))
  }, [getImg])

  // ----- Tạo 1 NPC mới đi dạo ngang từ 1 trong 2 mép màn hình -----
  function spawnStroller() {
    if (npcsRef.current.length >= MAX_NPCS) return // đã đạt giới hạn NPC cùng lúc, không spawn thêm

    // chỉ chọn trong số nhân vật CHƯA xuất hiện trên màn hình (tránh trùng loại)
    const usedNames = new Set(npcsRef.current.map((n) => n.character.name))
    const availableCharacters = CHARACTERS.filter((c) => !usedNames.has(c.name))
    if (availableCharacters.length === 0) return // hết loại nhân vật khả dụng, đợi lượt sau

    const character = availableCharacters[Math.floor(Math.random() * availableCharacters.length)]
    const fromLeft = Math.random() < 0.5
    const y = STROLL_Y_MIN + Math.random() * (STROLL_Y_MAX - STROLL_Y_MIN)
    const speed = 40 + Math.random() * 30 // px/giây
    npcsRef.current.push({
      uid: nextUid(),
      character,
      x: fromLeft ? -60 : CANVAS_W + 60,
      y,
      baseY: y,
      dir: fromLeft ? 'walk_right' : 'walk_left',
      vx: fromLeft ? speed : -speed,
      vy: 0,
      speed,
      mode: 'stroll', // stroll | approach | talking | leaving
      frame: 0,
      frameTime: 0,
    })
  }

  // ----- Chọn ngẫu nhiên 1 NPC đang dạo để cho ghé vào sạp -----
  function pickCustomer() {
    if (activeCustomer) return // đang có khách nói chuyện rồi thì thôi
    // QUAN TRỌNG: activeCustomer chỉ được set khi NPC đã TỚI sạp (mode='talking'),
    // không phải lúc bắt đầu đi vào (mode='approach'). Nếu chỉ check activeCustomer,
    // quãng đường approach dài (~10s) có thể lâu hơn PICK_CUSTOMER_INTERVAL (6s),
    // khiến 1 NPC thứ 2 bị chọn làm khách trong lúc NPC đầu vẫn đang đi tới ->
    // cả 2 cùng hội tụ về đúng 1 điểm STALL, ai tới sau sẽ ghi đè activeCustomer
    // và NPC tới trước bị "mồ côi", đứng kẹt tại chỗ mãi mãi vì không còn gắn với
    // hộp thoại nào để trigger onFinish. Nên phải check luôn cả các NPC đang
    // approach/talking trong npcsRef, không chỉ dựa vào state activeCustomer.
    const alreadyEngaged = npcsRef.current.some(
      (n) => n.mode === 'approach' || n.mode === 'talking'
    )
    if (alreadyEngaged) return
    const candidates = npcsRef.current.filter(
      (n) => n.mode === 'stroll' && !CUSTOMER_EXCLUDED_IDS.has(n.character.id)
    )
    if (candidates.length === 0) return
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]
    chosen.mode = 'approach'
    chosen.dir = 'walk_down'
    chosen.speed = 55
  }

  // ----- Vòng lặp game (update + draw) -----
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function update(dt) {
      spawnTimerRef.current -= dt
      if (spawnTimerRef.current <= 0) {
        spawnStroller()
        const [lo, hi] = SPAWN_INTERVAL
        spawnTimerRef.current = lo + Math.random() * (hi - lo)
      }

      pickTimerRef.current -= dt
      if (pickTimerRef.current <= 0) {
        pickCustomer()
        pickTimerRef.current = PICK_CUSTOMER_INTERVAL
      }

      for (const n of npcsRef.current) {
        const isMoving = n.mode === 'stroll' || n.mode === 'approach' || n.mode === 'leaving'
        if (isMoving) {
          n.frameTime += dt
          const frameDuration = 1000 / ANIM_FPS
          if (n.frameTime >= frameDuration) {
            n.frameTime -= frameDuration
            const slice = resolveDirection(n.character, n.dir).slice
            const count = slice ? slice.frameCount : 1
            n.frame = (n.frame + 1) % count
          }
        } else if (n.mode !== 'talking') {
          // Không reset frame khi mode='talking': frame ngẫu nhiên đã được set
          // 1 lần lúc chuyển sang talking (xem nhánh arrival phía dưới), phải
          // giữ nguyên suốt cuộc trò chuyện chứ không cho vòng lặp này ghi đè
          // về 0 mỗi frame.
          n.frame = 0
          n.frameTime = 0
        }

        if (n.mode === 'stroll') {
          n.x += n.vx * (dt / 1000)
        } else if (n.mode === 'approach') {
          const dx = STALL_X - n.x
          const dy = STALL_Y - n.y
          const dist = Math.hypot(dx, dy)
          if (dist <= ARRIVE_DIST) {
            // Lớp bảo vệ phòng hờ: nếu vì lý do gì đó đã có 1 khách khác đang
            // 'talking' rồi (không nên xảy ra sau khi sửa pickCustomer ở trên),
            // KHÔNG ghi đè activeCustomer -> tránh NPC này bị mồ côi đứng kẹt
            // mãi mãi. Cho nó rời đi ngang luôn thay vì đứng lại vô nghĩa.
            const someoneElseTalking = npcsRef.current.some(
              (other) => other !== n && other.mode === 'talking'
            )
            if (someoneElseTalking) {
              const leaveLeft = Math.random() < 0.5
              n.mode = 'leaving'
              n.dir = leaveLeft ? 'walk_left' : 'walk_right'
              n.vx = leaveLeft ? -n.speed : n.speed
            } else {
              n.mode = 'talking'
              // Dừng ở 1 frame NGẪU NHIÊN của walk_down (thay vì luôn về frame 0)
              // để trông giống đang đứng tự nhiên nhìn mặt người bán nói chuyện,
              // chứ không phải lúc nào cũng đứng y hệt 1 tư thế.
              n.dir = 'walk_down'
              const talkSlice = resolveDirection(n.character, 'walk_down').slice
              const talkFrameCount = talkSlice ? talkSlice.frameCount : 1
              n.frame = Math.floor(Math.random() * talkFrameCount)
              n.frameTime = 0
              setActiveCustomer({ uid: n.uid, name: n.character.name })
            }
          } else {
            // Ưu tiên walk_down trong khi còn cần tiến xuống sạp (dy đáng kể);
            // chỉ chuyển sang trái/phải khi đã gần ngang hàng với điểm đến (dy nhỏ).
            n.dir = dy > 6
              ? 'walk_down'
              : (dx > 0 ? 'walk_right' : 'walk_left')
            n.x += (dx / dist) * n.speed * (dt / 1000)
            n.y += (dy / dist) * n.speed * (dt / 1000)
          }
        } else if (n.mode === 'leaving') {
          n.x += n.vx * (dt / 1000) // rời sạp theo chiều ngang (trái/phải) ra khỏi màn hình
        }
      }

      // dọn NPC đã ra khỏi màn hình
      npcsRef.current = npcsRef.current.filter((n) => {
        if (n.mode === 'stroll') return n.x > -100 && n.x < CANVAS_W + 100
        if (n.mode === 'leaving') return n.x > -100 && n.x < CANVAS_W + 100
        return true
      })
    }

    function drawSprite(n) {
      const { src, flip, slice } = resolveDirection(n.character, n.dir)
      const img = getImg(src)
      if (!img.complete || img.naturalWidth === 0) return

      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
      if (slice) {
        const frame = n.frame % slice.frameCount
        const col = frame % slice.cols
        const row = Math.floor(frame / slice.cols)
        sw = slice.frameW
        sh = slice.frameH
        sx = slice.offX + col * (slice.frameW + slice.sepX)
        sy = slice.offY + row * (slice.frameH + slice.sepY)
      }

      const ratio = sw / sh
      const h = SPRITE_H
      const w = h * ratio
      ctx.save()
      ctx.translate(n.x, n.y)
      if (flip) ctx.scale(-1, 1)
      ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h, w, h)
      ctx.restore()
    }

    // Quầy hàng foreground: bàn kéo full chiều rộng + giỏ hoa quả trên mặt bàn.
    // Vẽ SAU NPC (gọi cuối trong draw()) để có z-index cao hơn, che khuất
    // phần thân dưới của NPC đứng gần quầy -> tạo hiệu ứng "đứng sau quầy".
    function drawCounterForeground() {
      const table = tableRef.current
      if (table && table.complete) {
        ctx.drawImage(table, 0, COUNTER_TOP_Y, CANVAS_W, 200)
      }

      const n = BASKETS.length
      BASKETS.forEach((basket, i) => {
        const img = getImg(basket.src)
        if (!img.complete || img.naturalWidth === 0) return
        const cx = ((i + 0.5) / n) * CANVAS_W
        const bw = 130
        const bh = bw * (img.naturalHeight / img.naturalWidth)
        const by = COUNTER_TOP_Y + 6 // giỏ đặt hơi chìm vào mép trên của bàn
        ctx.drawImage(img, cx - bw / 2, by - bh * 0.8+70, bw+30, bh+10)

        // bảng giá gỗ đơn giản (vẽ bằng canvas, không cần asset riêng)
        ctx.save()
        ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'center'
        const labelY = by - bh * 0.8 - 10
        const tw = ctx.measureText(basket.label).width + 16
        ctx.fillStyle = '#7a4a25'
        ctx.fillRect(cx - tw / 2, labelY - 16, tw, 20)
        ctx.strokeStyle = '#4a2a10'
        ctx.strokeRect(cx - tw / 2, labelY - 16, tw, 20)
        ctx.fillStyle = '#fff'
        ctx.fillText(basket.label, cx, labelY - 2)
        ctx.restore()
      })
    }

    function drawDebugGrid() {
      ctx.save()
      ctx.font = '11px monospace'
      for (let y = 0; y < CANVAS_H; y += 50) {
        ctx.strokeStyle = 'rgba(255,0,0,0.35)'
        ctx.beginPath()
        ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke()
        ctx.fillStyle = '#ff5050'
        ctx.fillText(`y=${y}`, 4, y - 3)
      }
      // vạch vàng: vùng NPC đi dạo (STROLL_Y_MIN -> STROLL_Y_MAX)
      ctx.strokeStyle = '#ffdd00'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, STROLL_Y_MIN); ctx.lineTo(CANVAS_W, STROLL_Y_MIN); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, STROLL_Y_MAX); ctx.lineTo(CANVAS_W, STROLL_Y_MAX); ctx.stroke()
      ctx.fillStyle = '#ffdd00'
      ctx.fillText(`STROLL_Y_MIN=${STROLL_Y_MIN}`, CANVAS_W - 170, STROLL_Y_MIN - 4)
      ctx.fillText(`STROLL_Y_MAX=${STROLL_Y_MAX}`, CANVAS_W - 170, STROLL_Y_MAX - 4)
      // vạch xanh lá: mép trên quầy hàng foreground
      ctx.strokeStyle = '#00ff88'
      ctx.beginPath(); ctx.moveTo(0, COUNTER_TOP_Y); ctx.lineTo(CANVAS_W, COUNTER_TOP_Y); ctx.stroke()
      ctx.fillStyle = '#00ff88'
      ctx.fillText(`COUNTER_TOP_Y=${COUNTER_TOP_Y}`, 4, COUNTER_TOP_Y - 4)
      // chấm xanh cyan: vị trí khách "tới nơi"
      ctx.fillStyle = '#00e5ff'
      ctx.beginPath(); ctx.arc(STALL_X, STALL_Y, 5, 0, Math.PI * 2); ctx.fill()
      ctx.fillText(`STALL (${STALL_X},${STALL_Y})`, STALL_X + 8, STALL_Y)
      ctx.restore()
    }

    function draw() {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      const bg = bgRef.current
      if (bg && bg.complete) ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H)
      else { ctx.fillStyle = '#7fbf5f'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H) }

      // Vẽ NPC theo thứ tự y (ai thấp hơn vẽ sau -> cảm giác chiều sâu)
      const sorted = [...npcsRef.current].sort((a, b) => a.y - b.y)
      for (const n of sorted) drawSprite(n)

      // Quầy hàng luôn vẽ SAU CÙNG (trước debug grid) -> z-index cao nhất
      drawCounterForeground()

      if (DEBUG_GRID) drawDebugGrid()
    }

    function loop(ts) {
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = Math.min(50, ts - lastTsRef.current) // clamp để tránh nhảy khung khi tab ẩn
      lastTsRef.current = ts
      update(dt)
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [getImg, activeCustomer])

  // ----- Khi kết thúc hội thoại -----
  function handleFinishDialog(success) {
    const n = npcsRef.current.find((x) => x.uid === activeCustomer.uid)
    if (n) {
      // Rời sạp theo chiều ngang: ưu tiên đi tiếp về phía đang "hướng mặt" lúc
      // strroll ban đầu nếu còn suy ra được, nếu không thì chọn ngẫu nhiên trái/phải.
      const leaveLeft = Math.random() < 0.5
      n.mode = 'leaving'
      n.dir = leaveLeft ? 'walk_left' : 'walk_right'
      n.speed = 60 + Math.random() * 20
      n.vx = leaveLeft ? -n.speed : n.speed
    }
    setActiveCustomer(null)
    // TODO: nếu success -> cộng điểm / tiền bán hàng vào state ngoài nếu cần
  }

  return (
    <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H, margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ display: 'block', border: '2px solid #333', background: '#000' }}
      />
      {activeCustomer && (
        <DialogBox
          customerName={activeCustomer.name}
          onFinish={handleFinishDialog}
        />
      )}
    </div>
  )
}