import { drawStar, fillRoundRect, strokeRoundRect } from './utils.js'
import { GameConfig, getDiseaseById } from './GameConfig.js'

// ==================== 全局病人图片缓存 ====================
const PatientImageCache = {
  // 正常状态图片缓存: { patientType: image }
  normalImages: {},
  // 生气状态图片缓存: { patientType: image }
  angryImages: {},
  // 生病状态图片缓存: { patientType: image }
  sickImages: {},
  // 爆炸图标（全局只加载一次）
  boomImage: null,
  // 是否已初始化
  initialized: false,
  
  // 初始化缓存（只调用一次）
  init() {
    if (this.initialized) return
    this.initialized = true
    
    // 预加载爆炸图标
    this.loadBoomImage()
  },
  
  // 加载爆炸图标
  loadBoomImage() {
    if (this.boomImage) return this.boomImage
    
    const img = wx.createImage()
    img.onload = () => {
      this.boomImage = img
    }
    img.onerror = () => {
      console.warn('Failed to load boom image')
    }
    img.src = 'images/boom.png'
    return img
  },
  
  // 获取正常状态图片
  getNormalImage(patientType) {
    if (!this.normalImages[patientType]) {
      const img = wx.createImage()
      img.onload = () => {
        this.normalImages[patientType] = img
      }
      img.onerror = () => {
        console.warn(`Failed to load patient normal image: images/patient_${patientType}_normal.png`)
      }
      img.src = `images/patient_${patientType}_normal.png`
      this.normalImages[patientType] = img
    }
    return this.normalImages[patientType]
  },
  
  // 获取生病状态图片
  getSickImage(patientType) {
    if (!this.sickImages[patientType]) {
      const img = wx.createImage()
      img.onload = () => {
        this.sickImages[patientType] = img
      }
      img.onerror = () => {
        console.warn(`Failed to load patient sick image: images/patient_${patientType}_sick.png`)
      }
      img.src = `images/patient_${patientType}_sick.png`
      this.sickImages[patientType] = img
    }
    return this.sickImages[patientType]
  },
  
  // 获取生气状态图片
  getAngryImage(patientType) {
    if (!this.angryImages[patientType]) {
      const img = wx.createImage()
      img.onload = () => {
        this.angryImages[patientType] = img
      }
      img.onerror = () => {
        console.warn(`Failed to load patient angry image: images/patient_${patientType}_angry.png`)
      }
      img.src = `images/patient_${patientType}_angry.png`
      this.angryImages[patientType] = img
    }
    return this.angryImages[patientType]
  },
  
  // 获取爆炸图标
  getBoomImage() {
    if (!this.boomImage) {
      this.loadBoomImage()
    }
    return this.boomImage
  },
  
  // 安抚图标
  comfortImage: null,
  
  // 加载安抚图标
  loadComfortImage() {
    if (this.comfortImage) return this.comfortImage
    
    const img = wx.createImage()
    img.onload = () => {
      this.comfortImage = img
    }
    img.onerror = () => {
      console.warn('Failed to load comfort image')
    }
    img.src = 'images/comfort.png'
    return img
  },
  
  // 获取安抚图标
  getComfortImage() {
    if (!this.comfortImage) {
      this.loadComfortImage()
    }
    return this.comfortImage
  },
  
  // 治疗中图标
  curingImage: null,
  
  // 加载治疗中图标
  loadCuringImage() {
    if (this.curingImage) return this.curingImage
    
    const img = wx.createImage()
    img.onload = () => {
      this.curingImage = img
    }
    img.onerror = () => {
      console.warn('Failed to load curing image')
    }
    img.src = 'images/curing.png'
    this.curingImage = img
    return img
  },
  
  // 获取治疗中图标
  getCuringImage() {
    if (!this.curingImage) {
      this.loadCuringImage()
    }
    return this.curingImage
  }
}

// 立即初始化缓存
PatientImageCache.init()

