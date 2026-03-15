import { fillRoundRect, strokeRoundRect } from './utils.js'

// ==================== 全局病床图片缓存 ====================
let bedImageCache = null
function getBedImage() {
  if (!bedImageCache) {
    const img = wx.createImage()
    img.onload = () => {
      bedImageCache = img
    }
    img.onerror = () => {
      console.warn('Failed to load bed image: images/bed.png')
    }
    img.src = 'images/bed.png'
    bedImageCache = img
  }
  return bedImageCache
}

// ==================== 输液椅图片缓存 ====================
let ivSeatFreeImageCache = null
let ivSeatOccupiedImageCache = null
function getIVSeatFreeImage() {
  if (!ivSeatFreeImageCache) {
    const img = wx.createImage()
    img.onload = () => {
      ivSeatFreeImageCache = img
    }
    img.onerror = () => {
      console.warn('Failed to load seat image: images/seat_free.png')
    }
    img.src = 'images/seat_free.png'
    ivSeatFreeImageCache = img
  }
  return ivSeatFreeImageCache
}
function getIVSeatOccupiedImage() {
  if (!ivSeatOccupiedImageCache) {
    const img = wx.createImage()
    img.onload = () => {
      ivSeatOccupiedImageCache = img
    }
    img.onerror = () => {
      console.warn('Failed to load seat image: images/seat_occupied.png')
    }
    img.src = 'images/seat_occupied.png'
    ivSeatOccupiedImageCache = img
  }
  return ivSeatOccupiedImageCache
}

class Bed {
  constructor(id, x, y, width, height) {
    this.id = id
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.patient = null
    this.treatmentProgress = 0
    this.assignedDoctor = null
    
    this.bedImage = getBedImage()
  }

  assignPatient(patient) {
    this.patient = patient
    this.treatmentProgress = 0
    patient.width = 21
    patient.height = 33.75
    patient.x = this.x + this.width / 2 - patient.width / 2
    patient.y = this.y + this.height / 2 - patient.height / 2 + this.height * 0.02
    patient.inBed = true
  }

  clear() {
    this.patient = null
    this.treatmentProgress = 0
    this.assignedDoctor = null
    this.scoreAdded = false
    if (this.leaveTimer) {
      clearTimeout(this.leaveTimer)
      this.leaveTimer = null
    }
  }

  isEmpty() {
    return this.patient === null
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }

  render(ctx, curedImage = null) {
    if (this.bedImage && this.bedImage.width > 0) {
      // 2号床(id=1)水平翻转
      if (this.id === 1) {
        ctx.save()
        ctx.translate(this.x + this.width, this.y)
        ctx.scale(-1, 1)
        ctx.drawImage(this.bedImage, 0, 0, this.width, this.height)
        ctx.restore()
      } else {
        ctx.drawImage(this.bedImage, this.x, this.y, this.width, this.height)
      }
    }
    
    if (this.patient && !this.patient.isCured) {
      const originalX = this.patient.x
      const originalY = this.patient.y
      const originalWidth = this.patient.width
      const originalHeight = this.patient.height
      
      const targetPatientWidth = this.width * 0.75
      const patientScale = targetPatientWidth / this.patient.baseWidth
      
      this.patient.width = this.patient.baseWidth * patientScale
      this.patient.height = this.patient.baseHeight * patientScale
      
      const patientOffsets = {
        0: { x: 0.7, y: -0.1 },
        1: { x: 0.3, y: -0.1 }
      }
      const offset = patientOffsets[this.id] || { x: 0.5, y: -0.11 }
      
      this.patient.x = this.x + (this.width - this.patient.width) * offset.x
      this.patient.y = this.y + this.height * offset.y
      
      this.patient.render(ctx, false, curedImage)
      
      this.patient.x = originalX
      this.patient.y = originalY
      this.patient.width = originalWidth
      this.patient.height = originalHeight
    }
  }
}

// 输液治疗椅类
class IVSeat {
  constructor(id, x, y, width, height) {
    this.id = id
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.patient = null
    this.type = 'iv'
    
    this.seatFreeImage = getIVSeatFreeImage()
    this.seatOccupiedImage = getIVSeatOccupiedImage()
  }

  assignPatient(patient) {
    this.patient = patient
    patient.width = 16
    patient.height = 26
    patient.x = this.x + (this.width - patient.width) / 2
    patient.y = this.y + this.height * 0.62
    patient.seat = this
    patient.state = 'seated'
    patient.seatedAt = Date.now()
  }

