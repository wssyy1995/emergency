// 游戏配置文件 - 修改这里的数值可以调整游戏难度和玩法

// 本地缓存键名
const STORAGE_KEY = 'emergency_game_data'

// 从本地缓存读取新玩家状态（如果没有则返回默认值）
export function getNewPlayerStatus() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY)
    if (data && data.is_new_player !== undefined) {
      console.log('[本地缓存] 读取新玩家状态:', data.is_new_player)
      return data.is_new_player
    }
  } catch (e) {
    console.warn('[本地缓存] 读取失败:', e)
  }
  // 默认值为 true（新玩家）
  return true
}

// 保存新玩家状态到本地缓存
export function saveNewPlayerStatus(isNewPlayer) {
  try {
    const data = wx.getStorageSync(STORAGE_KEY) || {}
    data.is_new_player = isNewPlayer
    wx.setStorageSync(STORAGE_KEY, data)
    console.log('[本地缓存] 保存新玩家状态:', isNewPlayer)
  } catch (e) {
    console.warn('[本地缓存] 保存失败:', e)
  }
}

// 从本地缓存读取关卡提示状态（第2关及以后）
export function getLevelHintStatus(levelIndex) {
  try {
    const data = wx.getStorageSync(STORAGE_KEY)
    if (data && data.levelHints && data.levelHints[levelIndex] !== undefined) {
      return data.levelHints[levelIndex]
    }
  } catch (e) {
    console.warn('[本地缓存] 读取关卡提示失败:', e)
  }
  // 默认返回 false（未点击过，需要显示）
  return false
}

// 保存关卡提示状态到本地缓存
export function saveLevelHintStatus(levelIndex, hasClicked) {
  try {
    const data = wx.getStorageSync(STORAGE_KEY) || {}
    if (!data.levelHints) {
      data.levelHints = {}
    }
    data.levelHints[levelIndex] = hasClicked
    wx.setStorageSync(STORAGE_KEY, data)
    console.log(`[本地缓存] 保存第${levelIndex + 1}关提示状态:`, hasClicked)
  } catch (e) {
    console.warn('[本地缓存] 保存关卡提示失败:', e)
  }
}