export default class Patient {
  constructor(id, patientDetail = null, disease = null) {
    this.id = id
    // 病人详细配置
    this.patientDetail = patientDetail
    // 使用代号作为名字（1-8号），如果有配置则使用配置中的名字
    this.name = patientDetail ? patientDetail.name : `${id}号`
    this.rageLevel = patientDetail ? patientDetail.rageLevel : 1  // 暴怒值 1-5
    this.age = Math.floor(Math.random() * 50) + 15
    
    // 病情配置：优先从 patientDetail.disease_id 获取，否则使用传入的 disease 或默认
    if (patientDetail && patientDetail.disease_id) {
      // 从 patientDetail 获取疾病配置
      this.disease = getDiseaseById(patientDetail.disease_id)
    } else if (disease) {
      // 使用传入的疾病配置
      this.disease = disease
    } else {
      // 默认疾病
      this.disease = { disease_id: 1, disease_name: '发烧', patience: 10 }
    }
    
    this.condition = {
      name: this.disease.disease_name,
      icon: this.getDiseaseIcon(this.disease.disease_name),
      color: this.getDiseaseColor(this.disease.disease_name)
    }
    
    // 位置和尺寸（根据屏幕自适应）
    this.x = 0
    this.y = 0
    this.targetX = 0
    this.targetY = 0
    // 基础尺寸
    this.baseWidth = 21
    this.baseHeight = 33.75
    this.width = this.baseWidth
    this.height = this.baseHeight
    
    this.animationTime = 0
    this.bounceOffset = 0
    this.facing = 1
    this.isMoving = false
    
    // 耐心值从病情配置获取
    this.patience = this.disease.patience
    this.maxPatience = this.patience
    this.isAngry = false
    this.inBed = false
    this.isCured = false
    this.cureAnimation = 0
    
    // 离开相关状态
    this.isLeaving = false
    this.tomatoThrown = false
    this.leaveTargetX = 0
    this.leaveTargetY = 0
    
    // 病人状态：'queuing'(前台排队), 'seated'(坐在椅子上), 'inbed'(在床上), 'movingToIV'(走向输液椅)
    this.state = 'queuing'
    
    // 是否显示耐心条（点击"普通"按钮后显示，即使没有坐下）
    this.showPatienceBar = false
    
    // 输液椅相关
    this.targetIVSeat = null
    this.onArriveAtIVSeat = null
    
    // 分数添加标记（防止重复计分）
    this.scoreAdded = false
    
    // 输液治疗相关
    this.ivTreatmentProgress = 0       // 输液治疗进度 (0-1)
    this.ivTreatmentComplete = false   // 输液治疗是否完成
    this.ivTreatmentTime = 0           // 当前已治疗时间（毫秒）
    this.ivTotalTreatmentTime = 0      // 总治疗时间（毫秒）
    
    // 暴走相关状态
    this.isRaging = false           // 是否处于暴走状态
    this.rageTargetDoctor = null    // 暴走目标医生
    this.rageTimeRemaining = 0      // 暴走剩余时间（毫秒）
    this.rageStartTime = 0          // 暴走开始时间
    
    // 安抚相关状态（耐心暂停减少）
    this.patiencePaused = false     // 耐心值是否暂停减少
    this.patiencePauseTime = 0      // 暂停剩余时间（毫秒）
    
    // 病人图片编号（使用 patientDetail.id，直接对应图片编号 1-26）
    this.patientType = patientDetail ? patientDetail.id : id
    
    // 从全局缓存获取图片（避免重复加载）
    // normalImage 保留给将来使用，现在默认显示 sick 图片
    this.sickImage = PatientImageCache.getSickImage(this.patientType)
    this.normalImage = this.sickImage  // 目前 normal 也指向 sick
    // angryImage 也使用 sick 图片
    this.angryImage = this.sickImage
    this.boomImage = PatientImageCache.getBoomImage()
    this.comfortImage = PatientImageCache.getComfortImage()
    this.curingImage = PatientImageCache.getCuringImage()
  }

