import WaitingArea from './WaitingArea.js'
import BedArea from './BedArea.js'
import EquipmentRoom from './EquipmentRoom.js'
import Patient from './Patient.js'
import Doctor from './Doctor.js'
import { fillRoundRect, strokeRoundRect, roundRect } from './utils.js'
import { getItemById, getItemImage, preloadItemImages, preloadAreaIcons, getAreaIcon, AREA_ICONS } from './Items.js'
import { audioManager } from './AudioManager.js'
import { GameConfig, getLevelConfig, getRandomPatientDetail, getRandomDisease, checkPatientRage, getRageProbability, getAutoTreatTimeByDisease, getDiseaseById, getNewPlayerStatus, saveNewPlayerStatus, getLevelHintStatus, saveLevelHintStatus } from './GameConfig.js'

// ==================== 马卡龙 UI 颜色配置（可自行调整）====================
const UI_COLORS = {
  // 全局背景
  background: '#E6E6FA',      // 浅薰衣草紫
  
  // 顶部状态栏
  header: '#B496C4',          // 香芋紫色背景
  headerBorder: '#C5B4E0',    // 顶部状态栏边框色（稍深）
  
  // 等候区托盘
  waiting: {
    outer: '#FFD1DC',         // 外层深粉色
    inner: '#FFF0F5',         // 内层白粉色
    badgeBg: '#FFD1DC',       // 标签背景
    badgeBorder: '#FFD1DC'    // 标签边框
  },
  
  // 治疗区托盘
  treatment: {
    outer: '#C5E0F2',         // 外层天蓝色
    inner: '#F0F8FF',         // 内层爱丽丝蓝
    badgeBg: '#C5E0F2',       // 标签背景
    badgeBorder: '#C5E0F2'    // 标签边框
  },
  
  // 器材室托盘
  equipment: {
    outer: '#FFE7C6',        // 外层奶黄色
    inner: '#FFFAF0',         // 内层花白色
    badgeBg: '#FFE7C6',       // 标签背景
    badgeBorder: '#FFE7C6'    // 标签边框
  }
}

export default class Game {
  constructor() {
    // 获取 Canvas
    this.canvas = wx.createCanvas()
    this.ctx = this.canvas.getContext('2d')
    
    // 调试日志系统
    this.debugLogs = []
    this.maxDebugLogs = 15
    
    // 初始化屏幕和 Canvas（一锤子买卖，终生只赋值一次）
    this.initCanvas()
    
    // 初始化游戏状态（只执行一次）
    this.initGameState()
    
    // 【极致简单】忽略系统的瞎指挥：不管灵动岛，onWindowResize 直接无视！
    // wx.onWindowResize(() => { ... }) // 直接删掉！
  }
  