export const GameConfig = {
  // ==================== 新玩家指引配置 ====================
  // 注意：is_new_player 会优先从本地缓存读取，没有缓存时才使用此默认值
  is_new_player: true,  // 是否为新玩家（true: 显示新人指引，false: 正常流程）
  
  // ==================== 关卡配置 ====================
  levels: [
    { 
      id: 1,                    // 第1关
      hasCountdown: false,      // 是否开启倒计时（false=无倒计时，true=有倒计时）
      timeLimit: 60,            // 倒计时（秒，仅当hasCountdown为true时生效）
      cureTarget: 5,            // 治愈人数目标
      doctorItemCount: 1,       // 医生请求物品数量
      patients: [1, 2, 3, 14, 15, 16]  // 本关出现的病人ID列表：病人6， 疾病123
    },
    { 
      id: 2,                    // 第2关
      hasCountdown: false,      // 是否开启倒计时
      timeLimit: 60,            // 倒计时（秒）
      cureTarget: 6,            // 治愈人数目标
      doctorItemCount: 2,       // 医生请求物品数量
      patients: [4,16,15,17,18,2,1,5]  // 本关出现的病人ID列表： 病人8，疾病 123+45
    },
    { 
      id: 3,                    // 第3关
      hasCountdown: false,      // 是否开启倒计时
      timeLimit: 60,            // 倒计时（秒）
      cureTarget: 8,            // 治愈人数目标
      doctorItemCount: {         // 医生请求物品数量配置
        min: 2,                  // 最少2个
        max: 3,                  // 最多3个
        probability: 0.3         // 50%概率请求max个，否则请求min个
      },
      patients: [6,18,17,16,15,5,4,3,2,19]  // 本关出现的病人ID列表： 病人10，疾病 2345+6
    },{ 
      id: 4,                    // 第4关
      hasCountdown: false,      // 是否开启倒计时
      timeLimit: 60,            // 倒计时（秒）
      cureTarget: 10,           // 治愈人数目标
      doctorItemCount: {         // 医生请求物品数量配置
        min: 2,                  // 最少2个
        max: 3,                  // 最多3个
        probability: 0.35         // 50%概率请求max个，否则请求min个
      },
      patients: [2,7,6,18,17,16,5,4,3,19,20,15]  // 本关出现的病人ID列表： 病人12，疾病 23456+7
    },{ 
      id: 5,                    // 第5关
      hasCountdown: false,      // 是否开启倒计时
      timeLimit: 90,            // 倒计时（秒）
      cureTarget: 10,           // 治愈人数目标
      doctorItemCount: {         // 医生请求物品数量配置
        min: 2,                  // 最少2个
        max: 3,                  // 最多3个
        probability: 0.4         // 50%概率请求max个，否则请求min个
      },
      patients: [8,7,6,18,17,16,5,4,3,19,20,21]  // 本关出现的病人ID列表： 病人12，疾病 34567+8
    },{ 
      id: 6,                    // 第6关
      hasCountdown: false,      // 是否开启倒计时
      timeLimit: 90,            // 倒计时（秒）
      cureTarget: 10,           // 治愈人数目标
      doctorItemCount: {         // 医生请求物品数量配置
        min: 2,                  // 最少2个
        max: 3,                  // 最多3个
        probability: 0.4         // 50%概率请求max个，否则请求min个
      },
      patients: [9,8,7,6,18,17,16,5,4,19,20,21,22]  // 本关出现的病人ID列表： 病人13，疾病 45678+9
    },{ 
      id: 7,                    // 第7关
      hasCountdown: false,      // 是否开启倒计时
      timeLimit: 100,           // 倒计时（秒）
      cureTarget: 12,           // 治愈人数目标
      doctorItemCount: {         // 医生请求物品数量配置
        min: 2,                  // 最少2个
        max: 3,                  // 最多3个
        probability: 0.5         // 50%概率请求max个，否则请求min个
      },
      patients: [10,9,8,7,6,18,17,16,5,19,20,21,22,23]  // 本关出现的病人ID列表： 病人14，疾病 56789+10
    },{ 
      id: 8,                    // 第8关
      hasCountdown: false,      // 是否开启倒计时
      timeLimit: 100,           // 倒计时（秒）
      cureTarget: 14,           // 治愈人数目标
      doctorItemCount: {         // 医生请求物品数量配置
        min: 2,                  // 最少2个
        max: 3,                  // 最多3个
        probability: 0.6         // 50%概率请求max个，否则请求min个
      },
      patients: [11,10,9,8,7,6,18,17,16,19,20,21,22,23,24]  // 本关出现的病人ID列表： 病人15，疾病 678910+11
    },{ 
      id: 9,                    // 第9关
      hasCountdown: false,      // 是否开启倒计时
      timeLimit: 120,           // 倒计时（秒）
      cureTarget: 14,           // 治愈人数目标
      doctorItemCount: {         // 医生请求物品数量配置
        min: 2,                  // 最少2个
        max: 3,                  // 最多3个
        probability: 0.7         // 50%概率请求max个，否则请求min个
      },
      patients: [12,11,10,9,7,6,18,17,16,19,20,21,22,23,24,25]  // 本关出现的病人ID列表： 病人16，疾病 891011+12
    },{ 
      id: 10,                    // 第10关
      hasCountdown: false,      // 是否开启倒计时
      timeLimit: 120,           // 倒计时（秒）
      cureTarget: 15,           // 治愈人数目标
      doctorItemCount: {         // 医生请求物品数量配置
        min: 2,                  // 最少2个
        max: 3,                  // 最多3个
        probability: 0.9         // 50%概率请求max个，否则请求min个
      },
      patients:[13,18,17,16,19,12,11,10,9,7,20,21,22,24,25,26] // 本关出现的病人ID列表： 病人16，疾病 9101112+13
    }
  ],

  // ==================== 病情配置 ====================
  // 每种病情对应的耐心值（秒）、急救治疗时间（毫秒）、自动治疗时间（毫秒）和所需物品
  // diseases_priority: 1=紧急, 2=普通, 3=轻微
  diseases: [
    { disease_id: 1, disease_name: '发烧', diseases_priority: 2, patience: 20, emerge_treat_time: 3000, auto_treat_time: 9000, treat_need: ['thermometer', 'antibiotic'], unlock_level: 1 },
    { disease_id: 2, disease_name: '外伤出血', diseases_priority: 2, patience: 30, emerge_treat_time: 2000, auto_treat_time: 6000, treat_need: ['painkiller', 'thermometer'], unlock_level: 1 },
    { disease_id: 3, disease_name: '开放性骨折', diseases_priority: 1, patience: 15, emerge_treat_time: 5000, auto_treat_time: 10000, treat_need: ['scissors', 'tape', 'painkiller'], unlock_level: 1 },
    { disease_id: 4, disease_name: '感冒', diseases_priority: 3, patience: 20, emerge_treat_time: 2000, auto_treat_time: 6000, treat_need: ['thermometer', 'antibiotic', 'injection'], unlock_level: 2 },
    { disease_id: 5, disease_name: '严重过敏', diseases_priority: 1, patience: 15, emerge_treat_time: 3000, auto_treat_time: 10000, treat_need: ['adrenaline', 'injection'], unlock_level: 2 },
    { disease_id: 6, disease_name: '肠胃炎', diseases_priority: 3, patience: 25, emerge_treat_time: 3000, auto_treat_time: 6000, treat_need: ['thermometer', 'injection'], unlock_level: 3 },
    { disease_id: 7, disease_name: '异物卡喉', diseases_priority: 1, patience: 15, emerge_treat_time: 4000, auto_treat_time: 8000, treat_need: ['aed', 'adrenaline'], unlock_level: 4 },
    { disease_id: 8, disease_name: '牙痛', diseases_priority: 3, patience: 30, emerge_treat_time: 2000, auto_treat_time: 6000, treat_need: ['tape', 'painkiller'], unlock_level: 5 },
    { disease_id: 9, disease_name: '急性阑尾炎', diseases_priority: 1, patience: 15, emerge_treat_time: 2000, auto_treat_time: 6000, treat_need: ['tape', 'painkiller'], unlock_level: 6 },
    { disease_id: 10, disease_name: '大面积烧伤', diseases_priority: 1, patience: 15, emerge_treat_time: 2000, auto_treat_time: 6000, treat_need: ['tape', 'painkiller'], unlock_level: 7 },
    { disease_id: 11, disease_name: '眩晕（耳石症）', diseases_priority: 3, patience: 20, emerge_treat_time: 2000, auto_treat_time: 6000, treat_need: ['tape', 'painkiller'], unlock_level: 8 },
    { disease_id: 12, disease_name: '心悸', diseases_priority: 2, patience: 20, emerge_treat_time: 2000, auto_treat_time: 6000, treat_need: ['tape', 'painkiller'], unlock_level: 9 },
    { disease_id: 13, disease_name: '中毒呕吐', diseases_priority: 1, patience: 15, emerge_treat_time: 4000, auto_treat_time: 9000, treat_need: ['tape', 'painkiller'], unlock_level: 10 }
  ],

  // ==================== 病人配置 ====================
  patient: {
    spawnFirstCount: 4,         // 前N个病人进场固定间隔
    spawnFirstInterval: 3500,   // 前N个病人进场的间隔（毫秒）
    spawnRandomMin: 2000,       // 随机间隔最小值（毫秒）
    spawnRandomMax: 5000       // 随机间隔最大值（毫秒）
  },

  // ==================== 托盘配置 ====================
  tray: {
    maxItems: 4,                // 托盘最大容量
    buttonGap: 12               // 重置和发送按钮间距（像素）
  },

  // ==================== 医生配置 ====================
  doctor: {
    // 医生配置保留用于将来扩展
  },

  // ==================== 游戏区域配置 ====================
  areas: {
    waitingWidth: 0.35,         // 等候区宽度占比
    bedWidth: 0.35,             // 治疗区宽度占比
    equipmentWidth: 0.30        // 器材室宽度占比
  },

  // ==================== 病人详细配置 ====================
  // 每个病人的独立配置，用于外观、身份和固定疾病
  patientDetails: [
    { id: 1, name: '1号', rageLevel: 1, disease_id: 1 },   // 发烧
    { id: 2, name: '2号', rageLevel: 1, disease_id: 2 },   // 外伤出血
    { id: 3, name: '3号', rageLevel: 1, disease_id: 3 },   // 骨折
    { id: 4, name: '4号', rageLevel: 1, disease_id: 4 },   // 感冒
    { id: 5, name: '5号', rageLevel: 1, disease_id: 5 },   // 严重过敏
    { id: 6, name: '6号', rageLevel: 1, disease_id: 6 },   // 肠胃炎
    { id: 7, name: '7号', rageLevel: 1, disease_id: 7 },   // 异物卡喉
    { id: 8, name: '8号', rageLevel: 4, disease_id: 8 },   // 牙痛
    { id: 9, name: '9号', rageLevel: 1, disease_id: 9 },   // 急性阑尾炎
    { id: 10, name: '10号', rageLevel: 1, disease_id: 10 }, // 大面积烧伤
    { id: 11, name: '11号', rageLevel: 4, disease_id: 11 }, // 眩晕（耳石症）
    { id: 12, name: '12号', rageLevel: 3, disease_id: 12 }, // 心悸
    { id: 13, name: '13号', rageLevel: 2, disease_id: 13 }, // 中毒呕吐
    { id: 14, name: '14号', rageLevel: 1, disease_id: 1 },   // 发烧
    { id: 15, name: '15号', rageLevel: 1, disease_id: 2 },   // 外伤出血
    { id: 16, name: '16号', rageLevel: 1, disease_id: 3 },   // 骨折
    { id: 17, name: '17号', rageLevel: 1, disease_id: 4 },   // 感冒
    { id: 18, name: '18号', rageLevel: 1, disease_id: 5 },   // 严重过敏
    { id: 19, name: '19号', rageLevel: 1, disease_id: 6 },   // 肠胃炎
    { id: 20, name: '20号', rageLevel: 1, disease_id: 7 },   // 异物卡喉
    { id: 21, name: '21号', rageLevel: 4, disease_id: 8 },   // 牙痛
    { id: 22, name: '22号', rageLevel: 1, disease_id: 9 },   // 急性阑尾炎
    { id: 23, name: '23号', rageLevel: 1, disease_id: 10 },  // 大面积烧伤
    { id: 24, name: '24号', rageLevel: 4, disease_id: 11 },  // 眩晕（耳石症）
    { id: 25, name: '25号', rageLevel: 3, disease_id: 12 },  // 心悸
    { id: 26, name: '26号', rageLevel: 2, disease_id: 13 },  // 中毒呕吐
  ],

  // ==================== 暴走配置 ====================
  rage: {
    baseProbability: 0,       // 暴怒值1的基础概率 10%
    probabilityPerLevel: 0,   // 每提升1级暴怒值，概率增加10%
    walkSpeed: 0.14             // 暴走病人移动速度（每毫秒）
  },

  // ==================== 药品清单 ====================
  medicines: [
    {
      id: 'antibiotic',
      name: '抗生素',
      icon: '💊',
      imagePath: 'images/antibiotic.png',
      color: '#FF6B6B',
      price: 50,
      unlockLevel: 1
    },
    {
      id: 'painkiller',
      name: '止痛药',
      icon: '💉',
      imagePath: 'images/painkiller.png',
      color: '#4ECDC4',
      price: 30,
      unlockLevel: 1
    },
    {
      id: 'adrenaline',
      name: '肾上腺素',
      icon: '💓',
      imagePath: 'images/adrenaline.png',
      color: '#FFE66D',
      price: 100,
      unlockLevel: 2
    },
    {
      id: 'injection',
      name: '注射液',
      icon: '🧪',
      imagePath: 'images/injection.png',
      color: '#95E1D3',
      price: 20,
      unlockLevel: 1
    }
  ],

  // ==================== 器械清单 ====================
  tools: [
    {
      id: 'aed',
      name: 'AED',
      icon: '⚡',
      imagePath: 'images/aed.png',
      color: '#F38181',
      price: 200,
      unlockLevel: 2,
      durability: 10
    },
    {
      id: 'tape',
      name: '医用绷带',
      icon: '🩹',
      imagePath: 'images/tape.png',
      color: '#AA96DA',
      price: 15,
      unlockLevel: 1,
      durability: 20
    },
    {
      id: 'scissors',
      name: '手术剪',
      icon: '✂️',
      imagePath: 'images/scissors.png',
      color: '#FCBAD3',
      price: 80,
      unlockLevel: 2,
      durability: 50
    },
    {
      id: 'thermometer',
      name: '体温计',
      icon: '🌡️',
      imagePath: 'images/thermometer.png',
      color: '#FFFFD2',
      price: 25,
      unlockLevel: 1,
      durability: 100
    }
  ]
}