  // 根据病情名称获取图标
  getDiseaseIcon(diseaseName) {
    const iconMap = {
      '发烧': '🌡️',
      '头痛': '🤕',
      '骨折': '🦴',
      '腹痛': '😣',
      '胸闷': '💔',
      '过敏': '🔴',
      '扭伤': '🦵',
      '感冒': '🤒'
    }
    return iconMap[diseaseName] || '🏥'
  }

  // 根据病情名称获取颜色
  getDiseaseColor(diseaseName) {
    const colorMap = {
      '发烧': '#F8B195',
      '头痛': '#E2F0CB',
      '骨折': '#FFB7B2',
      '腹痛': '#FFDAC1',
      '胸闷': '#B5EAD7',
      '过敏': '#C7CEEA',
      '扭伤': '#F67280',
      '感冒': '#FF9AA2'
    }
    return colorMap[diseaseName] || '#CCCCCC'
  }

  update(deltaTime) {
    this.animationTime += deltaTime
    
    // 安抚状态更新（耐心暂停减少）
    if (this.patiencePaused) {
      this.patiencePauseTime -= deltaTime
      if (this.patiencePauseTime <= 0) {
        this.patiencePaused = false
        this.patiencePauseTime = 0
      }
    }
    
    // 暴走状态更新
    if (this.isRaging && this.rageTargetDoctor) {
      if (!this.hasLockedDoctor) {
        // 还没锁定医生，检查是否到达治疗区
        if (!this.isMoving && this.checkArrivedAtBedArea()) {
          // 到达治疗区，锁定医生并开始跟随
          this.lockDoctorAndFollow()
          // 显示爆炸图标
          this.tomatoThrown = true
        }
      } else {
        // 已锁定医生，持续跟随
        if (!this.isMoving) {
          const dx = this.rageTargetDoctor.x - this.x
          const dy = this.rageTargetDoctor.y - this.y
          const dist = Math.hypot(dx, dy)
          // 如果医生移动超过10像素，继续跟随
          if (dist > 10) {
            this.updateFollowPosition()
          }
        }
      }
    }
    
    if (this.isMoving) {
      // 暴走时动画更快
      const bounceSpeed = this.isRaging ? 100 : 150
      this.bounceOffset = Math.abs(Math.sin(this.animationTime / bounceSpeed)) * -2
      
      const dx = this.targetX - this.x
      const dy = this.targetY - this.y
      const dist = Math.hypot(dx, dy)
      
      // 调试日志：如果是离开状态，打印移动信息
      if (this.isLeaving && Math.random() < 0.01) {
        console.log('病人移动:', this.name, 'dist:', dist.toFixed(2), 'isMoving:', this.isMoving, 'tomatoThrown:', this.tomatoThrown)
      }
      
      if (dist > 2) {
        // 暴走时使用配置的移动速度，走向病床时使用自定义速度，普通状态使用默认速度
        let baseSpeed
        if (this.isRaging) {
          baseSpeed = GameConfig.rage.walkSpeed
        } else if (this.state === 'movingToBed' && this.moveSpeed) {
          baseSpeed = this.moveSpeed // 走向病床时的较快速度
        } else {
          baseSpeed = 0.12 // 默认速度
        }
        const speed = baseSpeed * deltaTime
        this.x += (dx / dist) * speed
        this.y += (dy / dist) * speed
        this.facing = dx > 0 ? 1 : -1
      } else {
        this.isMoving = false
        this.bounceOffset = 0
        
        // 如果正在走向病床且已到达
        if (this.state === 'movingToBed' && this.targetBed) {
          this.arriveAtBed()
        }
        
        // 如果正在走向输液椅且已到达
        if (this.state === 'movingToIV' && this.targetIVSeat && this.onArriveAtIVSeat) {
          this.onArriveAtIVSeat(this.targetIVSeat)
        }
        
        // 如果正在离开且到达屏幕底部，标记为可移除
        if (this.isLeaving && !this.shouldRemove) {
          // 检查是否到达屏幕底部之外
          if (this.y > this.targetY - 5) {
            this.shouldRemove = true
          }
        }
      }
    } else {
      // 待机时的上下摆动（幅度比护士小）
      this.bounceOffset = Math.sin(this.animationTime / 800) * -1
    }
    
    if (this.isCured) {
      this.cureAnimation += deltaTime / 200
      this.bounceOffset = Math.sin(this.cureAnimation * 3) * -3
    }
  }

