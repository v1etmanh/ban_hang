import React, { useState } from 'react'
import { DIALOG_TREE, DIALOG_ROOT_ID } from '../game/dialogTree.js'

// Hộp thoại hỏi-đáp dạng cây. Khi chạm tới node lá -> gọi onFinish(success).
export default function DialogBox({ customerName, onFinish }) {
  const [nodeId, setNodeId] = useState(DIALOG_ROOT_ID)
  const node = DIALOG_TREE[nodeId]

  function choose(option) {
    if (option.next) setNodeId(option.next)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={styles.name}>{customerName}</div>
        <div style={styles.text}>{node.text}</div>

        {node.leaf ? (
          <button style={styles.btn} onClick={() => onFinish(node.success)}>
            {node.success ? 'Tuyệt vời!' : 'Thôi vậy...'}
          </button>
        ) : (
          <div style={styles.options}>
            {node.options.map((opt, i) => (
              <button key={i} style={styles.btn} onClick={() => choose(opt)}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    display: 'flex', justifyContent: 'center', padding: 20,
    pointerEvents: 'none',
  },
  box: {
    pointerEvents: 'auto',
    width: 'min(560px, 90vw)', background: 'rgba(30,20,10,0.92)',
    border: '3px solid #e0b060', borderRadius: 12, padding: '16px 20px',
    color: '#fff', fontFamily: 'sans-serif', boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
  },
  name: { fontWeight: 'bold', color: '#ffd479', marginBottom: 6, fontSize: 15 },
  text: { fontSize: 16, marginBottom: 14, lineHeight: 1.4 },
  options: { display: 'flex', flexDirection: 'column', gap: 8 },
  btn: {
    background: '#3a2a1a', color: '#fff', border: '1px solid #e0b060',
    borderRadius: 8, padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
    fontSize: 14,
  },
}
