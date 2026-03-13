import WaitingArea from './WaitingArea.js'
import BedArea from './BedArea.js'
import EquipmentRoom from './EquipmentRoom.js'
import Patient from './Patient.js'
import Doctor from './Doctor.js'
import { fillRoundRect, strokeRoundRect } from './utils.js'
import { getItemById, getItemImage, preloadItemImages, preloadAreaIcons, getAreaIcon, AREA_ICONS } from './Items.js'
import { audioManager } from './AudioManager.js'
import { GameConfig, getLevelConfig, getRandomPatientDetail, getRandomDisease, checkPatientRage, getRageProbability, getTreatNeedByDisease } from './GameConfig.js'

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
    
    // 椅子选择弹窗状态
    this.seatSelectionModal = null
    
    // 治疗弹窗状态
    this.treatmentModal = null
    
    // 输液区病人选择弹窗状态（治疗/急救）
    this.ivPatientSelectionModal = null
    
    // 暴走提示状态（只显示一次）
    this.hasShownRageToast = false
    
    // 音量按钮状态
    this.isMuted = false
    this.volumeBtnBounds = null
    
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

  // 更新浮动文字
  updateFloatingTexts(deltaTime) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.life -= deltaTime
      ft.offsetY -= 0.05 * deltaTime // 向上飘
      ft.opacity = ft.life / 1000
      
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1)
      }
    }
  }

  initAreas() {
    // 顶部状态栏高度
    const headerHeight = 45
    // 底部留白
    const bottomMargin = 10
    // 顶部状态栏与三个区域之间的间距
    const topPadding = 12
    
    // 可用区域
    const availableY = this.mapY + headerHeight + topPadding
    const availableHeight = this.mapHeight - headerHeight - bottomMargin - topPadding
    
    // 三个区域的间距
    const gap = 10
    
    // 计算总可用宽度
    const totalGap = gap * 4  // 左右边距 + 中间两个间距
    const availableWidth = this.mapWidth - totalGap
    
    // 调整比例：等候区 35% | 治疗区 35% | 器材室 30%
    const waitingWidth = availableWidth * 0.35
    const bedWidth = availableWidth * 0.35
    const equipmentWidth = availableWidth * 0.30
    
    // 等候区（左侧）
    const waitingX = this.mapX + gap
    this.waitingArea = new WaitingArea(waitingX, availableY, waitingWidth, availableHeight)
    
    // 治疗区（中间）- 2张病床 + 输液治疗区（4张输液椅）
    const bedX = waitingX + waitingWidth + gap
    this.bedArea = new BedArea(bedX, availableY, bedWidth, availableHeight, 2)
    
    // 器材室（右侧）- 更窄
    const equipmentX = bedX + bedWidth + gap
    this.equipmentRoom = new EquipmentRoom(equipmentX, availableY, equipmentWidth, availableHeight)
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
    // 【已移除】自动分配定时器已禁用
    // if (this.bedAssignmentTimer) clearInterval(this.bedAssignmentTimer)
    
    // 【已移除】不再自动分配病人到病床，玩家需要手动操作
    // this.bedAssignmentTimer = setInterval(...)
    
    // 前N个病人，使用固定间隔
    let initialSpawnCount = 0
    const spawnFirstCount = GameConfig.patient.spawnFirstCount
    const spawnFirstInterval = GameConfig.patient.spawnFirstInterval
    
    const spawnFirstPatients = () => {
      const maxPatients = getLevelConfig(this.currentLevel).maxPatients
      if (initialSpawnCount < spawnFirstCount && this.spawnedPatientsCount < maxPatients && this.isRunning) {
        const success = this.spawnPatientFromLeft()
        if (success) {
          initialSpawnCount++
          this.spawnedPatientsCount++
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
    const maxPatients = getLevelConfig(this.currentLevel).maxPatients
    const randomMin = GameConfig.patient.spawnRandomMin
    const randomMax = GameConfig.patient.spawnRandomMax
    
    const spawnNext = () => {
      if (!this.isRunning) return
      
      // 检查是否还有病人名额，且站立排队区未满
      const queueCount = this.waitingArea.getReceptionQueuePatients().length
      if (this.spawnedPatientsCount < maxPatients && queueCount < 4) {
        const success = this.spawnPatientFromLeft()
        if (success) {
          this.spawnedPatientsCount++
        }
        
        // 检查是否完成本关卡
        if (this.spawnedPatientsCount >= maxPatients && !this.levelComplete) {
          this.levelComplete = true
          this.checkLevelComplete()
          return
        }
        
        // 随机间隔生成下一个
        const randomDelay = randomMin + Math.random() * (randomMax - randomMin)
        this.spawnTimer = setTimeout(spawnNext, randomDelay)
      } else if (this.spawnedPatientsCount < maxPatients) {
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
            
            // 添加浮动文字动画
            this.addFloatingText(`+${addedScore}`, bed.x + bed.width / 2, bed.y, '#FFD700')
            
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
        
        // 【修改】输液椅上病人耐心暂停减少（保持当前值不变）
        // 不执行任何耐心值增减操作
        
        // 处理已治愈的病人（通过治疗弹窗治愈）
        if (seat.patient.isCured && !seat.patient.scoreAdded) {
          // 增加分数和治愈人数（只加一次）
          const addedScore = 10 + Math.floor(Math.random() * 20)
          this.score += addedScore
          this.curedCount++
          seat.patient.scoreAdded = true
          
          // 添加浮动文字动画
          this.addFloatingText(`+${addedScore}`, seat.patient.x, seat.patient.y, '#FFD700')
          
          // 病人离开
          if (!seat.patient.leaveTimer) {
            seat.patient.leaveTimer = setTimeout(() => {
              seat.clear()
            }, 1000)
          }
          
          // 检查是否完成关卡目标
          this.checkLevelTarget()
        }
      }
    })
    
    // 处理等候区病人耐心（排队区病人耐心都会减少）
    this.waitingArea.patients.forEach(patient => {
      patient.patience -= deltaTime / 1000
      // 耐心归零且未开始离开/暴走流程
      if (patient.patience <= 0 && !patient.isLeaving && !patient.tomatoThrown && !patient.isRaging) {
        patient.isAngry = true
        
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
      const totalPatients = getLevelConfig(this.currentLevel).maxPatients
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

  // 初始化当前关卡的病人池（确保不重复）
  initCurrentLevelPatientPool() {
    const maxPatients = getLevelConfig(this.currentLevel).maxPatients
    const allPatients = [...GameConfig.patientDetails]
    
    // 如果病人详情数量不够，复制一份再打乱
    let pool = []
    while (pool.length < maxPatients) {
      // Fisher-Yates 洗牌算法打乱顺序
      const shuffled = [...allPatients].sort(() => Math.random() - 0.5)
      pool.push(...shuffled)
    }
    
    // 截取所需数量，并添加唯一实例ID
    this.currentLevelPatientPool = pool.slice(0, maxPatients).map((detail, index) => ({
      ...detail,
      instanceId: index + 1  // 给每个实例分配唯一ID
    }))
    
    console.log(`关卡${this.currentLevel + 1}病人池已初始化，共${this.currentLevelPatientPool.length}个病人`)
  }

  // 从当前关卡病人池中获取下一个病人
  getNextPatientFromPool() {
    if (this.currentLevelPatientPool.length === 0) {
      console.warn('病人池已空！')
      return null
    }
    // 从池中随机取出一个病人
    const randomIndex = Math.floor(Math.random() * this.currentLevelPatientPool.length)
    const patient = this.currentLevelPatientPool.splice(randomIndex, 1)[0]
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
    
    // 随机获取病情
    const disease = getRandomDisease()
    const patient = new Patient(this.patientIdCounter++, patientDetail, disease)
    
    // 初始位置在等候区左侧外面
    patient.x = this.waitingArea.x - 50
    patient.y = this.waitingArea.y + this.waitingArea.height * 0.5
    patient.targetX = patient.x
    patient.targetY = patient.y
    
    // 添加到前台排队
    const added = this.waitingArea.addPatientToReception(patient)
    
    if (added) {
      console.log('[生成病人] 成功生成:', patient.name, '病情:', patient.condition.name)
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
    
    // 清空画布
    this.ctx.fillStyle = '#FFF5F5'
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 绘制地图背景
    this.renderMapBackground()
    
    // 绘制各个区域
    this.waitingArea.render(this.ctx)
    this.bedArea.render(this.ctx)
    this.equipmentRoom.render(this.ctx)
    
    // 在治疗区底部绘制托盘和按钮
    this.renderTrayAtBedArea()
    
    // 渲染医生身体
    this.doctors.forEach(doctor => doctor.render(this.ctx))
    
    // 渲染病人
    this.renderPatients()
    
    // 渲染医生气泡（在最上层，不被病人遮挡）
    this.doctors.forEach(doctor => doctor.renderBubble(this.ctx))
    
    this.renderUI()
    this.renderFloatingTexts()
    this.renderGameOverModal()
    this.renderLevelCompleteModal()
    this.renderLevelToast()
    this.renderGameWinModal()
    this.renderSeatSelectionModal()
    this.renderIVPatientSelectionModal()
    this.renderTreatmentModal()
    
    // 调试日志已禁用
    // this.renderDebugLogs()
    
    this.ctx.restore()
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

  // 在治疗区底部渲染托盘
  renderTrayAtBedArea() {
    const bedArea = this.bedArea
    // 托盘位置：治疗区底部居中，宽度为治疗区的一半
    const trayWidth = bedArea.width * 0.5
    const trayHeight = 32
    const trayX = bedArea.x + (bedArea.width - trayWidth) / 2 - 20  // 往左移动20像素
    const trayY = bedArea.y + bedArea.height - trayHeight - 8
    
    // 调用 EquipmentRoom 的 renderTray 方法在治疗区位置渲染
    this.equipmentRoom.renderTray(this.ctx, trayX, trayY, trayWidth, trayHeight)
  }

  renderFloatingTexts() {
    const ctx = this.ctx
    ctx.save()
    
    this.floatingTexts.forEach(ft => {
      ctx.globalAlpha = ft.opacity
      
      if (ft.type === 'item' && ft.item) {
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

  renderMapBackground() {
    const ctx = this.ctx
    
    // 外边框
    ctx.fillStyle = '#FFB7B2'
    ctx.fillRect(this.mapX, this.mapY, this.mapWidth, this.mapHeight)
    
    // 内部地板
    ctx.fillStyle = '#FFE4E1'
    ctx.fillRect(this.mapX + 5, this.mapY + 5, this.mapWidth - 10, this.mapHeight - 10)
    
    // 等候区背景（白色，80%透明度）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    fillRoundRect(ctx, this.waitingArea.x, this.waitingArea.y, this.waitingArea.width, this.waitingArea.height, 15)
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.4)'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, this.waitingArea.x, this.waitingArea.y, this.waitingArea.width, this.waitingArea.height, 15)
    
    // 治疗区背景（白色，50%透明度）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    fillRoundRect(ctx, this.bedArea.x, this.bedArea.y, this.bedArea.width, this.bedArea.height, 15)
    ctx.strokeStyle = 'rgba(91, 155, 213, 0.4)'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, this.bedArea.x, this.bedArea.y, this.bedArea.width, this.bedArea.height, 15)
    
    // 器材室背景
    ctx.fillStyle = 'rgba(245, 245, 245, 0.5)'
    fillRoundRect(ctx, this.equipmentRoom.x, this.equipmentRoom.y, this.equipmentRoom.width, this.equipmentRoom.height, 15)
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, this.equipmentRoom.x, this.equipmentRoom.y, this.equipmentRoom.width, this.equipmentRoom.height, 15)
  }

  renderPatients() {
    this.waitingArea.patients.forEach(patient => {
      patient.render(this.ctx)
    })
    
    if (this.selectedPatient) {
      this.selectedPatient.render(this.ctx, true)
    }
    
  }

  renderUI() {
    const ctx = this.ctx
    
    // 顶部状态栏高度（与 initAreas 中的 headerHeight 一致）
    const headerHeight = 45
    
    // 顶部状态栏
    const gradient = ctx.createLinearGradient(this.mapX, 0, this.mapX + this.mapWidth, 0)
    gradient.addColorStop(0, '#FFB7B2')
    gradient.addColorStop(1, '#FF9AA2')
    ctx.fillStyle = gradient
    ctx.fillRect(this.mapX, this.mapY, this.mapWidth, headerHeight)
    
    // 标题（垂直居中）
    const titleY = this.mapY + headerHeight / 2
    ctx.fillStyle = '#FFF'
    ctx.font = `${Math.max(16, this.screenWidth * 0.025)}px cursive, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('🏥 急诊室模拟器', this.mapX + 15, titleY)
    
    // 关卡数显示
    ctx.fillStyle = '#FFF'
    ctx.font = `bold ${Math.max(14, this.screenWidth * 0.02)}px cursive, sans-serif`
    ctx.fillText(`  第${this.currentLevel + 1}关`, this.mapX + 180, titleY)
    
    // 倒计时和治愈目标显示
    const levelConfig = getLevelConfig(this.currentLevel)
    const countdownText = `⏱️ ${this.timeRemaining}s`
    const cureText = `🏥 ${this.curedCount}/${levelConfig.cureTarget}`
    
    ctx.font = `bold ${Math.max(13, this.screenWidth * 0.019)}px cursive, sans-serif`
    
    // 倒计时（如果时间少于10秒变红色）
    if (this.timeRemaining <= 10) {
      ctx.fillStyle = '#FFE66D'  // 黄色警告
    } else {
      ctx.fillStyle = '#FFF'
    }
    ctx.fillText(countdownText, this.mapX + 260, titleY)
    
    // 治愈人数
    ctx.fillStyle = '#FFF'
    ctx.fillText(cureText, this.mapX + 340, titleY)
    
    // 统计
    const fontSize = Math.max(12, this.screenWidth * 0.018)
    ctx.font = `${fontSize}px cursive, sans-serif`
    
    // 荣誉点图标 + 数值（右上角）
    const honorX = this.mapX + this.mapWidth - 150
    if (this.honorImage) {
      ctx.drawImage(this.honorImage, honorX, this.mapY + (headerHeight - 20) / 2, 20, 20)
    }
    ctx.fillStyle = '#FFF'
    ctx.fillText(`${this.score}`, honorX + 28, titleY)
    
    // 音量开关按钮（最右侧）
    const volumeX = this.mapX + this.mapWidth - 50
    const volumeY = this.mapY + (headerHeight - 24) / 2
    const volumeSize = 24
    
    // 绘制音量图标背景（圆形）
    ctx.fillStyle = this.isMuted ? '#E74C3C' : '#27AE60'
    ctx.beginPath()
    ctx.arc(volumeX + volumeSize / 2, volumeY + volumeSize / 2, volumeSize / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // 绘制音量图标
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 14px sans-serif'
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
    
    // 区域标题
    const areaTitleY = this.mapY + headerHeight + 32
    const titleFontSize = Math.max(12, this.screenWidth * 0.018)
    ctx.font = `${titleFontSize}px cursive, sans-serif`
    ctx.textBaseline = 'middle'
    
    // 等候区标题 - 显示已出现病人数/本关卡总病人数
    const levelMax = getLevelConfig(this.currentLevel).maxPatients
    const waitingText = `等候区 (${this.spawnedPatientsCount}/${levelMax})`
    const waitingX = this.waitingArea.x + this.waitingArea.width / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = '#3498DB'
    ctx.fillText(waitingText, waitingX + 6, areaTitleY)
    this.renderAreaIcon(ctx, 'waiting', waitingX - ctx.measureText(waitingText).width / 2 - 4, areaTitleY, 18)
    
    // 治疗区标题
    const treatmentX = this.bedArea.x + this.bedArea.width / 2
    const treatmentText = '治疗区'
    ctx.fillStyle = '#27AE60'
    ctx.fillText(treatmentText, treatmentX + 6, areaTitleY)
    this.renderAreaIcon(ctx, 'treatment', treatmentX - ctx.measureText(treatmentText).width / 2 - 4, areaTitleY, 18)
    
    // 器材室标题
    const equipmentText = '器材室'
    const equipmentX = this.equipmentRoom.x + this.equipmentRoom.width / 2
    ctx.fillStyle = '#333333'
    ctx.fillText(equipmentText, equipmentX + 6, areaTitleY)
    this.renderAreaIcon(ctx, 'equipment', equipmentX - ctx.measureText(equipmentText).width / 2 - 4, areaTitleY, 18)
    

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
      
      // 1. 输液区病人选择弹窗（治疗/急救）
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
      
      // 检查是否点击音量开关按钮
      if (this.volumeBtnBounds &&
          x >= this.volumeBtnBounds.x && x <= this.volumeBtnBounds.x + this.volumeBtnBounds.width &&
          y >= this.volumeBtnBounds.y && y <= this.volumeBtnBounds.y + this.volumeBtnBounds.height) {
        this.isMuted = !this.isMuted
        audioManager.toggleMute()
        console.log(this.isMuted ? '已静音' : '已取消静音')
        return
      }
      
      // 检查是否在重置按钮区域（右上角）
      if (x > this.screenWidth - 100 && y < 60) {
        this.reset()
        return
      }
      
      // 检查是否点击重置按钮（优先检测，避免和器械柜重叠）
      if (this.equipmentRoom.isClickOnResetButton(x, y)) {
        // 设置按下状态并显示动效
        this.equipmentRoom.resetButtonPressed = true
        setTimeout(() => {
          this.equipmentRoom.resetButtonPressed = false
        }, 150)
        const trayItems = this.equipmentRoom.getTrayItems()
        if (trayItems.length > 0) {
          this.equipmentRoom.clearTray()
        }
        return
      }
      
      // 检查是否点击发送按钮（优先检测，避免和器械柜重叠）
      if (this.equipmentRoom.isClickOnSendButton(x, y)) {
        // 设置按下状态并显示动效
        this.equipmentRoom.sendButtonPressed = true
        setTimeout(() => {
          this.equipmentRoom.sendButtonPressed = false
        }, 150)
        this.handleSendButtonClick()
        return
      }
      
      // 检查是否点击器材室的物品
      const itemId = this.equipmentRoom.getItemAt(x, y)
      if (itemId) {
        // 点击器材时震动（仅真机）
        this.vibrate()
        const item = getItemById(itemId)
        if (item) {
          // 如果治疗弹窗打开，优先放入治疗弹窗槽位
          if (this.treatmentModal && this.treatmentModal.visible) {
            const added = this.addItemToTreatmentSlot(item)
            if (added) {
              console.log('已将', item.name, '放入治疗槽位')
            }
          } else {
            // 将物品放入托盘
            const result = this.equipmentRoom.addItemToTray(item)
            if (result.success) {
              console.log('已将', item.name, '放入托盘')
            } else if (result.reason === 'duplicate') {
              console.log(item.name, '已在托盘中')
            } else if (result.reason === 'full') {
              wx.showToast({
                title: '托盘已满(最多4个)',
                icon: 'none',
                duration: 1200
              })
            }
          }
        }
        return
      }
      
      // 检查治疗弹窗的点击（在器材室检测之后，避免拦截器材室点击）
      if (this.treatmentModal && this.treatmentModal.visible) {
        // 先检查是否点击弹窗内部（按钮和槽位）
        if (this.handleTreatmentModalClick(x, y)) {
          return
        }
        // 点击弹窗外部关闭弹窗（但器材室点击已处理过，不会到这里）
        this.treatmentModal = null
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
      
      // 检查是否点击输液椅上的病人（显示头上选择弹窗：治疗/急救）
      const ivSeatPatient = this.findIVSeatPatientAt(x, y)
      if (ivSeatPatient) {
        console.log('[点击检测] 点击输液椅上病人:', ivSeatPatient.name)
        this.vibrate()
        this.showIVPatientSelectionModal(ivSeatPatient)
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
    
    this.seatSelectionModal = {
      visible: true,
      patient: patient,
      buttons: [
        { 
          type: 'emergency', 
          label: '急救', 
          color: '#E74C3C', 
          enabled: hasEmptyBed,
          isEmergency: true  // 标记为急救按钮
        },
        { 
          type: 'iv', 
          label: '输液', 
          color: '#9B59B6', 
          enabled: hasEmptyIVSeat,
          isIV: true  // 标记为输液按钮
        },
        { 
          type: 'normal', 
          label: '普通', 
          color: '#2E86AB', 
          enabled: true,  // 普通按钮始终可用
          isNormal: true  // 标记为普通按钮
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
          // 该类型椅子已满
          wx.showToast({
            title: `${btn.label}已满`,
            icon: 'none',
            duration: 1000
          })
          return true
        }
        
        // 如果是急救按钮，直接送去病床
        if (btn.isEmergency) {
          this.sendPatientToBedDirectly(modal.patient)
        } else if (btn.isIV) {
          // 输液：前往治疗区的输液治疗椅坐下
          this.sendPatientToIVSeat(modal.patient)
        } else if (btn.isNormal) {
          // 普通：什么都不做，但是显示耐心条
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

  // 绘制病情分诊弹窗（轻量版：病情名 + 3个并排按钮）
  renderSeatSelectionModal() {
    if (!this.seatSelectionModal || !this.seatSelectionModal.visible) return
    
    const ctx = this.ctx
    const modal = this.seatSelectionModal
    const patient = modal.patient
    
    // 弹窗尺寸（轻量小弹窗）
    const modalWidth = 145
    const modalHeight = 75
    
    // 弹窗位置：在病人头部右侧显示
    // 弹窗左侧边在病人头部右侧
    let modalX = patient.x + patient.width + 8  // 头部右侧 + 8像素间距
    let modalY = patient.y - 80  // 与病人头部高度对齐（略微上移）
    
    // 保存弹窗位置用于点击检测
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
    
    // 顶部标题栏（更窄）
    ctx.fillStyle = '#5B9BD5'
    ctx.beginPath()
    ctx.moveTo(modalX + 8, modalY)
    ctx.lineTo(modalX + modalWidth - 8, modalY)
    ctx.quadraticCurveTo(modalX + modalWidth, modalY, modalX + modalWidth, modalY + 8)
    ctx.lineTo(modalX + modalWidth, modalY + 22)
    ctx.lineTo(modalX, modalY + 22)
    ctx.lineTo(modalX, modalY + 8)
    ctx.quadraticCurveTo(modalX, modalY, modalX + 8, modalY)
    ctx.closePath()
    ctx.fill()
    
    // 标题文字
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 12px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('分诊选择', modalX + modalWidth / 2, modalY + 11)
    
    // 病情名字（标题下方）
    ctx.fillStyle = '#333'
    ctx.font = 'bold 11px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(patient.condition.name, modalX + modalWidth / 2, modalY + 26)
    
    // 3个按钮并排（横向排列）
    const btnWidth = 40
    const btnHeight = 20
    const btnSpacing = 4
    const totalBtnsWidth = btnWidth * 3 + btnSpacing * 2
    const btnStartX = modalX + (modalWidth - totalBtnsWidth) / 2
    const btnY = modalY + 46
    
    modal.buttons.forEach((btn, i) => {
      const btnX = btnStartX + i * (btnWidth + btnSpacing)
      
      // 保存按钮位置用于点击检测
      btn.renderX = btnX
      btn.renderY = btnY
      btn.renderWidth = btnWidth
      btn.renderHeight = btnHeight
      
      // 按钮圆角
      const radius = 8
      
      // 按钮阴影
      if (btn.enabled) {
        ctx.shadowColor = btn.color + '60'
        ctx.shadowBlur = 3
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 2
      }
      
      // 按钮背景
      ctx.fillStyle = btn.enabled ? btn.color : '#CCC'
      fillRoundRect(ctx, btnX, btnY, btnWidth, btnHeight, radius)
      
      // 重置阴影
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      // 按钮文字
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 10px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const labelText = btn.enabled ? btn.label : '满'
      ctx.fillText(labelText, btnX + btnWidth / 2, btnY + btnHeight / 2)
    })
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
      
      const totalPatients = getLevelConfig(this.currentLevel).maxPatients
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
    const trayItems = this.equipmentRoom.getTrayItems()
    if (trayItems.length === 0) {
      wx.showToast({
        title: '请先选择物品',
        icon: 'none',
        duration: 1200
      })
      return
    }
    
    // 获取托盘物品ID集合
    const trayItemIds = this.equipmentRoom.getTrayItemIds()
    
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
      
      // 检查托盘所有物品是否都在该医生的需求列表中
      const allItemsMatch = trayItemIds.every(id => requiredIds.includes(id))
      
      if (allItemsMatch) {
        // 计算匹配的ID列表
        const matchedIds = trayItemIds.filter(id => requiredIds.includes(id))
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
        const matchedIds = trayItemIds.filter(id => requiredIds.includes(id))
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
    
    // 配送该医生在托盘中的所有物品
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
        
        this.equipmentRoom.removeItemFromTray(itemId)
      }
    }
    
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
  }
  
  // 绘制关卡完成弹窗
  renderLevelCompleteModal() {
    if (!this.levelCompleteModal || !this.levelCompleteModal.visible) {
      return
    }
    console.log('渲染关卡完成弹窗')
    
    const ctx = this.ctx
    const modalWidth = 280
    const modalHeight = 160
    const modalX = (this.screenWidth - modalWidth) / 2
    const modalY = (this.screenHeight - modalHeight) / 2
    
    // 半透明背景遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
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
    
    // 半透明背景遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
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
  
  // 显示输液区病人选择弹窗（头上弹窗：治疗/急救）
  showIVPatientSelectionModal(patient) {
    const hasEmptyBed = this.bedArea.findEmptyBed() !== null
    
    this.ivPatientSelectionModal = {
      visible: true,
      patient: patient,
      buttons: [
        { 
          type: 'treat', 
          label: '治疗', 
          color: '#9B59B6'  // 紫色
        },
        { 
          type: 'emergency', 
          label: '急救', 
          color: '#E74C3C',  // 红色
          enabled: hasEmptyBed
        }
      ]
    }
  }
  
  // 显示治疗弹窗（点击"治疗"按钮后）
  showTreatmentModal(patient) {
    this.treatmentModal = {
      visible: true,
      patient: patient,
      title: '请选择器材',
      slots: [null, null, null], // 3个槽位
      selectedSlot: -1, // 当前选中的槽位
      message: null, // 提示消息
      buttons: {
        treat: { text: '治疗', color: '#27AE60' },
        cancel: { text: '取消', color: '#95A5A6' }
      }
    }
  }
  
  // 处理治疗弹窗的触摸事件（只处理弹窗内部的点击）
  handleTreatmentModalClick(x, y) {
    if (!this.treatmentModal || !this.treatmentModal.visible) return false
    
    const modal = this.treatmentModal
    const patient = modal.patient
    
    // 弹窗尺寸和位置（与渲染一致）
    const modalWidth = 220
    const modalHeight = 140
    const modalX = patient.x + patient.width + 8
    const modalY = patient.y - 100
    
    // 保存位置
    modal.x = modalX
    modal.y = modalY
    modal.width = modalWidth
    modal.height = modalHeight
    
    // 检查点击槽位（小尺寸）
    const slotWidth = 50
    const slotHeight = 50
    const slotGap = 10
    const slotsTotalWidth = slotWidth * 3 + slotGap * 2
    const slotsStartX = modalX + (modalWidth - slotsTotalWidth) / 2
    const slotsY = modalY + 35
    
    for (let i = 0; i < 3; i++) {
      const slotX = slotsStartX + i * (slotWidth + slotGap)
      if (x >= slotX && x <= slotX + slotWidth && y >= slotsY && y <= slotsY + slotHeight) {
        this.vibrate()
        modal.selectedSlot = i
        return true
      }
    }
    
    // 检查点击按钮（小尺寸）
    const btnWidth = 60
    const btnHeight = 28
    const btnGap = 20
    const btnTotalWidth = btnWidth * 2 + btnGap
    const btnStartX = modalX + (modalWidth - btnTotalWidth) / 2
    const btnY = modalY + modalHeight - 40
    
    // 治疗按钮
    if (x >= btnStartX && x <= btnStartX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
      this.vibrate()
      this.handleTreatButton()
      return true
    }
    
    // 取消按钮
    if (x >= btnStartX + btnWidth + btnGap && x <= btnStartX + btnWidth * 2 + btnGap && y >= btnY && y <= btnY + btnHeight) {
      this.vibrate()
      this.treatmentModal = null
      return true
    }
    
    // 点击弹窗外部 - 返回false，让外部处理关闭逻辑
    if (x < modalX || x > modalX + modalWidth || y < modalY || y > modalY + modalHeight) {
      return false
    }
    
    // 点击弹窗内部但未命中特定元素
    return true
  }
  
  // 处理治疗按钮
  handleTreatButton() {
    const modal = this.treatmentModal
    const patient = modal.patient
    
    // 获取病人疾病所需物品
    const requiredItems = getTreatNeedByDisease(patient.condition.name)
    
    // 获取玩家选择的物品
    const selectedItems = modal.slots.filter(item => item !== null).map(item => item.id)
    
    // 检查是否匹配（顺序不重要，内容相同即可）
    const isMatch = this.arraysEqualIgnoreOrder(selectedItems, requiredItems)
    
    if (isMatch) {
      // 治疗成功
      modal.message = '治疗成功！'
      patient.isCured = true
      // 从输液椅移除
      if (patient.seat) {
        patient.seat.clear()
      }
      // 增加分数
      const addedScore = 10 + Math.floor(Math.random() * 20)
      this.score += addedScore
      this.curedCount++
      this.addFloatingText(`+${addedScore}`, patient.x, patient.y, '#FFD700')
      // 关闭弹窗
      setTimeout(() => {
        this.treatmentModal = null
      }, 1000)
    } else {
      // 治疗失败：弹窗立即消失
      this.treatmentModal = null
      
      // 病人耐心值归零，头上冒火，然后离开
      patient.patience = 0
      patient.isAngry = true
      patient.tomatoThrown = true
      
      // 从输液椅移除并离开
      if (patient.seat) {
        patient.seat.clear()
      }
      patient.startLeaving(this.screenHeight)
    }
  }
  
  // 数组比较（忽略顺序）
  arraysEqualIgnoreOrder(arr1, arr2) {
    if (arr1.length !== arr2.length) return false
    const sorted1 = [...arr1].sort()
    const sorted2 = [...arr2].sort()
    return sorted1.every((val, idx) => val === sorted2[idx])
  }
  
  // 添加物品到治疗弹窗槽位
  addItemToTreatmentSlot(item) {
    if (!this.treatmentModal || !this.treatmentModal.visible) return false
    
    const modal = this.treatmentModal
    
    // 找到第一个空槽位
    const emptySlotIndex = modal.slots.findIndex(slot => slot === null)
    if (emptySlotIndex === -1) {
      // 槽位已满
      wx.showToast({ title: '槽位已满', icon: 'none', duration: 1000 })
      return false
    }
    
    // 检查物品是否已在槽位中
    if (modal.slots.some(slot => slot && slot.id === item.id)) {
      wx.showToast({ title: '该器材已选择', icon: 'none', duration: 1000 })
      return false
    }
    
    modal.slots[emptySlotIndex] = item
    this.vibrate()
    return true
  }
  
  // 渲染输液区病人选择弹窗（头上弹窗：治疗/急救）
  renderIVPatientSelectionModal() {
    if (!this.ivPatientSelectionModal || !this.ivPatientSelectionModal.visible) return
    
    const ctx = this.ctx
    const modal = this.ivPatientSelectionModal
    const patient = modal.patient
    
    // 弹窗尺寸（轻量小弹窗）
    const modalWidth = 120
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
    
    // 2个按钮并排
    const btnWidth = 50
    const btnHeight = 32
    const btnGap = 8
    const totalBtnsWidth = btnWidth * 2 + btnGap
    const btnStartX = modalX + (modalWidth - totalBtnsWidth) / 2
    const btnY = modalY + 12
    
    modal.buttons.forEach((btn, i) => {
      const btnX = btnStartX + i * (btnWidth + btnGap)
      
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
        
        // 根据按钮类型执行不同操作
        if (btn.type === 'treat') {
          // 治疗：显示器材选择弹窗
          this.showTreatmentModal(modal.patient)
        } else if (btn.type === 'emergency') {
          // 急救：直接送去病床
          this.sendPatientToBedDirectly(modal.patient)
        }
        
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
  
  // 渲染治疗弹窗（轻量风格，类似分诊选择弹窗）
  renderTreatmentModal() {
    if (!this.treatmentModal || !this.treatmentModal.visible) return
    
    const ctx = this.ctx
    const modal = this.treatmentModal
    const patient = modal.patient
    
    // 弹窗尺寸（轻量小弹窗）
    const modalWidth = 220
    const modalHeight = 140
    
    // 弹窗位置：在病人头部右侧显示
    let modalX = patient.x + patient.width + 8
    let modalY = patient.y - 100
    
    // 保存位置用于点击检测
    modal.x = modalX
    modal.y = modalY
    modal.width = modalWidth
    modal.height = modalHeight
    
    // 弹窗背景（带阴影，无蒙层）
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
    
    // 顶部标题栏
    ctx.fillStyle = '#5B9BD5'
    ctx.beginPath()
    ctx.moveTo(modalX + 8, modalY)
    ctx.lineTo(modalX + modalWidth - 8, modalY)
    ctx.quadraticCurveTo(modalX + modalWidth, modalY, modalX + modalWidth, modalY + 8)
    ctx.lineTo(modalX + modalWidth, modalY + 22)
    ctx.lineTo(modalX, modalY + 22)
    ctx.lineTo(modalX, modalY + 8)
    ctx.quadraticCurveTo(modalX, modalY, modalX + 8, modalY)
    ctx.closePath()
    ctx.fill()
    
    // 标题文字
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 11px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('请选择器材', modalX + modalWidth / 2, modalY + 11)
    
    // 渲染3个槽位（小尺寸）
    const slotWidth = 50
    const slotHeight = 50
    const slotGap = 10
    const slotsTotalWidth = slotWidth * 3 + slotGap * 2
    const slotsStartX = modalX + (modalWidth - slotsTotalWidth) / 2
    const slotsY = modalY + 35
    
    for (let i = 0; i < 3; i++) {
      const slotX = slotsStartX + i * (slotWidth + slotGap)
      const slot = modal.slots[i]
      const isSelected = modal.selectedSlot === i
      
      // 槽位背景
      if (isSelected) {
        ctx.fillStyle = '#E3F2FD'
        ctx.strokeStyle = '#5B9BD5'
        ctx.lineWidth = 2
      } else {
        ctx.fillStyle = '#F5F5F5'
        ctx.strokeStyle = '#DDD'
        ctx.lineWidth = 1
      }
      
      fillRoundRect(ctx, slotX, slotsY, slotWidth, slotHeight, 6)
      strokeRoundRect(ctx, slotX, slotsY, slotWidth, slotHeight, 6)
      
      // 渲染槽位中的物品
      if (slot) {
        const itemImage = getItemImage(slot.id)
        if (itemImage) {
          ctx.drawImage(itemImage, slotX + 8, slotsY + 8, slotWidth - 16, slotHeight - 16)
        } else {
          ctx.fillStyle = '#333'
          ctx.font = '18px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(slot.icon, slotX + slotWidth / 2, slotsY + slotHeight / 2)
        }
      }
    }
    
    // 渲染按钮（小尺寸）
    const btnWidth = 60
    const btnHeight = 28
    const btnGap = 20
    const btnTotalWidth = btnWidth * 2 + btnGap
    const btnStartX = modalX + (modalWidth - btnTotalWidth) / 2
    const btnY = modalY + modalHeight - 40
    
    // 治疗按钮
    const treatBtn = modal.buttons.treat
    ctx.fillStyle = treatBtn.color
    fillRoundRect(ctx, btnStartX, btnY, btnWidth, btnHeight, 6)
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(treatBtn.text, btnStartX + btnWidth / 2, btnY + btnHeight / 2)
    
    // 取消按钮
    const cancelBtn = modal.buttons.cancel
    ctx.fillStyle = cancelBtn.color
    fillRoundRect(ctx, btnStartX + btnWidth + btnGap, btnY, btnWidth, btnHeight, 6)
    ctx.fillStyle = '#FFF'
    ctx.fillText(cancelBtn.text, btnStartX + btnWidth + btnGap + btnWidth / 2, btnY + btnHeight / 2)
  }
}