  clear() {
    this.patient = null
  }

  isEmpty() {
    return this.patient === null
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }

  render(ctx, curedImage = null) {
    const currentImage = this.patient ? this.seatOccupiedImage : this.seatFreeImage
    
    if (currentImage && currentImage.width > 0) {
      const targetHeight = this.height * 1.3
      const imageScale = targetHeight / currentImage.height
      const drawWidth = currentImage.width * imageScale
      const drawHeight = targetHeight
      
      ctx.drawImage(currentImage, this.x + (this.width - drawWidth) / 2, this.y + (this.height - drawHeight) / 2, drawWidth, drawHeight)
    }
    
    // 绘制坐着的病人
    if (this.patient) {
      const originalX = this.patient.x
      const originalY = this.patient.y
      const originalState = this.patient.state
      
      this.patient.x = this.x + (this.width - this.patient.width) / 2
      this.patient.y = this.y + this.height * 0.62
      
      this.patient.render(ctx, false, curedImage)
      
      this.patient.x = originalX
      this.patient.y = originalY
      this.patient.state = originalState
    }
  }
}

export default class BedArea {
  constructor(x, y, width, height, bedCount = 2) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.bedCount = bedCount
    this.beds = []
    this.ivSeats = [] // 输液治疗区域的椅子
    
