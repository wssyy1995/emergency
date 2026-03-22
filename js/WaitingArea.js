import { fillRoundRect, strokeRoundRect } from './utils.js'
import Nurse from './Nurse.js'

// ==================== 全局等候区图片缓存 ====================
const WaitingAreaImageCache = {
  images: {},
  
  getImage(key, src) {
    if (!this.images[key]) {
      const img = wx.createImage()
      img.onload = () => {
        this.images[key] = img
      }
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`)
      }
      img.src = src
      this.images[key] = img
    }
    return this.images[key]
  }
}

export default class WaitingArea {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.patients = []
    
    // 创建护士位置（相对于内层舞台）
    this.nurse = new Nurse(this.x + this.width * 0.55, this.y + this.height * 0.22)
    this.nurse.setScale(this.width)
    
    this.standingQueue = []
    this.initStandingQueue()
    
    // 加载图片
    this.nurseDeskImage = null
    this.plantImage = null
    this.loadImages()
  }

  loadImages() {
    this.nurseDeskImage = WaitingAreaImageCache.getImage('nurseDesk', 'images/nurse_desk.png')
    this.plantImage = WaitingAreaImageCache.getImage('plant', 'images/plant.png')
    this.bookshelfImage = WaitingAreaImageCache.getImage('bookshelf', 'images/bookshelf.png')
    this.guideImage = WaitingAreaImageCache.getImage('guide', 'images/guide.png')
    this.fingerImage = WaitingAreaImageCache.getImage('finger', 'images/finger.png')
    this.lightbulbImage = WaitingAreaImageCache.getImage('lightbulb', 'images/lightbulb.png')
  }
  
  // 设置新玩家模式
  setNewPlayerMode(isNewPlayer) {
    this.nurse.setNewPlayerMode(isNewPlayer)
  }
  
  // 标记 guide 已被点击（点击后不再显示手指指向）
  markGuideClicked() {
    this.guideClicked = true
  }

  initStandingQueue() {
    // 站立排队区：4列2行 = 8个位置（横排，左右间距缩小）
    const standingCols = 4  // 4列
    const standingRows = 2  // 2行
    
    const standingWidth = this.width * 0.20  // 宽度减小
    const standingHeight = this.height * 0.22
    const standingGapX = 4  // 左右间距缩小
    const standingGapY = 10
    
    const standingTotalWidth = standingCols * standingWidth + (standingCols - 1) * standingGapX
    const leftStartX = this.x + (this.width - standingTotalWidth) / 2
    const startY = this.y + this.height * 0.48
    
    // 创建站立排队位置（从左上开始，从左到右，然后下一行）
    let standingIndex = 0
    for (let row = 0; row < standingRows; row++) {
      for (let col = 0; col < standingCols; col++) {
        this.standingQueue.push({
          x: leftStartX + col * (standingWidth + standingGapX),
          y: startY + row * (standingHeight + standingGapY),
          width: standingWidth,
          height: standingHeight,
          occupied: false,
          patient: null,
          index: ++standingIndex
        })
      }
    }
  }

  // 添加病人到等候区（限制8人）
  addPatientToReception(patient) {
    // 最多8个位置
    if (this.patients.length >= 8) return false
    
    const emptyStanding = this.standingQueue.find(pos => !pos.occupied)
    if (!emptyStanding) {
      return false
    }
    
    this.patients.push(patient)
    
    patient.width = 16
    patient.height = 26
    
    emptyStanding.occupied = true
    emptyStanding.patient = patient
    patient.standingPos = emptyStanding
    patient.state = 'queuing'
    
    const targetX = emptyStanding.x + (emptyStanding.width - patient.width) / 2
    const targetY = emptyStanding.y + emptyStanding.height * 0.7
    patient.moveTo(targetX, targetY)
    return true
  }

  // 获取站立区排队的病人
  getReceptionQueuePatients() {
    return this.patients.filter(p => p.state === 'queuing' && p.standingPos)
      .sort((a, b) => (a.standingPos?.index || 0) - (b.standingPos?.index || 0))
  }

  removePatient(patient) {
    const index = this.patients.indexOf(patient)
    if (index > -1) {
      if (patient.standingPos) {
        patient.standingPos.occupied = false
        patient.standingPos.patient = null
        patient.standingPos = null
      }
      this.patients.splice(index, 1)
    }
  }

  // 【已废弃】输液椅已移到治疗区
  hasEmptySeatOfType(seatType) {
    return false
  }

  // 【已废弃】输液椅已移到治疗区
  getEmptySeatCounts() {
    return { iv: 0 }
  }

  clear() {
    this.patients = []
    this.standingQueue.forEach(pos => {
      pos.occupied = false
      pos.patient = null
    })
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }

  getPatientAt(x, y) {
    for (let patient of this.patients) {
      if (patient.contains(x, y)) {
        return patient
      }
    }
    return null
  }

  // 获取 guide.png 的位置和尺寸（统一计算，只改这里）
  getGuideBounds() {
    if (!this.guideImage || !this.guideImage.width > 0) return null
    
    const guideWidth = this.width * 0.24
    const guideHeight = guideWidth * (this.guideImage.height / this.guideImage.width)
    const guideX = this.nurse.x +35
    const guideY = this.nurse.y - guideHeight / 1.1
    
    return { x: guideX, y: guideY, width: guideWidth, height: guideHeight }
  }

  // 检测点击是否在 guide.png 上
  containsGuide(x, y) {
    const bounds = this.getGuideBounds()
    if (!bounds) return false
    
    // 添加 10px 的点击容差，让点击更容易命中
    const padding = 10
    
    return x >= bounds.x - padding && x <= bounds.x + bounds.width + padding &&
           y >= bounds.y - padding && y <= bounds.y + bounds.height + padding
  }

  update(deltaTime) {
    this.nurse.update(deltaTime)
    
    // 更新手指指向动效计时器
    if (!this.fingerAnimationTime) {
      this.fingerAnimationTime = 0
    }
    this.fingerAnimationTime += deltaTime
  }

  render(ctx) {
    // 粉色横向踢脚线（装饰）
    const baseboardY = this.y + this.height * 0.35
    ctx.fillStyle = '#FFB6C1'
    ctx.fillRect(this.x + 8, baseboardY, this.width - 16, 6)
    
    // 绘制护士
    this.nurse.render(ctx)
    
    // 绘制引导图片（在护士旁边）
    const guideBounds = this.getGuideBounds()
    if (guideBounds) {
      ctx.drawImage(this.guideImage, guideBounds.x, guideBounds.y, guideBounds.width, guideBounds.height)
      
      // 欢迎气泡消失后，在 guide 左边显示手指指向图标（点击 guide 后不再显示）
      if (!this.nurse.isNewPlayer && !this.nurse.showReadyBubble && !this.guideClicked && this.fingerImage && this.fingerImage.width > 0) {
        // 手指大小
        const fingerWidth = 32 * (this.width / 400)
        const fingerHeight = fingerWidth * (this.fingerImage.height / this.fingerImage.width)
        // 手指位置：guide 左边，稍微偏下
        const fingerX = guideBounds.x - fingerWidth * 0.7
        const fingerY = guideBounds.y + guideBounds.height * 0.3
        
        // 左右摇摆动效（周期 0.6 秒，幅度 8 像素）- 指向 guide
        const bounceOffset = Math.sin(this.fingerAnimationTime / 300) * 5
        
        // 绘制手指图片
        ctx.drawImage(this.fingerImage, fingerX + bounceOffset, fingerY, fingerWidth, fingerHeight)
      }
      
      // 【关卡提示】第2关及以后，在 guide 右上方显示灯泡
      if (this.nurse.showLevelHint && this.lightbulbImage && this.lightbulbImage.width > 0) {
        const baseBulbSize = 48 * (this.width / 400)
        // 位置：guide 右上方
        const bulbX = guideBounds.x + guideBounds.width + baseBulbSize * 0.2
        const bulbY = guideBounds.y - baseBulbSize * 0.1
        
        // 呼吸动效（缩放 0.9 ~ 1.1，周期 1.2 秒）
        const breathScale = 1 + Math.sin(this.fingerAnimationTime / 200) * 0.1
        const bulbSize = baseBulbSize * breathScale
        
        ctx.drawImage(this.lightbulbImage, bulbX - bulbSize / 2, bulbY - bulbSize / 2, bulbSize, bulbSize)
      }
    }
    
    this.renderReception(ctx)
    this.renderStandingQueue(ctx)
  }

  renderReception(ctx) {
    // 护士台位置在最右边
    const deskWidth = this.width * 0.5
    const deskHeight = this.height * 0.4
    const centerX = this.x + this.width - deskWidth + 10
    const deskY = this.y + this.height * 0.12
    
    if (this.nurseDeskImage && this.nurseDeskImage.width > 0) {
      const targetWidth = deskWidth * 1.1
      const imageScale = targetWidth / this.nurseDeskImage.width
      const drawWidth = targetWidth
      const drawHeight = this.nurseDeskImage.height * imageScale
      
      ctx.drawImage(
        this.nurseDeskImage,
        centerX - drawWidth / 2,
        deskY - drawHeight * 0.1,
        drawWidth,
        drawHeight
      )
    } else {
      // 图片未加载时的 fallback
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.moveTo(centerX - deskWidth / 2, deskY)
      ctx.lineTo(centerX + deskWidth / 2, deskY)
      ctx.quadraticCurveTo(centerX + deskWidth / 2, deskY + deskHeight * 1.1, centerX, deskY + deskHeight * 1.15)
      ctx.quadraticCurveTo(centerX - deskWidth / 2, deskY + deskHeight * 1.1, centerX - deskWidth / 2, deskY)
      ctx.closePath()
      ctx.fill()
      
      ctx.strokeStyle = '#FFB7B2'
      ctx.lineWidth = 2
      ctx.stroke()
      
      ctx.fillStyle = '#FFB7B2'
      ctx.beginPath()
      ctx.moveTo(centerX - deskWidth / 2 + deskWidth * 0.05, deskY + deskHeight * 0.4)
      ctx.lineTo(centerX + deskWidth / 2 - deskWidth * 0.05, deskY + deskHeight * 0.4)
      ctx.quadraticCurveTo(centerX + deskWidth / 2 - deskWidth * 0.05, deskY + deskHeight * 0.55, centerX, deskY + deskHeight * 0.6)
      ctx.quadraticCurveTo(centerX - deskWidth / 2 + deskWidth * 0.05, deskY + deskHeight * 0.55, centerX - deskWidth / 2 + deskWidth * 0.05, deskY + deskHeight * 0.4)
      ctx.closePath()
      ctx.fill()
    }
    
    // 绘制植物（在护士台左边）
    if (this.plantImage && this.plantImage.width > 0) {
      const plantWidth = deskWidth * 0.28
      const plantHeight = plantWidth * 1.5
      // 相对于护士台左侧的位置（使用比例，适配所有屏幕）
      const plantX = centerX + deskWidth * 0.32
      const plantY = deskY + deskHeight - plantHeight * 1.62
      
      ctx.drawImage(this.plantImage, plantX, plantY, plantWidth, plantHeight)
    }
    
    // 绘制书架（在护士台右边，和植物同一Y位置）
    if (this.bookshelfImage && this.bookshelfImage.width > 0) {
      const bookshelfWidth = deskWidth * 0.28
      const bookshelfHeight = bookshelfWidth * 1.3
      // 相对于护士台左侧的位置
      const bookshelfX = centerX - deskWidth *0.65
      const bookshelfY = deskY + deskHeight - bookshelfHeight * 1.74
      
      ctx.drawImage(this.bookshelfImage, bookshelfX, bookshelfY, bookshelfWidth, bookshelfHeight)
    }
  }

  renderStandingQueue(ctx) {
    // 绘制站立位置标记 - 灰色椭圆阴影
    this.standingQueue.forEach((pos, i) => {
      ctx.fillStyle = pos.occupied ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.25)'
      ctx.beginPath()
      ctx.ellipse(
        pos.x + pos.width / 2, 
        pos.y + pos.height * 0.75, 
        pos.width * 0.25,
        pos.height * 0.06,
        0, 0, Math.PI * 2
      )
      ctx.fill()
    })
  }
}
