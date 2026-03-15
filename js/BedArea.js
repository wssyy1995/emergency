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
    
    // 床位号
    ctx.fillStyle = '#FFF'
    ctx.beginPath()
    ctx.arc(this.x + this.width / 2, this.y - this.height * 0.03, this.width * 0.08, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#81D4C1'
    ctx.lineWidth = Math.max(1, this.width * 0.01)
    ctx.stroke()
    
    ctx.fillStyle = '#27AE60'
    ctx.font = `bold ${Math.max(8, this.width * 0.1)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${this.id + 1}`, this.x + this.width / 2, this.y - this.height * 0.03)
    
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
    
    // 绘制输液椅（底部1/3区域，无背景）
    this.ivSeats.forEach(seat => seat.render(ctx, curedImage))
  }
}
