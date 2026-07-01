import React from 'react'
import GameCanvas from './components/GameCanvas.jsx'

export default function App() {
  return (
    <div className="app-wrap">
      <h1>Chợ Quê - Bán Hàng</h1>
      <GameCanvas />
      <p className="hint">
        Người qua lại tự đi dạo trái/phải. Thỉnh thoảng 1 người sẽ ghé vào sạp,
        trả lời đúng các câu hội thoại để bán được hàng!
      </p>
    </div>
  )
}