  // 添加调试日志
  addDebugLog(msg) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    this.debugLogs.unshift(`[${time}] ${msg}`)
    if (this.debugLogs.length > this.maxDebugLogs) {
      this.debugLogs.pop()
    }
    console.log(msg)
  }
  
  // 初始化 Canvas（一锤子买卖，终生只赋值一次）
  initCanvas() {
    this.addDebugLog('=== initCanvas 开始 ===')
    
    const sysInfo = wx.getSystemInfoSync()
    
    // 【绝招】强制锁死横屏逻辑尺寸（防止刚点开游戏时拿到的是竖屏数据）
    this.screenWidth = Math.max(sysInfo.windowWidth, sysInfo.windowHeight)
    this.screenHeight = Math.min(sysInfo.windowWidth, sysInfo.windowHeight)
    this.pixelRatio = sysInfo.pixelRatio || 1
    
    this.addDebugLog(`强制横屏尺寸: ${this.screenWidth}x${this.screenHeight}`)
    
    // 1. 物理画布：终生只赋值这一次！
    this.canvas.width = Math.floor(this.screenWidth * this.pixelRatio)
    this.canvas.height = Math.floor(this.screenHeight * this.pixelRatio)
    
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.scale(this.pixelRatio, this.pixelRatio)
    
    this.addDebugLog(`Canvas 已锁定: ${this.canvas.width}x${this.canvas.height}`)
    
    // 2. 逻辑地图：不管 Safe Area，直接按全屏算！
    this.mapX = 10
    this.mapY = 10
    this.mapWidth = this.screenWidth - 20   // 不减去 safeArea
    this.mapHeight = this.screenHeight - 20
    
    this.addDebugLog(`地图: ${this.mapWidth}x${this.mapHeight}`)
  }
  
  resize() {
    // 【极致简单】不再响应任何尺寸变化！
    // Canvas 物理尺寸在 initCanvas 中一锤子买卖，终生不变
    // 逻辑地图尺寸也固定，不随 Safe Area 变化
    this.addDebugLog('resize 被调用（但已禁用）')
  }
  
  // 初始化游戏状态（仅在 constructor 中调用一次）
  initGameState() {
    // 获取平台信息（用于判断是否在真机上运行）
    const sysInfo = wx.getSystemInfoSync()
    this.platform = sysInfo.platform // 'ios', 'android', 'devtools', 'windows', 'mac'
    console.log('当前平台:', this.platform)
    
    // 游戏状态
    this.score = 0
    this.gameTime = 0
    this.isRunning = false
    this.patientIdCounter = 1
    this.doctorIdCounter = 1
    this.hasRagingPatient = false
    
    // 关卡系统
    this.currentLevel = 0
    this.spawnedPatientsCount = 0
    this.levelComplete = false
    
    // 倒计时和治愈目标
    this.timeRemaining = 0       // 剩余时间（秒）
    this.curedCount = 0          // 已治愈人数
    this.countdownTimer = null   // 倒计时定时器
    
    // 动态计算三个区域
    this.initAreas()
    
    // 立即创建医生（不在 setTimeout 中，避免时序问题）
    this.doctors = []
    this.createDoctors(2)
    
    this.lastTime = 0
    
    // 图标图片
    this.honorImage = null
    this.curedImage = null
    this.loadIcons()
    
    // 浮动文字动画
    this.floatingTexts = []
    
    // 拖动暴走病人状态
    this.draggingRagePatient = null
    this.dragStartX = 0
    this.dragStartY = 0
    
    // 弹窗状态
    this.gameOverModal = null
    this.levelCompleteModal = null
    this.gameWinModal = null
    this.levelToast = null
    
    // 调试弹窗状态
    this.debugModal = null
    this.titleBounds = null  // 标题点击区域
    
    // 椅子选择弹窗状态
    this.seatSelectionModal = null
    
    // 输液区病人选择弹窗状态（急救）
    this.ivPatientSelectionModal = null
    
    // 疾病清单弹窗状态（点击护士显示）
    this.diseaseListModal = null
    
    // 按钮轻量提示状态
    this.buttonTooltip = null
    
    // 暴走提示状态（只显示一次）
    this.hasShownRageToast = false
    
    // 音量按钮状态
    this.isMuted = false
    this.volumeBtnBounds = null
    
    // 调试按钮状态（点击荣誉点+100）
    this.debugHonorBtnBounds = null
    
    // 当前关卡病人池（用于不重复生成病人）
    this.currentLevelPatientPool = []
    
    // 【已移除】1秒轮询定时器已禁用（玩家需手动分配病人到病床）
    // this.bedAssignmentTimer = null
    
    this.initTouch()
  }

  // 触发震动（仅在 iOS 或 Android 真机上生效，开发者工具和其他平台不震动）
  vibrate() {
    // 只在 iOS 或 Android 平台触发震动
    if (this.platform === 'ios' || this.platform === 'android') {
      wx.vibrateShort({ type: 'light' })
    }
  }

  loadIcons() {
    // 加载荣誉点图标
    const honorImg = wx.createImage()
    honorImg.onload = () => {
      this.honorImage = honorImg
    }
    honorImg.src = 'images/honor.png'
    
    // 加载治愈图标
    const curedImg = wx.createImage()
    curedImg.onload = () => {
      this.curedImage = curedImg
    }
    curedImg.src = 'images/cured.png'
    
    // 加载倒计时图标
    const timerImg = wx.createImage()
    timerImg.onload = () => {
      this.timerImage = timerImg
    }
    timerImg.src = 'images/timer.png'
    
    // 加载疾病图标缓存
    this.diseaseImages = {}
    for (let i = 1; i <= 9; i++) {
      const diseaseImg = wx.createImage()
      diseaseImg.onload = ((id, img) => {
        this.diseaseImages[id] = img
      })(i, diseaseImg)
      // 尝试小写 png 和大写 PNG
      diseaseImg.src = `images/disease_${i}.png`
    }
    
    // 加载治疗区托盘背景图
    this.bedAreaBgImage = null
    const bedBgImg = wx.createImage()
    bedBgImg.onload = () => {
      this.bedAreaBgImage = bedBgImg
    }
    bedBgImg.onerror = () => {
      console.warn('Failed to load bed area background: images/bed_area_bg.png')
    }
    bedBgImg.src = 'images/bed_area_bg.png'
  }

  // 添加浮动文字
  addFloatingText(text, x, y, color) {
    this.floatingTexts.push({
      type: 'text',
      text,
      x,
      y,
      color,
      opacity: 1,
      offsetY: 0,
      life: 1000 // 1秒动画
    })
  }
  
  // 添加浮动奖励（图标+数值）
  // rewardType: 'honor' | 'cured'
  addFloatingReward(rewardType, value, x, y) {
    this.floatingTexts.push({
      type: 'reward',
      rewardType,  // 'honor' 或 'cured'
      value,       // 数值
      x,
      y,
      opacity: 1,
      offsetY: 0,
      life: 1000 // 1秒动画
    })
  }
  
  // 添加组合奖励动效（荣誉点 + 治愈，两行显示）
  addFloatingRewardsCombined(honorValue, curedValue, x, y) {
    this.floatingTexts.push({
      type: 'rewardCombined',
      honorValue,
      curedValue,
      x,
      y,
      opacity: 1,
      offsetY: 0,
      life: 1000 // 1秒动画
    })
  }
  
  // 添加浮动物品图片
  addFloatingItem(item, x, y) {
    this.floatingTexts.push({
      type: 'item',
      item,
      x,
      y,
      color: item.color || '#3498DB',
      opacity: 1,
      offsetY: 0,
      life: 1000 // 1秒动画
    })
  }

  // 添加浮动荣誉点变化（用于安抚按钮的 -10 效果）
  addFloatingHonorChange(x, y, value) {
    this.floatingTexts.push({
      type: 'honorChange',
      value,
      x,
      y,
      opacity: 1,
      offsetY: 0,
      life: 2000 // 2秒动画（更慢）
    })
  }

  // 更新浮动文字
  updateFloatingTexts(deltaTime) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.life -= deltaTime
      
      // 荣誉点变化动效飘得更慢
      if (ft.type === 'honorChange') {
        ft.offsetY -= 0.02 * deltaTime // 更慢的上升速度
        ft.opacity = ft.life / 2000
      } else {
        ft.offsetY -= 0.05 * deltaTime // 普通速度
        ft.opacity = ft.life / 1000
      }
      
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1)
      }
    }
  }

  initAreas() {
    // 顶部状态栏高度
    const headerHeight = 48
    // 底部留白
    const bottomMargin = 6
    // 顶部状态栏与三个区域之间的间距
    const topPadding = 8
    
    // 托盘 padding（外层边框宽度）- 增大以显示明显边框
    const trayPadding = 10
    
    // 可用区域（包含托盘边框）
    const availableY = this.mapY + headerHeight + topPadding
    const availableHeight = this.mapHeight - headerHeight - bottomMargin - topPadding
    
    // 三个区域的间距（托盘之间的间距）
    const gap = 8
    
    // 计算总可用宽度
    const totalGap = gap * 4  // 左右边距 + 中间两个间距
    const availableWidth = this.mapWidth - totalGap
    
    // 调整比例：等候区 35% | 治疗区 35% | 器材室 30%
    const waitingWidth = availableWidth * 0.35
    const bedWidth = availableWidth * 0.35
    const equipmentWidth = availableWidth * 0.30
    
    // 等候区（左侧）- 传入内层舞台坐标（加上 trayPadding）
    const waitingX = this.mapX + gap + trayPadding
    this.waitingArea = new WaitingArea(waitingX, availableY + trayPadding, 
                                        waitingWidth - trayPadding * 2, 
                                        availableHeight - trayPadding * 2)
    // 保存托盘位置用于背景绘制
    this.waitingArea.trayX = this.mapX + gap
    this.waitingArea.trayY = availableY
    this.waitingArea.trayWidth = waitingWidth
    this.waitingArea.trayHeight = availableHeight
    
    // 治疗区（中间）
    const bedX = this.mapX + gap + waitingWidth + gap + trayPadding
    this.bedArea = new BedArea(bedX, availableY + trayPadding, 
                               bedWidth - trayPadding * 2, 
                               availableHeight - trayPadding * 2, 2)
    this.bedArea.trayX = this.mapX + gap + waitingWidth + gap
    this.bedArea.trayY = availableY
    this.bedArea.trayWidth = bedWidth
    this.bedArea.trayHeight = availableHeight
    
    // 器材室（右侧）
    const equipmentX = this.mapX + gap + waitingWidth + gap + bedWidth + gap + trayPadding
    this.equipmentRoom = new EquipmentRoom(equipmentX, availableY + trayPadding, 
                                           equipmentWidth - trayPadding * 2, 
                                           availableHeight - trayPadding * 2)
    this.equipmentRoom.trayX = this.mapX + gap + waitingWidth + gap + bedWidth + gap
    this.equipmentRoom.trayY = availableY
    this.equipmentRoom.trayWidth = equipmentWidth
    this.equipmentRoom.trayHeight = availableHeight
  }

  createDoctors(count) {
    for (let i = 0; i < count; i++) {
      const doctor = new Doctor(this.doctorIdCounter++, this.bedArea)
      this.doctors.push(doctor)
    }
  }

  // 恢复游戏（用于小程序重新进入时，不重置游戏状态）
  resume() {
    this.addDebugLog('=== resume 开始 ===')
    
    if (this.isRunning) {
      this.addDebugLog('已经在运行中，跳过')
      return
    }
    
    // 安全检查：确保 Canvas 有效
    if (!this.canvas || !this.ctx) {
      this.addDebugLog('❌ Canvas 无效，无法恢复')
      return
    }
    
    this.isRunning = true
    this.lastTime = 0
    
    // 恢复计时器
    this.timeTimer = setInterval(() => {
      this.gameTime++
    }, 1000)
    
    this.addDebugLog('渲染循环已恢复')
    
    // 开始渲染循环
    this.loop(0)
  }
  
  start() {
    // 如果已经在运行，先停止并清理
    if (this.isRunning) {
      clearInterval(this.timeTimer)
      clearTimeout(this.spawnTimer)
      clearTimeout(this.initialSpawnTimer)
    }
    
    this.isRunning = true
    
    // 预加载物品图片和区域图标
    preloadItemImages()
    preloadAreaIcons()
    
    this.loop(0)
    
    this.timeTimer = setInterval(() => {
      this.gameTime++
    }, 1000)
    
    // 重置关卡状态（start 是新游戏，resume 是继续）
    this.spawnedPatientsCount = 0
    this.levelComplete = false
    this.curedCount = 0
    
    // 【新玩家指引】第一关检查是否为新玩家（优先从本地缓存读取）
    if (this.currentLevel === 0) {
      // 从本地缓存读取，没有缓存则使用 GameConfig 默认值
      const isNewPlayer = getNewPlayerStatus()
      GameConfig.is_new_player = isNewPlayer
      this.waitingArea.setNewPlayerMode(isNewPlayer)
      console.log(`[新玩家指引] 当前模式: ${isNewPlayer ? '新玩家' : '正常流程'}`)
    } else {
      // 非第一关，关闭新玩家模式
      this.waitingArea.setNewPlayerMode(false)
      
      // 【关卡提示】第2关及以后，显示灯泡提示（如果本关未点击过）
      if (this.currentLevel >= 1) {
        const hasClicked = getLevelHintStatus(this.currentLevel)
        const showHint = !hasClicked
        this.waitingArea.nurse.setLevelHint(showHint)
        console.log(`[关卡提示] 第${this.currentLevel + 1}关灯泡状态: ${showHint ? '显示' : '已关闭'}`)
      }
    }
    
    // 初始化倒计时
    const levelConfig = getLevelConfig(this.currentLevel)
    this.timeRemaining = levelConfig.timeLimit || 60
    
    // 启动倒计时
    if (this.countdownTimer) clearInterval(this.countdownTimer)
    this.countdownTimer = setInterval(() => {
      if (this.isRunning && this.timeRemaining > 0) {
        this.timeRemaining--
        // 检查是否时间到
        if (this.timeRemaining <= 0) {
          this.checkTimeUp()
        }
      }
    }, 1000)
    
    // 初始化当前关卡的病人池（不重复的病人）
    this.initCurrentLevelPatientPool()
    
    // 清除之前的定时器
    if (this.initialSpawnTimer) clearTimeout(this.initialSpawnTimer)
    if (this.spawnTimer) clearTimeout(this.spawnTimer)
    
    // 【新玩家指引】如果不是新玩家，立即开始生成病人
    if (!GameConfig.is_new_player) {
      this.startPatientSpawning()
    } else {
      console.log('[新玩家指引] 等待点击护士后开始生成病人')
    }
  }
  
  // 开始生成病人（提取为独立方法）
  startPatientSpawning() {
    // 前N个病人，使用固定间隔
    let initialSpawnCount = 0
    const spawnFirstCount = GameConfig.patient.spawnFirstCount
    const spawnFirstInterval = GameConfig.patient.spawnFirstInterval
    
    const levelConfigStart = getLevelConfig(this.currentLevel)
    const totalPatientsStart = levelConfigStart.patients.length
    
    const spawnFirstPatients = () => {
      if (initialSpawnCount < spawnFirstCount && this.spawnedPatientsCount < totalPatientsStart && this.isRunning) {
        const success = this.spawnPatientFromLeft()
        if (success) {
          initialSpawnCount++
          this.spawnedPatientsCount++
          // 【动画控制】第一个病人生成后，启用医生和护士的动画
          if (this.spawnedPatientsCount === 1) {
            this.enableCharacterAnimations()
          }
        }
        // 无论成功与否，都继续尝试生成（直到达到spawnFirstCount或无法生成）
        this.initialSpawnTimer = setTimeout(spawnFirstPatients, spawnFirstInterval)
      } else {
        // 前N个生成完毕，开始后续随机生成
        this.spawnRemainingPatients()
      }
    }
    
    // 开始生成前N个病人
    this.initialSpawnTimer = setTimeout(spawnFirstPatients, 1000)
  }
  
  // 生成剩余的病人（随机间隔）
  spawnRemainingPatients() {
    const levelConfig = getLevelConfig(this.currentLevel)
    const totalPatients = levelConfig.patients.length
    const randomMin = GameConfig.patient.spawnRandomMin
    const randomMax = GameConfig.patient.spawnRandomMax
    
    const spawnNext = () => {
      if (!this.isRunning) return
      
      // 检查是否还有病人名额，且站立排队区未满
      const queueCount = this.waitingArea.getReceptionQueuePatients().length
      if (this.spawnedPatientsCount < totalPatients && queueCount < 4) {
        const success = this.spawnPatientFromLeft()
        if (success) {
          this.spawnedPatientsCount++
        }
        
        // 检查是否完成本关卡
        if (this.spawnedPatientsCount >= totalPatients && !this.levelComplete) {
          this.levelComplete = true
          this.checkLevelComplete()
          return
        }
        
        // 随机间隔生成下一个
        const randomDelay = randomMin + Math.random() * (randomMax - randomMin)
        this.spawnTimer = setTimeout(spawnNext, randomDelay)
      } else if (this.spawnedPatientsCount < totalPatients) {
        // 排队人数已满或等候区满了，稍后再检查
        this.spawnTimer = setTimeout(spawnNext, 1000)
      }
    }
    
    // 开始生成剩余病人
    spawnNext()
  }

  loop(timestamp) {
    // 如果游戏不在运行中，但有弹窗显示，仍然需要渲染
    const hasModal = this.gameOverModal?.visible || 
                     this.levelCompleteModal?.visible || 
                     this.gameWinModal?.visible
    
    if (!this.isRunning && !hasModal) return
    
    const deltaTime = timestamp - this.lastTime
    this.lastTime = timestamp
    
    // 只有游戏运行时才更新逻辑
    if (this.isRunning) {
      this.update(deltaTime)
    }
    
    // 始终渲染（用于显示弹窗等）
    this.render()
    
    requestAnimationFrame((t) => this.loop(t))
  }

  update(deltaTime) {
    this.waitingArea.update(deltaTime)
    this.equipmentRoom.update(deltaTime)
    this.doctors.forEach(doctor => doctor.update(deltaTime, this.bedArea))
    
    // 更新浮动文字
    this.updateFloatingTexts(deltaTime)
    
    // 更新等候区病人
    this.waitingArea.patients.forEach(patient => patient.update(deltaTime))
    
    // 更新病床上病人
    this.bedArea.getOccupiedBeds().forEach(bed => {
      if (bed.patient) {
        bed.patient.update(deltaTime)
        // 治疗完成后病人自行离开
        if (bed.patient.isCured) {
          // 增加分数和治愈人数（只加一次）
          if (!bed.scoreAdded) {
            const addedScore = 10 + Math.floor(Math.random() * 20)
            this.score += addedScore
            this.curedCount++
            bed.scoreAdded = true
            
            // 添加浮动奖励动效（荣誉点 + 治愈，两行显示）
            const centerX = bed.x + bed.width / 2
            const centerY = bed.y
            this.addFloatingRewardsCombined(addedScore, 1, centerX, centerY)
            
            // 检查是否完成关卡目标
            this.checkLevelTarget()
          }
          // 清理病床，病人离开
          if (!bed.leaveTimer) {
            bed.leaveTimer = setTimeout(() => {
              bed.clear()
              bed.leaveTimer = null
              bed.scoreAdded = false
            }, 1000)
          }
        }
      }
    })
    
    // 更新输液椅上病人
    this.bedArea.ivSeats.forEach(seat => {
      if (seat.patient) {
        seat.patient.update(deltaTime)
        
        // 【修改】输液椅上病人耐心处理
        // 如果疾病priority为1（紧急），耐心值继续减少；否则暂停减少
        // 如果处于安抚暂停状态，耐心值也不减少
        const isEmergencyPriority = seat.patient.disease && seat.patient.disease.diseases_priority === 1
        if (isEmergencyPriority && !seat.patient.patiencePaused) {
          // 紧急疾病：耐心值继续减少（非暂停状态）
          seat.patient.patience -= deltaTime / 1000
          // 检查耐心是否归零
          if (seat.patient.patience <= 0 && !seat.patient.isLeaving && !seat.patient.tomatoThrown) {
            seat.patient.isAngry = true
            seat.patient.startLeaving(this.screenHeight)
          }
        }
        // 非紧急疾病：耐心值保持不变（暂停减少）
        
        // 【修复】检查紧急病人是否已经离开屏幕，清理座位
        if (seat.patient.isLeaving && seat.patient.shouldRemove) {
          seat.clear()
          return
        }
        
        // 输液治疗进度更新
        if (!seat.patient.ivTreatmentComplete) {
          // 初始化总治疗时间（只需要一次）
          if (seat.patient.ivTotalTreatmentTime === 0) {
            seat.patient.ivTotalTreatmentTime = getAutoTreatTimeByDisease(seat.patient.condition.name)
          }
          
          // 更新治疗时间
          seat.patient.ivTreatmentTime += deltaTime
          seat.patient.ivTreatmentProgress = Math.min(1, seat.patient.ivTreatmentTime / seat.patient.ivTotalTreatmentTime)
          
          // 治疗完成
          if (seat.patient.ivTreatmentProgress >= 1) {
            seat.patient.ivTreatmentComplete = true
          }
        }
      }
    })
    
    // 处理等候区病人耐心（排队区病人耐心都会减少，除非处于安抚暂停状态）
    this.waitingArea.patients.forEach(patient => {
      if (!patient.patiencePaused) {
        patient.patience -= deltaTime / 1000
      }
      // 耐心归零且未开始离开/暴走流程
      if (patient.patience <= 0 && !patient.isLeaving && !patient.tomatoThrown && !patient.isRaging) {
        patient.isAngry = true
        
        // 【新增】如果该病人的病情分诊弹窗正在显示，强制关闭
        if (this.seatSelectionModal && 
            this.seatSelectionModal.visible && 
            this.seatSelectionModal.patient === patient) {
          this.seatSelectionModal = null
        }
        
        // 检查是否会暴走（根据暴怒值概率判断，且当前没有其他病人暴走）
        const rageProbability = patient.patientDetail ? getRageProbability(patient.patientDetail.rageLevel) : 0
        const randomValue = Math.random()
        const willRage = patient.patientDetail && randomValue < rageProbability && !this.hasRagingPatient
        
        // 调试日志（可以在开发者工具中查看）
        console.log(`病人${patient.name} 暴走概率:${(rageProbability*100).toFixed(1)}% 随机值:${(randomValue*100).toFixed(1)}% 是否暴走:${willRage} hasRagingPatient:${this.hasRagingPatient}`)
        
        if (willRage && this.doctors.length > 0) {
          // 暴走：找到一位还没有走到病床边的医生（不在 treating 状态）
          const targetDoctor = this.findAvailableDoctorForRage()
          console.log(`暴走病人找到医生:`, targetDoctor ? targetDoctor.name : '无')
          if (targetDoctor) {
            // 设置标记：有病人正在暴走
            this.hasRagingPatient = true
            // 设置病人暴走目标（先走到治疗区，再锁定医生）
            patient.startRage(targetDoctor, this.bedArea)
            // 提示会在病人锁定医生后显示（在 update 中检测）
          } else {
            // 没有可用医生，正常离开
            console.log('没有可用医生，病人正常离开')
            this.startPatientLeaving(patient)
          }
        } else {
          // 不暴走，正常离开流程
          this.startPatientLeaving(patient)
        }
      }
      
      // 更新暴走病人的跟随位置（只有锁定医生后才会跟随）
      // 这个逻辑已经在 Patient.update 中处理
      
      // 检查病人是否刚刚锁定医生，显示提示
      if (patient.justLockedDoctor) {
        patient.justLockedDoctor = false
        this.showRageToastOnce()
      }
      
    })
    
    // 清理已经离开的愤怒病人
    const angryPatients = this.waitingArea.patients.filter(p => p.shouldRemove)
    angryPatients.forEach(patient => {
      // 如果是暴走病人离开，重置暴走标记
      if (patient.isRaging || patient.rageTargetDoctor) {
        this.hasRagingPatient = false
      }
      this.waitingArea.removePatient(patient)
      // 检查是否完成关卡（当所有病人都已生成且都被处理）
      const levelConfig = getLevelConfig(this.currentLevel)
      const totalPatients = levelConfig.patients.length
      if (this.spawnedPatientsCount >= totalPatients) {
        this.levelComplete = true
        this.checkLevelComplete()
      }
    })
  }

  // 开始病人正常离开流程
  startPatientLeaving(patient) {
    patient.startLeaving(this.screenHeight)
  }

  // 检查时间是否到达，判断游戏结束
  checkTimeUp() {
    const levelConfig = getLevelConfig(this.currentLevel)
    // 时间到，检查是否达到治愈目标
    if (this.curedCount < levelConfig.cureTarget) {
      // 未达到目标，游戏结束
      this.gameOverWithReason('游戏结束，未达成本关目标')
    }
  }

  // 检查关卡目标是否完成
  checkLevelTarget() {
    const levelConfig = getLevelConfig(this.currentLevel)
    // 如果达到治愈目标，关卡完成
    if (this.curedCount >= levelConfig.cureTarget) {
      this.levelComplete = true
      this.checkLevelComplete()
    }
  }

  // 游戏结束（带原因）
  gameOverWithReason(reason) {
    this.isRunning = false
    clearInterval(this.timeTimer)
    clearTimeout(this.spawnTimer)
    if (this.initialSpawnTimer) {
      clearTimeout(this.initialSpawnTimer)
    }
    // 【已移除】自动分配定时器已禁用
    // if (this.bedAssignmentTimer) {
    //   clearInterval(this.bedAssignmentTimer)
 // }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
    
    // 关闭所有其他弹窗
    this.seatSelectionModal = null
    this.levelCompleteModal = null
    this.gameWinModal = null
    this.levelToast = null
    
    // 设置游戏结束弹窗状态
    this.gameOverModal = {
      visible: true,
      isAnimating: true,
      animationTime: 0,
      reason: reason,
      buttons: [
        { text: '重新开始', x: 0, y: 0, width: 120, height: 40, color: '#27AE60', action: 'restart' },
        { text: '原地复活', x: 0, y: 0, width: 120, height: 40, color: '#3498DB', action: 'revive', disabled: true }
      ]
    }
  }

  // 找到距离病人最近的医生
  findNearestDoctor(patient) {
    let nearestDoctor = null
    let nearestDist = Infinity
    
    this.doctors.forEach(doctor => {
      // 跳过已被锁定的医生
      if (doctor.isLocked) return
      
      const dx = doctor.x - patient.x
      const dy = doctor.y - patient.y
      const dist = Math.hypot(dx, dy)
      
      if (dist < nearestDist) {
        nearestDist = dist
        nearestDoctor = doctor
      }
    })
    
    return nearestDoctor
  }

  // 找到一位可用于暴走的医生（不在 treating 状态且未被锁定）
  findAvailableDoctorForRage() {
    // 过滤出可用的医生（不在治疗状态且未被锁定）
    const availableDoctors = this.doctors.filter(doctor => 
      doctor.state !== 'treating' && !doctor.isLocked
    )
    
    if (availableDoctors.length === 0) return null
    
    // 随机选择一位可用医生
    const randomIndex = Math.floor(Math.random() * availableDoctors.length)
    return availableDoctors[randomIndex]
  }

  // 查找点击位置的暴走病人
  findRagingPatientAt(x, y) {
    // 遍历所有病人，找到暴走状态的病人
    for (const patient of this.waitingArea.patients) {
      if (patient.isRaging && patient.contains(x, y)) {
        return patient
      }
    }
    return null
  }
  
  // 查找点击位置是否在输液椅上的病人
  findIVSeatPatientAt(x, y) {
    for (const seat of this.bedArea.ivSeats) {
      if (seat.patient && seat.patient.contains(x, y)) {
        return seat.patient
      }
    }
    return null
  }
  
  // 显示暴走提示（只显示一次）
  showRageToastOnce() {
    // 检查本地存储，是否已显示过
    const hasShown = wx.getStorageSync('rage_toast_shown')
    if (hasShown || this.hasShownRageToast) {
      return
    }
    
    // 显示提示（在屏幕上方，停留2秒）
    wx.showToast({
      title: '将暴走病人拖回等待区，解救医生！',
      icon: 'none',
      duration: 2000,
      position: 'top'
    })
    
    // 标记已显示
    this.hasShownRageToast = true
    wx.setStorageSync('rage_toast_shown', true)
  }

  spawnPatient() {
    this.spawnPatientFromLeft()
  }

  // 初始化当前关卡的病人池（从levelConfig.patients获取）
  initCurrentLevelPatientPool() {
    const levelConfig = getLevelConfig(this.currentLevel)
    const patientIds = levelConfig.patients || []
    
    // 根据ID列表从patientDetails中找到对应的病人配置
    this.currentLevelPatientPool = patientIds.map((patientId, index) => {
      const patientDetail = GameConfig.patientDetails.find(p => p.id === patientId)
      if (!patientDetail) {
        console.warn(`未找到病人配置: ID ${patientId}`)
        return null
      }
      return {
        ...patientDetail,
        instanceId: index + 1  // 给每个实例分配唯一ID
      }
    }).filter(p => p !== null)  // 过滤掉未找到的病人
    
    console.log(`关卡${this.currentLevel + 1}病人池已初始化，共${this.currentLevelPatientPool.length}个病人`, this.currentLevelPatientPool.map(p => p.name))
  }

  // 从当前关卡病人池中获取下一个病人（按顺序取出）
  getNextPatientFromPool() {
    if (this.currentLevelPatientPool.length === 0) {
      console.warn('病人池已空！')
      return null
    }
    // 从池中按顺序取出第一个病人
    const patient = this.currentLevelPatientPool.shift()
    return patient
  }

  // 从左侧走进来的病人生成
  // 返回值：true=成功生成，false=未生成
  spawnPatientFromLeft() {
    // 如果站立排队区已满（8人），暂停进场
    const queueCount = this.waitingArea.getReceptionQueuePatients().length
    if (queueCount >= 8) {
      console.log('[生成病人] 站立区已满，暂停生成')
      return false
    }
    
    // 从当前关卡病人池中获取病人（不重复）
    const patientDetail = this.getNextPatientFromPool()
    if (!patientDetail) {
      console.warn('没有更多病人可以生成')
      return
    }
    
    // 创建病人，疾病配置由 Patient 构造函数从 patientDetail.disease_id 获取
    const patient = new Patient(this.patientIdCounter++, patientDetail)
    
    // 初始位置在等候区左侧外面
    patient.x = this.waitingArea.x - 50
    patient.y = this.waitingArea.y + this.waitingArea.height * 0.5
    patient.targetX = patient.x
    patient.targetY = patient.y
    
    // 添加到前台排队
    const added = this.waitingArea.addPatientToReception(patient)
    
    if (added) {
      console.log('[生成病人] 成功生成:', patient.name, 'patientDetail.id:', patientDetail.id, 'disease_id:', patientDetail.disease_id, '病情:', patient.condition.name, 'disease:', patient.disease)
      return true
    } else {
      console.log('[生成病人] 添加到排队失败')
      return false
    }
  }

  render() {
    // 【每帧强校准】彻底治愈 iOS 切后台画面缩小问题
    // 不管之前发生了什么，每帧都强制重置缩放比例
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.scale(this.pixelRatio, this.pixelRatio)
    
    this.ctx.save()
    
    // 清空画布 - 浅薰衣草紫背景
    this.ctx.fillStyle = UI_COLORS.background
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 绘制马卡龙风格 UI 背景
    this.renderMacaronBackground()
    
    // 绘制各个区域（新风格）
    this.waitingArea.render(this.ctx)
    this.bedArea.render(this.ctx, this.curedImage)
    this.equipmentRoom.render(this.ctx)
    
    
    // 渲染医生身体
    this.doctors.forEach(doctor => doctor.render(this.ctx))
    
    // 渲染病人
    this.renderPatients()
    
    // 渲染医生气泡（在最上层，不被病人遮挡）
    this.doctors.forEach(doctor => doctor.renderBubble(this.ctx))
    
    // 【新玩家指引】聚光灯效果（在所有元素之后绘制，只影响背景）
    if (GameConfig.is_new_player && this.currentLevel === 0) {
      this.renderNewPlayerSpotlight()
    }
    
    this.renderUI()
    this.renderFloatingTexts()
    this.renderGameOverModal()
    this.renderLevelCompleteModal()
    this.renderLevelToast()
    this.renderGameWinModal()
    this.renderSeatSelectionModal()
    this.renderIVPatientSelectionModal()
    this.renderDiseaseListModal()

    
    // 调试日志已禁用
    // this.renderDebugLogs()
    
    this.ctx.restore()
  }
  
  // 【新玩家指引】渲染聚光灯效果（只遮罩背景，不影响游戏元素）
  renderNewPlayerSpotlight() {
    const ctx = this.ctx
    const nurse = this.waitingArea.nurse
    
    // 聚光灯中心在护士位置
    const centerX = nurse.x-20
    const centerY = nurse.y
    const spotlightRadius = 180 * nurse.scale  // 高亮区域半径
    
    ctx.save()
    
    // 创建径向渐变：中心透明，边缘半透明黑色
    const gradient = ctx.createRadialGradient(
      centerX, centerY, spotlightRadius * 0.4,  // 内圈（高亮区域更小更集中）
      centerX, centerY, spotlightRadius * 4  // 外圈（扩散范围）
    )
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')      // 中心完全透明
    gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.25)')    // 保持透明区域
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)')  // 开始变暗
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)')    // 边缘暗化
    
    // 绘制覆盖全屏的遮罩
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    ctx.restore()
  }
  
  // 绘制调试日志（在屏幕左上角）
  renderDebugLogs() {
    if (!this.debugLogs || this.debugLogs.length === 0) return
    
    const ctx = this.ctx
    const lineHeight = 14
    const padding = 8
    const maxWidth = 380
    const maxLines = Math.min(this.debugLogs.length, 15)
    
    // 计算背景高度
    const bgHeight = maxLines * lineHeight + padding * 2
    
    // 绘制半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.fillRect(5, 5, maxWidth, bgHeight)
    
    // 绘制日志文字
    ctx.font = '11px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    
    for (let i = 0; i < maxLines; i++) {
      const log = this.debugLogs[i]
      const y = 5 + padding + i * lineHeight
      
      // 根据内容类型设置颜色
      if (log.includes('❌')) {
        ctx.fillStyle = '#ff6b6b'
      } else if (log.includes('✅')) {
        ctx.fillStyle = '#51cf66'
      } else if (log.includes('⏭️')) {
        ctx.fillStyle = '#ffd43b'
      } else if (log.includes('===')) {
        ctx.fillStyle = '#74c0fc'
      } else {
        ctx.fillStyle = '#fff'
      }
      
      // 截断过长的日志
      let displayLog = log
      if (log.length > 55) {
        displayLog = log.substring(0, 55) + '...'
      }
      
      ctx.fillText(displayLog, 10, y)
    }
  }

  renderFloatingTexts() {
    const ctx = this.ctx
    ctx.save()
    
    this.floatingTexts.forEach(ft => {
      ctx.globalAlpha = ft.opacity
      
      if (ft.type === 'rewardCombined') {
        // 绘制组合奖励（荣誉点 + 治愈，两行显示）
        const iconSize = 22
        const lineHeight = 26
        const spacing = 6
        const centerX = ft.x
        const centerY = ft.y + ft.offsetY
        
        // 更深的颜色
        const honorColor = '#E6A700'  // 深黄色（金色）
        const curedColor = '#1F618D'  // 深蓝色
        
        // 添加阴影效果
        ctx.shadowColor = 'rgba(0,0,0,0.4)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        // 第一行：荣誉点
        const honorText = `+${ft.honorValue}`
        ctx.font = 'bold 22px cursive, sans-serif'
        const honorTextWidth = ctx.measureText(honorText).width
        const honorTotalWidth = iconSize + spacing + honorTextWidth
        const honorStartX = centerX - honorTotalWidth / 2
        const honorY = centerY - lineHeight / 2
        
        // 绘制荣誉点图标
        if (this.honorImage && this.honorImage.width > 0) {
          ctx.drawImage(this.honorImage, honorStartX, honorY - iconSize/2, iconSize, iconSize)
        }
        // 绘制荣誉点数值
        ctx.fillStyle = honorColor
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(honorText, honorStartX + iconSize + spacing, honorY)
        
        // 第二行：治愈数
        const curedText = `+${ft.curedValue}`
        ctx.font = 'bold 22px cursive, sans-serif'
        const curedTextWidth = ctx.measureText(curedText).width
        const curedTotalWidth = iconSize + spacing + curedTextWidth
        const curedStartX = centerX - curedTotalWidth / 2
        const curedY = centerY + lineHeight / 2
        
        // 绘制治愈图标
        if (this.curedImage && this.curedImage.width > 0) {
          ctx.drawImage(this.curedImage, curedStartX, curedY - iconSize/2 - 3, iconSize + 8, iconSize + 18)
        }
        // 绘制治愈数值
        ctx.fillStyle = curedColor
        ctx.fillText(curedText, curedStartX + iconSize + spacing, curedY)
        
        // 重置阴影
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      } else if (ft.type === 'reward') {
        // 绘制奖励图标+数值（荣誉点或治愈）- 单行显示（备用）
        const iconSize = 24
        const text = `+${ft.value}`
        const isHonor = ft.rewardType === 'honor'
        const iconImage = isHonor ? this.honorImage : this.curedImage
        const textColor = isHonor ? '#E6A700' : '#1F618D'  // 深黄色或深蓝色
        
        // 计算总宽度（图标 + 间距 + 文字）
        ctx.font = 'bold 24px cursive, sans-serif'
        const textWidth = ctx.measureText(text).width
        const spacing = 6
        const totalWidth = iconSize + spacing + textWidth
        const startX = ft.x - totalWidth / 2
        const centerY = ft.y + ft.offsetY
        
        // 添加阴影效果
        ctx.shadowColor = 'rgba(0,0,0,0.4)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        // 绘制图标
        if (iconImage && iconImage.width > 0) {
          ctx.drawImage(iconImage, startX, centerY - iconSize/2, iconSize, iconSize)
        }
        
        // 绘制数值文字
        ctx.fillStyle = textColor
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, startX + iconSize + spacing, centerY)
        
        // 重置阴影
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      } else if (ft.type === 'item' && ft.item) {
        // 绘制物品图片
        const itemSize = 32
        const itemImage = getItemImage(ft.item.id)
        
        // 添加阴影效果
        ctx.shadowColor = 'rgba(0,0,0,0.3)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        if (itemImage) {
          ctx.drawImage(itemImage, ft.x - itemSize/2, ft.y + ft.offsetY - itemSize/2, itemSize, itemSize)
        } else {
          // 如果没有图片，使用emoji
          ctx.fillStyle = ft.color
          ctx.font = 'bold 28px cursive, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(ft.item.icon, ft.x, ft.y + ft.offsetY)
        }
        
        // 重置阴影
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      } else if (ft.type === 'honorChange') {
        // 绘制荣誉点变化（安抚按钮的 -10 效果）
        const centerX = ft.x
        const centerY = ft.y + ft.offsetY
        
        // 绘制荣誉点图标
        const iconSize = 18
        if (this.honorImage && this.honorImage.width > 0) {
          ctx.drawImage(this.honorImage, centerX - 40, centerY - iconSize/2, iconSize, iconSize)
        }
        
        // 绘制变化值（红色，带负号）
        ctx.fillStyle = '#E74C3C'  // 红色表示减少
        ctx.font = 'bold 20px "PingFang SC", sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${ft.value}`, centerX - 20, centerY)
      } else {
        // 绘制文字
        ctx.fillStyle = ft.color
        ctx.font = 'bold 24px cursive, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // 添加阴影效果
        ctx.shadowColor = 'rgba(0,0,0,0.3)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        ctx.fillText(ft.text, ft.x, ft.y + ft.offsetY)
        
        // 重置阴影
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      }
    })
    
    ctx.restore()
  }

  renderMacaronBackground() {
    const ctx = this.ctx
    
    // ===== 顶部状态栏 =====
    // 顶部状态栏背景（圆角）
    const headerHeight = 45
    const headerRadius = 15  // 圆角半径
    
    ctx.fillStyle = UI_COLORS.header
    fillRoundRect(ctx, this.mapX, this.mapY, this.mapWidth, headerHeight, headerRadius)
    
    // 顶部状态栏边框（圆角）
    ctx.strokeStyle = UI_COLORS.headerBorder
    ctx.lineWidth = 2
    strokeRoundRect(ctx, this.mapX, this.mapY, this.mapWidth, headerHeight, headerRadius)
    
    // 顶部状态栏底部阴影
    ctx.fillStyle = 'rgba(150, 130, 190, 0.3)'
    ctx.fillRect(this.mapX + headerRadius, this.mapY + headerHeight, this.mapWidth - headerRadius * 2, 3)
    
    // ===== 等候区：双层托盘效果 =====
    this.renderTray(ctx, 
      this.waitingArea.trayX, this.waitingArea.trayY, 
      this.waitingArea.trayWidth, this.waitingArea.trayHeight,
      UI_COLORS.waiting.outer,
      UI_COLORS.waiting.inner,
      30,          // 圆角
      6    // padding（托盘外层和内层边距）
    )
    
    // ===== 治疗区：双层托盘效果（支持背景图，往下30px）=====
    this.renderTray(ctx, 
      this.bedArea.trayX, this.bedArea.trayY, 
      this.bedArea.trayWidth, this.bedArea.trayHeight,
      UI_COLORS.treatment.outer,
      UI_COLORS.treatment.inner,
      30,          // 圆角
      6,           // padding
      this.bedAreaBgImage,  // 背景图（如果有）
      15           // 背景图Y轴偏移：往下
    )
    
    // ===== 器材室：双层托盘效果 =====
    this.renderTray(ctx, 
      this.equipmentRoom.trayX, this.equipmentRoom.trayY, 
      this.equipmentRoom.trayWidth, this.equipmentRoom.trayHeight,
      UI_COLORS.equipment.outer,
      UI_COLORS.equipment.inner,
      30,          // 圆角
      6           // padding
    )
    
    // ===== 悬浮标题标签（移到外层内部，避免被挤出）=====
    // 等候区：显示本关进度（已生成/总数）
    const levelConfig = getLevelConfig(this.currentLevel)
    const totalPatientsCount = levelConfig.patients.length
    const waitingText = `等候区 ${this.spawnedPatientsCount}/${totalPatientsCount}`
    this.renderFloatingBadge(ctx, this.waitingArea.trayX + this.waitingArea.trayWidth / 2, 
                             this.waitingArea.trayY + 16, waitingText, 
                             UI_COLORS.waiting.badgeBg, UI_COLORS.waiting.badgeBorder)
    
    // 治疗区托盘标题（暂时隐藏）
    // this.renderFloatingBadge(ctx, this.bedArea.trayX + this.bedArea.trayWidth / 2, 
    //                          this.bedArea.trayY + 16, '治疗区', 
    //                          UI_COLORS.treatment.badgeBg, UI_COLORS.treatment.badgeBorder)
    
    this.renderFloatingBadge(ctx, this.equipmentRoom.trayX + this.equipmentRoom.trayWidth / 2, 
                             this.equipmentRoom.trayY + 16, '器材室', 
                             UI_COLORS.equipment.badgeBg, UI_COLORS.equipment.badgeBorder)
  }
  
  // 绘制双层托盘（外层深色 + 内层浅色/图片 + 内阴影）
  renderTray(ctx, x, y, width, height, outerColor, innerColor, radius, padding, backgroundImage = null, bgOffsetY = 0) {
    // 托盘投影阴影（在背景上）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    fillRoundRect(ctx, x + 3, y + 4, width, height, radius)
    
    // 外层：深色托盘
    ctx.fillStyle = outerColor
    fillRoundRect(ctx, x, y, width, height, radius)
        
    // 内层：浅色舞台（减去 padding，向下偏移 2px）
    const innerX = x + padding
    const innerY = y + padding 
    const innerWidth = width - padding * 2
    const innerHeight = height - padding * 2
    const innerRadius = Math.max(10, radius - padding / 2)
    
    // 内层：如果有背景图片则绘制图片，否则填充颜色
    if (backgroundImage && backgroundImage.width > 0) {
      // 使用 clip 裁剪圆角区域，然后绘制图片
      ctx.save()
      ctx.beginPath()
      roundRect(ctx, innerX, innerY, innerWidth, innerHeight, innerRadius)
      ctx.clip()
      
      // 计算图片缩放，保持比例铺满内层区域
      const imgRatio = backgroundImage.width / backgroundImage.height
      const areaRatio = innerWidth / innerHeight
      let drawWidth, drawHeight, drawX, drawY
      
      if (imgRatio > areaRatio) {
        // 图片更宽，以高度为基准缩放
        drawHeight = innerHeight
        drawWidth = drawHeight * imgRatio
        drawX = innerX + (innerWidth - drawWidth) / 2
        drawY = innerY + bgOffsetY  // 应用Y轴偏移
      } else {
        // 图片更高，以宽度为基准缩放
        drawWidth = innerWidth
        drawHeight = drawWidth / imgRatio
        drawX = innerX
        drawY = innerY + (innerHeight - drawHeight) / 2 + bgOffsetY  // 应用Y轴偏移
      }
      
      ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight)
      ctx.restore()
    } else {
      // 内层底色
      ctx.fillStyle = innerColor
      fillRoundRect(ctx, innerX, innerY, innerWidth, innerHeight, innerRadius)
    }
 
    // 内层底部微阴影（增加厚度感）
    const bottomGradient = ctx.createLinearGradient(innerX, innerY + innerHeight - 10, innerX, innerY + innerHeight)
    bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.04)')
    ctx.fillStyle = bottomGradient
    ctx.beginPath()
    roundRect(ctx, innerX, innerY + innerHeight - 10, innerWidth, 10, innerRadius)
    ctx.fill()
  }
  
  // 渲染悬浮标题标签（双层胶囊）
  renderFloatingBadge(ctx, centerX, y, text, bgColor, borderColor) {
    const paddingX = 14
    ctx.font = 'bold 16px cursive, sans-serif'
    const textWidth = ctx.measureText(text).width
    const badgeWidth = textWidth + paddingX * 2
    const badgeHeight = 26
    
    // 下层边框（稍大的圆角矩形）
    ctx.fillStyle = borderColor
    fillRoundRect(ctx, centerX - badgeWidth / 2 - 2, y - badgeHeight / 2, 
                  badgeWidth + 4, badgeHeight, 12)
    
    // 上层背景
    ctx.fillStyle = bgColor
    fillRoundRect(ctx, centerX - badgeWidth / 2, y - badgeHeight / 2 + 1, 
                  badgeWidth, badgeHeight - 2, 10)
    
    // 文字
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, centerX, y + 1)
  }

  renderPatients() {
    this.waitingArea.patients.forEach(patient => {
      patient.render(this.ctx, false, this.curedImage)
    })
    
    if (this.selectedPatient) {
      this.selectedPatient.render(this.ctx, true, this.curedImage)
    }
    
  }

  renderUI() {
    const ctx = this.ctx
    
    // 顶部状态栏高度
    const headerHeight = 45
    const titleY = this.mapY + headerHeight / 2
    
    // 标题（可点击打开调试弹窗）
    ctx.fillStyle = '#FFF'
    ctx.font = `${Math.max(16, this.screenWidth * 0.025)}px cursive, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const titleText = '🏥 急诊室模拟器'
    const titleX = this.mapX + 15
    ctx.fillText(titleText, titleX, titleY)
    
    // 保存标题点击区域（用于打开调试弹窗）
    const titleMetrics = ctx.measureText(titleText)
    this.titleBounds = {
      x: titleX - 5,
      y: titleY - 15,
      width: titleMetrics.width + 10,
      height: 30
    }
    
    // 绘制调试弹窗
    if (this.debugModal && this.debugModal.visible) {
      this.renderDebugModal(ctx)
    }
    
    // ===== 三个胶囊以倒计时胶囊为中心显示 =====
    const levelConfig = getLevelConfig(this.currentLevel)
    const capsuleSpacing = 12  // 胶囊之间的间距（padding）
    
    // 1. 先计算三个胶囊的宽度和高度
    // 关卡胶囊
    const levelText = `第${this.currentLevel + 1}关`
    ctx.font = `bold ${Math.max(14, this.screenWidth * 0.02)}px cursive, sans-serif`
    const levelMetrics = ctx.measureText(levelText)
    const levelHeight = 26
    const levelWidth = levelMetrics.width + 16
    
    // 倒计时胶囊
    const countdownText = `${this.timeRemaining}s`
    ctx.font = `bold ${Math.max(13, this.screenWidth * 0.019)}px cursive, sans-serif`
    const countdownMetrics = ctx.measureText(countdownText)
    const countdownHeight = 24
    const countdownIconSize = 20  // 图标尺寸
    const countdownWidth = countdownMetrics.width + countdownIconSize + 20  // 文字 + 图标 + 间距
    
    // 治愈人数胶囊
    const cureText = `${this.curedCount}/${levelConfig.cureTarget}`
    const cureMetrics = ctx.measureText(cureText)
    const cureHeight = 24
    const cureIconSize = 28  // 图标尺寸
    const cureWidth = cureMetrics.width + cureIconSize + 20  // 文字 + 图标 + 间距
    
    // 2. 以倒计时胶囊为中心，计算位置
    const centerX = this.mapX + this.mapWidth / 2
    const countdownX = centerX - countdownWidth / 2
    const countdownY = titleY - countdownHeight / 2
    
    // 3. 绘制三个胶囊
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // 关卡胶囊（在倒计时胶囊左边，间距 capsuleSpacing）
    const levelX = countdownX - capsuleSpacing - levelWidth
    const levelY = titleY - levelHeight / 2
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    fillRoundRect(ctx, levelX, levelY, levelWidth, levelHeight, levelHeight / 2)
    ctx.fillStyle = '#FFF'
    ctx.fillText(levelText, levelX + levelWidth / 2, titleY)
    
    // 倒计时胶囊（居中）
    ctx.fillStyle = this.timeRemaining <= 10 ? 'rgba(231,76,60,0.4)' : 'rgba(255,255,255,0.25)'
    fillRoundRect(ctx, countdownX, countdownY, countdownWidth, countdownHeight, countdownHeight / 2)
    // 绘制倒计时图标
    if (this.timerImage) {
      ctx.drawImage(this.timerImage, countdownX + 6, countdownY + (countdownHeight - countdownIconSize) / 2, countdownIconSize, countdownIconSize)
    }
    // 绘制倒计时文字
    ctx.fillStyle = this.timeRemaining <= 10 ? '#FFE66D' : '#FFF'
    ctx.textAlign = 'left'
    ctx.fillText(countdownText, countdownX + 6 + countdownIconSize + 4, titleY)
    
    // 治愈人数胶囊（在倒计时胶囊右边，间距 capsuleSpacing）
    const cureX = countdownX + countdownWidth + capsuleSpacing
    const cureY = titleY - cureHeight / 2
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    fillRoundRect(ctx, cureX, cureY, cureWidth, cureHeight, cureHeight / 2)
    // 绘制治愈图标
    if (this.curedImage) {
      ctx.drawImage(this.curedImage, cureX + 6, cureY + (cureHeight - cureIconSize) / 2, cureIconSize, cureIconSize)
    }
    // 绘制治愈文字
    ctx.fillStyle = '#FFF'
    ctx.textAlign = 'left'
    ctx.fillText(cureText, cureX + 6 + cureIconSize + 4, titleY)
    
    // 荣誉点胶囊
    const honorX = this.mapX + this.mapWidth - 160
    const honorText = `${this.score}`
    ctx.font = `bold ${Math.max(14, this.screenWidth * 0.02)}px cursive, sans-serif`
    const honorWidth = ctx.measureText(honorText).width + 60
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    fillRoundRect(ctx, honorX - 10, titleY - 13, honorWidth, 26, 13)
    if (this.honorImage) {
      ctx.drawImage(this.honorImage, honorX, titleY - 10, 20, 20)
    }
    ctx.fillStyle = '#FFF'
    ctx.fillText(honorText, honorX + 35, titleY)
    
    // 【暂时隐藏】调试加号按钮（在荣誉点左边）
    /* 【暂时隐藏】调试加号按钮（在荣誉点左边）
    const debugBtnSize = 20
    const debugBtnX = honorX - 30
    const debugBtnY = titleY - 10
    
    // 按钮阴影
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath()
    ctx.arc(debugBtnX + debugBtnSize / 2 + 1, debugBtnY + debugBtnSize / 2 + 2, debugBtnSize / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // 按钮本体（金色）
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(debugBtnX + debugBtnSize / 2, debugBtnY + debugBtnSize / 2, debugBtnSize / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // 加号
    ctx.fillStyle = '#5D4E37'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('+', debugBtnX + debugBtnSize / 2, debugBtnY + debugBtnSize / 2 + 1)
    
    // 记录调试按钮区域用于点击检测
    this.debugHonorBtnBounds = {
      x: debugBtnX,
      y: debugBtnY,
      width: debugBtnSize,
      height: debugBtnSize
    }
    */
    
    // 音量开关按钮（圆形果冻风格）
    const volumeX = this.mapX + this.mapWidth - 45
    const volumeY = titleY - 12
    const volumeSize = 24
    
    // 按钮阴影
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath()
    ctx.arc(volumeX + volumeSize / 2 + 1, volumeY + volumeSize / 2 + 2, volumeSize / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // 按钮本体
    ctx.fillStyle = this.isMuted ? '#E74C3C' : '#27AE60'
    ctx.beginPath()
    ctx.arc(volumeX + volumeSize / 2, volumeY + volumeSize / 2, volumeSize / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // 按钮高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.arc(volumeX + volumeSize / 2 - 3, volumeY + volumeSize / 2 - 3, volumeSize / 4, 0, Math.PI * 2)
    ctx.fill()
    
    // 音量图标
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.isMuted ? '🔇' : '🔊', volumeX + volumeSize / 2, volumeY + volumeSize / 2 + 1)
    
    // 记录音量按钮区域用于点击检测
    this.volumeBtnBounds = {
      x: volumeX,
      y: volumeY,
      width: volumeSize,
      height: volumeSize
    }
    
  }

  // 渲染区域图标
  renderAreaIcon(ctx, areaId, x, y, size) {
    const iconImage = getAreaIcon(areaId)
    if (iconImage) {
      ctx.drawImage(iconImage, x - size/2, y - size/2, size, size)
    } else {
      // 使用emoji回退
      const emojiMap = {
        'waiting': '🪑',
        'treatment': '🛏️',
        'equipment': '🏥'
      }
      ctx.font = `${size}px cursive, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emojiMap[areaId] || '', x, y)
    }
  }

  initTouch() {
    // 首次点击时播放背景音乐（微信要求用户交互后才能播放音频）
    let bgmStarted = false
    
    wx.onTouchStart((e) => {
      console.log('[触摸事件] TouchStart 触发')
      // 第一次点击触发背景音乐
      if (!bgmStarted) {
        bgmStarted = true
        audioManager.playBGM('audio/bgm.mp3')
      }
      
      const touch = e.touches[0]
      const x = touch.clientX
      const y = touch.clientY
      console.log('[触摸事件] 坐标:', x, y)
      console.log('[触摸事件] 等候区病人数量:', this.waitingArea.patients.length)
      this.waitingArea.patients.forEach((p, i) => {
        console.log(`[触摸事件] 病人${i}:`, p.name, '状态:', p.state, '位置:', p.x, p.y)
      })
      
      // 优先处理弹窗点击（按优先级顺序）
      
      // 1. 输液区病人选择弹窗（急救）
      if (this.ivPatientSelectionModal && this.ivPatientSelectionModal.visible) {
        if (this.handleIVPatientSelectionTouch(x, y)) {
          return
        }
      }
      
      // 2. 椅子选择弹窗
      if (this.seatSelectionModal && this.seatSelectionModal.visible) {
        if (this.handleSeatSelectionTouch(x, y)) {
          return
        }
      }
      
      // 3. 游戏胜利弹窗
      if (this.gameWinModal && this.gameWinModal.visible) {
        if (this.handleGameWinTouch(x, y)) {
          return
        }
      }
      
      // 4. 关卡完成弹窗
      if (this.levelCompleteModal && this.levelCompleteModal.visible) {
        if (this.handleLevelCompleteTouch(x, y)) {
          return
        }
      }
      
      // 4. 游戏结束弹窗
      if (this.gameOverModal && this.gameOverModal.visible) {
        if (this.handleGameOverTouch(x, y)) {
          return
        }
      }
      
      // 5. 疾病清单弹窗（点击护士显示）
      if (this.diseaseListModal && this.diseaseListModal.visible) {
        if (this.handleDiseaseListTouch(x, y)) {
          return
        }
      }
      
      /* 【暂时隐藏】检查是否点击调试荣誉点按钮
      if (this.debugHonorBtnBounds &&
          x >= this.debugHonorBtnBounds.x && x <= this.debugHonorBtnBounds.x + this.debugHonorBtnBounds.width &&
          y >= this.debugHonorBtnBounds.y && y <= this.debugHonorBtnBounds.y + this.debugHonorBtnBounds.height) {
        this.score += 100
        console.log('调试：荣誉点 +100，当前：', this.score)
        return
      }
      */
      
      // 检查是否点击音量开关按钮
      if (this.volumeBtnBounds &&
          x >= this.volumeBtnBounds.x && x <= this.volumeBtnBounds.x + this.volumeBtnBounds.width &&
          y >= this.volumeBtnBounds.y && y <= this.volumeBtnBounds.y + this.volumeBtnBounds.height) {
        this.isMuted = !this.isMuted
        audioManager.toggleMute()
        console.log(this.isMuted ? '已静音' : '已取消静音')
        return
      }
      
      // 处理调试弹窗点击
      if (this.debugModal && this.debugModal.visible) {
        // 检查是否点击关闭按钮
        if (this.debugModal.closeBtn &&
            x >= this.debugModal.closeBtn.x && x <= this.debugModal.closeBtn.x + this.debugModal.closeBtn.width &&
            y >= this.debugModal.closeBtn.y && y <= this.debugModal.closeBtn.y + this.debugModal.closeBtn.height) {
          this.debugModal.visible = false
          return
        }
        
        // 检查是否点击调试按钮
        if (this.debugModal.buttons) {
          for (const btn of this.debugModal.buttons) {
            if (x >= btn.x && x <= btn.x + btn.width &&
                y >= btn.y && y <= btn.y + btn.height) {
              btn.action()
              console.log('[调试] 执行:', btn.id)
              return
            }
          }
        }
        
        // 点击弹窗外部关闭
        this.debugModal.visible = false
        return
      }
      
      // 检查是否点击标题打开调试弹窗
      if (this.titleBounds &&
          x >= this.titleBounds.x && x <= this.titleBounds.x + this.titleBounds.width &&
          y >= this.titleBounds.y && y <= this.titleBounds.y + this.titleBounds.height) {
        this.debugModal = { visible: true }
        console.log('[调试] 打开调试面板')
        return
      }
      
      // 检查是否在重置按钮区域（右上角）
      if (x > this.screenWidth - 100 && y < 60) {
        this.reset()
        return
      }
      
      // 检查是否点击器材区的发送按钮
      if (this.equipmentRoom.isClickOnEquipmentSendButton(x, y)) {
        // 设置按下状态并显示动效
        this.equipmentRoom.equipmentSendBtnPressed = true
        setTimeout(() => {
          this.equipmentRoom.equipmentSendBtnPressed = false
        }, 150)
        this.handleSendButtonClick()
        return
      }
      
      // 检查是否点击器材区的清空按钮
      if (this.equipmentRoom.isClickOnEquipmentClearButton(x, y)) {
        // 设置按下状态并显示动效
        this.equipmentRoom.equipmentClearBtnPressed = true
        setTimeout(() => {
          this.equipmentRoom.equipmentClearBtnPressed = false
        }, 150)
        // 清空选中的器材
        if (this.equipmentRoom.selectedItems.size > 0) {
          this.equipmentRoom.clearSelection()
          console.log('已清空选中的器材')
        }
        return
      }
      
      // 检查是否点击器材室的物品（新的选择模式）
      const itemId = this.equipmentRoom.getItemAt(x, y)
      if (itemId) {
        // 点击器材时震动（仅真机）
        this.vibrate()
        const item = getItemById(itemId)
        if (item) {
          // 切换选中状态
          const isSelected = this.equipmentRoom.toggleItemSelection(itemId)
          if (isSelected) {
            console.log('选中器材:', item.name)
          } else {
            console.log('取消选中:', item.name)
          }
        }
        return
      }
      
      // 检查是否点击暴走病人（可以拖动回等候区）
      const ragePatient = this.findRagingPatientAt(x, y)
      if (ragePatient) {
        // 开始拖动暴走病人
        this.draggingRagePatient = ragePatient
        this.dragStartX = x
        this.dragStartY = y
        return
      }
      
      // 检查是否点击前台排队的病人（显示椅子选择弹窗）
      console.log('[点击检测] 点击坐标:', x, y)
      const patient = this.waitingArea.getPatientAt(x, y)
      console.log('[点击检测] 找到病人:', patient ? patient.name : '无')
      if (patient) {
        console.log('[点击检测] 病人状态:', patient.state, '耐心:', patient.patience, '是否离开:', patient.isLeaving)
      }
      if (patient && patient.state === 'queuing' && patient.patience > 0 && !patient.isLeaving) {
        console.log('[点击检测] 条件满足，显示弹窗')
        // 点击时震动（仅真机）
        this.vibrate()
        // 显示椅子选择弹窗
        this.showSeatSelectionModal(patient)
        console.log('[点击检测] 弹窗已显示')
        return
      }
      
      // 检查是否点击护士（显示疾病清单）
      if (this.waitingArea.nurse.contains(x, y)) {
        console.log('[点击检测] 点击护士')
        // 点击时震动（仅真机）
        this.vibrate()
        
        // 【新玩家指引】如果是新玩家，立即恢复正常护士图片（移除灯泡）
        if (GameConfig.is_new_player) {
          console.log('[新玩家指引] 护士被点击，恢复正常图片，显示分诊指南')
          this.waitingArea.setNewPlayerMode(false)
        }
        
        // 【关卡提示】第2关及以后，点击护士关闭灯泡提示
        if (this.currentLevel >= 1 && this.waitingArea.nurse.showLevelHint) {
          saveLevelHintStatus(this.currentLevel, true)
          this.waitingArea.nurse.setLevelHint(false)
          console.log(`[关卡提示] 第${this.currentLevel + 1}关灯泡已关闭`)
        }
        
        // 显示疾病清单弹窗
        this.showDiseaseListModal()
        return
      }
      
      // 检查是否点击输液椅上的病人
      const ivSeatPatient = this.findIVSeatPatientAt(x, y)
      if (ivSeatPatient) {
        console.log('[点击检测] 点击输液椅上病人:', ivSeatPatient.name)
        this.vibrate()
        
        // 如果治疗已完成，点击触发治愈
        if (ivSeatPatient.ivTreatmentComplete) {
          this.completeIVTreatment(ivSeatPatient)
        } else {
          // 治疗未完成，显示急救弹窗
          this.showIVPatientSelectionModal(ivSeatPatient)
        }
        return
      }
    })
    
    // 触摸移动 - 拖动暴走病人
    wx.onTouchMove((e) => {
      if (!this.draggingRagePatient) return
      
      const touch = e.touches[0]
      const x = touch.clientX
      const y = touch.clientY
      
      // 更新暴走病人位置（跟随手指）
      this.draggingRagePatient.x = x - this.draggingRagePatient.width / 2
      this.draggingRagePatient.y = y - this.draggingRagePatient.height / 2
      this.draggingRagePatient.isMoving = false
    })
    
    // 触摸结束 - 释放暴走病人
    wx.onTouchEnd((e) => {
      if (!this.draggingRagePatient) return
      
      const patient = this.draggingRagePatient
      const x = patient.x + patient.width / 2
      const y = patient.y + patient.height / 2
      
      // 检查是否在等候区内
      if (this.waitingArea.contains(x, y)) {
        // 拖回等候区，解锁医生并开始正常离开流程
        // 解锁医生
        if (patient.rageTargetDoctor) {
          patient.rageTargetDoctor.unlockByPatient()
        }
        // 重置暴走状态
        patient.isRaging = false
        patient.rageTargetDoctor = null
        patient.hasLockedDoctor = false
        patient.tomatoThrown = false  // 重置爆炸图标状态
        patient.isMoving = false      // 确保可以开始新的移动
        // 重置暴走标记
        this.hasRagingPatient = false
        // 开始正常离开流程（会扣除爱心）
        console.log('拖回等候区，开始离开流程', patient.name)
        this.startPatientLeaving(patient)
        wx.showToast({
          title: '成功制止暴走病人！',
          icon: 'none',
          duration: 1500
        })
      } else {
        // 没有拖回等候区
        // 如果已经锁定医生，继续跟随；否则继续走向治疗区
        if (patient.hasLockedDoctor) {
          patient.updateFollowPosition()
        }
      }
      
      this.draggingRagePatient = null
    })
  }

  notifyDoctors(bed) {
    // 如果病床已经被分配给某个医生，或者病人已被治愈，不再通知
    if (bed.assignedDoctor || !bed.patient || bed.patient.isCured) {
      return
    }
    
    let nearestDoctor = null
    let minDist = Infinity
    
    this.doctors.forEach(doctor => {
      // 医生必须处于空闲状态，且没有其他目标病床
      if (doctor.state === 'idle' && !doctor.targetBed) {
        const dist = Math.hypot(doctor.x - bed.x, doctor.y - bed.y)
        if (dist < minDist) {
          minDist = dist
          nearestDoctor = doctor
        }
      }
    })
    
    if (nearestDoctor) {
      bed.assignedDoctor = nearestDoctor
      nearestDoctor.currentLevel = this.currentLevel
      nearestDoctor.assignToBed(bed)
    }
  }

  // 自动分配病人到空闲病床（按椅子优先级：急症椅>危重椅>普通椅）
  autoAssignPatientsToBeds() {
    // 查找真正空闲的病床（排除已有病人正在走向的）
    const emptyBed = this.findTrulyEmptyBed()
    if (!emptyBed) {
      return // 没有空闲病床
    }
    
    // 获取所有真正坐在椅子上（已到达椅子位置、停止移动、且满足延迟时间）的病人
    const waitingPatients = this.waitingArea.patients.filter(patient => {
      // 排除正在走向病床的病人
      if (patient.state === 'movingToBed' || patient.targetBed) {
        return false
      }
      
      // 必须坐在椅子上且已停止移动
      if (patient.state !== 'seated' || !patient.seat || patient.isMoving) {
        return false
      }
      
      // 检查是否在椅子上坐够了延迟时间
      const seatedTime = Date.now() - (patient.seatedAt || 0)
      if (seatedTime < 2000) { // 2秒延迟
        return false
      }
      
      // 其他基本条件
      return !patient.inBed && // 不在床上
             patient.patience > 0 && // 有耐心
             !patient.isLeaving && // 不在离开状态
             !patient.isRaging && // 不在暴走状态
             !patient.tomatoThrown // 没有开始离开流程
    })
    
    if (waitingPatients.length === 0) {
      return // 没有可分配的病人
    }
    
    // 按椅子优先级排序（重症椅 priority=2 > 普通椅 priority=3）
    waitingPatients.sort((a, b) => {
      const priorityA = a.seat.priority || 3
      const priorityB = b.seat.priority || 3
      return priorityA - priorityB // 数字越小优先级越高
    })
    
    // 分配优先级最高的病人到病床
    const patientToAssign = waitingPatients[0]
    
    // 立即标记病床为已占用（只设置引用，不设置位置），防止其他病人被分配
    emptyBed.patient = patientToAssign
    
    // 设置病人目标病床并开始移动（比正常速度快1.5倍）
    patientToAssign.targetBed = emptyBed
    patientToAssign.state = 'movingToBed'
    patientToAssign.moveSpeed = 0.18 // 正常速度是0.12，快1.5倍
    
    // 保存当前座位类型用于日志
    const seatType = patientToAssign.seat?.type || 'normal'
    const typeName = seatType === 'critical' ? '重症椅' : '普通椅'
    
    // 计算病床目标位置
    const targetX = emptyBed.x + emptyBed.width / 2 - patientToAssign.width / 2
    const targetY = emptyBed.y + emptyBed.height / 2 - patientToAssign.height / 2 + emptyBed.height * 0.02
    
    // 让病人走向病床
    patientToAssign.moveTo(targetX, targetY)
    
    // 从等候区的椅子上移除（但保留在patients列表中直到到达病床）
    if (patientToAssign.seat) {
      patientToAssign.seat.occupied = false
      patientToAssign.seat.patient = null
      patientToAssign.seat = null
    }
    
    // 设置到达病床后的回调
    const game = this
    patientToAssign.onArriveAtBed = function(bed) {
      // 正式完成病床分配（设置尺寸和位置）
      bed.assignPatient(this)
      // 从等候区正式移除
      game.waitingArea.removePatient(this)
      // 通知医生
      game.notifyDoctors(bed)
    }
    
    console.log(`病人开始走向病床: ${emptyBed.id + 1}号床，来自${typeName}`)
  }

  // 直接将病人送去病床（急救功能）- 点击后直接出现在病床上
  sendPatientToBedDirectly(patient) {
    // 查找空闲病床
    const emptyBed = this.bedArea.findEmptyBed()
    if (!emptyBed) {
      wx.showToast({
        title: '暂无空闲病床',
        icon: 'none',
        duration: 1000
      })
      return
    }
    
    // 【关键修复】如果病人在输液椅上，先从输液椅移除
    if (patient.seat) {
      patient.seat.clear()
      patient.seat = null
      console.log(`急救：病人${patient.name}从输液椅移除`)
    }
    
    // 从等候区移除病人
    this.waitingArea.removePatient(patient)
    
    // 直接将病人分配到病床（不再走过去，直接出现）
    emptyBed.assignPatient(patient)
    
    // 通知医生
    this.notifyDoctors(emptyBed)
    
    console.log(`急救：病人${patient.name}直接出现在${emptyBed.id + 1}号床`)
  }
  
  // 将病人送往治疗区的输液治疗椅 - 点击后直接出现在输液椅上
  sendPatientToIVSeat(patient) {
    const emptySeat = this.bedArea.findEmptyIVSeat()
    if (!emptySeat) {
      wx.showToast({
        title: '输液椅已满',
        icon: 'none',
        duration: 1000
      })
      return
    }
    
    // 从等候区移除病人
    this.waitingArea.removePatient(patient)
    
    // 直接将病人分配到输液椅（不再走过去，直接出现）
    emptySeat.assignPatient(patient)
    
    console.log(`病人 ${patient.name} 直接出现在输液椅`)
  }
  
  // 完成输液治疗（点击已完成的病人）
  completeIVTreatment(patient) {
    if (!patient || !patient.ivTreatmentComplete || patient.scoreAdded) return
    
    // 标记已计分
    patient.scoreAdded = true
    
    // 增加分数和治愈人数
    const addedScore = 10 + Math.floor(Math.random() * 20)
    this.score += addedScore
    this.curedCount++
    
    // 添加浮动奖励动效（荣誉点 + 治愈，两行显示）
    this.addFloatingRewardsCombined(addedScore, 1, patient.x, patient.y)
    
    // 病人离开
    if (patient.seat) {
      patient.seat.clear()
    }
    
    // 检查是否完成关卡目标
    this.checkLevelTarget()
    
    console.log(`输液治疗完成: ${patient.name}, 获得 ${addedScore} 分`)
  }
  
  // 查找真正空闲的病床（排除已有病人正在走向的）
  findTrulyEmptyBed() {
    // 获取所有正在被走向的病床
    const targetedBeds = new Set()
    this.waitingArea.patients.forEach(p => {
      if (p.targetBed && p.state === 'movingToBed') {
        targetedBeds.add(p.targetBed.id)
      }
    })
    
    // 找到既没有病人，也没有被分配的病床
    return this.bedArea.beds.find(bed => bed.isEmpty() && !targetedBeds.has(bed.id))
  }

  // 显示病情分诊弹窗（自定义小弹窗，显示在等候区）
  showSeatSelectionModal(patient) {
    const hasEmptyIVSeat = this.bedArea.findEmptyIVSeat() !== null
    const hasEmptyBed = this.bedArea.findEmptyBed() !== null
    const hasEnoughHonor = this.score >= 10  // 检查荣誉点是否足够10点
    
    this.seatSelectionModal = {
      visible: true,
      isAnimating: true,
      animationTime: 0,
      patient: patient,
      buttons: [
        { 
          type: 'emergency', 
          label: '急救', 
          color: '#E45555', 
          enabled: hasEmptyBed,
          isEmergency: true  // 标记为急救按钮
        },
        { 
          type: 'iv', 
          label: '治疗', 
          color: '#54A0FF', 
          enabled: hasEmptyIVSeat,
          isIV: true  // 标记为输液按钮
        },
        { 
          type: 'normal', 
          label: '安抚', 
          color: '#F5B2AE', 
          enabled: hasEnoughHonor,  // 荣誉点足够10点才可用
          isNormal: true,  // 标记为普通按钮
          disabledReason: hasEnoughHonor ? '' : '荣誉点不足'  // 禁用原因
        }
      ]
    }
  }

  // 处理病情分诊弹窗的点击
  handleSeatSelectionTouch(x, y) {
    if (!this.seatSelectionModal || !this.seatSelectionModal.visible) return false
    
    const modal = this.seatSelectionModal
    
    // 检查是否点击了某个按钮（使用渲染时保存的按钮位置）
    for (let i = 0; i < modal.buttons.length; i++) {
      const btn = modal.buttons[i]
      
      if (x >= btn.renderX && x <= btn.renderX + btn.renderWidth &&
          y >= btn.renderY && y <= btn.renderY + btn.renderHeight) {
        
        // 点击按钮时震动
        this.vibrate()
        
        if (!btn.enabled) {
          // 如果是安抚按钮且禁用（荣誉点不足）
          if (btn.isNormal && btn.disabledReason === '荣誉点不足') {
            this.showHonorTip(btn.renderX + btn.renderWidth / 2, btn.renderY)
          } else {
            // 该类型椅子已满
            wx.showToast({
              title: `${btn.label}已满`,
              icon: 'none',
              duration: 1000
            })
          }
          return true
        }
        
        // 如果是急救按钮，直接送去病床
        if (btn.isEmergency) {
          this.sendPatientToBedDirectly(modal.patient)
        } else if (btn.isIV) {
          // 输液：前往治疗区的输液治疗椅坐下
          this.sendPatientToIVSeat(modal.patient)
        } else if (btn.isNormal) {
          // 安抚：消耗荣誉点10点，耐心值暂停减少5秒
          this.score -= 10
          // 显示荣誉点减少动效
          this.addFloatingHonorChange(modal.patient.x, modal.patient.y - 50, -10)
          // 设置病人耐心暂停状态
          modal.patient.startPatiencePause(5000)  // 暂停5秒
          modal.patient.showPatienceBar = true
        }
        
        // 关闭弹窗
        this.seatSelectionModal = null
        return true
      }
    }
    
    // 点击弹窗外部关闭弹窗
    if (x < modal.x || x > modal.x + modal.width ||
        y < modal.y || y > modal.y + modal.height) {
      this.seatSelectionModal = null
      return true
    }
    
    return false
  }

  // 绘制病情分诊弹窗（立体卡片风格：奶白底+粉边框+悬浮标题+立体按钮）
  renderSeatSelectionModal() {
    if (!this.seatSelectionModal || !this.seatSelectionModal.visible) return
    
    const ctx = this.ctx
    const modal = this.seatSelectionModal
    const patient = modal.patient
    
    // 弹窗尺寸（更大的立体卡片）
    const modalWidth = 160
    const modalHeight = 125
    
    // 弹窗位置：在病人头部右侧显示
    let modalX = patient.x + patient.width -25
    let modalY = patient.y -180
    
    // 保存弹窗位置用于点击检测
    modal.x = modalX
    modal.y = modalY
    modal.width = modalWidth
    modal.height = modalHeight
    
    // ===== 入场动画计算 =====
    const { scale, opacity } = this.calculateModalAnimation(modal)
    
    ctx.save()
    
    // 应用动画变换
    this.applyModalTransform(ctx, modalX, modalY, modalWidth, modalHeight, scale)
    
    // ===== 1. 主卡片：奶白色底 + 粉色边框 =====
    ctx.fillStyle = '#FDF9F6'  // 奶白色
    fillRoundRect(ctx, modalX, modalY, modalWidth, modalHeight, 16)
    
    // 粉色边框
    ctx.strokeStyle = '#F1D5D6'
    ctx.lineWidth = 3
    strokeRoundRect(ctx, modalX, modalY, modalWidth, modalHeight, 16)
    
    // ===== 2. 顶部悬浮标题（蓝色渐变胶囊，向上偏移）=====
    const titleBadgeWidth = 90
    const titleBadgeHeight = 28
    const titleBadgeX = modalX + (modalWidth - titleBadgeWidth) / 2
    const titleBadgeY = modalY - 14  // 向上偏移出边界
    
    // 标题阴影
    ctx.fillStyle = '#5A9BD0'
    fillRoundRect(ctx, titleBadgeX, titleBadgeY + 3, titleBadgeWidth, titleBadgeHeight, 14)
    
    // 标题渐变背景（模拟从上到下的渐变）
    const titleGradient = ctx.createLinearGradient(0, titleBadgeY, 0, titleBadgeY + titleBadgeHeight)
    titleGradient.addColorStop(0, '#94C6EB')
    titleGradient.addColorStop(1, '#73AEE3')
    ctx.fillStyle = titleGradient
    fillRoundRect(ctx, titleBadgeX, titleBadgeY, titleBadgeWidth, titleBadgeHeight, 14)
    
    // 标题文字
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('病情分诊', modalX + modalWidth / 2, titleBadgeY + titleBadgeHeight / 2 + 1)
    
    // ===== 4. 疾病图标区域（中央大图标）=====
    const iconY = modalY + 48
    const iconSize = 28
    
    // 图标背景圆圈
    ctx.fillStyle = 'rgba(148, 198, 235, 0.15)'
    ctx.beginPath()
    ctx.arc(modalX + modalWidth / 2, iconY, iconSize, 0, Math.PI * 2)
    ctx.fill()
    
    // 病情图标（优先使用图片，没有则回退到emoji）
    const diseaseId = patient.disease ? patient.disease.disease_id : null
    const diseaseImage = diseaseId && this.diseaseImages ? this.diseaseImages[diseaseId] : null
    
    if (diseaseImage && diseaseImage.width > 0) {
      // 使用疾病图片，限制在圆圈内
      const imgSize = iconSize * 1.5  // 图片稍大一点点
      ctx.drawImage(diseaseImage, 
        modalX + modalWidth / 2 - imgSize / 2, 
        iconY - imgSize / 2, 
        imgSize, 
        imgSize
      )
    } else {
      // 回退到emoji
      ctx.fillStyle = '#333'
      ctx.font = '24px "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(patient.condition.icon, modalX + modalWidth / 2, iconY)
    }
    
    // 病情名称（图标下方）
    ctx.fillStyle = '#666'
    ctx.font = 'bold 11px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(patient.condition.name, modalX + modalWidth / 2, iconY + iconSize -3)

    // ===== 5. 三个立体胶囊按钮 =====
    const btnWidth = 38
    const btnHeight = 24
    const btnSpacing = 8
    const totalBtnsWidth = btnWidth * 3 + btnSpacing * 2
    const btnStartX = modalX + (modalWidth - totalBtnsWidth) / 2
    const btnBottomPadding = 10  // 距离底部 20px
    const btnY = modalY + modalHeight - btnHeight - btnBottomPadding
    
    // 按钮配色（对应 抢救/治疗/安抚）
    const btnColors = [
      { normal: '#E45555', shadow: '#C44444' },  // 红色-急救（与分诊指南紧急颜色一致）
      { normal: '#54A0FF', shadow: '#3D8AE5' },  // 蓝色-治疗
      { normal: '#F5B2AE', shadow: '#E0908C' }   // 粉色-安抚
    ]
    
    modal.buttons.forEach((btn, i) => {
      const btnX = btnStartX + i * (btnWidth + btnSpacing)
      const colors = btnColors[i]
      
      // 保存按钮位置用于点击检测
      btn.renderX = btnX
      btn.renderY = btnY
      btn.renderWidth = btnWidth
      btn.renderHeight = btnHeight
      
      // 按钮圆角（胶囊形状）
      const radius = btnHeight / 2
      
      if (btn.enabled) {
        // 立体效果：先画底部阴影（厚度）
        ctx.fillStyle = colors.shadow
        fillRoundRect(ctx, btnX, btnY + 3, btnWidth, btnHeight, radius)
        
        // 再画按钮主体
        ctx.fillStyle = colors.normal
        fillRoundRect(ctx, btnX, btnY, btnWidth, btnHeight, radius)
      } else {
        // 不可用状态：灰色扁平
        ctx.fillStyle = '#D0D0D0'
        fillRoundRect(ctx, btnX, btnY + 2, btnWidth, btnHeight, radius)
      }
      
      // 按钮文字
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 11px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      // 根据禁用原因显示不同文字
      let labelText
      if (btn.enabled) {
        labelText = btn.label
      } else if (btn.isNormal) {
        labelText = '安抚'  // 安抚按钮即使禁用了也显示安抚
      } else {
        labelText = '满'
      }
      ctx.fillText(labelText, btnX + btnWidth / 2, btnY + btnHeight / 2 + (btn.enabled ? 1 : 2))
    })
    
    // 绘制按钮提示（如果有）
    this.renderButtonTooltip()
    
    // 绘制荣誉点不足提示（如果有）
    this.renderHonorTip(ctx)
    
    // 恢复变换（结束动画）
    ctx.restore()
  }

  // 显示荣誉点不足提示
  showHonorTip(x, y) {
    this.honorTip = {
      x: x,
      y: y,
      visible: true,
      startTime: Date.now()
    }
    // 1.5秒后自动隐藏
    setTimeout(() => {
      if (this.honorTip && Date.now() - this.honorTip.startTime >= 1400) {
        this.honorTip = null
      }
    }, 1500)
  }

  // 绘制荣誉点不足提示（带箭头的轻量白色提示条）
  renderHonorTip(ctx) {
    if (!this.honorTip || !this.honorTip.visible) return
    
    const elapsed = Date.now() - this.honorTip.startTime
    const duration = 1500
    const progress = Math.min(elapsed / duration, 1)
    
    // 淡入淡出效果
    let opacity = 1
    if (progress < 0.2) {
      opacity = progress / 0.2  // 淡入
    } else if (progress > 0.7) {
      opacity = 1 - (progress - 0.7) / 0.3  // 淡出
    }
    
    const tipX = this.honorTip.x
    const tipY = this.honorTip.y - 45  // 提示条在按钮上方
    const tipWidth = 80
    const tipHeight = 28
    
    ctx.save()
    ctx.globalAlpha = opacity
    
    // 绘制提示条背景（圆角矩形）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
    fillRoundRect(ctx, tipX - tipWidth / 2, tipY, tipWidth, tipHeight, 6)
    ctx.shadowColor = 'transparent'
    
    // 绘制箭头（向下指向按钮）
    const arrowSize = 6
    const arrowY = tipY + tipHeight  // 箭头在提示条下方
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.beginPath()
    ctx.moveTo(tipX, arrowY + arrowSize)  // 箭头顶点向下
    ctx.lineTo(tipX - arrowSize, arrowY)  // 左上
    ctx.lineTo(tipX + arrowSize, arrowY)  // 右上
    ctx.closePath()
    ctx.fill()
    
    // 绘制文字
    ctx.fillStyle = '#666666'
    ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('荣誉点不足', tipX, tipY + tipHeight / 2)
    
    ctx.restore()
  }

  reset() {
    wx.showModal({
      title: '重新开始',
      content: '要重新开始游戏吗？',
      success: (res) => {
        if (res.confirm) {
          // 清理所有定时器
          clearInterval(this.timeTimer)
          clearTimeout(this.spawnTimer)
          if (this.initialSpawnTimer) {
            clearTimeout(this.initialSpawnTimer)
          }
          // 【已移除】自动分配定时器已禁用
          // if (this.bedAssignmentTimer) {
   // clearInterval(this.bedAssignmentTimer)
// }
          if (this.countdownTimer) {
            clearInterval(this.countdownTimer)
          }
          
          this.score = 0
          this.gameTime = 0
          this.curedCount = 0
          this.timeRemaining = 0
          this.patientIdCounter = 1
          this.hasRagingPatient = false  // 重置暴走标记
          this.waitingArea.clear()
          this.bedArea.clear()
          this.doctors.forEach(doctor => {
            doctor.targetBed = null
            doctor.state = 'idle'
            doctor.isLocked = false  // 重置医生锁定状态
            doctor.lockedByPatient = null
          })
        }
      }
    })
  }
  
  // 游戏结束
  gameOver() {
    this.isRunning = false
    clearInterval(this.timeTimer)
    clearTimeout(this.spawnTimer)
    if (this.initialSpawnTimer) {
      clearTimeout(this.initialSpawnTimer)
    }
    // 【已移除】自动分配定时器已禁用
    // if (this.bedAssignmentTimer) {
    //   clearInterval(this.bedAssignmentTimer)
 // }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
    
    // 关闭所有其他弹窗，确保游戏结束弹窗优先级最高
    this.seatSelectionModal = null
    this.levelCompleteModal = null
    this.gameWinModal = null
    this.levelToast = null
    
    // 设置游戏结束弹窗状态
    this.gameOverModal = {
      visible: true,
      isAnimating: true,
      animationTime: 0,
      buttons: [
        { text: '重新开始', x: 0, y: 0, width: 120, height: 40, color: '#27AE60', action: 'restart' },
        { text: '原地复活', x: 0, y: 0, width: 120, height: 40, color: '#999999', action: 'revive', disabled: true }
      ]
    }
    
    // 绑定触摸事件处理弹窗点击
    this.bindModalTouch()
  }
  
  // 检查关卡是否完成（所有病人都已出现且被治愈或离开）
  checkLevelComplete() {
    // 如果游戏不在运行中，不检查
    if (!this.isRunning) {
      console.log('游戏不在运行中，跳过检查')
      return
    }
    
    // 延迟检查，确保所有病人都已处理
    setTimeout(() => {
      // 再次检查游戏状态
      if (!this.isRunning) {
        console.log('游戏已停止，跳过检查')
        return
      }
      
      const levelConfig = getLevelConfig(this.currentLevel)
      const totalPatients = levelConfig.patients.length
      const occupiedBeds = this.bedArea.getOccupiedBeds().length
      const waitingPatients = this.waitingArea.patients.length
      
      console.log('检查关卡完成:', 
        '已生成:', this.spawnedPatientsCount, 
        '目标:', totalPatients,
        '等候区:', waitingPatients,
        '病床占用:', occupiedBeds,
        'levelComplete:', this.levelComplete,
        'isRunning:', this.isRunning)
      
      // 如果本关所有病人都已出现，且没有剩余病人在等候或治疗中
      if (this.spawnedPatientsCount >= totalPatients && 
          waitingPatients === 0 &&
          occupiedBeds === 0 &&
          this.isRunning) {
        
        console.log('关卡完成，准备进入下一关')
        if (this.currentLevel < GameConfig.levels.length - 1) {
          // 进入下一关
          this.showLevelCompleteModal()
        } else {
          // 所有关卡完成，游戏胜利
          this.showGameWinModal()
        }
      }
    }, 2000)
  }
  
  // 显示关卡完成提示（自定义确认弹窗）
  showLevelCompleteModal() {
    console.log('显示关卡完成弹窗，当前关卡:', this.currentLevel)
    
    // 停止游戏运行（等待用户点击继续）
    this.isRunning = false
    
    // 显示自定义确认弹窗
    this.levelCompleteModal = {
      visible: true,
      isAnimating: true,
      animationTime: 0,
      title: '本关目标达成',
      content: '迎接下一波病人吧！',
      buttonText: '继续'
    }
  }
  
  // 处理游戏胜利弹窗的点击
  handleGameWinTouch(x, y) {
    console.log('handleGameWinTouch called', x, y, this.gameWinModal)
    if (!this.gameWinModal || !this.gameWinModal.visible) {
      console.log('gameWinModal not visible or null')
      return false
    }
    
    const btn = this.gameWinModal
    console.log('Button bounds:', btn.buttonX, btn.buttonY, btn.buttonWidth, btn.buttonHeight)
    
    if (x >= btn.buttonX && x <= btn.buttonX + btn.buttonWidth &&
        y >= btn.buttonY && y <= btn.buttonY + btn.buttonHeight) {
      console.log('点击了重新开始按钮')
      this.gameWinModal.visible = false
      this.currentLevel = 0
      this.restart()
      return true
    }
    console.log('Click not in button bounds')
    return false
  }
  
  // 处理关卡完成弹窗的点击
  handleLevelCompleteTouch(x, y) {
    if (!this.levelCompleteModal || !this.levelCompleteModal.visible) return false
    
    // 检查是否点击了按钮区域（弹窗中央按钮）
    const modalWidth = 280
    const modalHeight = 160
    const modalX = (this.screenWidth - modalWidth) / 2
    const modalY = (this.screenHeight - modalHeight) / 2
    const btnWidth = 140
    const btnHeight = 44
    const btnX = modalX + (modalWidth - btnWidth) / 2
    const btnY = modalY + 105
    
    if (x >= btnX && x <= btnX + btnWidth &&
        y >= btnY && y <= btnY + btnHeight) {
      console.log('点击了开始下一关按钮')
      this.levelCompleteModal.visible = false
      this.nextLevel()
      return true
    }
    return false
  }

  // 处理游戏结束弹窗的点击
  handleGameOverTouch(x, y) {
    if (!this.gameOverModal || !this.gameOverModal.visible) return false
    
    const modalWidth = 280
    const modalHeight = 160
    const modalX = (this.screenWidth - modalWidth) / 2
    const modalY = (this.screenHeight - modalHeight) / 2
    
    // 按钮
    const btnY = modalY + 100
    const btnGap = 20
    const btnWidth = 120
    const btnHeight = 40
    const totalBtnWidth = btnWidth * 2 + btnGap
    const startX = modalX + (modalWidth - totalBtnWidth) / 2
    
    // 检查每个按钮
    for (let i = 0; i < this.gameOverModal.buttons.length; i++) {
      const btn = this.gameOverModal.buttons[i]
      const btnX = startX + i * (btnWidth + btnGap)
      
      if (x >= btnX && x <= btnX + btnWidth &&
          y >= btnY && y <= btnY + btnHeight) {
        
        if (btn.disabled) {
          wx.showToast({
            title: '功能暂未开放',
            icon: 'none',
            duration: 1000
          })
          return true
        }
        
        if (btn.action === 'restart') {
          console.log('点击了重新开始按钮')
          this.gameOverModal.visible = false
          this.restart()
          return true
        }
      }
    }
    
    return false
  }

  // 处理发送按钮点击
  handleSendButtonClick() {
    // 获取选中的物品
    const selectedItems = this.equipmentRoom.getSelectedItems()
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请先选择物品',
        icon: 'none',
        duration: 1200
      })
      return
    }
    
    // 获取选中物品ID集合
    const selectedItemIds = selectedItems.map(item => item.id)
    
    // 获取所有正在申请物品且有未满足需求的医生
    const requestingDoctors = []
    for (const doctor of this.doctors) {
      const requiredIds = doctor.getRequiredItemIds()
      if (requiredIds.length > 0) {
        requestingDoctors.push(doctor)
      }
    }
    
    if (requestingDoctors.length === 0) {
      wx.showToast({
        title: '暂无医生需要物品',
        icon: 'none',
        duration: 1200
      })
      return
    }
    
    // 找出托盘物品可以配送给哪个医生
    // 规则：托盘所有物品必须都属于同一个医生的未收到需求列表
    const validDoctorMatches = []
    
    for (const doctor of requestingDoctors) {
      const requiredIds = doctor.getRequiredItemIds()
      
      // 检查选中物品是否都在该医生的需求列表中
      const allItemsMatch = selectedItemIds.every(id => requiredIds.includes(id))
      
      if (allItemsMatch) {
        // 计算匹配的ID列表
        const matchedIds = selectedItemIds.filter(id => requiredIds.includes(id))
        validDoctorMatches.push({
          doctor,
          matchedIds,
          requiredIds
        })
      }
    }
    
    // 如果没有医生能完全匹配托盘物品
    if (validDoctorMatches.length === 0) {
      // 检查是否有部分匹配（用于提示）
      const partialMatches = []
      for (const doctor of requestingDoctors) {
        const requiredIds = doctor.getRequiredItemIds()
        const matchedIds = selectedItemIds.filter(id => requiredIds.includes(id))
        if (matchedIds.length > 0) {
          partialMatches.push({ doctor, matchedCount: matchedIds.length })
        }
      }
      
      if (partialMatches.length > 0) {
        // 有部分匹配，但托盘里有不属于这些医生的物品
        wx.showToast({
          title: '一次仅能配送一位医生',
          icon: 'none',
          duration: 2000
        })
      } else {
        // 完全无匹配
        const allRequiredNames = requestingDoctors
          .flatMap(d => d.getRequiredItemIds())
          .map(id => getItemById(id).name)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join('、')
        wx.showToast({
          title: `需要: ${allRequiredNames}`,
          icon: 'none',
          duration: 2000
        })
      }
      return
    }
    
    // 如果有多个医生可以匹配，检查托盘物品是否完全相同
    // 场景1：医生A要[肾上腺素]，医生B要[手术剪]，托盘[肾上腺素] → 只能匹配A，不会进这里
    // 场景2：医生A要[肾上腺素]，医生B要[肾上腺素]，托盘[肾上腺素] → 两个都匹配，需要选一个
    let targetDoctor = null
    let matchedIds = null
    
    if (validDoctorMatches.length > 1) {
      // 多个医生匹配，检查是否所有医生的需求物品都相同
      // 如果托盘物品完全相同（比如都是肾上腺素），则可以选择最近的医生
      // 这里简化处理：选择第一个匹配的医生
      targetDoctor = validDoctorMatches[0].doctor
      matchedIds = validDoctorMatches[0].matchedIds
    } else {
      // 只有一个医生完全匹配
      targetDoctor = validDoctorMatches[0].doctor
      matchedIds = validDoctorMatches[0].matchedIds
    }
    
    // 配送该医生在选中物品中的所有匹配物品
    let deliveredCount = 0
    for (const itemId of matchedIds) {
      if (targetDoctor.receiveItem(itemId)) {
        deliveredCount++
        const item = getItemById(itemId)
        console.log('发送', item.name, '给医生')
        
        const drawerCenter = this.equipmentRoom.getDrawerCenter(itemId)
        if (drawerCenter) {
          this.addFloatingItem(item, drawerCenter.x, drawerCenter.y - 20)
        }
      }
    }
    
    // 清空选中状态（发送后重置）
    this.equipmentRoom.clearSelection()
    
    if (deliveredCount > 0) {
      const remainingRequired = targetDoctor.getRequiredItemIds()
      if (remainingRequired.length > 0) {
        const remainingNames = remainingRequired.map(id => getItemById(id).name).join('、')
        wx.showToast({
          title: `还需: ${remainingNames}`,
          icon: 'none',
          duration: 2000
        })
      }
    }
  }
  
  // 进入下一关
  nextLevel() {
    console.log('进入下一关:', this.currentLevel + 1)
    this.currentLevel++
    this.spawnedPatientsCount = 0
    this.levelComplete = false
    this.curedCount = 0
    
    // 清理当前状态
    this.waitingArea.clear()
    this.bedArea.clear()
    this.doctors.forEach(doctor => {
      doctor.targetBed = null
      doctor.state = 'idle'
    })
    
    // 清理轮询定时器
    // 【已移除】自动分配定时器已禁用
    // if (this.bedAssignmentTimer) {
    //   clearInterval(this.bedAssignmentTimer)
 // }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
    
    // 延迟一点再启动，确保清理完成
    setTimeout(() => {
      this.start()
    }, 100)
  }
  
  // 显示游戏胜利弹窗
  showGameWinModal() {
    console.log('显示游戏胜利弹窗')
    
    // 停止游戏但不重置状态
    this.isRunning = false
    clearInterval(this.timeTimer)
    clearTimeout(this.spawnTimer)
    
    this.gameWinModal = {
      visible: true,
      isAnimating: true,
      animationTime: 0,
      title: '🎉 恭喜通关！',
      buttonText: '重新开始'
    }
    console.log('游戏胜利弹窗已创建:', this.gameWinModal)
    
    // 手动触发一帧渲染，确保弹窗显示
    this.render()
  }

  // 重新开始游戏
  restart() {
    // 清理所有定时器
    clearInterval(this.timeTimer)
    clearTimeout(this.spawnTimer)
    if (this.initialSpawnTimer) {
      clearTimeout(this.initialSpawnTimer)
    }
    // 【已移除】自动分配定时器已禁用
    // if (this.bedAssignmentTimer) {
    //   clearInterval(this.bedAssignmentTimer)
 // }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
    
    this.currentLevel = 0
    this.gameOverModal = null
    this.levelCompleteModal = null
    this.gameWinModal = null
    this.levelToast = null
    this.isRunning = false
    this.score = 0
    this.gameTime = 0
    this.curedCount = 0
    this.timeRemaining = 0
    this.patientIdCounter = 1
    this.doctorIdCounter = 1  // 重置医生ID计数器
    this.waitingArea.clear()
    this.bedArea.clear()
    
    // 重新创建医生
    this.doctors = []
    this.createDoctors(2)
    
    this.start()
  }
  
  // 绘制游戏结束弹窗
  renderGameOverModal() {
    if (!this.gameOverModal || !this.gameOverModal.visible) return
    
    const ctx = this.ctx
    const modalWidth = 280
    const modalHeight = 160
    const modalX = (this.screenWidth - modalWidth) / 2
    const modalY = (this.screenHeight - modalHeight) / 2
    
    // ===== 入场动画计算 =====
    const { scale, opacity } = this.calculateModalAnimation(this.gameOverModal)
    
    ctx.save()
    
    // 应用动画变换
    this.applyModalTransform(ctx, modalX, modalY, modalWidth, modalHeight, scale)
    
    // 【已移除】半透明背景遮罩（屏幕不需要蒙层）
    // ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    // ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 弹窗背景
    ctx.fillStyle = '#FFF'
    fillRoundRect(ctx, modalX, modalY, modalWidth, modalHeight, 12)
    
    // 弹窗阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 10
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    // 标题
    ctx.fillStyle = '#E74C3C'
    ctx.font = 'bold 18px cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('游戏结束', modalX + modalWidth / 2, modalY + 20)
    
    // 内容文字（显示原因或默认文字）
    ctx.fillStyle = '#333'
    ctx.font = '14px cursive, sans-serif'
    const reasonText = this.gameOverModal.reason || '恶评漫天飞，你的急诊室被迫关闭'
    // 支持多行文字
    const lines = reasonText.split('\n')
    lines.forEach((line, index) => {
      ctx.fillText(line, modalX + modalWidth / 2, modalY + 50 + index * 20)
    })
    
    // 按钮
    const btnY = modalY + 100
    const btnGap = 20
    const totalBtnWidth = 120 * 2 + btnGap
    const startX = modalX + (modalWidth - totalBtnWidth) / 2
    
    this.gameOverModal.buttons.forEach((btn, index) => {
      btn.x = startX + index * (120 + btnGap)
      btn.y = btnY
      
      // 按钮背景
      ctx.fillStyle = btn.disabled ? '#CCC' : btn.color
      fillRoundRect(ctx, btn.x, btn.y, btn.width, btn.height, 6)
      
      // 按钮文字
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 14px cursive, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(btn.text, btn.x + btn.width / 2, btn.y + btn.height / 2)
    })
    
    // 恢复变换（结束动画）
    ctx.restore()
  }
  
  // 绘制关卡完成弹窗
  renderLevelCompleteModal() {
    if (!this.levelCompleteModal || !this.levelCompleteModal.visible) {
      return
    }
    
    const ctx = this.ctx
    const modalWidth = 280
    const modalHeight = 160
    const modalX = (this.screenWidth - modalWidth) / 2
    const modalY = (this.screenHeight - modalHeight) / 2
    
    // ===== 入场动画计算 =====
    const { scale, opacity } = this.calculateModalAnimation(this.levelCompleteModal)
    
    // 半透明背景遮罩
    ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * opacity})`
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    ctx.save()
    
    // 应用动画变换
    this.applyModalTransform(ctx, modalX, modalY, modalWidth, modalHeight, scale)
    
    // 弹窗背景
    ctx.fillStyle = '#FFF'
    fillRoundRect(ctx, modalX, modalY, modalWidth, modalHeight, 12)
    
    // 标题
    ctx.fillStyle = '#27AE60'
    ctx.font = 'bold 20px cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(this.levelCompleteModal.title, modalX + modalWidth / 2, modalY + 25)
    
    // 内容
    ctx.fillStyle = '#333'
    ctx.font = '16px cursive, sans-serif'
    ctx.fillText(this.levelCompleteModal.content, modalX + modalWidth / 2, modalY + 65)
    
    // 按钮
    const btnWidth = 140
    const btnHeight = 44
    const btnX = modalX + (modalWidth - btnWidth) / 2
    const btnY = modalY + 105
    
    // 按钮背景
    ctx.fillStyle = '#27AE60'
    fillRoundRect(ctx, btnX, btnY, btnWidth, btnHeight, 8)
    
    // 按钮文字
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 16px cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.levelCompleteModal.buttonText, modalX + modalWidth / 2, btnY + btnHeight / 2)
    
    // 恢复变换（结束动画）
    ctx.restore()
  }
  
  // 绘制游戏胜利弹窗
  renderGameWinModal() {
    if (!this.gameWinModal || !this.gameWinModal.visible) {
      return
    }
    
    console.log('渲染游戏胜利弹窗')
    
    const ctx = this.ctx
    const modalWidth = 280
    const modalHeight = 180
    const modalX = (this.screenWidth - modalWidth) / 2
    const modalY = (this.screenHeight - modalHeight) / 2
    
    // ===== 入场动画计算 =====
    const { scale, opacity } = this.calculateModalAnimation(this.gameWinModal)
    
    // 半透明背景遮罩
    ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * opacity})`
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    ctx.save()
    
    // 应用动画变换
    this.applyModalTransform(ctx, modalX, modalY, modalWidth, modalHeight, scale)
    
    // 弹窗背景
    ctx.fillStyle = '#FFF'
    fillRoundRect(ctx, modalX, modalY, modalWidth, modalHeight, 12)
    
    // 标题 - 金色
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 24px cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(this.gameWinModal.title, modalX + modalWidth / 2, modalY + 20)
    
    // 内容（分成两行显示）
    ctx.fillStyle = '#333'
    ctx.font = '16px cursive, sans-serif'
    ctx.fillText('您已完成所有关卡！', modalX + modalWidth / 2, modalY + 65)
    ctx.fillText(`最终得分: ${this.score}`, modalX + modalWidth / 2, modalY + 90)
    
    // 按钮
    const btnWidth = 140
    const btnHeight = 44
    const btnX = modalX + (modalWidth - btnWidth) / 2
    const btnY = modalY + 125
    
    // 更新按钮位置和尺寸（用于点击检测）
    this.gameWinModal.buttonX = btnX
    this.gameWinModal.buttonY = btnY
    this.gameWinModal.buttonWidth = btnWidth
    this.gameWinModal.buttonHeight = btnHeight
    
    // 按钮背景 - 金色
    ctx.fillStyle = '#FFD700'
    fillRoundRect(ctx, btnX, btnY, btnWidth, btnHeight, 8)
    
    // 按钮文字
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 16px cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.gameWinModal.buttonText, modalX + modalWidth / 2, btnY + btnHeight / 2)
    
    // 恢复变换（结束动画）
    ctx.restore()
  }
  
  // 绘制调试弹窗
  renderDebugModal(ctx) {
    if (!this.debugModal || !this.debugModal.visible) return
    
    const modalWidth = 260
    const modalHeight = 280
    const modalX = (this.screenWidth - modalWidth) / 2
    const modalY = (this.screenHeight - modalHeight) / 2
    
    // 半透明背景遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 弹窗背景
    ctx.fillStyle = '#FFF'
    fillRoundRect(ctx, modalX, modalY, modalWidth, modalHeight, 12)
    
    // 标题
    ctx.fillStyle = '#333'
    ctx.font = 'bold 18px "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('🔧 调试面板', modalX + modalWidth / 2, modalY + 15)
    
    // 关闭按钮
    const closeBtnSize = 28
    const closeBtnX = modalX + modalWidth - closeBtnSize - 8
    const closeBtnY = modalY + 8
    this.debugModal.closeBtn = { x: closeBtnX, y: closeBtnY, width: closeBtnSize, height: closeBtnSize }
    
    ctx.fillStyle = '#E74C3C'
    ctx.beginPath()
    ctx.arc(closeBtnX + closeBtnSize/2, closeBtnY + closeBtnSize/2, closeBtnSize/2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('×', closeBtnX + closeBtnSize/2, closeBtnY + closeBtnSize/2 + 1)
    
    // 调试按钮配置
    const buttons = [
      { id: 'addTime', text: '+30秒', color: '#3498DB', action: () => { this.timeRemaining += 30 } },
      { id: 'addCure', text: '+1治愈', color: '#27AE60', action: () => { this.curedCount++ } },
      { id: 'clearLevel', text: '直接通关', color: '#E74C3C', action: () => { 
        // 直接显示关卡完成弹窗
        this.showLevelCompleteModal()
      } },
      { id: 'resetGame', text: '重置游戏', color: '#F39C12', action: () => { this.start() } },
      { id: 'addScore', text: '+100分', color: '#9B59B6', action: () => { this.score += 100 } }
    ]
    
    const btnWidth = 110
    const btnHeight = 42
    const btnGapX = 12
    const btnGapY = 12
    const startX = modalX + (modalWidth - btnWidth * 2 - btnGapX) / 2
    const startY = modalY + 55
    
    this.debugModal.buttons = []
    
    buttons.forEach((btn, index) => {
      const row = Math.floor(index / 2)
      const col = index % 2
      const btnX = startX + col * (btnWidth + btnGapX)
      const btnY = startY + row * (btnHeight + btnGapY)
      
      // 保存按钮位置（增加10px点击padding，让按钮更容易点中）
      this.debugModal.buttons.push({
        id: btn.id,
        x: btnX - 5,
        y: btnY - 5,
        width: btnWidth + 10,
        height: btnHeight + 10,
        action: btn.action
      })
      
      // 绘制按钮
      ctx.fillStyle = btn.color
      fillRoundRect(ctx, btnX, btnY, btnWidth, btnHeight, 6)
      
      // 按钮文字
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 14px "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(btn.text, btnX + btnWidth / 2, btnY + btnHeight / 2)
    })
  }
  
  // 绘制轻量提示（下一关通知）
  renderLevelToast() {
    if (!this.levelToast || !this.levelToast.visible) return
    
    const ctx = this.ctx
    const toastWidth = 200
    const toastHeight = 40
    const toastX = (this.screenWidth - toastWidth) / 2
    const toastY = this.screenHeight / 2
    
    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    fillRoundRect(ctx, toastX, toastY, toastWidth, toastHeight, 20)
    
    // 文字
    ctx.fillStyle = '#FFF'
    ctx.font = '14px cursive, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.levelToast.message, this.screenWidth / 2, toastY + toastHeight / 2)
  }
  
  // 绑定弹窗触摸事件
  bindModalTouch() {
    // 新的触摸开始事件（只在弹窗显示时处理）
    wx.onTouchStart((e) => {
      if (!this.gameOverModal || !this.gameOverModal.visible) return
      
      const touch = e.touches[0]
      const x = touch.clientX
      const y = touch.clientY
      
      // 检查点击了哪个按钮
      for (const btn of this.gameOverModal.buttons) {
        if (x >= btn.x && x <= btn.x + btn.width &&
            y >= btn.y && y <= btn.y + btn.height) {
          if (btn.action === 'restart') {
            this.restart()
          } else if (btn.action === 'revive') {
            wx.showToast({
              title: '原地复活功能开发中',
              icon: 'none',
              duration: 2000
            })
          }
          return
        }
      }
    })
  }
  
  // 显示输液区病人选择弹窗（头上弹窗：急救）
  showIVPatientSelectionModal(patient) {
    const hasEmptyBed = this.bedArea.findEmptyBed() !== null
    
    this.ivPatientSelectionModal = {
      visible: true,
      patient: patient,
      buttons: [
        { 
          type: 'emergency', 
          label: '急救', 
          color: '#E45555',  // 红色（与分诊指南紧急颜色一致）
          enabled: hasEmptyBed
        }
      ]
    }
  }
  
  // 渲染输液区病人选择弹窗（头上弹窗：急救）
  renderIVPatientSelectionModal() {
    if (!this.ivPatientSelectionModal || !this.ivPatientSelectionModal.visible) return
    
    const ctx = this.ctx
    const modal = this.ivPatientSelectionModal
    const patient = modal.patient
    
    // 弹窗尺寸（轻量小弹窗）- 单个按钮，尺寸更小
    const modalWidth = 70
    const modalHeight = 55
    
    // 弹窗位置：在病人头部右侧显示
    let modalX = patient.x + patient.width + 8
    let modalY = patient.y - 60
    
    // 保存位置用于点击检测
    modal.x = modalX
    modal.y = modalY
    modal.width = modalWidth
    modal.height = modalHeight
    
    // 弹窗背景（带阴影）
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 3
    ctx.fillStyle = '#FFF'
    fillRoundRect(ctx, modalX, modalY, modalWidth, modalHeight, 8)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    // 单个按钮居中
    const btnWidth = 50
    const btnHeight = 32
    const btnX = modalX + (modalWidth - btnWidth) / 2
    const btnY = modalY + 12
    
    modal.buttons.forEach((btn) => {
      // 保存按钮位置用于点击检测
      btn.renderX = btnX
      btn.renderY = btnY
      btn.renderWidth = btnWidth
      btn.renderHeight = btnHeight
      
      // 按钮背景
      ctx.fillStyle = btn.enabled !== false ? btn.color : '#CCC'
      fillRoundRect(ctx, btnX, btnY, btnWidth, btnHeight, 6)
      
      // 按钮文字
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 12px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const labelText = btn.enabled !== false ? btn.label : '满'
      ctx.fillText(labelText, btnX + btnWidth / 2, btnY + btnHeight / 2)
    })
  }
  
  // 处理输液区病人选择弹窗的点击
  handleIVPatientSelectionTouch(x, y) {
    if (!this.ivPatientSelectionModal || !this.ivPatientSelectionModal.visible) return false
    
    const modal = this.ivPatientSelectionModal
    
    // 检查是否点击了某个按钮
    for (let i = 0; i < modal.buttons.length; i++) {
      const btn = modal.buttons[i]
      
      if (x >= btn.renderX && x <= btn.renderX + btn.renderWidth &&
          y >= btn.renderY && y <= btn.renderY + btn.renderHeight) {
        
        // 点击按钮时震动
        this.vibrate()
        
        if (btn.enabled === false) {
          wx.showToast({
            title: '暂无空闲病床',
            icon: 'none',
            duration: 1000
          })
          return true
        }
        
        // 关闭当前弹窗
        this.ivPatientSelectionModal = null
        
        // 急救：直接送去病床
        this.sendPatientToBedDirectly(modal.patient)
        
        return true
      }
    }
    
    // 点击弹窗外部关闭弹窗
    if (x < modal.x || x > modal.x + modal.width || y < modal.y || y > modal.y + modal.height) {
      this.ivPatientSelectionModal = null
      return true
    }
    
    return false
  }

  // 显示疾病清单弹窗（点击护士）
  showDiseaseListModal() {
    this.diseaseListModal = {
      visible: true,
      currentPage: 0,  // 当前页码
      itemsPerPage: 4, // 每页显示条数（会根据高度动态计算）
      animationTime: 0, // 动画时间（毫秒）
      isAnimating: true // 是否正在播放入场动画
    }
  }

  // 绘制疾病清单弹窗（参考ui.txt风格：弥散阴影+圆角卡片+胶囊徽章，支持分页）
  renderDiseaseListModal() {
    if (!this.diseaseListModal || !this.diseaseListModal.visible) return
    
    const ctx = this.ctx
    const currentLevelNum = (this.currentLevel || 0) + 1
    
    // 对疾病列表进行排序：新解锁的优先 > 按优先级排序（紧急>普通>轻微）> 未解锁的
    const sortedDiseases = [...GameConfig.diseases].sort((a, b) => {
      const aIsUnlocked = currentLevelNum >= (a.unlock_level || 1)
      const bIsUnlocked = currentLevelNum >= (b.unlock_level || 1)
      const aIsNewUnlock = a.unlock_level === currentLevelNum
      const bIsNewUnlock = b.unlock_level === currentLevelNum
      
      // 新解锁的（unlock_level == currentLevelNum）排在最前面
      if (aIsNewUnlock && !bIsNewUnlock) return -1
      if (!aIsNewUnlock && bIsNewUnlock) return 1
      
      // 已解锁的排在未解锁前面
      if (aIsUnlocked && !bIsUnlocked) return -1
      if (!aIsUnlocked && bIsUnlocked) return 1
      
      // 都已解锁或都是新解锁：按优先级排序（紧急(1) > 普通(2) > 轻微(3)）
      if (aIsUnlocked && bIsUnlocked) {
        return (a.diseases_priority || 2) - (b.diseases_priority || 2)
      }
      
      // 都未解锁：按 unlock_level 升序
      return (a.unlock_level || 1) - (b.unlock_level || 1)
    })
    
    // ===== 入场动画计算（使用通用方法）=====
    const { scale, opacity } = this.calculateModalAnimation(this.diseaseListModal)
    
    // ===== 分页计算 =====
    const modalWidth = 240
    const rowHeight = 36
    const rowSpacing = 8
    const headerHeight = 55
    const footerHeight = 20  // 底部文字按钮区域
    const padding = 12
    
    // 固定每页5个疾病
    const itemsPerPage = 4
    
    // 总页数
    const totalPages = Math.ceil(sortedDiseases.length / itemsPerPage)
    const currentPage = this.diseaseListModal.currentPage || 0
    
    // 当前页显示的疾病
    const startIndex = currentPage * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, sortedDiseases.length)
    const pageDiseases = sortedDiseases.slice(startIndex, endIndex)
    
    // 实际弹窗高度（根据内容动态计算）
    const contentHeight = pageDiseases.length * (rowHeight + rowSpacing)
    const modalHeight = headerHeight + contentHeight + footerHeight + padding
    
    // 弹窗位置（居中）
    const modalX = (this.screenWidth - modalWidth) / 2
    const modalY = (this.screenHeight - modalHeight) / 2
    
    // 保存弹窗位置用于点击检测（保存原始未缩放的位置）
    this.diseaseListModal.x = modalX
    this.diseaseListModal.y = modalY
    this.diseaseListModal.width = modalWidth
    this.diseaseListModal.height = modalHeight
    this.diseaseListModal.itemsPerPage = itemsPerPage
    this.diseaseListModal.totalPages = totalPages
    
    // 绘制半透明背景遮罩（带淡入效果）
    ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * opacity})`
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // ===== 应用果冻动画变换 =====
    ctx.save()
    // 以弹窗中心为基准进行缩放
    const centerX = modalX + modalWidth / 2
    const centerY = modalY + modalHeight / 2
    ctx.translate(centerX, centerY)
    ctx.scale(scale, scale)
    ctx.translate(-centerX, -centerY)
    
    // ===== 1. 绘制外层白色大卡片（带弥散阴影）=====
    ctx.save()
    ctx.shadowColor = 'rgba(175, 199, 227, 0.5)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetY = 8
    ctx.fillStyle = '#FFFFFF'
    fillRoundRect(ctx, modalX, modalY, modalWidth, modalHeight, 20)
    ctx.restore()
    
    // ===== 2. 绘制标题 =====
    ctx.fillStyle = '#333333'
    ctx.font = 'bold 18px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🏥 护士站分诊指南', modalX + modalWidth / 2, modalY + 25)
    
    // 页码指示器（如：1/3）
    if (totalPages > 1) {
      ctx.fillStyle = '#999999'
      ctx.font = '11px "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${currentPage + 1}/${totalPages}`, modalX + modalWidth / 2, modalY + 50)
    }
    
    // 表头文字
    ctx.fillStyle = '#666666'
    ctx.font = '12px "PingFang SC", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('疾病名称', modalX + 30, modalY + 68)
    ctx.textAlign = 'right'
    ctx.fillText('分诊分类', modalX + modalWidth - 30, modalY + 68)
    
    // ===== 3. 绘制疾病列表 =====
    let startY = modalY + headerHeight + padding - 10
    
    // 初始化胶囊点击区域数组
    if (!this.diseaseListModal.pillBadges) {
      this.diseaseListModal.pillBadges = []
    }
    this.diseaseListModal.pillBadges = []
    
    pageDiseases.forEach((disease, index) => {
      const rowY = startY + index * (rowHeight + rowSpacing)
      
      // 检查该疾病是否需要显示"待解锁"
      const isUnlocked = currentLevelNum >= (disease.unlock_level || 1)
      
      // 3.1 绘制单行底色（极浅的蓝灰底色）
      ctx.fillStyle = '#F4F8FB'
      fillRoundRect(ctx, modalX + 15, rowY, modalWidth - 30, rowHeight, 12)
      
      // 3.2 绘制疾病图标（使用疾病图片或emoji回退）
      const diseaseImage = this.diseaseImages && this.diseaseImages[disease.disease_id]
      if (diseaseImage && diseaseImage.width > 0) {
        // 使用疾病图片
        const iconSize = 30
        ctx.drawImage(diseaseImage, modalX + 25, rowY + 4, iconSize, iconSize)
      } else {
        // 回退到emoji
        ctx.font = '20px sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(disease.condition ? disease.condition.icon : '🏥', modalX + 30, rowY + rowHeight / 2)
      }
      
      // 3.3 已解锁疾病：显示名称和分诊类别
      if (isUnlocked) {
        // 判断是否为本关新解锁的疾病（且只在第2关及以后显示）
        const isNewUnlock = disease.unlock_level === currentLevelNum && currentLevelNum >= 2
        
        // 绘制【new】标签（如果是新解锁的）- 左上角倾斜，只有文字
        if (isNewUnlock) {
          ctx.save()
          // 设置位置为左上角
          const newTagX = modalX + 18
          const newTagY = rowY + 2
          
          // 移动画布原点到标签位置并旋转
          ctx.translate(newTagX, newTagY)
          ctx.rotate(-Math.PI / 12)  // 向左倾斜15度
          
          // 绘制红色文字（8px，带白色阴影增加可读性）
          ctx.fillStyle = '#FF4444'
          ctx.font = 'bold 8px "PingFang SC", sans-serif'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          
          // 添加白色描边阴影
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
          ctx.shadowBlur = 2
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
          
          ctx.fillText('NEW', 0, 0)
          ctx.restore()
        }
        
        // 绘制疾病名称（统一位置）
        ctx.fillStyle = '#333333'
        ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(disease.disease_name, modalX + 65, rowY + rowHeight / 2)
        
        // 绘制右侧分类胶囊徽章
        const priorityConfig = this.getPriorityConfig(disease.diseases_priority)
        const pillX = modalX + modalWidth - 90
        const pillY = rowY + 4
        const pillW = 55
        const pillH = 28
        this.drawPillBadge(ctx, priorityConfig.label, priorityConfig.color, priorityConfig.shadow, pillX, pillY)
        
        // 保存胶囊位置和提示信息（用于点击检测）
        this.diseaseListModal.pillBadges.push({
          x: pillX,
          y: pillY,
          width: pillW,
          height: pillH,
          priority: disease.diseases_priority,
          label: priorityConfig.label
        })
      } else {
        // 3.4 锁定疾病：绘制半透明白色蒙层和"待解锁"文字
        // 绘制半透明白色蒙层（更深的遮罩）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        fillRoundRect(ctx, modalX + 15, rowY, modalWidth - 30, rowHeight, 12)
        
        // 绘制"待解锁"文字
        ctx.fillStyle = '#999999'
        ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('待解锁', modalX + modalWidth / 2, rowY + rowHeight / 2)
      }
    })
    
    // ===== 4. 绘制底部分页文字按钮 =====
    const btnY = modalY + modalHeight - 16  // 距离底部16px
    const btnPadding = 20
    
    ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textBaseline = 'middle'
    
    // 左下角：上一页（如果不是第一页）
    if (currentPage > 0) {
      ctx.fillStyle = '#38BDF8'
      ctx.textAlign = 'left'
      ctx.fillText('上一页', modalX + btnPadding, btnY)
      
      // 保存按钮位置
      this.diseaseListModal.prevBtn = {
        x: modalX + btnPadding,
        y: btnY - 10,
        width: 50,
        height: 20
      }
    } else {
      this.diseaseListModal.prevBtn = null
    }
    
    // 右下角：下一页/知道了
    const isLastPage = currentPage >= totalPages - 1
    const nextText = isLastPage ? '' : '下一页'
    const textWidth = ctx.measureText(nextText).width
    
    ctx.fillStyle = isLastPage ? '#999999' : '#38BDF8'
    ctx.textAlign = 'right'
    ctx.fillText(nextText, modalX + modalWidth - btnPadding, btnY)
    
    // 保存按钮位置
    this.diseaseListModal.nextBtn = {
      x: modalX + modalWidth - btnPadding - textWidth,
      y: btnY - 10,
      width: textWidth,
      height: 20
    }
    
    // 绘制胶囊提示（如果有）
    this.renderPillTooltip(ctx)
    
    // 恢复变换（结束果冻动画）
    ctx.restore()
  }
  
  // 绘制胶囊轻量提示（带箭头）
  renderPillTooltip(ctx) {
    if (!this.diseaseListModal || !this.diseaseListModal.pillTooltip) return
    
    const tooltip = this.diseaseListModal.pillTooltip
    
    // 计算提示框尺寸
    const lines = tooltip.text.split('\n')
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif'
    let maxWidth = 0
    lines.forEach(line => {
      const width = ctx.measureText(line).width
      maxWidth = Math.max(maxWidth, width)
    })
    
    const paddingX = 12
    const paddingY = 8
    const lineHeight = 16
    const tooltipWidth = maxWidth + paddingX * 2
    const tooltipHeight = lines.length * lineHeight + paddingY * 2
    
    // 计算提示框位置（在胶囊上方）
    const arrowHeight = 6
    const tooltipX = tooltip.badgeX + tooltip.badgeWidth / 2 - tooltipWidth / 2
    const tooltipY = tooltip.badgeY - tooltipHeight - arrowHeight - 4
    
    // 保存位置用于点击检测
    tooltip.tooltipX = tooltipX
    tooltip.tooltipY = tooltipY
    tooltip.tooltipWidth = tooltipWidth
    tooltip.tooltipHeight = tooltipHeight
    tooltip.arrowHeight = arrowHeight
    
    // 绘制提示框背景（白色半透明+阴影）
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 4
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    
    // 绘制圆角矩形
    const radius = 10
    fillRoundRect(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, radius)
    
    // 绘制箭头（三角形，指向胶囊）
    ctx.beginPath()
    ctx.moveTo(tooltip.badgeX + tooltip.badgeWidth / 2 - arrowHeight, tooltipY + tooltipHeight)
    ctx.lineTo(tooltip.badgeX + tooltip.badgeWidth / 2, tooltipY + tooltipHeight + arrowHeight)
    ctx.lineTo(tooltip.badgeX + tooltip.badgeWidth / 2 + arrowHeight, tooltipY + tooltipHeight)
    ctx.closePath()
    ctx.fill()
    
    ctx.restore()
    
    // 绘制文字（深色以便在白色背景上阅读）
    ctx.fillStyle = '#333333'
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    lines.forEach((line, index) => {
      const textY = tooltipY + paddingY + lineHeight / 2 + index * lineHeight
      ctx.fillText(line, tooltipX + tooltipWidth / 2, textY)
    })
  }
  
  // 获取优先级配置
  getPriorityConfig(priority) {
    const configs = {
      1: { label: '紧急', color: '#E45555', shadow: 'rgba(228,85,85,0.4)' },    // 红色-紧急
      2: { label: '普通', color: '#F6B94A', shadow: 'rgba(246,185,74,0.4)' },    // 黄色-普通
      3: { label: '轻微', color: '#68C488', shadow: 'rgba(104,196,136,0.4)' }     // 绿色-轻微
    }
    return configs[priority] || configs[3]
  }
  
  // 绘制胶囊徽章按钮
  drawPillBadge(ctx, text, color, shadowColor, x, y) {
    const w = 55
    const h = 28
    const r = 15  // 胶囊圆角刚好是高度的一半
    
    // 画底色和阴影
    ctx.save()
    ctx.shadowColor = shadowColor
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
    ctx.fillStyle = color
    fillRoundRect(ctx, x, y, w, h, r)
    ctx.restore()
    
    // 画白色居中文字
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 12px "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + w / 2, y + h / 2 + 1)
  }

  // 启用医生和护士的动画（第一个病人生成后调用）
  enableCharacterAnimations() {
    console.log('[动画控制] 第一个病人生成，启用角色动画')
    // 启用护士动画
    this.waitingArea.nurse.enableAnimation()
    // 启用所有医生动画
    this.doctors.forEach(doctor => doctor.enableAnimation())
  }

  // 【新玩家指引】分诊指南关闭后处理
  handleNewPlayerGuideComplete() {
    // 如果还是新玩家模式（未开始生成病人）
    if (GameConfig.is_new_player) {
      console.log('[新玩家指引] 分诊指南已关闭，显示准备气泡')
      // 更新为新玩家状态为 false
      GameConfig.is_new_player = false
      // 保存到本地缓存（下次游戏不再显示新玩家指引）
      saveNewPlayerStatus(false)
      
      // 显示准备气泡
      this.waitingArea.nurse.showReadyHint()
      
      // 3秒后气泡自动消失，并开始生成病人
      setTimeout(() => {
        console.log('[新玩家指引] 准备气泡消失，开始生成病人')
        this.startPatientSpawning()
      }, 3000)
    }
    // 如果 is_new_player 已经是 false，不做任何处理
  }

  // 处理疾病清单弹窗的点击
  handleDiseaseListTouch(x, y) {
    if (!this.diseaseListModal || !this.diseaseListModal.visible) return false
    
    const modal = this.diseaseListModal
    const currentPage = modal.currentPage || 0
    const totalPages = modal.totalPages || 1
    
    // 点击弹窗外部关闭弹窗
    if (x < modal.x || x > modal.x + modal.width || y < modal.y || y > modal.y + modal.height) {
      this.diseaseListModal = null
      // 【新玩家指引】如果是新玩家模式下关闭弹窗，开始游戏
      this.handleNewPlayerGuideComplete()
      return true
    }
    
    // 检查是否点击了【上一页】按钮
    if (modal.prevBtn && currentPage > 0 &&
        x >= modal.prevBtn.x && x <= modal.prevBtn.x + modal.prevBtn.width &&
        y >= modal.prevBtn.y && y <= modal.prevBtn.y + modal.prevBtn.height) {
      // 上一页
      this.diseaseListModal.currentPage = currentPage - 1
      this.diseaseListModal.pillTooltip = null  // 清除提示
      this.vibrate()  // 震动反馈
      return true
    }
    
    // 检查是否点击了【下一页/知道了】按钮
    if (modal.nextBtn &&
        x >= modal.nextBtn.x && x <= modal.nextBtn.x + modal.nextBtn.width &&
        y >= modal.nextBtn.y && y <= modal.nextBtn.y + modal.nextBtn.height) {
      
      if (currentPage < totalPages - 1) {
        // 下一页
        this.diseaseListModal.currentPage = currentPage + 1
        this.diseaseListModal.pillTooltip = null  // 清除提示
        this.vibrate()  // 震动反馈
      } else {
        // 最后一页，关闭弹窗
        this.diseaseListModal = null
        // 【新玩家指引】如果是新玩家模式下关闭弹窗，开始游戏
        this.handleNewPlayerGuideComplete()
      }
      return true
    }
    
    // 检查是否点击了分类胶囊
    if (modal.pillBadges) {
      for (const badge of modal.pillBadges) {
        if (x >= badge.x && x <= badge.x + badge.width &&
            y >= badge.y && y <= badge.y + badge.height) {
          // 显示提示
          this.showPillTooltip(badge)
          this.vibrate()
          return true
        }
      }
    }
    
    // 检查是否点击了提示框本身（点击提示不关闭）
    if (modal.pillTooltip) {
      const tooltip = modal.pillTooltip
      // 检查点击是否在提示框区域内（包括箭头）
      const arrowHeight = tooltip.arrowHeight || 6
      const inTooltip = x >= tooltip.tooltipX && x <= tooltip.tooltipX + tooltip.tooltipWidth &&
                       y >= tooltip.tooltipY && y <= tooltip.tooltipY + tooltip.tooltipHeight + arrowHeight
      if (inTooltip) {
        return true  // 点击提示框，不关闭，只阻止事件传递
      }
      
      // 点击其他区域清除提示
      this.diseaseListModal.pillTooltip = null
      return true
    }
    
    // 点击其他区域不处理（防止误触）
    return true
  }
  
  // 显示胶囊提示
  showPillTooltip(badge) {
    // 根据优先级设置提示文本
    let tooltipText = ''
    if (badge.priority === 1) {
      // 紧急
      tooltipText = '立刻将病人送往急救间，\n无法在治疗椅恢复！'
    } else if (badge.priority === 2) {
      // 普通
      tooltipText = '病人可在治疗椅上恢复生命'
    } else {
      // 轻微
      tooltipText = '病人生命值较高，\n可在等候区等待'
    }
    
    // 设置提示状态（不自动消失，点击其他地方关闭）
    this.diseaseListModal.pillTooltip = {
      text: tooltipText,
      badgeX: badge.x,
      badgeY: badge.y,
      badgeWidth: badge.width,
      badgeHeight: badge.height
    }
  }

  // 显示按钮轻量提示
  showButtonTooltip(btn) {
    // 清除之前的定时器
    if (this.buttonTooltip && this.buttonTooltip.timer) {
      clearTimeout(this.buttonTooltip.timer)
    }
    
    // 根据按钮类型设置提示文本
    let tooltipText = ''
    if (btn.isEmergency) {
      tooltipText = '病人需立刻送往急救区，\n无法在治疗椅恢复！'
    } else if (btn.isIV) {
      tooltipText = '病人可在治疗椅上恢复生命'
    } else if (btn.isNormal) {
      tooltipText = '病人生命值较高，\n可在等候区等待'
    }
    
    // 设置提示状态
    this.buttonTooltip = {
      buttonType: btn.type,
      text: tooltipText,
      btnX: btn.renderX,
      btnY: btn.renderY,
      btnWidth: btn.renderWidth,
      btnHeight: btn.renderHeight,
      timer: setTimeout(() => {
        this.buttonTooltip = null
      }, 2500) // 2.5秒后自动消失
    }
  }
  
  // 执行按钮操作
  executeButtonAction(btn, patient) {
    // 清除提示
    if (this.buttonTooltip && this.buttonTooltip.timer) {
      clearTimeout(this.buttonTooltip.timer)
    }
    this.buttonTooltip = null
    
    // 执行对应操作
    if (btn.isEmergency) {
      this.sendPatientToBedDirectly(patient)
    } else if (btn.isIV) {
      this.sendPatientToIVSeat(patient)
    } else if (btn.isNormal) {
      patient.showPatienceBar = true
    }
    
    // 关闭弹窗
    this.seatSelectionModal = null
  }
  
  // 绘制按钮轻量提示（带箭头）
  renderButtonTooltip() {
    if (!this.buttonTooltip) return
    
    const ctx = this.ctx
    const tooltip = this.buttonTooltip
    
    // 计算提示框尺寸
    const lines = tooltip.text.split('\n')
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif'
    let maxWidth = 0
    lines.forEach(line => {
      const width = ctx.measureText(line).width
      maxWidth = Math.max(maxWidth, width)
    })
    
    const paddingX = 12
    const paddingY = 8
    const lineHeight = 16
    const tooltipWidth = maxWidth + paddingX * 2
    const tooltipHeight = lines.length * lineHeight + paddingY * 2
    
    // 计算提示框位置（在按钮上方）
    const arrowHeight = 6
    const tooltipX = tooltip.btnX + tooltip.btnWidth / 2 - tooltipWidth / 2
    const tooltipY = tooltip.btnY - tooltipHeight - arrowHeight - 4
    
    // 绘制提示框背景（半透明黑色）
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    
    // 绘制圆角矩形
    const radius = 8
    fillRoundRect(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, radius)
    
    // 绘制箭头（三角形）
    ctx.beginPath()
    ctx.moveTo(tooltip.btnX + tooltip.btnWidth / 2 - arrowHeight, tooltipY + tooltipHeight)
    ctx.lineTo(tooltip.btnX + tooltip.btnWidth / 2, tooltipY + tooltipHeight + arrowHeight)
    ctx.lineTo(tooltip.btnX + tooltip.btnWidth / 2 + arrowHeight, tooltipY + tooltipHeight)
    ctx.closePath()
    ctx.fill()
    
    ctx.restore()
    
    // 绘制文字
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    lines.forEach((line, index) => {
      const textY = tooltipY + paddingY + lineHeight / 2 + index * lineHeight
      ctx.fillText(line, tooltipX + tooltipWidth / 2, textY)
    })
  }

  // ========== 通用弹窗动画方法 ==========
  
  // 计算弹窗入场动画（柔和回弹效果）
  // modal: 弹窗状态对象，需要包含 isAnimating 和 animationTime
  // 返回: { scale, opacity }
  calculateModalAnimation(modal) {
    if (!modal) return { scale: 1, opacity: 1 }
    
    const ANIMATION_DURATION = 350 // 动画持续时间（毫秒）
    
    // 初始化动画状态
    if (modal.isAnimating === undefined) {
      modal.isAnimating = true
      modal.animationTime = 0
    }
    
    if (modal.isAnimating) {
      // 更新动画时间（假设约60fps，每帧16ms）
      modal.animationTime = (modal.animationTime || 0) + 16
      const progress = Math.min(modal.animationTime / ANIMATION_DURATION, 1)
      
      // 柔和的回弹缓动函数（ease-out back）
      const easeOutBack = (t) => {
        const c1 = 1.2 // 弹性系数（1.0=无弹性，越大越弹，1.2较柔和）
        const c3 = c1 + 1
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
      }
      
      // 应用弹性缩放（从 0.9 开始，轻微回弹）
      const scaleValue = easeOutBack(progress)
      const scale = 0.9 + 0.1 * scaleValue // 缩放在 0.9~1.02 之间
      const opacity = progress
      
      // 动画结束
      if (progress >= 1) {
        modal.isAnimating = false
        return { scale: 1, opacity: 1 }
      }
      
      return { scale, opacity }
    }
    
    return { scale: 1, opacity: 1 }
  }
  
  // 应用弹窗动画变换（在ctx.save()之后调用）
  // ctx: canvas上下文
  // modalX, modalY, modalWidth, modalHeight: 弹窗位置和尺寸
  // scale: 动画缩放值
  applyModalTransform(ctx, modalX, modalY, modalWidth, modalHeight, scale) {
    if (scale === 1) return
    
    // 以弹窗中心为基准进行缩放
    const centerX = modalX + modalWidth / 2
    const centerY = modalY + modalHeight / 2
    ctx.translate(centerX, centerY)
    ctx.scale(scale, scale)
    ctx.translate(-centerX, -centerY)
  }

}
