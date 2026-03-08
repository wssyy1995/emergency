import WaitingArea from './WaitingArea.js'
import BedArea from './BedArea.js'
import EquipmentRoom from './EquipmentRoom.js'
import Patient from './Patient.js'
import Doctor from './Doctor.js'
import { fillRoundRect, strokeRoundRect } from './utils.js'
import { getItemById, getItemImage, preloadItemImages, preloadAreaIcons, getAreaIcon, AREA_ICONS } from './Items.js'

export default class Game {
  constructor() {
    // 获取 Canvas
    this.canvas = wx.createCanvas()
    this.ctx = this.canvas.getContext('2d')
    
    // 获取屏幕尺寸和设备像素比（横屏模式）
    const sysInfo = wx.getSystemInfoSync()
    this.screenWidth = sysInfo.windowWidth
    this.screenHeight = sysInfo.windowHeight
    this.pixelRatio = sysInfo.pixelRatio || 1
    
    // 设置画布实际尺寸为屏幕尺寸的 pixelRatio 倍（高清显示）
    this.canvas.width = this.screenWidth * this.pixelRatio
    this.canvas.height = this.screenHeight * this.pixelRatio
    // 缩放绘图上下文，使坐标系统保持与屏幕尺寸一致
    this.ctx.scale(this.pixelRatio, this.pixelRatio)
    
    // 计算地图尺寸（留边距）
    this.mapX = 10
    this.mapY = 10
    this.mapWidth = this.screenWidth - 20
    this.mapHeight = this.screenHeight - 20
    
    // 游戏状态
    this.score = 0
    this.treatedCount = 0
    this.gameTime = 0
    this.isRunning = false
    this.patientIdCounter = 1
    this.doctorIdCounter = 1
    
    // 关卡系统
    this.currentLevel = 0  // 内部从0开始，显示为第1关
    this.levelConfig = [
      { maxPatients: 8, spawnInterval: 3000 },   // 第1关：8人，3秒间隔
      { maxPatients: 10, spawnInterval: 2500 },  // 第2关：10人，2.5秒间隔
    ]
    this.spawnedPatientsCount = 0  // 本关卡已出现的病人数
    this.levelComplete = false     // 当前关卡是否完成
    
    // 动态计算三个区域的宽度（无间隙填满）
    this.initAreas()
    
    // 延迟创建医生，确保 bedArea 已准备好
    this.doctors = []
    setTimeout(() => {
      this.createDoctors(2)
      console.log('医生创建完成，数量:', this.doctors.length)
      this.doctors.forEach((d, i) => console.log(`医生${i}:`, d.x, d.y))
    }, 100)
    
    this.lastTime = 0
    
    // 图标图片
    this.honorImage = null
    this.heartImage = null
    this.loadIcons()
    
    // 浮动文字动画
    this.floatingTexts = []
    
    // 弹窗状态
    this.gameOverModal = null
    this.levelCompleteModal = null
    this.gameWinModal = null
    this.levelToast = null
    
    this.initTouch()
  }

  loadIcons() {
    // 加载荣誉点图标
    const honorImg = wx.createImage()
    honorImg.onload = () => {
      this.honorImage = honorImg
    }
    honorImg.src = 'images/honor.png'
    
    // 加载爱心图标
    const heartImg = wx.createImage()
    heartImg.onload = () => {
      this.heartImage = heartImg
    }
    heartImg.src = 'images/heart.png'
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
    
    // 治疗区（中间）
    const bedX = waitingX + waitingWidth + gap
    this.bedArea = new BedArea(bedX, availableY, bedWidth, availableHeight, 4)
    
    // 器材室（右侧）- 更窄
    const equipmentX = bedX + bedWidth + gap
    this.equipmentRoom = new EquipmentRoom(equipmentX, availableY, equipmentWidth, availableHeight)
  }