// 获取指定关卡配置
export function getLevelConfig(levelIndex) {
  return GameConfig.levels[levelIndex] || GameConfig.levels[GameConfig.levels.length - 1]
}

// 获取医生应该请求的物品数量
export function getDoctorItemCount(levelIndex) {
  const level = getLevelConfig(levelIndex)
  const itemConfig = level.doctorItemCount
  
  // 如果是数字，直接返回
  if (typeof itemConfig === 'number') {
    return itemConfig
  }
  
  // 如果是对象，根据概率返回
  if (typeof itemConfig === 'object') {
    return Math.random() < itemConfig.probability ? itemConfig.max : itemConfig.min
  }
  
  return 1 // 默认1个
}

// 获取病人详细配置
export function getPatientDetail(patientId) {
  const patient = GameConfig.patientDetails.find(p => p.id === patientId)
  return patient || GameConfig.patientDetails[0] // 默认返回第一个
}

// 获取随机病人配置
export function getRandomPatientDetail() {
  const index = Math.floor(Math.random() * GameConfig.patientDetails.length)
  return GameConfig.patientDetails[index]
}

// 获取随机病情配置
export function getRandomDisease() {
  const diseases = GameConfig.diseases
  const index = Math.floor(Math.random() * diseases.length)
  return diseases[index]
}