    this.initBeds()
    this.initIVSeats()
  }

  initBeds() {
    // 上半部分：2张病床，横排
    const bedWidth = this.width * 0.45
    const bedHeight = this.height * 0.38
    const gapX = (this.width - bedWidth * 2) / 3
    
    const startX = this.x + gapX
    const startY = this.y + this.height * 0.15
    
    for (let i = 0; i < 2; i++) {
      const bedX = startX + i * (bedWidth + gapX)
      this.beds.push(new Bed(i, bedX, startY, bedWidth, bedHeight))
    }
  }

  initIVSeats() {
    // 输液治疗椅子区域：高度为治疗区的三分之一，横排4张椅子
    const seatWidth = this.width * 0.16
    const seatHeight = this.height * 0.2  // 高度增加适应区域
    const gapX = (this.width - seatWidth * 4) / 5
    
    const startX = this.x + gapX
    // 输液区域再治疗区底部
    const startY = this.y + this.height * 0.75
    
    for (let i = 0; i < 4; i++) {
      const seatX = startX + i * (seatWidth + gapX)
      this.ivSeats.push(new IVSeat(i, seatX, startY, seatWidth, seatHeight))
    }
  }

  findEmptyBed() {
    return this.beds.find(bed => bed.isEmpty())
  }

  findEmptyIVSeat() {
    return this.ivSeats.find(seat => seat.isEmpty())
  }

  getOccupiedBeds() {
    return this.beds.filter(bed => !bed.isEmpty())
  }

  getBedAt(x, y) {
    for (let bed of this.beds) {
      if (bed.contains(x, y)) {
        return bed
      }
    }
    return null
  }

  getIVSeatAt(x, y) {
    for (let seat of this.ivSeats) {
      if (seat.contains(x, y)) {
        return seat
      }
    }
    return null
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }

  clear() {
    this.beds.forEach(bed => bed.clear())
    this.ivSeats.forEach(seat => seat.clear())
  }

  render(ctx, curedImage = null) {
    // 绘制病床（上半部分2/3区域）
    this.beds.forEach(bed => bed.render(ctx, curedImage))
    
    // 计算"急救间"标签位置和尺寸（先计算，用于确定虚线位置）
    const bedLabelPadding = 4
    const bedLabelFontSize = 10
    ctx.font = `bold ${bedLabelFontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
    const bedLabelText = '急救间'
    const bedLabelWidth = ctx.measureText(bedLabelText).width + bedLabelPadding * 2
    const bedLabelHeight = bedLabelFontSize + bedLabelPadding * 2
    const bedLabelX = this.x + this.width / 2 - bedLabelWidth / 2  // 居中
    const bedLabelY = this.y + 20
    
    // 【急救间】下方一根白色虚线（先绘制，作为背景层）
    ctx.save()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])  // 虚线模式：6px实线，4px空白
    ctx.beginPath()
    const bedLineY = bedLabelY + bedLabelHeight - 8
    ctx.moveTo(this.x, bedLineY)  // 从左侧边缘开始
    ctx.lineTo(this.x + this.width, bedLineY)  // 到右侧边缘
    ctx.stroke()
    ctx.restore()
    
    // 绘制"急救间"区域标签（后绘制，覆盖在虚线上方）
    ctx.save()
    ctx.fillStyle = 'rgba(231, 76, 60, 0.7)'  // 红色（对应紧急）
    
    // 标签背景（圆角矩形）
    ctx.beginPath()
    const r1 = 8
    ctx.moveTo(bedLabelX + r1, bedLabelY)
    ctx.lineTo(bedLabelX + bedLabelWidth - r1, bedLabelY)
    ctx.quadraticCurveTo(bedLabelX + bedLabelWidth, bedLabelY, bedLabelX + bedLabelWidth, bedLabelY + r1)
    ctx.lineTo(bedLabelX + bedLabelWidth, bedLabelY + bedLabelHeight - r1)
    ctx.quadraticCurveTo(bedLabelX + bedLabelWidth, bedLabelY + bedLabelHeight, bedLabelX + bedLabelWidth - r1, bedLabelY + bedLabelHeight)
    ctx.lineTo(bedLabelX + r1, bedLabelY + bedLabelHeight)
    ctx.quadraticCurveTo(bedLabelX, bedLabelY + bedLabelHeight, bedLabelX, bedLabelY + bedLabelHeight - r1)
    ctx.lineTo(bedLabelX, bedLabelY + r1)
    ctx.quadraticCurveTo(bedLabelX, bedLabelY, bedLabelX + r1, bedLabelY)
    ctx.closePath()
    ctx.fill()
    
    // 标签文字
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(bedLabelText, bedLabelX + bedLabelWidth / 2, bedLabelY + bedLabelHeight / 2)
    ctx.restore()
    
    // 绘制输液椅（底部1/3区域，无背景）
    this.ivSeats.forEach(seat => seat.render(ctx, curedImage))
    
    // 计算"治疗椅"标签位置和尺寸（先计算，用于确定虚线位置）
    const ivLabelPadding = 4
    const ivLabelFontSize = 10
    ctx.font = `bold ${ivLabelFontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
    const ivLabelText = '治疗椅'
    const ivLabelWidth = ctx.measureText(ivLabelText).width + ivLabelPadding * 2
    const ivLabelHeight = ivLabelFontSize + ivLabelPadding * 2
    // 输液椅区域大约在 y + height * 0.75 的位置
    const ivLabelX = this.x + this.width / 2 - ivLabelWidth / 2  // 居中
    const ivLabelY = this.y + this.height * 0.63
    
    // 【治疗椅】下方一根白色虚线（先绘制，作为背景层）
    ctx.save()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 4])  // 虚线模式：6px实线，4px空白
    ctx.beginPath()
    const ivLineY = ivLabelY + ivLabelHeight - 8
    ctx.moveTo(this.x, ivLineY)  // 从左侧边缘开始
    ctx.lineTo(this.x + this.width, ivLineY)  // 到右侧边缘
    ctx.stroke()
    ctx.restore()
    
    // 绘制"治疗椅"区域标签（后绘制，覆盖在虚线上方）
    ctx.save()
    ctx.fillStyle = 'rgba(52, 152, 219, 0.7)'  // 蓝色（对应普通），透明度降低
    
    // 标签背景（圆角矩形）
    ctx.beginPath()
    const r2 = 8
    ctx.moveTo(ivLabelX + r2, ivLabelY)
    ctx.lineTo(ivLabelX + ivLabelWidth - r2, ivLabelY)
    ctx.quadraticCurveTo(ivLabelX + ivLabelWidth, ivLabelY, ivLabelX + ivLabelWidth, ivLabelY + r2)
    ctx.lineTo(ivLabelX + ivLabelWidth, ivLabelY + ivLabelHeight - r2)
    ctx.quadraticCurveTo(ivLabelX + ivLabelWidth, ivLabelY + ivLabelHeight, ivLabelX + ivLabelWidth - r2, ivLabelY + ivLabelHeight)
    ctx.lineTo(ivLabelX + r2, ivLabelY + ivLabelHeight)
    ctx.quadraticCurveTo(ivLabelX, ivLabelY + ivLabelHeight, ivLabelX, ivLabelY + ivLabelHeight - r2)
    ctx.lineTo(ivLabelX, ivLabelY + r2)
    ctx.quadraticCurveTo(ivLabelX, ivLabelY, ivLabelX + r2, ivLabelY)
    ctx.closePath()
    ctx.fill()
    
    // 标签文字
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(ivLabelText, ivLabelX + ivLabelWidth / 2, ivLabelY + ivLabelHeight / 2)
    ctx.restore()
  }
}
