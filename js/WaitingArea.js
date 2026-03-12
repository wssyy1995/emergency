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
    
    // 创建护士位置
    this.nurse = new Nurse(this.x + this.width * 0.53, this.y + this.height * 0.24)
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
    const startY = this.y + this.height * 0.42
    
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

  update(deltaTime) {
    this.nurse.update(deltaTime)
  }

  render(ctx) {
    // 浅粉色踢脚线
    const baseboardColor = '#FFB6C1'
    const positionRatio = 0.35
    const baseboardHeight = 10
    const baseboardY = this.y + this.height * positionRatio
    ctx.fillStyle = baseboardColor
    ctx.fillRect(this.x, baseboardY, this.width, baseboardHeight)
    
    // 绘制护士
    this.nurse.render(ctx)
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
    
    // 绘制植物
    if (this.plantImage && this.plantImage.width > 0) {
      const plantWidth = 45
      const plantHeight = 65
      const plantOffsetX = -140
      const plantOffsetY = -35
      
      const plantX = centerX - deskWidth / 2 - plantWidth / 2 - plantOffsetX
      const plantY = deskY + deskHeight - plantHeight + plantOffsetY
      
      ctx.drawImage(this.plantImage, plantX, plantY, plantWidth, plantHeight)
    }
  }

  renderStandingQueue(ctx) {
    // 绘制站立位置标记
    this.standingQueue.forEach((pos, i) => {
      // 统一浅粉色，有人时透明度更高，阴影尺寸缩小
      ctx.fillStyle = pos.occupied ? 'rgba(255, 182, 193, 0.4)' : 'rgba(255, 182, 193, 0.2)'
      ctx.beginPath()
      ctx.ellipse(
        pos.x + pos.width / 2, 
        pos.y + pos.height * 0.75, 
        pos.width * 0.35,  // 宽度从 0.5 缩小到 0.35
        pos.height * 0.08, // 高度从 0.12 缩小到 0.08
        0, 0, Math.PI * 2
      )
      ctx.fill()
      
      // 【已移除】排队序号不再显示
    })
  }
}