// 计算病人暴走概率（根据暴怒值）
// rageLevel: 1-5，返回概率如 0.1, 0.2, ..., 0.5
export function getRageProbability(rageLevel) {
  const rageConfig = GameConfig.rage
  // 概率 = 基础概率 + (暴怒值 - 1) * 每级概率
  // rageLevel=1: 10%, rageLevel=5: 50%
  return rageConfig.baseProbability + (rageLevel - 1) * rageConfig.probabilityPerLevel
}

// 检查病人是否会暴走
export function checkPatientRage(patientDetail) {
  const probability = getRageProbability(patientDetail.rageLevel)
  return Math.random() < probability
}

// 根据疾病名称获取急救治疗时间（毫秒）- 医生治疗病床使用
export function getTreatTimeByDisease(diseaseName) {
  const disease = GameConfig.diseases.find(d => d.disease_name === diseaseName)
  return disease ? disease.emerge_treat_time : 3000 // 默认3秒
}

// 根据疾病名称获取自动治疗时间（毫秒）
export function getAutoTreatTimeByDisease(diseaseName) {
  const disease = GameConfig.diseases.find(d => d.disease_name === diseaseName)
  return disease ? disease.auto_treat_time : 6000 // 默认6秒
}

// 根据疾病名称获取所需治疗物品列表
export function getTreatNeedByDisease(diseaseName) {
  const disease = GameConfig.diseases.find(d => d.disease_name === diseaseName)
  return disease ? disease.treat_need : [] // 默认空数组
}

