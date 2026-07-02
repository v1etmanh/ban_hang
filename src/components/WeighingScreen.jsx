import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FRUITS, FRUIT_ORDER, SUCCESS_TOLERANCE_RATIO } from '../game/fruitData.js'

// Viết lại từ bản gốc Godot (cân đồng hồ kim, tolerance 5%, time limit) sang
// React thuần: KHÔNG dùng Canvas 2D vẽ tay như GameCanvas.jsx (không cần
// chạy 60fps, chỉ là 1 overlay UI như DialogBox) - dùng SVG cho mặt đồng hồ
// + CSS transition cho kim (thay cho Tween thủ công của Godot), và dùng
// ảnh trái cây có sẵn trong public/ thay vì vẽ hình học.
//
// Bố cục màn hình dựa theo ảnh tham khảo do người dùng cung cấp: bàn cân
// (khay xanh dương + chân giằng xanh lá + mặt đồng hồ kim to) bên trái, lưới
// nút chọn mức cân + ô hiển thị các mức đã chọn + dòng "Da can/Lech" ở giữa,
// dải icon 4 loại trái cây của quầy bên phải (chỉ mang tính hiển thị - loại
// trái cây khách yêu cầu do dialogRegistry quyết định từ trước, không đổi
// được ở màn hình này), hàng 4 nút thao tác ở dưới cùng.
const TIME_LIMIT_MS = 20000 // 20s - rộng hơn bản Godot gốc (15s) vì thao tác
                             // bằng chuột từng nút một, không có phím tắt
const DIAL_MIN_ANGLE = -132
const DIAL_MAX_ANGLE = 132

