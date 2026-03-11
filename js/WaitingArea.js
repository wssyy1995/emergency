import { fillRoundRect } from './utils.js'
import Nurse from './Nurse.js'

export default class WaitingArea {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.patients = []
    
    // 创建护士（放在护士台后面，只显示上半身）
    this.nurse = new Nurse(this.x + this.width / 2, this.y + this.height * 0.23)
    this.nurse.setScale(this.width)
    
    this.seats = []
    this.initSeats()
    
    this.queuePositions = []
    this.initQueuePositions()
    
    // 加载椅子图片
    this.seatFreeImage = null
    this.seatOccupiedImage = null
    // 加载护士台图片
    this.nurseDeskImage = null
    this.loadImages()
  }

  loadImages() {
    // 加载空闲椅子图片
    const freeImg = wx.createImage()
    freeImg.onload = () => {
      this.seatFreeImage = freeImg
    }
    freeImg.onerror = () => {
      console.warn('Failed to load seat free image: images/seat_free.png')
    }
    freeImg.src = 'images/seat_free.png'
    
    // 加载占用椅子图片
    const occupiedImg = wx.createImage()
    occupiedImg.onload = () => {
      this.seatOccupiedImage = occupiedImg
    }
    occupiedImg.onerror = () => {
      console.warn('Failed to load seat occupied image: images/seat_occupied.png')
    }
    occupiedImg.src = 'images/seat_occupied.png'
    
    // 加载护士台图片
    const nurseDeskImg = wx.createImage()
    nurseDeskImg.onload = () => {
      this.nurseDeskImage = nurseDeskImg
    }
    nurseDeskImg.onerror = () => {
      console.warn('Failed to load nurse desk image: images/nurse_desk.png')
    }
    nurseDeskImg.src = 'images/nurse_desk.png'
  }

  initSeats() {
    // 两排座位，每排4个，共8个座位
    const rows = 2
    const seatsPerRow = 4
    
    // 根据区域大小计算座位尺寸
    const seatWidth = this.width * 0.22                   // 椅子宽度
    const seatHeight = this.height * 0.16
    const gapX = -3                                        // 椅子左右间距
    const gapY = Math.max(8, this.height * 0.08)          // 行间距
    
    // 计算椅子区域总宽度，使其在等候区居中
    const seatsTotalWidth = seatsPerRow * seatWidth + (seatsPerRow - 1) * gapX
    const startX = this.x + (this.width - seatsTotalWidth) / 2
    
    // 起始位置（前台下方）
    const startY = this.y + this.height * 0.55
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < seatsPerRow; col++) {
        // 第一排往上移动，第二排保持不变
        const rowOffset = row === 0 ? -10 : 0
        this.seats.push({
          x: startX + col * (seatWidth + gapX),
          y: startY + row * (seatHeight + gapY) + rowOffset,
          width: seatWidth,
          height: seatHeight,
          occupied: false,
          patient: null
        })
      }
    }
  }

  initQueuePositions() {
    // 站位区域
    for (let i = 0; i < 2; i++) {
      this.queuePositions.push({
        x: this.x + this.width * 0.2 + i * this.width * 0.3,
        y: this.y + this.height * 2,
        occupied: false,
        patient: null
      })
    }
  }

  addPatient(patient) {
    if (this.patients.length >= 8) return
    this.patients.push(patient)
    this.assignPosition(patient)
  }

  assignPosition(patient) {
    const emptySeat = this.seats.find(seat => !seat.occupied)
    if (emptySeat) {
      emptySeat.occupied = true
      emptySeat.patient = patient
      patient.seat = emptySeat
      // 设置病人尺寸（等候区专用，较小）
      patient.width = 16
      patient.height = 26
      // 病人坐在椅子中央，靠下一点
      const targetX = emptySeat.x + (emptySeat.width - patient.width) / 2
      const targetY = emptySeat.y + emptySeat.height * 0.62  // 调整此值改变位置 (0-1 之间，越大越靠下)
      patient.moveTo(targetX, targetY)
      return
    }
    
    const emptyQueue = this.queuePositions.find(pos => !pos.occupied)
    if (emptyQueue) {
      emptyQueue.occupied = true
      emptyQueue.patient = patient
      patient.queuePos = emptyQueue
      // 设置病人尺寸（等候区专用，较小）
      patient.width = 16
      patient.height = 26
      patient.moveTo(emptyQueue.x, emptyQueue.y)
    }
  }

  removePatient(patient) {
    const index = this.patients.indexOf(patient)
    if (index > -1) {
      if (patient.seat) {
        patient.seat.occupied = false
        patient.seat.patient = null
        patient.seat = null
      }
      if (patient.queuePos) {
        patient.queuePos.occupied = false
        patient.queuePos.patient = null
        patient.queuePos = null
      }
      this.patients.splice(index, 1)
      this.reorganizeQueue()
    }
  }

  reorganizeQueue() {
    let seatIndex = 0
    let queueIndex = 0
    
    for (let patient of this.patients) {
      if (patient.inBed) continue
      
      if (!patient.seat && !patient.queuePos) {
        while (seatIndex < this.seats.length && this.seats[seatIndex].occupied) {
          seatIndex++
        }
        if (seatIndex < this.seats.length) {
          const seat = this.seats[seatIndex]
          seat.occupied = true
          seat.patient = patient
          patient.seat = seat
          // 设置病人尺寸（等候区专用，较小）
          patient.width = 16
          patient.height = 26
          // 病人坐在椅子中央，靠下一点
          const targetX = seat.x + (seat.width - patient.width) / 2
          const targetY = seat.y + seat.height * 0.62  // 调整此值改变位置 (0-1 之间，越大越靠下)
          patient.moveTo(targetX, targetY)
        } else {
          while (queueIndex < this.queuePositions.length && this.queuePositions[queueIndex].occupied) {
            queueIndex++
          }
          if (queueIndex < this.queuePositions.length) {
            const pos = this.queuePositions[queueIndex]
            pos.occupied = true
            pos.patient = patient
            patient.queuePos = pos
            // 设置病人尺寸（等候区专用，较小）
            patient.width = 16
            patient.height = 26
            patient.moveTo(pos.x, pos.y)
          }
        }
      }
    }
  }

  clear() {
    this.patients = []
    this.seats.forEach(seat => {
      seat.occupied = false
      seat.patient = null
    })
    this.queuePositions.forEach(pos => {
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
    // 先画护士（在护士台后面，只露上半身）
    this.nurse.render(ctx)
    // 再画护士台（遮挡护士下半身）
    this.renderReception(ctx)
    this.renderSeats(ctx)
  }

  renderReception(ctx) {
    const centerX = this.x + this.width / 2
    const deskY = this.y + this.height * 0.03
    const deskWidth = this.width * 0.45
    const deskHeight = this.height * 0.1
    
    // 优先使用护士台图片
    if (this.nurseDeskImage && this.nurseDeskImage.width > 0) {
      // 使用图片绘制护士台，保持比例
      const targetWidth = deskWidth * 1.1
      const imageScale = targetWidth / this.nurseDeskImage.width
      const drawWidth = targetWidth
      const drawHeight = this.nurseDeskImage.height * imageScale
      
      ctx.drawImage(
        this.nurseDeskImage,
        centerX - drawWidth / 2,
        deskY - drawHeight * 0.1, // 稍微向上偏移，让护士台位置更合适
        drawWidth,
        drawHeight
      )
    } else {
      // 图片未加载时，使用原来的代码绘制（fallback）
      // 护士台主体 - 上直边，下弧形
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      // 左上
      ctx.moveTo(centerX - deskWidth / 2, deskY)
      // 右上
      ctx.lineTo(centerX + deskWidth / 2, deskY)
      // 右下圆弧
      ctx.quadraticCurveTo(centerX + deskWidth / 2, deskY + deskHeight * 1.1, centerX, deskY + deskHeight * 1.15)
      // 左下圆弧
      ctx.quadraticCurveTo(centerX - deskWidth / 2, deskY + deskHeight * 1.1, centerX - deskWidth / 2, deskY)
      ctx.closePath()
      ctx.fill()
      
      // 边框
      ctx.strokeStyle = '#FFB7B2'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // 台面装饰（粉色弧形条纹）
      ctx.fillStyle = '#FFB7B2'
      ctx.beginPath()
      ctx.moveTo(centerX - deskWidth / 2 + deskWidth * 0.05, deskY + deskHeight * 0.4)
      ctx.lineTo(centerX + deskWidth / 2 - deskWidth * 0.05, deskY + deskHeight * 0.4)
      ctx.quadraticCurveTo(centerX + deskWidth / 2 - deskWidth * 0.05, deskY + deskHeight * 0.55, centerX, deskY + deskHeight * 0.6)
      ctx.quadraticCurveTo(centerX - deskWidth / 2 + deskWidth * 0.05, deskY + deskHeight * 0.55, centerX - deskWidth / 2 + deskWidth * 0.05, deskY + deskHeight * 0.4)
      ctx.closePath()
      ctx.fill()
    }
  }

  renderSeats(ctx) {
    this.seats.forEach((seat, i) => {
      // 根据座位状态选择图片
      const currentImage = seat.occupied ? this.seatOccupiedImage : this.seatFreeImage
      
      if (currentImage && currentImage.width > 0) {
        // 使用图片绘制椅子，保持比例
        const targetHeight = seat.height * 1.3
        const imageScale = targetHeight / currentImage.height
        const drawWidth = currentImage.width * imageScale
        const drawHeight = targetHeight
        
        ctx.drawImage(currentImage, seat.x + (seat.width - drawWidth) / 2, seat.y + (seat.height - drawHeight) / 2, drawWidth, drawHeight)
      }
      
      // 座位号（只有座位空闲时显示）
      if (!seat.occupied) {
        ctx.fillStyle = '#2E86AB'
        ctx.font = `bold ${Math.max(8, seat.width * 0.18)}px "PingFang SC", "Microsoft YaHei", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${i + 1}`, seat.x + seat.width / 2, seat.y + seat.height * 0.25)
      }
    })
  }
}