  moveTo(x, y) {
    this.targetX = x
    this.targetY = y
    this.isMoving = true
  }

  // 到达病床后的处理
  arriveAtBed() {
    if (!this.targetBed) return
    
    // 设置病人尺寸与医生一致
    this.width = 21
    this.height = 33.75
    
    // 正式分配到病床
    this.targetBed.patient = this
    this.targetBed.treatmentProgress = 0
    this.inBed = true
    this.state = 'inbed'
    
    // 保存病床引用并清空临时目标
    const bed = this.targetBed
    this.targetBed = null
    this.moveSpeed = null // 重置移动速度
    
    // 触发游戏通知医生的回调（通过事件或回调函数）
    if (this.onArriveAtBed) {
      this.onArriveAtBed(bed)
    }
    
    console.log(`病人 ${this.name} 已到达病床 ${bed.id + 1}号`)
  }

  // 开始离开流程（从屏幕底部离开）
  startLeaving(screenHeight) {
    this.isLeaving = true
    this.isAngry = true
    this.tomatoThrown = true  // 显示小火焰
    // 直接从当前位置走向屏幕底部
    this.moveTo(this.x, screenHeight + 100)
  }

  // 开始暴走 - 先走到治疗区，再锁定医生
  startRage(doctor, bedArea) {
    this.isRaging = true
    this.isAngry = true
    this.rageTargetDoctor = doctor
    this.bedArea = bedArea // 保存治疗区引用
    // 设置跟随偏移（在医生后方）
    this.followOffsetX = -35 // 在医生后方35像素
    this.followOffsetY = 5
    // 还未锁定医生，先走到治疗区
    this.hasLockedDoctor = false
    // 计算治疗区内的目标位置（医生附近）
    this.moveToBedAreaNearDoctor()
  }

  // 移动到治疗区内（医生附近但不锁定）
  moveToBedAreaNearDoctor() {
    if (!this.rageTargetDoctor || !this.bedArea) return
    // 目标位置：治疗区内，医生方向的边缘
    const doctorX = this.rageTargetDoctor.x
    const doctorY = this.rageTargetDoctor.y
    // 在医生旁边一个较远的位置（治疗区入口处）
    const targetX = this.bedArea.x + this.bedArea.width * 0.2 // 治疗区左侧入口
    const targetY = doctorY + (Math.random() - 0.5) * 50 // 医生高度附近，略有偏移
    this.moveTo(targetX, targetY)
  }

  // 检查是否到达治疗区内位置
  checkArrivedAtBedArea() {
    if (!this.bedArea) return false
    const dx = this.x - this.targetX
    const dy = this.y - this.targetY
    const dist = Math.hypot(dx, dy)
    return dist < 10 // 距离目标位置小于10像素认为到达
  }

  // 锁定医生并开始跟随
  lockDoctorAndFollow() {
    if (!this.rageTargetDoctor || this.hasLockedDoctor) return
    this.hasLockedDoctor = true
    // 锁定医生，医生会停止移动
    this.rageTargetDoctor.lockByPatient(this)
    // 开始跟随医生
    this.updateFollowPosition()
    // 设置标记，通知 Game 显示提示
    this.justLockedDoctor = true
  }