export default function WeighingScreen({ customerName, fruitId, targetWeight, onFinish }) {
  const fruit = FRUITS[fruitId]
  const [chosen, setChosen] = useState([]) // [{ id, weight }]
  const [timeLeftMs, setTimeLeftMs] = useState(TIME_LIMIT_MS)
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState(null) // { ok, text, transient? } | null
  const startRef = useRef(performance.now())
  const idCounterRef = useRef(0)
  const finishedRef = useRef(false) // tránh onFinish gọi 2 lần (timeout + confirm gần nhau)

  const totalWeight = useMemo(
    () => Math.round(chosen.reduce((sum, item) => sum + item.weight, 0) * 100) / 100,
    [chosen]
  )
  const maxScaleWeight = Math.max(targetWeight * 1.55, 1.0)
  const tolerance = targetWeight * SUCCESS_TOLERANCE_RATIO
  const diff = Math.round(Math.abs(totalWeight - targetWeight) * 100) / 100
  const withinTolerance = diff <= tolerance

  // ----- Đếm ngược thời gian, tính theo mốc thời gian thực (tránh trôi do
  // setInterval không chính xác tuyệt đối) -----
  useEffect(() => {
    const timer = setInterval(() => {
      if (finishedRef.current) return
      const elapsed = performance.now() - startRef.current
      const remain = Math.max(0, TIME_LIMIT_MS - elapsed)
      setTimeLeftMs(remain)
      if (remain <= 0) {
        finishWith(false, 'Het gio roi! Khach bo di mat...')
      }
    }, 100)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addWeight(w) {
    if (finished) return
    idCounterRef.current += 1
    setChosen((prev) => [...prev, { id: idCounterRef.current, weight: w }])
  }

  function removeItem(id) {
    if (finished) return
    setChosen((prev) => prev.filter((it) => it.id !== id))
  }

  function undoLast() {
    if (finished) return
    setChosen((prev) => prev.slice(0, -1))
  }

  function resetAll() {
    if (finished) return
    setChosen([])
  }

  function finishWith(ok, text) {
    if (finishedRef.current) return
    finishedRef.current = true
    setFinished(true)
    setResult({ ok, text })
    setTimeout(() => onFinish(ok, totalWeight), 1100)
  }

  function confirm() {
    if (finished) return
    if (!withinTolerance) {
      setResult({ ok: false, transient: true, text: `Lech qua 5%! Can dung ${targetWeight}kg (dang can ${totalWeight}kg)` })
      setTimeout(() => setResult((r) => (r && r.transient ? null : r)), 1400)
      return
    }
    finishWith(true, 'Can chuan qua! Ban duoc hang')
  }

  const angle = DIAL_MIN_ANGLE + (Math.min(totalWeight, maxScaleWeight) / maxScaleWeight) * (DIAL_MAX_ANGLE - DIAL_MIN_ANGLE)
  const targetAngle = DIAL_MIN_ANGLE + (Math.min(targetWeight, maxScaleWeight) / maxScaleWeight) * (DIAL_MAX_ANGLE - DIAL_MIN_ANGLE)
  const secondsLeft = Math.ceil(timeLeftMs / 1000)

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={styles.topRow}>
          <div>
            <div style={styles.orderLine}>Khach: {customerName}</div>
            <div style={styles.customerLine}>Khach yeu cau: {fruit.name} {targetWeight} kg</div>
          </div>
          <div style={styles.timer}>Con {secondsLeft} giay</div>
        </div>

        <div style={styles.sectionHeading}>Dang chon: {fruit.name}</div>

        <div style={styles.mainRow}>
          <div style={styles.scaleColumn}>
            <div style={styles.tray} />
            <div style={styles.standLegs} />
            <Dial angle={angle} targetAngle={targetAngle} withinTolerance={withinTolerance} />
            <div style={styles.base} />
          </div>

          <div style={styles.middleCol}>
            <div style={styles.optionsGrid}>
              {fruit.weightOptions.map((w) => (
                <button
                  key={w}
                  style={styles.optionBtn}
                  onClick={() => addWeight(w)}
                  disabled={finished}
                >
                  {w.toFixed(2)} kg
                </button>
              ))}
            </div>

            <div style={styles.readoutBox}>
              {chosen.length === 0 && (
                <div style={styles.emptyHint}>Chon can nang ben tren de them vao can...</div>
              )}
              {chosen.map((item) => (
                <div key={item.id} style={styles.chip}>
                  <img src={fruit.asset} alt="" style={styles.chipImg} />
                  <span>{item.weight.toFixed(2)} kg</span>
                  <button style={styles.chipRemove} onClick={() => removeItem(item.id)} disabled={finished}>x</button>
                </div>
              ))}
            </div>

            <div style={styles.statsBlock}>
              <div style={styles.statLine}>Da can: <b>{totalWeight.toFixed(2)} kg</b></div>
              <div style={{ ...styles.statLine, color: withinTolerance ? '#5fd15f' : '#e08a4a' }}>
                Lech {diff.toFixed(2)} kg
              </div>
            </div>
          </div>

          <div style={styles.fruitStrip}>
            {FRUIT_ORDER.map((id) => (
              <div
                key={id}
                style={{
                  ...styles.fruitStripItem,
                  ...(id === fruitId ? styles.fruitStripItemActive : {}),
                }}
                title={FRUITS[id].name}
              >
                <img src={FRUITS[id].asset} alt={FRUITS[id].name} style={styles.fruitStripImg} />
              </div>
            ))}
          </div>
        </div>

        <div style={styles.bottomRow}>
          <div style={styles.hint}>Chon can nang, bo dong sai neu can.</div>
          <div style={styles.actions}>
            {/* "Bo dong" trong ảnh mẫu hiển thị mờ/vô hiệu hóa - giữ đúng như
                vậy vì bản gốc Godot chưa gán hành động cụ thể cho nút này;
                không tự bịa logic khi chưa rõ ý nghĩa thật (tránh đoán sai
                hành vi gameplay). 3 nút còn lại giữ nguyên logic đã có. */}
            <button style={styles.btnDisabled} disabled title="Chua kha dung">Bo dong</button>
            <button style={styles.btnGhost} onClick={undoLast} disabled={finished}>Bo cuoi</button>
            <button style={styles.btnGhost} onClick={resetAll} disabled={finished}>Lam lai</button>
            <button style={styles.btnPrimary} onClick={confirm} disabled={finished}>Xac nhan</button>
          </div>
        </div>

        {result && (
          <div
            style={{
              ...styles.resultBanner,
              borderColor: result.ok ? '#5fd15f' : '#e05a3a',
              color: result.ok ? '#bdf5bd' : '#ffd4c2',
            }}
          >
            {result.text}
          </div>
        )}
      </div>
    </div>
  )
}

// Mặt đồng hồ kim vẽ bằng SVG. Kim vẽ NẰM NGANG ở góc 0deg mặc định rồi
// rotate bằng CSS transform (transform-origin = tâm đồng hồ) - cách này cho
// phép CSS transition mượt + nảy nhẹ (thay cho Tween TRANS_BACK của Godot)
// mà không cần tự viết vòng lặp animation trong JS. Kích thước tăng so với
// bản trước (176 -> 220) để khớp tỉ lệ "mặt cân to" trong ảnh tham khảo.
function Dial({ angle, targetAngle, withinTolerance }) {
  const size = 220
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 16
  const needleLen = radius - 26

  const ticks = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    const a = DIAL_MIN_ANGLE + t * (DIAL_MAX_ANGLE - DIAL_MIN_ANGLE)
    const rad = (a * Math.PI) / 180
    const long = i % 2 === 0
    const outerLen = radius
    const innerLen = radius - (long ? 16 : 9)
    ticks.push(
      <line
        key={i}
        x1={cx + Math.cos(rad) * innerLen}
        y1={cy + Math.sin(rad) * innerLen}
        x2={cx + Math.cos(rad) * outerLen}
        y2={cy + Math.sin(rad) * outerLen}
        stroke="#3a2a1a"
        strokeWidth={long ? 3 : 1.5}
      />
    )
  }

  const targetRad = (targetAngle * Math.PI) / 180
  const tMarkerA = { x: cx + Math.cos(targetRad) * (radius - 32), y: cy + Math.sin(targetRad) * (radius - 32) }
  const tMarkerB = { x: cx + Math.cos(targetRad) * (radius - 5), y: cy + Math.sin(targetRad) * (radius - 5) }

  return (
    <div style={styles.dialWrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius + 12} fill="#c9a15c" />
        <circle cx={cx} cy={cy} r={radius + 5} fill="#f4e6c4" />
        <circle cx={cx} cy={cy} r={radius - 9} fill="#efdcae" />
        {ticks}
        {/* Vạch xanh: mức cân nặng khách yêu cầu, cố định, không animate */}
        <line x1={tMarkerA.x} y1={tMarkerA.y} x2={tMarkerB.x} y2={tMarkerB.y} stroke="#237a2e" strokeWidth={5} strokeLinecap="round" />
        {/* Kim: vẽ tĩnh nằm ngang (angle=0), xoay bằng CSS transform */}
        <line
          x1={cx} y1={cy} x2={cx + needleLen} y2={cy}
          stroke={withinTolerance ? '#2e9e3f' : '#c9331c'}
          strokeWidth={5}
          strokeLinecap="round"
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'transform 300ms cubic-bezier(.34,1.56,.64,1), stroke 200ms',
          }}
        />
        <circle cx={cx} cy={cy} r={11} fill="#2e6b1f" />
        <circle cx={cx} cy={cy} r={6} fill="#e0b060" />
      </svg>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    background: 'rgba(0,0,0,0.45)',
  },
  box: {
    pointerEvents: 'auto',
    width: 'min(880px, 96%)', background: 'rgba(30,20,10,0.97)',
    border: '3px solid #e0b060', borderRadius: 14, padding: '18px 22px',
    color: '#fff', fontFamily: 'sans-serif', boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
    position: 'relative',
  },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderLine: { fontSize: 13, color: '#cbb08a' },
  customerLine: { fontSize: 15, fontWeight: 'bold', color: '#ffd479', marginTop: 2 },
  timer: { fontSize: 20, fontWeight: 'bold', color: '#ffb057', fontVariantNumeric: 'tabular-nums' },
  sectionHeading: { fontSize: 17, fontWeight: 'bold', color: '#fff', margin: '10px 0 14px' },
  mainRow: { display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' },

  scaleColumn: { flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  tray: {
    width: 190, height: 46, borderRadius: 6,
    background: 'linear-gradient(180deg,#3a90d0,#1f5f95)',
    border: '2px solid #e0b060',
    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.25)',
  },
  standLegs: {
    width: 190, height: 40, marginTop: -2,
    background: '#2c6b2c',
    clipPath: 'polygon(22% 0%, 78% 0%, 92% 100%, 8% 100%)',
  },
  dialWrap: { flex: '0 0 auto', marginTop: -4 },
  base: {
    width: 190, height: 26, marginTop: -6, borderRadius: 4,
    background: '#2c6b2c', border: '2px solid #e0b060',
  },
  middleCol: { flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 220 },
  optionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 },
  optionBtn: {
    background: '#241a10', color: '#fff', border: '1px solid #6a4a28',
    borderRadius: 8, padding: '10px 6px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
    textAlign: 'center',
  },

  readoutBox: {
    background: '#1c130b', border: '1px solid #6a4a28', borderRadius: 8,
    minHeight: 60, maxHeight: 100, overflowY: 'auto', padding: 8,
    display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start',
  },
  emptyHint: { color: '#a99', fontSize: 12, fontStyle: 'italic' },
  chip: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: '#2a1c10', border: '1px solid #6a4a28', borderRadius: 14,
    padding: '3px 6px 3px 4px', fontSize: 12, height: 24,
  },
  chipImg: { width: 16, height: 16, objectFit: 'contain' },
  chipRemove: {
    background: 'transparent', border: 'none', color: '#e08a6a',
    cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 2px',
  },
  statsBlock: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 },
  statLine: { fontSize: 15 },
  fruitStrip: {
    flex: '0 0 auto', display: 'flex', flexDirection: 'column',
    gap: 10, alignItems: 'center', paddingLeft: 6,
  },
  fruitStripItem: {
    width: 54, height: 54, borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: '2px solid transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: 0.5, transition: 'all 150ms',
  },
  fruitStripItemActive: {
    opacity: 1, border: '2px solid #e0b060',
    boxShadow: '0 0 10px rgba(224,176,96,0.6)', background: 'rgba(224,176,96,0.12)',
  },
  fruitStripImg: { width: 36, height: 36, objectFit: 'contain' },

  bottomRow: {
    marginTop: 14, display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 12, flexWrap: 'wrap',
  },
  hint: { fontSize: 12, color: '#cbb08a', fontStyle: 'italic' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btnDisabled: {
    background: 'transparent', color: '#6a6a6a', border: '1px solid #555',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'not-allowed', opacity: 0.6,
  },
  btnGhost: {
    background: 'transparent', color: '#e0b060', border: '1px solid #e0b060',
    borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13,
  },
  btnPrimary: {
    background: '#e0b060', color: '#2a1c10', border: '1px solid #e0b060',
    borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 'bold',
  },
  resultBanner: {
    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
    background: 'rgba(20,14,8,0.96)', border: '2px solid', borderRadius: 10,
    padding: '14px 20px', fontSize: 16, fontWeight: 'bold', textAlign: 'center',
    maxWidth: '80%', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  },
}
