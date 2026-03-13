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
  // 每种病情对应的耐心值（秒）、急救治疗时间（毫秒）、自动治疗时间（毫秒）和所需物品
  diseases: [
    { disease_id: 1, disease_name: '发烧', patience: 20, emerge_treat_time: 2000, auto_treat_time: 4000, treat_need: ['thermometer', 'antibiotic'] },
    { disease_id: 2, disease_name: '头痛', patience: 30, emerge_treat_time: 3000, auto_treat_time: 6000, treat_need: ['painkiller', 'thermometer'] },
    { disease_id: 3, disease_name: '骨折', patience: 30, emerge_treat_time: 5000, auto_treat_time: 10000, treat_need: ['scissors', 'tape', 'painkiller'] },
    { disease_id: 4, disease_name: '腹痛', patience: 30, emerge_treat_time: 3000, auto_treat_time: 6000, treat_need: ['thermometer', 'injection'] },
    { disease_id: 5, disease_name: '胸闷', patience: 30, emerge_treat_time: 4000, auto_treat_time: 8000, treat_need: ['aed', 'adrenaline'] },
    { disease_id: 6, disease_name: '过敏', patience: 30, emerge_treat_time: 2500, auto_treat_time: 5000, treat_need: ['adrenaline', 'injection'] },
    { disease_id: 7, disease_name: '扭伤', patience: 30, emerge_treat_time: 2500, auto_treat_time: 5000, treat_need: ['tape', 'painkiller'] },
    { disease_id: 8, disease_name: '感冒', patience: 30, emerge_treat_time: 2000, auto_treat_time: 4000, treat_need: ['thermometer', 'antibiotic', 'injection'] },
    { disease_id: 9, disease_name: '中风', patience: 15, emerge_treat_time: 6000, auto_treat_time: 12000, treat_need: ['aed', 'adrenaline', 'injection'] }
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
  },

  // ==================== 药品清单 ====================
  medicines: [
    {
      id: 'antibiotic',
      name: '抗生素',
      icon: '💊',
      imagePath: 'images/antibiotic.png',
      color: '#FF6B6B',
      description: '用于治疗细菌感染',
      effect: '抗菌消炎',
      price: 50,
      unlockLevel: 1
    },
    {
      id: 'painkiller',
      name: '止痛药',
      icon: '💉',
      imagePath: 'images/painkiller.png',
      color: '#4ECDC4',
      description: '快速缓解疼痛症状',
      effect: '镇痛',
      price: 30,
      unlockLevel: 1
    },
    {
      id: 'adrenaline',
      name: '肾上腺素',
      icon: '💓',
      imagePath: 'images/adrenaline.png',
      color: '#FFE66D',
      description: '急救时使用，恢复生命体征',
      effect: '急救复苏',
      price: 100,
      unlockLevel: 2
    },
    {
      id: 'injection',
      name: '注射液',
      icon: '🧪',
      imagePath: 'images/injection.png',
      color: '#95E1D3',
      description: '补充水分和电解质',
      effect: '补液',
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
      description: '自动体外除颤器，用于心脏骤停急救',
      effect: '除颤急救',
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
      description: '用于包扎伤口',
      effect: '止血包扎',
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
      description: '外科手术用具',
      effect: '切割',
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
      description: '测量体温',
      effect: '体温检测',
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

// 根据疾病名称获取急救治疗时间（毫秒）
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
