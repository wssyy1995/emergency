// 药品定义
export const MEDICINES = [
  {
    id: 'antibiotic',
    name: '抗生素',
    icon: '💊',
    imagePath: 'images/antibiotic.png',
    imageName: 'antibiotic.png',
    color: '#FF6B6B'
  },
  {
    id: 'painkiller',
    name: '止痛药',
    icon: '💉',
    imagePath: 'images/painkiller.png',
    imageName: 'painkiller.png',
    color: '#4ECDC4'
  },
  {
    id: 'adrenaline',
    name: '肾上腺素',
    icon: '💓',
    imagePath: 'images/adrenaline.png',
    imageName: 'adrenaline.png',
    color: '#FFE66D'
  },
  {
    id: 'injection',
    name: '注射液',
    icon: '🧪',
    imagePath: 'images/injection.png',
    imageName: 'injection.png',
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
    imageName: 'aed.png',
    color: '#F38181'
  },
  {
    id: 'tape',
    name: '医用绷带',
    icon: '🩹',
    imagePath: 'images/tape.png',
    imageName: 'tape.png',
    color: '#AA96DA'
  },
  {
    id: 'scissors',
    name: '手术剪',
    icon: '✂️',
    imagePath: 'images/scissors.png',
    imageName: 'scissors.png',
    color: '#FCBAD3'
  },
  {
    id: 'thermometer',
    name: '体温计',
    icon: '🌡️',
    imagePath: 'images/thermometer.png',
    imageName: 'thermometer.png',
    color: '#FFFFD2'
  }
]

// 图片缓存
const imageCache = {}

// 额外的机器设备图片（由 Game.js 在初始化时设置）
let extraMachines = []

// 云存储图片管理器（动态导入）
let cloudImageManager = null

// 是否使用云存储
let useCloudStorage = false

// 设置是否使用云存储
export function setUseCloudStorage(enabled) {
  useCloudStorage = enabled
  console.log('[Items] 云存储模式:', enabled ? '开启' : '关闭')
}

// 设置云存储管理器
export function setCloudImageManager(manager) {
  cloudImageManager = manager
}

// 设置额外的机器设备（用于预加载）
export function setExtraMachines(machines) {
  extraMachines = machines || []
}

// 获取图片路径（支持本地和云存储）
function getImagePath(imageName) {
  if (useCloudStorage && cloudImageManager) {
    return cloudImageManager.getImagePath(imageName)
  }
  return 'images/' + imageName
}

// 预加载所有物品图片
export async function preloadItemImages(callback) {
  const allItems = [...MEDICINES, ...TOOLS, ...extraMachines]
  let loadedCount = 0
  const totalCount = allItems.length

  // 如果使用云存储，使用 CloudImageManager 加载
  if (useCloudStorage && cloudImageManager) {
    // 加载所有物品（包括只有 imagePath 的）
    for (const item of allItems) {
      // 从 imageName 或 imagePath 中提取文件名
      const fileName = item.imageName || (item.imagePath && item.imagePath.split('/').pop())
      if (!fileName) continue
      
      try {
        // 先尝试云存储
        const img = await cloudImageManager.loadImage(fileName)
        imageCache[item.id] = img
      } catch (e) {
        // 云存储未配置或失败，回退到本地
        console.log('[Items] 云存储未配置，回退本地:', item.imagePath)
        await new Promise((resolve) => {
          const img = wx.createImage()
          img.onload = () => {
            imageCache[item.id] = img
            resolve()
          }
          img.onerror = () => resolve()
          img.src = item.imagePath
        })
      }
    }
    
    if (callback) callback()
    return
  }

  // 本地加载方式
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

// 异步加载单个物品图片（支持云存储）
export async function loadItemImageAsync(itemId) {
  // 检查缓存
  if (imageCache[itemId]) {
    return imageCache[itemId]
  }
  
  const item = getItemById(itemId)
  if (!item) return null
  
  // 使用云存储加载
  // 从 imageName 或 imagePath 中提取文件名
  const fileName = item.imageName || (item.imagePath && item.imagePath.split('/').pop())
  if (useCloudStorage && cloudImageManager && fileName) {
    try {
      const img = await cloudImageManager.loadImage(fileName)
      imageCache[itemId] = img
      return img
    } catch (e) {
      console.warn('[Items] 云存储加载失败，回退到本地:', itemId, fileName)
    }
  }
  
  // 本地加载
  return new Promise((resolve, reject) => {
    const img = wx.createImage()
    img.onload = () => {
      imageCache[itemId] = img
      resolve(img)
    }
    img.onerror = reject
    img.src = item.imagePath
  })
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
  const allItems = [...MEDICINES, ...TOOLS]
  const item = allItems.find(item => item.id === id)
  if (item) return item
  
  // 搜索 GameConfig.machine 中的设备（检验设备）
  // 使用动态导入避免循环依赖
  try {
    const GameConfig = require('./GameConfig.js').GameConfig
    if (GameConfig && GameConfig.machine) {
      return GameConfig.machine.find(m => m.id === id)
    }
  } catch (e) {
    // 如果导入失败，返回 null
  }
  return null
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
  // 检验设备定义在 GameConfig.machine 中
  try {
    const GameConfig = require('./GameConfig.js').GameConfig
    if (GameConfig && GameConfig.machine) {
      return GameConfig.machine.some(m => m.id === id)
    }
  } catch (e) {
    return false
  }
  return false
}
