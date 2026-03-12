import { fillRoundRect } from './utils.js'
import Nurse from './Nurse.js'

export default class WaitingArea {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.patients = []
    
    // 创建护士（放在护士台后面，只显示上半身）- 位置在最右边
    this.nurse = new Nurse(this.x + this.width * 0.75, this.y + this.height * 0.24)
    this.nurse.setScale(this.width)
    
    this.seats = []
    this.initSeats()
    
    // 前台排队位置（一个队列）
    this.receptionQueue = []
    this.initReceptionQueue()
    
    // 加载椅子图片
    this.seatFreeImage = null
    this.seatOccupiedImage = null
    // 加载护士台图片
    this.nurseDeskImage = null
    // 加载植物图片
    this.plantImage = null
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
    
    // 加载植物图片
    const plantImg = wx.createImage()
    plantImg.onload = () => {
      this.plantImage = plantImg
    }
    plantImg.onerror = () => {
      console.warn('Failed to load plant image: images/plant.png')
    }
    plantImg.src = 'images/plant.png'
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
        const seatIndex = row * seatsPerRow + col // 0-7
        
        // 设置椅子优先级：0,1(1-2号)急症椅，2,3(3-4号)危重椅，4-7(5-8号)普通椅
        let priority = 3 // 默认普通椅
        let type = 'normal'
        if (seatIndex <= 1) {
          priority = 1 // 急症椅 - 最高优先级
          type = 'emergency'
        } else if (seatIndex <= 3) {
          priority = 2 // 危重椅 - 中等优先级
          type = 'critical'
        }
        