// 根据疾病ID获取疾病配置
export function getDiseaseById(diseaseId) {
  return GameConfig.diseases.find(d => d.disease_id === diseaseId) || GameConfig.diseases[0]
}

// ==================== 药品/器械配置获取函数 ====================

// 获取药品配置
export function getMedicineConfig(medicineId) {
  return GameConfig.medicines.find(m => m.id === medicineId) || null
}

// 获取器械配置
export function getToolConfig(toolId) {
  return GameConfig.tools.find(t => t.id === toolId) || null
}

// 获取所有药品
export function getAllMedicines() {
  return GameConfig.medicines
}

// 获取所有器械
export function getAllTools() {
  return GameConfig.tools
}

// 根据关卡获取已解锁的药品
export function getUnlockedMedicines(level) {
  return GameConfig.medicines.filter(m => m.unlockLevel <= level)
}

// 根据关卡获取已解锁的器械
export function getUnlockedTools(level) {
  return GameConfig.tools.filter(t => t.unlockLevel <= level)
}

// 获取随机药品（根据关卡）
export function getRandomMedicineByLevel(level) {
  const unlocked = getUnlockedMedicines(level)
  return unlocked[Math.floor(Math.random() * unlocked.length)]
}

// 获取随机器械（根据关卡）
export function getRandomToolByLevel(level) {
  const unlocked = getUnlockedTools(level)
  return unlocked[Math.floor(Math.random() * unlocked.length)]
}

