// 游戏配置文件 - 修改这里的数值可以调整游戏难度和玩法

export const GameConfig = {
  // ==================== 关卡配置 ====================
  levels: [
    { 
      id: 1,                    // 第1关
      maxPatients: 10,          // 总病人数
      timeLimit: 400,            // 倒计时（秒）
      cureTarget: 5,            // 治愈人数目标
      doctorItemCount: 1        // 医生请求物品数量
    },
    { 
      id: 2,                    // 第2关
      maxPatients: 12,          // 总病人数
      timeLimit: 90,            // 倒计时（秒）
      cureTarget: 8,            // 治愈人数目标
      doctorItemCount: 2        // 医生请求物品数量
    },
    { 
      id: 3,                    // 第3关
      maxPatients: 12,          // 总病人数
      timeLimit: 120,           // 倒计时（秒）
      cureTarget: 10,           // 治愈人数目标
      doctorItemCount: {         // 医生请求物品数量配置
        min: 2,                  // 最少2个
        max: 3,                  // 最多3个
        probability: 0.5         // 50%概率请求max个，否则请求min个
      }
    }
  ],

  // ==================== 病情配置 ====================
  // 每种病情对应的耐心值（秒）
  diseases: [
    { disease_id: 1, disease_name: '发烧', patience: 20 },
    { disease_id: 2, disease_name: '头痛', patience: 30 },
    { disease_id: 3, disease_name: '骨折', patience: 30 },
    { disease_id: 4, disease_name: '腹痛', patience: 30 },
    { disease_id: 5, disease_name: '胸闷', patience: 30 },
    { disease_id: 6, disease_name: '过敏', patience: 30 },
    { disease_id: 7, disease_name: '扭伤', patience: 30 },
    { disease_id: 8, disease_name: '感冒', patience: 30 },
    { disease_id: 9, disease_name: '中风', patience: 15 }
  ],

  // ==================== 病人配置 ====================
  patient: {
    spawnFirstCount: 6,         // 前N个病人进场固定间隔
    spawnFirstInterval: 2000,   // 前N个病人进场的间隔（毫秒）
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
  // 每个病人的独立配置，用于外观和身份
  patientDetails: [
    { id: 1, name: '1号', rageLevel: 1 },
    { id: 2, name: '2号', rageLevel: 1 },
    { id: 3, name: '3号', rageLevel: 1 },
    { id: 4, name: '4号', rageLevel: 1 },
    { id: 5, name: '5号', rageLevel: 1 },
    { id: 6, name: '6号', rageLevel: 1 },
    { id: 7, name: '7号', rageLevel: 1 },
    { id: 8, name: '8号', rageLevel: 4 },
    { id: 9, name: '9号', rageLevel: 1 },
    { id: 10, name: '10号', rageLevel: 1 },
    { id: 11, name: '11号', rageLevel: 4 },
    { id: 12, name: '12号', rageLevel: 3 },
    { id: 13, name: '13号', rageLevel: 2 },
    { id: 14, name: '14号', rageLevel: 4 },
    { id: 15, name: '15号', rageLevel: 1 },
    { id: 16, name: '16号', rageLevel: 3 },
    { id: 17, name: '17号', rageLevel: 2 },
    { id: 18, name: '18号', rageLevel: 1 }
  ],

  // ==================== 暴走配置 ====================
  rage: {
    baseProbability: 0,       // 暴怒值1的基础概率 10%
    probabilityPerLevel: 0,   // 每提升1级暴怒值，概率增加10%
    walkSpeed: 0.14             // 暴走病人移动速度（每毫秒）
  }
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
