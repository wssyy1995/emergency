// 药品定义
export const MEDICINES = [
  {
    id: 'antibiotic',
    name: '抗生素',
    icon: '💊',
    imagePath: 'images/antibiotic.png',
    color: '#FF6B6B'
  },
  {
    id: 'painkiller',
    name: '止痛药',
    icon: '💉',
    imagePath: 'images/painkiller.png',
    color: '#4ECDC4'
  },
  {
    id: 'adrenaline',
    name: '肾上腺素',
    icon: '💓',
    imagePath: 'images/adrenaline.png',
    color: '#FFE66D'
  },
  {
    id: 'injection',
    name: '注射液',
    icon: '🧪',
    imagePath: 'images/injection.png',
    color: '#95E1D3'
  }
]

// 工具定义
export const TOOLS = [
  {
    id: 'aed',
    name: 'AED',
    icon: '⚡',
    imagePath: 'images/aed.png',
    color: '#F38181'
  },
  {
    id: 'tape',
    name: '医用绷带',
    icon: '🩹',
    imagePath: 'images/tape.png',
    color: '#AA96DA'
  },
  {
    id: 'scissors',
    name: '手术剪',
    icon: '✂️',
    imagePath: 'images/scissors.png',
    color: '#FCBAD3'
  },
  {
    id: 'thermometer',
    name: '体温计',
    icon: '🌡️',
    imagePath: 'images/thermometer.png',
    color: '#FFFFD2'
  }
]

// 检验设备定义
export const EXAM_DEVICES = [
  {
    id: 'xray',
    name: 'X光机',
    icon: '☢️',
    imagePath: 'images/xray.png',
    color: '#4A90E2'
  },
  {
    id: 'ct',
    name: 'CT',
    icon: '🏥',
    imagePath: 'images/ct.png',
    color: '#7B68EE'
  },
  {
    id: 'blood_test',
    name: '血常规',
    icon: '🩸',
    imagePath: 'images/blood_test.png',
    color: '#E74C3C'
  },
  {
    id: 'ecg',
    name: '心电图',
    icon: '💓',
    imagePath: 'images/ecg.png',
    color: '#2ECC71'
  },
  {
    id: 'eeg',
    name: '脑电图',
    icon: '🧠',
    imagePath: 'images/eeg.png',
    color: '#9B59B6'
  }
]

// 图片缓存
const imageCache = {}

// 预加载所有物品图片
export function preloadItemImages(callback) {
  const allItems = [...MEDICINES, ...TOOLS, ...EXAM_DEVICES]
  let loadedCount = 0
  const totalCount = allItems.length

  allItems.forEach(item => {
    const img = wx.createImage()
    img.onload = () => {
      imageCache[item.id] = img
      loadedCount++
      if (loadedCount >= totalCount && callback) {
        callback()
      }
    }
    img.onerror = () => {
      // 加载失败，使用emoji作为回退
      console.warn(`Failed to load image: ${item.imagePath}`)
      loadedCount++
      if (loadedCount >= totalCount && callback) {
        callback()
      }
    }
    img.src = item.imagePath
  })
}

// 获取图片
export function getItemImage(itemId) {
  return imageCache[itemId] || null
}

// 检查图片是否已加载
export function isImageLoaded(itemId) {
  return !!imageCache[itemId]
}

// 获取随机药品
export function getRandomMedicine() {
  return MEDICINES[Math.floor(Math.random() * MEDICINES.length)]
}

// 获取随机工具
export function getRandomTool() {
  return TOOLS[Math.floor(Math.random() * TOOLS.length)]
}

// 获取随机物品（药品或工具）
export function getRandomItem() {
  return Math.random() > 0.5 ? getRandomMedicine() : getRandomTool()
}

// 根据ID获取物品
export function getItemById(id) {
  const allItems = [...MEDICINES, ...TOOLS, ...EXAM_DEVICES]
  return allItems.find(item => item.id === id)
}

// 判断是否是药品
export function isMedicine(id) {
  return MEDICINES.some(m => m.id === id)
}

// 判断是否是工具
export function isTool(id) {
  return TOOLS.some(t => t.id === id)
}

// 判断是否是检验设备
export function isExamDevice(id) {
  return EXAM_DEVICES.some(d => d.id === id)
}