// ==================== 升级系统配置 ====================

// 本地存储键名
const UPGRADE_STORAGE_KEY = 'emergency_game_upgrades'

// 升级配置
export const UpgradeConfig = {
  // 护士升级选项
  nurses: [
    {
      id: 'nurse_default',
      name: '实习护士',
      imagePath: 'images/nurse.png',
      skill: '基础安抚，暂停耐心减少5秒',
      cost: 0,
      isDefault: true
    },
    {
      id: 'nurse_pro',
      name: '专业护士',
      imagePath: 'images/nurse_pro.png',
      skill: '安抚效果+50%，暂停耐心减少7.5秒',
      cost: 100
    },
    {
      id: 'nurse_expert',
      name: '专家护士',
      imagePath: 'images/nurse_pro.png', // 暂时使用相同图片
      skill: '安抚效果+100%，暂停耐心减少10秒',
      cost: 250
    }
  ],
  
  // 医生升级选项
  doctors: [
    {
      id: 'doctor_default',
      name: '实习医生',
      imagePath: 'images/doctor_1_idle.png',
      skill: '基础治疗速度',
      cost: 0,
      isDefault: true
    },
    {
      id: 'doctor_pro',
      name: '主治医生',
      imagePath: 'images/nurse_pro.png', // 暂时使用护士图片
      skill: '治疗速度+20%，更快治愈病人',
      cost: 150
    },
    {
      id: 'doctor_expert',
      name: '主任医师',
      imagePath: 'images/nurse_pro.png', // 暂时使用护士图片
      skill: '治疗速度+40%，物品需求减少1个',
      cost: 300
    }
  ],
  
  // 输液椅升级选项
  ivSeats: [
    {
      id: 'ivseat_default',
      name: '普通输液椅',
      imagePath: 'images/seat_free.png',
      skill: '基础治疗速度',
      cost: 0,
      isDefault: true
    },
    {
      id: 'ivseat_pro',
      name: '舒适输液椅',
      imagePath: 'images/seat_pro.png',
      skill: '治疗速度+15%，病人更不容易暴走',
      cost: 120
    },
    {
      id: 'ivseat_expert',
      name: '豪华输液椅',
      imagePath: 'images/seat_pro.png', // 暂时使用相同图片
      skill: '治疗速度+30%，耐心消耗减半',
      cost: 280
    }
  ]
}

// 从本地存储读取已选择的升级
export function getSelectedUpgrades() {
  try {
    const data = wx.getStorageSync(UPGRADE_STORAGE_KEY)
    if (data && data.upgrades) {
      return data.upgrades
    }
  } catch (e) {
    console.warn('[本地缓存] 读取升级状态失败:', e)
  }
  // 默认返回初始升级
  return {
    nurse: 'nurse_default',
    doctor: 'doctor_default',
    ivSeat: 'ivseat_default'
  }
}

// 保存升级选择到本地缓存
export function saveSelectedUpgrade(type, upgradeId) {
  try {
    const current = getSelectedUpgrades()
    current[type] = upgradeId
    wx.setStorageSync(UPGRADE_STORAGE_KEY, { upgrades: current })
    console.log(`[本地缓存] 保存升级: ${type} = ${upgradeId}`)
    return true
  } catch (e) {
    console.warn('[本地缓存] 保存升级失败:', e)
    return false
  }
}

// 获取指定类型的所有升级选项
export function getUpgradesByType(type) {
  return UpgradeConfig[type] || []
}

// 获取当前选中的升级配置
export function getCurrentUpgrade(type) {
  const selectedId = getSelectedUpgrades()[type]
  const upgrades = getUpgradesByType(type)
  return upgrades.find(u => u.id === selectedId) || upgrades[0]
}