  createDoctors(count) {
    // 获取走道区域
    const walkableAreas = this.bedArea.getWalkableAreas()
    
    // 备用位置（如果 walkableAreas 为空）
    const fallbackPositions = [
      { x: this.bedArea.x + this.bedArea.width * 0.25, y: this.bedArea.y + this.bedArea.height * 0.5 },
      { x: this.bedArea.x + this.bedArea.width * 0.75, y: this.bedArea.y + this.bedArea.height * 0.5 }
    ]
    
    for (let i = 0; i < count; i++) {
      const doctor = new Doctor(this.doctorIdCounter++, this.bedArea)
      
      // 将医生放在走道区域
      if (walkableAreas.length > 0) {
        const area = walkableAreas[i % walkableAreas.length]
        doctor.x = area.x + area.width / 2
        doctor.y = area.y + area.height / 2
      } else {
        // 使用备用位置
        const pos = fallbackPositions[i % fallbackPositions.length]
        doctor.x = pos.x
        doctor.y = pos.y
      }
      this.doctors.push(doctor)
    }
  }

  start() {
    // 如果已经在运行，先停止并清理
    if (this.isRunning) {
      clearInterval(this.timeTimer)
      clearInterval(this.spawnTimer)
      clearInterval(this.initialSpawnTimer)
    }
    
    this.isRunning = true
    
    // 预加载物品图片和区域图标
    preloadItemImages(() => {
      console.log('所有物品图片加载完成')
    })
    preloadAreaIcons(() => {
      console.log('所有区域图标加载完成')
    })
    
    this.loop(0)
    
    this.timeTimer = setInterval(() => {
      this.gameTime++
    }, 1000)
    
    // 重置关卡状态
    this.spawnedPatientsCount = 0
    this.levelComplete = false
    
    // 初始渐入：根据关卡配置间隔，进来病人
    let initialSpawnCount = 0
    const spawnInterval = this.levelConfig[this.currentLevel].spawnInterval
    const maxInitialPatients = Math.min(4, this.levelConfig[this.currentLevel].maxPatients)
    this.initialSpawnTimer = setInterval(() => {
      const maxPatients = this.levelConfig[this.currentLevel].maxPatients
      if (initialSpawnCount < maxInitialPatients && this.spawnedPatientsCount < maxPatients) {
        this.spawnPatientFromLeft()
        initialSpawnCount++
        this.spawnedPatientsCount++
      } else {
        clearInterval(this.initialSpawnTimer)
      }
    }, spawnInterval)
    
    // 定时补充病人（根据关卡配置）
    const levelSpawnInterval = this.levelConfig[this.currentLevel].spawnInterval
    this.spawnTimer = setInterval(() => {
      const maxPatients = this.levelConfig[this.currentLevel].maxPatients
      // 检查是否还有病人名额，且当前等候区人数未满
      if (this.spawnedPatientsCount < maxPatients && 
          this.waitingArea.patients.length < 8 && 
          Math.random() > 0.3) {
        this.spawnPatientFromLeft()
        this.spawnedPatientsCount++
        
        // 检查是否完成本关卡
        if (this.spawnedPatientsCount >= maxPatients && !this.levelComplete) {
          this.levelComplete = true
          this.checkLevelComplete()
        }
      }
    }, levelSpawnInterval)
  }

  loop(timestamp) {
    if (!this.isRunning) return
    
    const deltaTime = timestamp - this.lastTime
    this.lastTime = timestamp
    
    this.update(deltaTime)
    this.render()
    
    requestAnimationFrame((t) => this.loop(t))
  }