  // 更新跟随位置（跟随医生）
  updateFollowPosition() {
    if (!this.isRaging || !this.rageTargetDoctor || !this.hasLockedDoctor) return
    // 计算跟随位置（医生后方）
    const targetX = this.rageTargetDoctor.x + this.followOffsetX
    const targetY = this.rageTargetDoctor.y + this.followOffsetY
    this.moveTo(targetX, targetY)
  }

  // 结束暴走 - 转为普通离开（从屏幕底部离开）
  endRage(screenHeight) {
    // 解锁医生
    if (this.rageTargetDoctor) {
      this.rageTargetDoctor.unlockByPatient()
    }
    this.isRaging = false
    this.rageTargetDoctor = null
    // 开始正常离开流程，从屏幕底部离开
    const targetScreenHeight = screenHeight || 1000 // 默认值
    this.startLeaving(targetScreenHeight)
  }

  // 被用户拖回等候区 - 结束暴走
  draggedBackToWaiting() {
    this.endRage()
  }

  // 开始耐心暂停（安抚按钮效果）
  startPatiencePause(durationMs) {
    this.patiencePaused = true
    this.patiencePauseTime = durationMs
  }

  // 检查耐心是否暂停
  isPatiencePaused() {
    return this.patiencePaused
  }

  render(ctx, isDragging = false, curedImage = null) {
    ctx.save()
    
    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2
    
    ctx.translate(centerX, centerY + this.bounceOffset)
    
    if (isDragging) {
      ctx.scale(1.1, 1.1)
    }
    
    ctx.scale(this.facing, 1)
    
    // 根据基础尺寸计算缩放比例
    const scale = this.width / this.baseWidth
    
    // 绘制病人图片（默认显示 sick 图片）
    const currentImage = this.isAngry ? this.angryImage : this.sickImage
    
    if (currentImage && currentImage.width > 0) {
      // 使用图片绘制病人：targetHeight可以调整病人高度
      const targetHeight = 75
      const imageScale = targetHeight / currentImage.height
      const drawWidth = currentImage.width * imageScale
      const drawHeight = targetHeight
      
      ctx.drawImage(currentImage, -drawWidth / 2, -drawHeight / 2 - 26, drawWidth, drawHeight)
    }
    
    ctx.restore()
    
    // 输液椅上病人：显示治疗进度条或耐心值进度条
    if (this.seat && this.state === 'seated' && !this.isLeaving && !this.isRaging) {
      ctx.save()
      const barY = this.y - 75 * scale + this.bounceOffset
      
      // 判断是否为紧急疾病（priority 1）
      const isEmergencyPriority = this.disease && this.disease.diseases_priority === 1
      
      if (isEmergencyPriority) {
        // 【紧急疾病】显示真实的耐心值进度条（绿色/橙色/红色）
        const patiencePercent = Math.max(0, this.patience / this.maxPatience)
        const barWidth = 40 * scale
        const barHeight = 8 * scale
        const barX = centerX - barWidth / 2
        const radius = barHeight / 2
        
        // 进度条背景（灰色圆角）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        fillRoundRect(ctx, barX, barY, barWidth, barHeight, radius)
        
        // 耐心值进度条颜色：>50%绿色，30%-50%橙色，<30%红色
        let barColor
        if (patiencePercent > 0.5) {
          barColor = '#2ECC71' // 绿色
        } else if (patiencePercent > 0.3) {
          barColor = '#F39C12' // 橙色
        } else {
          barColor = '#E74C3C' // 红色
        }
        ctx.fillStyle = barColor
        const progressWidth = barWidth * patiencePercent
        if (progressWidth > 0) {
          fillRoundRect(ctx, barX, barY, progressWidth, barHeight, radius)
        }
      } else if (this.ivTreatmentComplete) {
        // 【非紧急疾病】治疗完成：显示绿色圆圈 + 对勾（带上下跳动动画）
        // 上下跳动动画：周期约0.8秒，跳动幅度 3px
        const bounceOffset = Math.sin(this.animationTime / 160) * 3 * scale
        // 绿色圆圈 + 对勾
        ctx.fillStyle = '#27AE60'
        ctx.beginPath()
        ctx.arc(centerX, barY + 5 * scale + bounceOffset, 14 * scale, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#FFF'
        ctx.lineWidth = 2 * scale
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(centerX - 4 * scale, barY + 5 * scale + bounceOffset)
        ctx.lineTo(centerX - 1 * scale, barY + 8 * scale + bounceOffset)
        ctx.lineTo(centerX + 5 * scale, barY + 2 * scale + bounceOffset)
        ctx.stroke()
      } else {
        // 【非紧急疾病】治疗中：显示蓝色圆角进度条
        const barWidth = 40 * scale
        const barHeight = 8 * scale
        const barX = centerX - barWidth / 2
        const radius = barHeight / 2  // 圆角半径为高度的一半，形成圆润的胶囊形状
        
        // 进度条背景（灰色圆角）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
        fillRoundRect(ctx, barX, barY, barWidth, barHeight, radius)
        
        // 蓝色进度条（圆角）
        ctx.fillStyle = '#3498DB'
        const progressWidth = barWidth * this.ivTreatmentProgress
        if (progressWidth > 0) {
          fillRoundRect(ctx, barX, barY, progressWidth, barHeight, radius)
        }
        
        // 绘制治疗中图标（在进度条左侧）
        if (this.curingImage && this.curingImage.width > 0) {
          const iconSize = 18 * scale
          ctx.drawImage(this.curingImage, barX - iconSize - 3 * scale, barY + (barHeight - iconSize) / 2, iconSize, iconSize)
        }
      }
      
      ctx.restore()
    }
    // 其他状态：显示耐心条（常驻显示，除了床上、已治愈、离开、暴走状态）
    else if (!this.inBed && !this.isCured && !this.isLeaving && !this.isRaging) {
      const patiencePercent = Math.max(0, this.patience / this.maxPatience)
      ctx.save()
      
      // 耐心条位置跟随病人图片移动（向上偏移）
      const barWidth = 36 * scale
      const barHeight = 6 * scale
      const barX = centerX - barWidth / 2
      const barY = this.y - 69 * scale + this.bounceOffset
      const radius = barHeight / 2  // 圆角半径为高度的一半，形成圆润的胶囊形状
      
      // 耐心条背景（灰色圆角）
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      fillRoundRect(ctx, barX, barY, barWidth, barHeight, radius)
      
      // 安抚状态：在耐心条上方显示安抚图标
      if (this.patiencePaused && this.comfortImage && this.comfortImage.width > 0) {
        const comfortSize = 20 * scale
        const comfortX = centerX - comfortSize / 2
        const comfortY = barY - comfortSize - 4 * scale
        ctx.drawImage(this.comfortImage, comfortX, comfortY, comfortSize, comfortSize)
      }
      
      // 耐心条颜色：>50%绿色，30%-50%橙色，<30%红色，暂停状态粉色
      let barColor
      if (this.patiencePaused) {
        barColor = '#F5B2AE' // 粉色（安抚暂停状态）
      } else if (patiencePercent > 0.5) {
        barColor = '#2ECC71' // 绿色
      } else if (patiencePercent > 0.3) {
        barColor = '#F39C12' // 橙色
      } else {
        barColor = '#E74C3C' // 红色
      }
      ctx.fillStyle = barColor
      const progressWidth = barWidth * patiencePercent
      if (progressWidth > 0) {
        fillRoundRect(ctx, barX, barY, progressWidth, barHeight, radius)
      }
      
      ctx.restore()
    }
    
    // 治愈特效
    if (this.isCured) {
      ctx.save()
      ctx.translate(centerX, centerY)
      
      for (let i = 0; i < 6; i++) {
        const angle = (this.cureAnimation + i * Math.PI / 3)
        const starX = Math.cos(angle) * 35 * scale
        const starY = Math.sin(angle) * 35 * scale
        const color = i % 2 === 0 ? '#FFD700' : '#FF69B4'
        drawStar(ctx, starX, starY, 5 * scale, color)
      }
      
      ctx.restore()
    }
    
    // 小火焰或爆炸图标（到达前台后显示在头顶）
    if (this.tomatoThrown) {
      ctx.save()
      // 暴走状态的爆炸图标位置更高（-110 vs -80）
      const iconOffsetY = this.isRaging ? -90 * scale : -80 * scale
      ctx.translate(centerX, centerY + iconOffsetY + this.bounceOffset)
      
      // 如果是暴走状态，显示爆炸图标（带闪烁动效）
      if (this.isRaging && this.boomImage) {
        // 闪烁动效：使用正弦函数控制透明度和缩放
        const flashSpeed = 3 // 闪烁速度（降低频率）
        const flashAlpha = 0.7 + Math.sin(this.animationTime / 200 * flashSpeed) * 0.3 // 0.4 - 1.0 之间变化
        const flashScale = 1 + Math.sin(this.animationTime / 200 * flashSpeed * 2) * 0.1 // 0.9 - 1.1 之间变化
        
        const boomSize = 40 * scale * flashScale
        ctx.globalAlpha = flashAlpha
        ctx.drawImage(this.boomImage, -boomSize / 2, -boomSize / 2, boomSize, boomSize)
        ctx.globalAlpha = 1 // 恢复默认透明度
      } else {
        // 普通愤怒状态显示火焰
        const flameTime = this.animationTime / 50
        const flicker = Math.sin(flameTime) * 0.3 + 1
        const lean = Math.sin(flameTime * 0.7) * 2 * scale
        
        // 底层火焰（红色）
        ctx.fillStyle = '#FF4444'
        ctx.beginPath()
        ctx.moveTo(-5 * scale + lean * 0.3, 0)
        ctx.quadraticCurveTo(-4 * scale + lean * 0.5, -8 * scale * flicker, lean * 0.2, -13 * scale * flicker)
        ctx.quadraticCurveTo(4 * scale + lean * 0.5, -8 * scale * flicker, 5 * scale + lean * 0.3, 0)
        ctx.fill()
        
        // 中层火焰（橙色）
        ctx.fillStyle = '#FF7700'
        ctx.beginPath()
        ctx.moveTo(-4 * scale + lean * 0.3, 0)
        ctx.quadraticCurveTo(-3 * scale + lean * 0.5, -6 * scale * flicker, lean * 0.2, -10 * scale * flicker)
        ctx.quadraticCurveTo(3 * scale + lean * 0.5, -6 * scale * flicker, 4 * scale + lean * 0.3, 0)
        ctx.fill()
        
        // 焰心（黄色）
        ctx.fillStyle = '#FFDD33'
        ctx.beginPath()
        ctx.moveTo(-2.5 * scale, 0)
        ctx.quadraticCurveTo(-1.5 * scale, -4 * scale * flicker, 0, -6 * scale * flicker)
        ctx.quadraticCurveTo(1.5 * scale, -4 * scale * flicker, 2.5 * scale, 0)
        ctx.fill()
      }
      
      ctx.restore()
    }
  }

  contains(x, y) {
    // 暴走病人和排队病人有更大的点击范围
    let paddingX, paddingYTop, paddingYBottom
    if (this.isRaging) {
      paddingX = 40
      paddingYTop = 70   // 向上扩展更多（头部区域）
      paddingYBottom = 50
    } else if (this.state === 'queuing') {
      // 排队病人点击区域更大，特别是头部上方
      paddingX = 20
      paddingYTop = 60   // 向上扩展60px覆盖头部
      paddingYBottom = 40
    } else {
      paddingX = 15
      paddingYTop = 50   // 普通病人也增加头部点击区域
      paddingYBottom = 20
    }
    const hit = x >= this.x - paddingX && x <= this.x + this.width + paddingX &&
           y >= this.y - paddingYTop && y <= this.y + this.height + paddingYBottom
    return hit
  }
}
