import { drawStar } from './utils.js'

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
  constructor(id, initialPatience = 30) {
    this.id = id
    // 使用代号作为名字（1-8号）
    this.name = `${id}号`
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
    
    // 病人图片编号（1-14 号按顺序循环使用）
    this.patientType = ((id - 1) % 14) + 1
    
    // 加载图片
    this.normalImage = null
    this.angryImage = null
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
  }

  update(deltaTime) {
    this.animationTime += deltaTime
    
    if (this.isMoving) {
      this.bounceOffset = Math.abs(Math.sin(this.animationTime / 150)) * -2
      
      const dx = this.targetX - this.x
      const dy = this.targetY - this.y
      const dist = Math.hypot(dx, dy)
      
      if (dist > 2) {
        const speed = 0.12 * deltaTime
        this.x += (dx / dist) * speed
        this.y += (dy / dist) * speed
        this.facing = dx > 0 ? 1 : -1
      } else {
        this.isMoving = false
        this.bounceOffset = 0
        
        // 如果正在离开且到达前台位置，停留2秒后走向左上角
        if (this.isLeaving && !this.tomatoThrown) {
          this.tomatoThrown = true
          // 停留2秒钟后走向左上角
          setTimeout(() => {
            // 设置左上角为目标位置
            this.moveTo(this.leaveTargetX - 100, this.leaveTargetY - 100)
            // 触发爱心-1动效标记
            this.showHeartEffect = true
          }, 2000)
        } else if (this.isLeaving && this.tomatoThrown && !this.shouldRemove) {
          // 检查是否到达左上角
          const dx = this.x - (this.leaveTargetX - 100)
          const dy = this.y - (this.leaveTargetY - 100)
          const dist = Math.hypot(dx, dy)
          if (dist < 5) {
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

  // 开始离开流程（去前台扔番茄）
  startLeaving(frontDeskX, frontDeskY) {
    this.isLeaving = true
    this.isAngry = true
    this.leaveTargetX = frontDeskX
    this.leaveTargetY = frontDeskY
    // 走到前台
    this.moveTo(frontDeskX, frontDeskY)
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
    
    // 耐心条（只在非离开状态显示）
    if (!this.inBed && !this.isCured && !this.isLeaving) {
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
    
    // 小火焰（到达前台后显示在头顶）
    if (this.tomatoThrown) {
      ctx.save()
      ctx.translate(centerX, centerY - 80 * scale + this.bounceOffset)
      
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
      
      ctx.restore()
    }
  }

  contains(x, y) {
    // 扩大点击范围
    const paddingX = 15
    const paddingY = 20
    return x >= this.x - paddingX && x <= this.x + this.width + paddingX &&
           y >= this.y - paddingY && y <= this.y + this.height + paddingY * 1.5
  }
}