  update(deltaTime) {
    this.waitingArea.update(deltaTime)
    this.equipmentRoom.update(deltaTime)
    this.doctors.forEach(doctor => doctor.update(deltaTime, this.bedArea))
    
    // 更新浮动文字
    this.updateFloatingTexts(deltaTime)
    
    this.waitingArea.patients.forEach(patient => patient.update(deltaTime))
    this.bedArea.getOccupiedBeds().forEach(bed => {
      if (bed.patient) {
        bed.patient.update(deltaTime)
        // 治疗完成后病人自行离开
        if (bed.patient.isCured) {
          // 增加分数（只加一次）
          if (!bed.scoreAdded) {
            const addedScore = 10 + Math.floor(Math.random() * 20)
            this.score += addedScore
            this.treatedCount++
            bed.scoreAdded = true
            
            // 添加浮动文字动画
            this.addFloatingText(`+${addedScore}`, bed.x + bed.width / 2, bed.y, '#FFD700')
            this.addFloatingText('+❤️', bed.x + bed.width / 2, bed.y - 30, '#E74C3C')
            
            // 检查是否完成关卡（当所有病人都已生成且都被处理）
            const totalPatients = this.levelConfig[this.currentLevel].maxPatients
            if (this.spawnedPatientsCount >= totalPatients) {
              this.levelComplete = true
              this.checkLevelComplete()
            }
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
    
    this.waitingArea.patients.forEach(patient => {
      patient.patience -= deltaTime / 1000
      // 耐心归零且未开始离开流程
      if (patient.patience <= 0 && !patient.isLeaving && !patient.tomatoThrown) {
        patient.isAngry = true
        // 计算前台位置（护士台前方）
        const frontDeskX = this.waitingArea.x + this.waitingArea.width / 2
        const frontDeskY = this.waitingArea.y + this.waitingArea.height * 0.45
        patient.startLeaving(frontDeskX, frontDeskY)
        // 爱心减1（生命值减少）
        this.treatedCount--
        
        // 检查游戏结束
        if (this.treatedCount < 0) {
          this.gameOver()
        }
      }
    })
    
    // 清理已经离开的愤怒病人
    const angryPatients = this.waitingArea.patients.filter(p => p.shouldRemove)
    angryPatients.forEach(patient => {
      this.waitingArea.removePatient(patient)
      // 检查是否完成关卡（当所有病人都已生成且都被处理）
      const totalPatients = this.levelConfig[this.currentLevel].maxPatients
      if (this.spawnedPatientsCount >= totalPatients) {
        this.levelComplete = true
        this.checkLevelComplete()
      }
    })
  }

  spawnPatient() {
    this.spawnPatientFromLeft()
  }

  // 从左侧走进来的病人生成
  spawnPatientFromLeft() {
    if (this.waitingArea.patients.length >= 8) return
    
    const patient = new Patient(this.patientIdCounter++)
    
    // 初始位置在等候区左侧外面
    patient.x = this.waitingArea.x - 50
    patient.y = this.waitingArea.y + this.waitingArea.height * 0.5
    patient.targetX = patient.x
    patient.targetY = patient.y
    
    // 先添加到等候区
    this.waitingArea.addPatient(patient)
    
    // 然后让病人走到等候区内的目标位置
    setTimeout(() => {
      const emptySeat = this.waitingArea.seats.find(seat => seat.patient === patient)
      const emptyQueue = this.waitingArea.queuePositions.find(q => q.patient === patient)
      
      if (emptySeat) {
        // 使用与 WaitingArea.js 中一致的位置计算
        const targetX = emptySeat.x + (emptySeat.width - patient.width) / 2
        const targetY = emptySeat.y + emptySeat.height * 0.62  // 调整此值改变位置 (0-1 之间，越大越靠下)
        patient.moveTo(targetX, targetY)
      } else if (emptyQueue) {
        patient.moveTo(emptyQueue.x - patient.width / 2, emptyQueue.y - patient.height)
      }
    }, 100)
  }

  spawnPatientWithHairStyle(hairStyle) {
    if (this.waitingArea.patients.length >= 8) return
    
    const patient = new Patient(this.patientIdCounter++)
    // 强制设置发型
    patient.hairStyle = hairStyle
    // 从左侧入口进入
    patient.x = this.waitingArea.x + 20
    patient.y = this.waitingArea.y + 80
    patient.targetX = patient.x
    patient.targetY = patient.y
    this.waitingArea.addPatient(patient)
  }

  render() {
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
    
    // 渲染医生
    this.doctors.forEach(doctor => doctor.render(this.ctx))
    this.renderPatients()
    this.renderUI()
    this.renderFloatingTexts()
    this.renderGameOverModal()
    this.renderLevelCompleteModal()
    this.renderLevelToast()
    this.renderGameWinModal()
    
    this.ctx.restore()
  }

  // 在治疗区底部渲染托盘
  renderTrayAtBedArea() {
    const bedArea = this.bedArea
    // 托盘位置：治疗区底部居中，宽度为治疗区的一半
    const trayWidth = bedArea.width * 0.5
    const trayHeight = 32
    const trayX = bedArea.x + (bedArea.width - trayWidth) / 2
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
    
    // 等候区背景（浅蓝色）
    ctx.fillStyle = 'rgba(230, 243, 255, 0.7)'
    fillRoundRect(ctx, this.waitingArea.x, this.waitingArea.y, this.waitingArea.width, this.waitingArea.height, 15)
    ctx.strokeStyle = '#E0E0E0'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, this.waitingArea.x, this.waitingArea.y, this.waitingArea.width, this.waitingArea.height, 15)
    
    // 治疗区背景
    ctx.fillStyle = 'rgba(181, 234, 215, 0.4)'
    fillRoundRect(ctx, this.bedArea.x, this.bedArea.y, this.bedArea.width, this.bedArea.height, 15)
    ctx.strokeStyle = '#B5EAD7'
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
    ctx.fillText('🏥 急症室模拟器', this.mapX + 15, titleY)
    
    // 关卡数显示
    ctx.fillStyle = '#FFF'
    ctx.font = `bold ${Math.max(14, this.screenWidth * 0.02)}px cursive, sans-serif`
    ctx.fillText(`第${this.currentLevel + 1}关`, this.mapX + 180, titleY)
    
    // 统计
    const fontSize = Math.max(12, this.screenWidth * 0.018)
    ctx.font = `${fontSize}px cursive, sans-serif`
    
    // 荣誉点图标 + 数值（右上角）
    const honorX = this.mapX + this.mapWidth - 200
    if (this.honorImage) {
      ctx.drawImage(this.honorImage, honorX, this.mapY + (headerHeight - 20) / 2, 20, 20)
    }
    ctx.fillStyle = '#FFF'
    ctx.fillText(`${this.score}`, honorX + 28, titleY)
    
    // 爱心图标 + 数值（荣誉点旁边）
    const heartX = this.mapX + this.mapWidth - 130
    if (this.heartImage) {
      ctx.drawImage(this.heartImage, heartX, this.mapY + (headerHeight - 20) / 2, 20, 20)
      ctx.fillText(`${this.treatedCount}`, heartX + 28, titleY)
    } else {
      ctx.fillText(`❤️ ${this.treatedCount}`, heartX, titleY)
    }
    
    // 区域标题
    const areaTitleY = this.mapY + headerHeight + 32
    const titleFontSize = Math.max(12, this.screenWidth * 0.018)
    ctx.font = `${titleFontSize}px cursive, sans-serif`
    ctx.textBaseline = 'middle'
    
    // 等候区标题 - 显示已出现病人数/本关卡总病人数
    const levelMax = this.levelConfig[this.currentLevel].maxPatients
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
    wx.onTouchStart((e) => {
      const touch = e.touches[0]
      const x = touch.clientX
      const y = touch.clientY
      
      // 优先处理弹窗点击（按优先级顺序）
      if (this.gameWinModal && this.gameWinModal.visible) {
        if (this.handleGameWinTouch(x, y)) {
          return
        }
      }
      
      if (this.levelCompleteModal && this.levelCompleteModal.visible) {
        if (this.handleLevelCompleteTouch(x, y)) {
          return
        }
      }
      
      if (this.gameOverModal && this.gameOverModal.visible) {
        // 游戏结束弹窗的点击处理...
        return
      }
      
      // 检查是否在重置按钮区域（右上角）
      if (x > this.screenWidth - 100 && y < 60) {
        this.reset()
        return
      }
      
      // 检查是否点击重置按钮（优先检测，避免和器械柜重叠）
      if (this.equipmentRoom.isClickOnResetButton(x, y)) {
        const trayItems = this.equipmentRoom.getTrayItems()
        if (trayItems.length > 0) {
          this.equipmentRoom.clearTray()
        }
        return
      }
      
      // 检查是否点击发送按钮（优先检测，避免和器械柜重叠）
      if (this.equipmentRoom.isClickOnSendButton(x, y)) {
        this.handleSendButtonClick()
        return
      }
      
      // 检查是否点击器材室的物品 - 点击放入托盘
      const itemId = this.equipmentRoom.getItemAt(x, y)
      if (itemId) {
        const item = getItemById(itemId)
        if (item) {
          // 将物品放入托盘
          const result = this.equipmentRoom.addItemToTray(item)
          if (result.success) {
            console.log('已将', item.name, '放入托盘')
          } else if (result.reason === 'duplicate') {
            console.log(item.name, '已在托盘中')
          } else if (result.reason === 'full') {
            wx.showToast({
              title: '托盘已满(最多2个)',
              icon: 'none',
              duration: 1200
            })
          }
        }
        return
      }
      
      // 点击病人 - 自动分配到空闲病床
      const patient = this.waitingArea.getPatientAt(x, y)
      if (patient && !patient.inBed && patient.patience > 0 && !patient.isLeaving) {
        // 查找空闲病床
        const emptyBed = this.bedArea.findEmptyBed()
        if (emptyBed) {
          // 自动分配病人到病床
          this.waitingArea.removePatient(patient)
          emptyBed.assignPatient(patient)
          patient.inBed = true
          this.notifyDoctors(emptyBed)
          console.log('病人自动分配到病床:', emptyBed.id)
        } else {
          // 没有空闲病床
          wx.showToast({
            title: '暂无空闲病床',
            icon: 'none',
            duration: 1500
          })
        }
      }
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

  reset() {
    wx.showModal({
      title: '重新开始',
      content: '要重新开始游戏吗？',
      success: (res) => {
        if (res.confirm) {
          // 清理所有定时器
          clearInterval(this.timeTimer)
          clearInterval(this.spawnTimer)
          if (this.initialSpawnTimer) {
            clearInterval(this.initialSpawnTimer)
          }
          
          this.score = 0
          this.treatedCount = 0
          this.gameTime = 0
          this.patientIdCounter = 1
          this.waitingArea.clear()
          this.bedArea.clear()
          this.doctors.forEach(doctor => {
            doctor.targetBed = null
            doctor.state = 'idle'
          })
        }
      }
    })
  }
  
  // 游戏结束
  gameOver() {
    this.isRunning = false
    clearInterval(this.timeTimer)
    clearInterval(this.spawnTimer)
    if (this.initialSpawnTimer) {
      clearInterval(this.initialSpawnTimer)
    }
    
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
      
      const totalPatients = this.levelConfig[this.currentLevel].maxPatients
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
        if (this.currentLevel < this.levelConfig.length - 1) {
          // 进入下一关
          this.showLevelCompleteModal()
        } else {
          // 所有关卡完成，游戏胜利
          this.showGameWinModal()
        }
      }
    }, 2000)
  }
  
  // 显示关卡完成提示（轻量提示，自动进入下一关）
  showLevelCompleteModal() {
    console.log('显示关卡完成提示，当前关卡:', this.currentLevel)
    
    // 显示自定义轻量提示
    this.levelToast = {
      visible: true,
      message: `下一波病人即将来临...`,
      showTime: Date.now()
    }
    
    // 延迟后自动进入下一关
    setTimeout(() => {
      this.levelToast = null
      this.nextLevel()
    }, 2000)
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
    
    // 清理当前状态
    this.waitingArea.clear()
    this.bedArea.clear()
    this.doctors.forEach(doctor => {
      doctor.targetBed = null
      doctor.state = 'idle'
    })
    
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
    clearInterval(this.spawnTimer)
    
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
    clearInterval(this.spawnTimer)
    if (this.initialSpawnTimer) {
      clearInterval(this.initialSpawnTimer)
    }
    
    this.currentLevel = 0
    this.gameOverModal = null
    this.levelCompleteModal = null
    this.gameWinModal = null
    this.levelToast = null
    this.isRunning = false
    this.score = 0
    this.treatedCount = 0
    this.gameTime = 0
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
    
    // 半透明背景遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
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
    
    // 内容文字
    ctx.fillStyle = '#333'
    ctx.font = '14px cursive, sans-serif'
    ctx.fillText('口碑破产，急诊室关闭', modalX + modalWidth / 2, modalY + 55)
    
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
    
    // 更新按钮位置（用于点击检测）
    this.gameWinModal.buttonX = btnX
    this.gameWinModal.buttonY = btnY
    
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
}
