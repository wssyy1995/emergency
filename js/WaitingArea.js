import { fillRoundRect, strokeRoundRect } from './utils.js'
import Nurse from './Nurse.js'

export default class WaitingArea {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.patients = []
    
    // 创建护士（放在护士台后面，只显示上半身）- 位置在最右边
    this.nurse = new Nurse(this.x + this.width * 0.55, this.y + this.height * 0.24)
    this.nurse.setScale(this.width)
    
    this.seats = []
    // 站立排队区位置（左边一列）
    this.standingQueue = []
    this.initSeats()
    
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
    // 布局：左边站立排队区，右边椅子区
    const rows = 2
    const seatsPerRow = 2  // 每排2个椅子
    
    // 椅子尺寸
    const seatWidth = this.width * 0.22
    const seatHeight = this.height * 0.16
    const gapX = -3  // 椅子左右间距
    const gapY = Math.max(8, this.height * 0.08)  // 行间距
    
    // 计算总宽度
    const seatsTotalWidth = seatsPerRow * seatWidth + (seatsPerRow - 1) * gapX
    
    // 站立排队区参数（左边，2列2行=4个位置）
    const standingCols = 2  // 2列
    const standingRows = 2  // 每列2个
    const standingWidth = seatWidth * 0.75
    const standingHeight = seatHeight * 1
    const standingGapX = 20  // 列间距
    const standingGapY = gapY
    
    // 计算排队区总宽度
    const standingTotalWidth = standingCols * standingWidth + (standingCols - 1) * standingGapX
    
    // 计算两个区域的总宽度
    const totalContentWidth = standingTotalWidth + seatsTotalWidth + 20  // 20是中间间隔
    const leftStartX = this.x + (this.width - totalContentWidth) / 2 + 20  // +20整体往右移
    
    // 椅子区起始位置（右边）
    const seatsStartX = leftStartX + standingTotalWidth + 20
    const startY = this.y + this.height * 0.55
    // 站立区位置偏移
    const standingStartY = startY - 10  // 垂直偏移（负数往上，-10表示往下挪10像素）
    
    // 1. 创建站立排队区（左边2列，每列2个）
    // 顺序：右上(0) -> 右下(1) -> 左上(2) -> 左下(3)
    let standingIndex = 0
    for (let col = standingCols - 1; col >= 0; col--) {  // 从右到左
      for (let row = 0; row < standingRows; row++) {  // 从上到下
        this.standingQueue.push({
          x: leftStartX + col * (standingWidth + standingGapX),
          y: standingStartY + row * (standingHeight + standingGapY),
          width: standingWidth,
          height: standingHeight,
          occupied: false,
          patient: null,
          index: ++standingIndex
        })
      }
    }
    
