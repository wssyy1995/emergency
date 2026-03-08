// 游戏配置文件 - 修改这里的数值可以调整游戏难度和玩法

export const GameConfig = {
  // ==================== 关卡配置 ====================
  levels: [
    { 
      id: 1,                    // 第1关
      maxPatients: 4,           // 总病人数
      doctorItemCount: 1        // 医生请求物品数量
    },
    { 
      id: 2,                    // 第2关
      maxPatients: 4,           // 总病人数
      doctorItemCount: 2        // 医生请求物品数量
    },
    { 
      id: 3,                    // 第3关
      maxPatients: 4,          // 总病人数
      doctorItemCount: {         // 医生请求物品数量配置
        min: 2,                  // 最少2个
        max: 3,                  // 最多3个
        probability: 0.5         // 50%概率请求max个，否则请求min个
      }
    }
  ],

  // ==================== 病人配置 ====================
  patient: {
    initialPatience: 10,        // 初始耐心值（秒）
    spawnFirstCount: 4,         // 前N个病人使用固定间隔
    spawnFirstInterval: 3000,   // 前N个病人的间隔（毫秒）
    spawnRandomMin: 2000,       // 随机间隔最小值（毫秒）
    spawnRandomMax: 4000,       // 随机间隔最大值（毫秒）
    spawnInterval: 3000         // 基础间隔（毫秒）- 所有关卡通用
  },

  // ==================== 托盘配置 ====================
  tray: {
    maxItems: 4,                // 托盘最大容量
    buttonGap: 12               // 重置和发送按钮间距（像素）
  },

  // ==================== 医生配置 ====================
  doctor: {
    baseSpeed: 0.12,            // 医生移动速度
    treatmentTime: 2000         // 治疗时间（毫秒）- 收到物品后多久完成治疗
  },

  // ==================== 游戏区域配置 ====================
  areas: {
    waitingWidth: 0.35,         // 等候区宽度占比
    bedWidth: 0.35,             // 治疗区宽度占比
    equipmentWidth: 0.30        // 器材室宽度占比
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
