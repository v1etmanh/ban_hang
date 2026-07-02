// Dữ liệu trái cây dùng chung giữa quầy hàng (GameCanvas BASKETS) và trò
// chơi cân hàng (WeighingScreen) - gom về 1 nơi để tên/màu/asset/đơn vị cân
// không bị lệch nhau giữa 2 chỗ dùng khác nhau trong code.
//
// weightOptions: các mức cân sẵn có để người chơi bấm chọn khi cân (mô phỏng
// việc "múc từng phần" lên cân, cộng dồn tới khi khớp yêu cầu của khách).
export const FRUITS = {
  man: {
    id: 'man',
    name: 'Mận',
    asset: '/man.png',
    color: '#911433',
    weightOptions: [0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.22],
  },
  oi: {
    id: 'oi',
    name: 'Ổi',
    asset: '/tomato.png',
    color: '#b8d44d',
    weightOptions: [0.14, 0.17, 0.20, 0.23, 0.26, 0.29, 0.32, 0.35],
  },
  xoai: {
    id: 'xoai',
    name: 'Xoài',
    asset: '/mango.png',
    color: '#f0a812',
    weightOptions: [0.22, 0.26, 0.30, 0.34, 0.38, 0.42, 0.46, 0.50],
  },
  khoai: {
    id: 'khoai',
    name: 'Khoai lang',
    asset: '/apple.png',
    color: '#b83642',
    weightOptions: [0.16, 0.19, 0.22, 0.25, 0.28, 0.31, 0.34, 0.37],
  },
}

export const FRUIT_ORDER = ['khoai', 'oi', 'man', 'xoai']

// Sai số tối đa cho phép giữa tổng cân thực tế và cân yêu cầu của khách,
// tính theo tỉ lệ % của số cân yêu cầu (giống bản Godot gốc: 5%).
export const SUCCESS_TOLERANCE_RATIO = 0.05