    // 2. 创建椅子区（右边）
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < seatsPerRow; col++) {
        const rowOffset = row === 0 ? -10 : 0
        const seatIndex = row * seatsPerRow + col // 0-3
        
        // 设置椅子优先级：0,1(1-2号)重症椅，2,3(3-4号)普通椅
        let priority = 3 // 默认普通椅
        let type = 'normal'
        if (seatIndex <= 1) {
          priority = 2 // 重症椅 - 中等优先级
          type = 'critical'
        }
        
        this.seats.push({
          x: seatsStartX + col * (seatWidth + gapX),
          y: startY + row * (seatHeight + gapY) + rowOffset,
          width: seatWidth,
          height: seatHeight,
          occupied: false,
          patient: null,
          priority: priority,  // 2=重症椅, 3=普通椅
          type: type,
          index: seatIndex + 1 // 座位号 1-6
        })
      }
    }
  }

  // 添加病人到等候区（只能去站立区排队，需要手动分配才能去椅子或病床）
  // 按顺序找第一个空闲位置，一旦站好不再自动移动
  addPatientToReception(patient) {
    // 总共8个位置（4椅子 + 4站立）
    if (this.patients.length >= 8) return false
    
    // 按顺序找第一个空闲位置（index 0,1,2,3...）
    const emptyStanding = this.standingQueue.find(pos => !pos.occupied)
    if (!emptyStanding) {
      return false // 站立区已满
    }
    
    this.patients.push(patient)
    
    // 设置病人尺寸
    patient.width = 16
    patient.height = 26
    
    // 分配到站立区
    emptyStanding.occupied = true
    emptyStanding.patient = patient
    patient.standingPos = emptyStanding
    patient.state = 'queuing'
    
    // 移动到站立位置（站在位置中央）
    const targetX = emptyStanding.x + (emptyStanding.width - patient.width) / 2
    const targetY = emptyStanding.y + emptyStanding.height * 0.7
    patient.moveTo(targetX, targetY)
    return true
  }
  
  // 更新站立区排队位置（不再自动补位，病人固定在自己的位置）
  updateQueuePositions() {
    // 不再自动调整位置，病人一旦站好就固定不动
    // 即使前面的人走了，后面的人也不移动
  }

  // 将病人从站立区分配到指定类型的椅子
  assignPatientToSeatType(patient, seatType) {
    // 病人必须在站立区排队状态
    if (patient.state !== 'queuing') return false
    
    // 找到对应类型的空椅子
    const targetSeat = this.seats.find(seat => 
      !seat.occupied && seat.type === seatType
    )
    
    if (!targetSeat) {
      return false // 该类型椅子已满
    }
    
    // 释放站立区位置
    if (patient.standingPos) {
      patient.standingPos.occupied = false
      patient.standingPos.patient = null
      patient.standingPos = null
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
    
    return true
  }

  // 获取站立区排队的病人（按位置顺序排序）
  getReceptionQueuePatients() {
    return this.patients.filter(p => p.state === 'queuing' && p.standingPos)
      .sort((a, b) => (a.standingPos?.index || 0) - (b.standingPos?.index || 0))
  }
  
  // 获取站立区排队的病人（按位置索引排序）
  getStandingQueuePatients() {
    return this.patients.filter(p => p.state === 'queuing' && p.standingPos)
      .sort((a, b) => (a.standingPos?.index || 0) - (b.standingPos?.index || 0))
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
      if (patient.standingPos) {
        patient.standingPos.occupied = false
        patient.standingPos.patient = null
        patient.standingPos = null
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
    const counts = { critical: 0, normal: 0 }
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
    const deskWidth = this.width * 0.5
    const deskHeight = this.height * 0.4
    const centerX = this.x + this.width - deskWidth+10   // 最右边留一点边距
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
    
    // 绘制植物（在护士台之后绘制，层级在上层）
    if (this.plantImage && this.plantImage.width > 0) {
      // 植物位置和大小参数（可以调整这些值来改变位置和大小）
      const plantWidth = 45      // 植物宽度（像素）
      const plantHeight = 65     // 植物高度（像素）
      const plantOffsetX = -140   // 相对于护士台左边的水平偏移（正值向左，负值向右）
      const plantOffsetY = -35   // 垂直偏移（负值向上，正值向下）
      
      const plantX = centerX - deskWidth / 2 - plantWidth / 2 - plantOffsetX
      const plantY = deskY + deskHeight - plantHeight + plantOffsetY
      
      ctx.drawImage(this.plantImage, plantX, plantY, plantWidth, plantHeight)
    }
  }

  renderSeats(ctx) {
    // 1. 先绘制站立区（左边2x2排队区）
    
    // 计算两区之间的分隔线位置（虚线）
    if (this.standingQueue.length > 0 && this.seats.length > 0) {
      const standingRight = Math.max(...this.standingQueue.map(p => p.x + p.width))
      const seatsLeft = Math.min(...this.seats.map(s => s.x))
      const dividerX = (standingRight + seatsLeft) / 2
      
      const minY = Math.min(
        Math.min(...this.standingQueue.map(p => p.y)),
        Math.min(...this.seats.map(s => s.y))
      )
      const maxY = Math.max(
        Math.max(...this.standingQueue.map(p => p.y + p.height)),
        Math.max(...this.seats.map(s => s.y + s.height))
      )
      
      // 绘制淡色虚线分隔
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])  // 5像素线，5像素间隔
      ctx.beginPath()
      ctx.moveTo(dividerX, minY - 10)
      ctx.lineTo(dividerX, maxY + 10)
      ctx.stroke()
      ctx.setLineDash([])  // 重置为实线
    }
    
    this.standingQueue.forEach((pos, i) => {
      // 绘制站立位置标记（圆形站位点）- 浅粉色
      ctx.fillStyle = pos.occupied ? 'rgba(255, 182, 193, 0.5)' : 'rgba(255, 182, 193, 0.3)'
      ctx.beginPath()
      ctx.ellipse(
        pos.x + pos.width / 2, 
        pos.y + pos.height * 0.75, 
        pos.width / 2, 
        pos.height * 0.12, 
        0, 0, Math.PI * 2
      )
      ctx.fill()
      
      // 绘制排队序号
      if (!pos.occupied) {
        ctx.fillStyle = '#999'
        ctx.font = `bold ${Math.max(10, pos.width * 0.3)}px "PingFang SC", "Microsoft YaHei", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${i + 1}`, pos.x + pos.width / 2, pos.y + pos.height * 0.4)
      }
    })
    
    // 2. 绘制椅子区（右边）
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
        if (seat.type === 'critical') {
          seatColor = '#F39C12' // 重症椅 - 橙色
        }
        ctx.fillStyle = seatColor
        // 字体加大
        ctx.font = `900 ${Math.max(14, seat.width * 0.28)}px "PingFang SC", "Microsoft YaHei", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${i + 1}`, seat.x + seat.width / 2, seat.y + seat.height * 0.25)
      }
    })
  }
}
