import { drawStar } from './utils.js'
import { GameConfig } from './GameConfig.js'

const CONDITIONS = [
  { name: '感冒', icon: '🤒', color: '#FF9AA2', treatmentTime: 5 },
  { name: '骨折', icon: '🦴', color: '#FFB7B2', treatmentTime: 10 },
  { name: '腹痛', icon: '😣', color: '#FFDAC1', treatmentTime: 7 },
  { name: '头痛', icon: '🤕', color: '#E2F0CB', treatmentTime: 4 },
  { name: '胸闷', icon: '💔', color: '#B5EAD7', treatmentTime: 8 },
  { name: '过敏', icon: '🔴', color: '#C7CEEA', treatmentTime: 6 },
  { name: '发烧', icon: '🌡️', color: '#F8B195', treatmentTime: 6 },
  { name: '扭伤', icon: '🦵', color: '#F67280', treatmentTime: 5 }
]

export default class Patient {
  constructor(id, initialPatience = 30, patientDetail = null) {
    this.id = id
    // 病人详细配置
    this.patientDetail = patientDetail
    // 使用代号作为名字（1-8号），如果有配置则使用配置中的名字
    this.name = patientDetail ? patientDetail.name : `${id}号`
    this.info = patientDetail ? patientDetail.info : ''
    this.rageLevel = patientDetail ? patientDetail.rageLevel : 1  // 暴怒值 1-5
    this.age = Math.floor(Math.random() * 50) + 15
    this.condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)]
    
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
    
    this.patience = initialPatience  // 使用配置的初始耐心值
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
    this.showHeartEffect = false  // 开始走向左上角时触发爱心-1效果
    
    // 病人状态：'queuing'(前台排队), 'seated'(坐在椅子上), 'inbed'(在床上)
    this.state = 'queuing'
    
    // 暴走相关状态
    this.isRaging = false           // 是否处于暴走状态
    this.rageTargetDoctor = null    // 暴走目标医生
    this.rageTimeRemaining = 0      // 暴走剩余时间（毫秒）
    this.rageStartTime = 0          // 暴走开始时间
    
    // 病人图片编号（1-14 号按顺序循环使用）
    this.patientType = ((id - 1) % 14) + 1
    
    // 加载图片
    this.normalImage = null
    this.angryImage = null
    this.boomImage = null
    this.loadImages()
  }

  loadImages() {
    // 加载正常状态图片
    const normalImg = wx.createImage()
    normalImg.onload = () => {
      this.normalImage = normalImg
    }
    normalImg.onerror = () => {
      console.warn(`Failed to load patient normal image: images/patient_${this.patientType}_normal.png`)
    }
    normalImg.src = `images/patient_${this.patientType}_normal.png`
    
    // 加载生气状态图片
    const angryImg = wx.createImage()
    angryImg.onload = () => {
      this.angryImage = angryImg
    }
    angryImg.onerror = () => {
      console.warn(`Failed to load patient angry image: images/patient_${this.patientType}_angry.png`)
    }
    angryImg.src = `images/patient_${this.patientType}_angry.png`
    
    // 加载爆炸图标
    const boomImg = wx.createImage()
    boomImg.onload = () => {
      this.boomImage = boomImg
    }
    boomImg.onerror = () => {
      console.warn('Failed to load boom image: images/boom.png')
    }
    boomImg.src = 'images/boom.png'
  }

  update(deltaTime) {
    this.animationTime += deltaTime
    
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
        
        // 如果正在离开且到达屏幕底部，标记为可移除
        if (this.isLeaving && !this.shouldRemove) {
          // 检查是否到达屏幕底部之外
          if (this.y > this.targetY - 5) {
            this.shouldRemove = true
          }
        }
      }
    } else {
      this.bounceOffset = Math.sin(this.animationTime / 500) * -1
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
    this.showHeartEffect = true  // 触发爱心-1效果
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

  render(ctx, isDragging = false) {
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
    
    // 绘制病人图片
    const currentImage = this.isAngry ? this.angryImage : this.normalImage
    
    if (currentImage && currentImage.width > 0) {
      // 使用图片绘制病人：targetHeight可以调整病人高度
      const targetHeight = 75
      const imageScale = targetHeight / currentImage.height
      const drawWidth = currentImage.width * imageScale
      const drawHeight = targetHeight
      
      ctx.drawImage(currentImage, -drawWidth / 2, -drawHeight / 2 - 26, drawWidth, drawHeight)
    }
    
    ctx.restore()
    
    // 耐心条（只在非离开状态、非暴走状态、非排队状态显示）
    if (!this.inBed && !this.isCured && !this.isLeaving && !this.isRaging && this.state !== 'queuing') {
      const patiencePercent = Math.max(0, this.patience / this.maxPatience)
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      // 耐心条位置跟随病人图片移动
      const barY = this.y - 68 * scale + this.bounceOffset
      ctx.fillRect(centerX - 18 * scale, barY, 36 * scale, 5 * scale)
      // 耐心条颜色：>50%绿色，30%-50%橙色，<30%红色
      let barColor
      if (patiencePercent > 0.5) {
        barColor = '#2ECC71' // 绿色
      } else if (patiencePercent > 0.3) {
        barColor = '#F39C12' // 橙色
      } else {
        barColor = '#E74C3C' // 红色
      }
      ctx.fillStyle = barColor
      ctx.fillRect(centerX - 18 * scale, barY, 36 * scale * patiencePercent, 5 * scale)
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
      
      ctx.fillStyle = '#FF69B4'
      ctx.font = `${16 * scale}px "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('❤️', 0, -45 * scale)
      
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
    // 暴走病人有更大的点击范围，方便用户拖动
    const paddingX = this.isRaging ? 40 : 15
    const paddingY = this.isRaging ? 50 : 20
    return x >= this.x - paddingX && x <= this.x + this.width + paddingX &&
           y >= this.y - paddingY && y <= this.y + this.height + paddingY * 1.5
  }
}