        this.seats.push({
          x: startX + col * (seatWidth + gapX),
          y: startY + row * (seatHeight + gapY) + rowOffset,
          width: seatWidth,
          height: seatHeight,
          occupied: false,
          patient: null,
          priority: priority,  // 1=急症椅, 2=危重椅, 3=普通椅
          type: type,
          index: seatIndex + 1 // 座位号 1-8
        })
      }
    }
  }

  initReceptionQueue() {
    // 前台排队位置逻辑（从右往左排队，动态计算位置）
    // 最多排4个人
    this.maxQueueLength = 4
  }

  // 添加病人到前台排队（从右往左排队，5像素间距）
  addPatientToReception(patient) {
    if (this.patients.length >= 12) return false
    
    // 检查当前排队人数
    const queueCount = this.getReceptionQueuePatients().length
    if (queueCount >= this.maxQueueLength) {
      return false // 排队已满
    }
    
    this.patients.push(patient)
    patient.state = 'queuing' // 排队状态
    
    // 设置病人尺寸
    patient.width = 16
    patient.height = 26
    
    // 计算排队位置：从右往左排队
    // 基准点（最右边第一个人的位置）
    const baseX = this.x + this.width * 0.42 
    const spacing = 32 // 排队人左右间距
    const targetX = baseX - queueCount * (patient.width + spacing)
    const targetY = this.y + this.height * 0.34
    
    patient.moveTo(targetX, targetY)
    
    return true
  }
  
  // 更新排队位置（当有人离开后，其他人往前补位）
  updateQueuePositions() {
    const queuePatients = this.getReceptionQueuePatients()
    const baseX = this.x + this.width * 0.4 
    const spacing = 25 // 排队人左右间距（与addPatientToReception一致）
    
    queuePatients.forEach((patient, index) => {
      const targetX = baseX - index * (patient.width + spacing)
      const targetY = this.y + this.height * 0.34
      
      // 强制更新位置
      patient.moveTo(targetX, targetY)
    })
  }

  // 将病人分配到指定类型的椅子
  assignPatientToSeatType(patient, seatType) {
    // 病人必须在排队状态
    if (patient.state !== 'queuing') return false
    
    // 找到对应类型的空椅子
    const targetSeat = this.seats.find(seat => 
      !seat.occupied && seat.type === seatType
    )
    
    if (!targetSeat) {
      return false // 该类型椅子已满
    }
    
    // 分配椅子
    targetSeat.occupied = true
    targetSeat.patient = patient
    patient.seat = targetSeat
    patient.state = 'seated'
    patient.seatedAt = Date.now() // 记录坐下时间（用于延迟检测）
    
    // 移动到椅子位置
    const targetX = targetSeat.x + (targetSeat.width - patient.width) / 2
    const targetY = targetSeat.y + targetSeat.height * 0.62
    patient.moveTo(targetX, targetY)
    
    // 更新其他排队人员的位置（往前补位）
    this.updateQueuePositions()
    
    return true
  }

  // 获取前台排队的病人（按排队顺序）
  getReceptionQueuePatients() {
    // 从所有病人中筛选出正在排队的（state === 'queuing'）
    return this.patients.filter(p => p.state === 'queuing')
  }

  // 获取坐在椅子上的病人（按椅子优先级排序）
  getSeatedPatientsByPriority() {
    const seatedPatients = this.patients.filter(p => p.seat && p.state === 'seated')
    return seatedPatients.sort((a, b) => {
      const priorityA = a.seat?.priority || 3
      const priorityB = b.seat?.priority || 3
      return priorityA - priorityB
    })
  }

  removePatient(patient) {
    const index = this.patients.indexOf(patient)
    if (index > -1) {
      if (patient.seat) {
        patient.seat.occupied = false
        patient.seat.patient = null
        patient.seat = null
      }
      this.patients.splice(index, 1)
    }
  }

  // 检查是否有空的指定类型椅子
  hasEmptySeatOfType(seatType) {
    return this.seats.some(seat => !seat.occupied && seat.type === seatType)
  }

  // 获取各类型椅子的空位数量
  getEmptySeatCounts() {
    const counts = { emergency: 0, critical: 0, normal: 0 }
    this.seats.forEach(seat => {
      if (!seat.occupied) {
        counts[seat.type]++
      }
    })
    return counts
  }

  clear() {
    this.patients = []
    this.seats.forEach(seat => {
      seat.occupied = false
      seat.patient = null
    })
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }

  getPatientAt(x, y) {
    console.log('[getPatientAt] 查找坐标:', x, y, '病人数量:', this.patients.length)
    for (let patient of this.patients) {
      const hit = patient.contains(x, y)
      console.log('[getPatientAt] 检测病人:', patient.name, '位置:', patient.x, patient.y, '尺寸:', patient.width, patient.height, '是否命中:', hit)
      if (hit) {
        return patient
      }
    }
    console.log('[getPatientAt] 未找到病人')
    return null
  }

  update(deltaTime) {
    this.nurse.update(deltaTime)
  }

  render(ctx) {
    // 先画浅粉色踢脚线（横向贯穿等候区中间偏上，放在最底层）
    const baseboardColor = '#FFB6C1'  // 浅粉色 (LightPink)
    const positionRatio = 0.35  // 中间偏上
    const baseboardHeight = 10
    const baseboardY = this.y + this.height * positionRatio
    ctx.fillStyle = baseboardColor
    ctx.fillRect(this.x, baseboardY, this.width, baseboardHeight)
    
    // 再画护士（在护士台后面，只露上半身）
    this.nurse.render(ctx)
    // 再画护士台（遮挡护士下半身）
    this.renderReception(ctx)
    this.renderSeats(ctx)
  }

  renderReception(ctx) {
    // 护士台位置在最右边
    const deskWidth = this.width * 0.51
    const deskHeight = this.height * 0.4
    const centerX = this.x + this.width - deskWidth / 4 - this.width * 0.12 // 最右边留一点边距
    const deskY = this.y + this.height * 0.12
    
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
    
    // 绘制指示牌（在护士台右上方，醒目位置）
    if (this.guidePostImage && this.guidePostImage.width > 0) {
      // 指示牌位置和大小参数（可以调整）
      const guideWidth = 40      // 指示牌宽度
      const guideHeight = 60     // 指示牌高度
      // 放在护士台右上方，确保可见
      const guideX = this.x + this.width - guideWidth - 10  // 等候区最右边
      const guideY = this.y + 5  // 顶部留一点边距
      
      ctx.drawImage(this.guidePostImage, guideX, guideY, guideWidth, guideHeight)
      
      console.log('绘制指示牌:', guideX, guideY, guideWidth, guideHeight)
    } else {
      console.log('指示牌图片未加载:', this.guidePostImage)
    }
    
    // 绘制植物（在护士台之后绘制，层级在上层）
    if (this.plantImage && this.plantImage.width > 0) {
      // 植物位置和大小参数（可以调整这些值来改变位置和大小）
      const plantWidth = 48      // 植物宽度（像素）
      const plantHeight = 75     // 植物高度（像素）
      const plantOffsetX = -140   // 相对于护士台左边的水平偏移（正值向左，负值向右）
      const plantOffsetY = -38   // 垂直偏移（负值向上，正值向下）
      
      const plantX = centerX - deskWidth / 2 - plantWidth / 2 - plantOffsetX
      const plantY = deskY + deskHeight - plantHeight + plantOffsetY
      
      ctx.drawImage(this.plantImage, plantX, plantY, plantWidth, plantHeight)
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
        // 根据椅子类型设置不同颜色
        let seatColor = '#2E86AB' // 普通椅 - 蓝色
        if (seat.type === 'emergency') {
          seatColor = '#E74C3C' // 急症椅 - 红色
        } else if (seat.type === 'critical') {
          seatColor = '#F39C12' // 危重椅 - 橙色
        }
        ctx.fillStyle = seatColor
        // 字体加粗加大，使用 900 字重和更大的尺寸
        ctx.font = `900 ${Math.max(10, seat.width * 0.2)}px "PingFang SC", "Microsoft YaHei", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${i + 1}`, seat.x + seat.width / 2, seat.y + seat.height * 0.25)
      }
    })
  }
}
