import { fillRoundRect, strokeRoundRect } from './utils.js'

class Bed {
  constructor(id, x, y, width, height) {
    this.id = id
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.patient = null
    this.treatmentProgress = 0
    this.assignedDoctor = null // 被分配到这个病床的医生
  }

  assignPatient(patient) {
    this.patient = patient
    this.treatmentProgress = 0
    // 设置病人尺寸与医生一致（21 x 33.75）
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

  render(ctx) {
    const boardWidth = this.width * 0.08
    
    // 有人躺上时，去掉阴影和特效，简化绘制
    if (!this.patient) {
      // 空闲时的阴影
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.beginPath()
      ctx.ellipse(this.x + this.width / 2, this.y + this.height - this.height * 0.02, this.width / 2 - this.width * 0.02, this.height * 0.05, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 床头板
    ctx.fillStyle = '#81D4C1'
    fillRoundRect(ctx, this.x, this.y, boardWidth, this.height, boardWidth / 2)
    
    // 床尾板
    fillRoundRect(ctx, this.x + this.width - boardWidth, this.y, boardWidth, this.height, boardWidth / 2)
    
    // 床垫（有人时简化颜色）
    ctx.fillStyle = this.patient ? '#FFF' : '#F5F5F5'
    ctx.fillRect(this.x + boardWidth + this.width * 0.01, this.y + this.height * 0.04, this.width - boardWidth * 2 - this.width * 0.02, this.height * 0.92)
    
    // 枕头（四角微突的枕头形状）
    ctx.fillStyle = '#FFF'
    const pillowW = this.width * 0.32
    const pillowH = this.height * 0.13
    const cx = this.x + this.width / 2
    const cy = this.y + this.height * 0.18
    const w = pillowW / 2
    const h = pillowH / 2
    
    // 绘制枕头主体（四边微凹，四角微突）
    ctx.beginPath()
    ctx.moveTo(cx - w * 0.8, cy - h)
    ctx.quadraticCurveTo(cx, cy - h * 1.3, cx + w * 0.8, cy - h)
    ctx.quadraticCurveTo(cx + w * 1.15, cy, cx + w * 0.8, cy + h)
    ctx.quadraticCurveTo(cx, cy + h * 1.3, cx - w * 0.8, cy + h)
    ctx.quadraticCurveTo(cx - w * 1.15, cy, cx - w * 0.8, cy - h)
    ctx.closePath()
    ctx.fill()
    
    // 枕头边框
    ctx.strokeStyle = '#BDBDBD'
    ctx.lineWidth = 1.5
    ctx.stroke()
    
    // 空闲时才有枕头阴影
    if (!this.patient) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.beginPath()
      ctx.ellipse(cx, cy + h + 2, w * 0.7, 3, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 被子（白色，完全盖住身体）
    if (this.patient) {
      ctx.fillStyle = '#FFF'
      const coverWidth = this.width - boardWidth * 2 - this.width * 0.02
      const coverY = this.y + this.height * 0.32
      const coverHeight = this.y + this.height * 0.92 - coverY
      fillRoundRect(ctx, this.x + boardWidth + this.width * 0.01, coverY, coverWidth, coverHeight, this.width * 0.02)
      // 简化边框
      ctx.strokeStyle = '#E0E0E0'
      ctx.lineWidth = 1
      strokeRoundRect(ctx, this.x + boardWidth + this.width * 0.01, coverY, coverWidth, coverHeight, this.width * 0.02)
    }
    
    // 床边框（有人时去掉颜色变化）
    ctx.strokeStyle = '#BDBDBD'
    ctx.lineWidth = Math.max(1, this.width * 0.008)
    ctx.strokeRect(this.x + boardWidth + this.width * 0.01, this.y + this.height * 0.04, this.width - boardWidth * 2 - this.width * 0.02, this.height * 0.92)
    
    // 床位号
    ctx.fillStyle = '#FFF'
    ctx.beginPath()
    ctx.arc(this.x + this.width / 2, this.y - this.height * 0.03, this.width * 0.08, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#81D4C1'
    ctx.lineWidth = Math.max(1, this.width * 0.01)
    ctx.stroke()
    
    ctx.fillStyle = '#27AE60'
    ctx.font = `bold ${Math.max(8, this.width * 0.1)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${this.id + 1}`, this.x + this.width / 2, this.y - this.height * 0.03)
    
    // 绘制床上的病人（保持完整发型和脸型，头大小为枕头宽度的2/3）
    if (this.patient && !this.patient.isCured) {
      // 保存原始状态
      const originalX = this.patient.x
      const originalY = this.patient.y
      const originalWidth = this.patient.width
      const originalHeight = this.patient.height
      
      // 计算头大小比例
      const pillowW = this.width * 0.32
      const targetHeadWidth = pillowW * 2 / 3
      const originalHeadWidth = 28 // Patient.js中头部宽度
      const scaleRatio = targetHeadWidth / originalHeadWidth
      
      // 设置病人在床上的位置和大小
      // 头中心对齐枕头中心，再往下偏移
      const headCenterX = this.x + this.width / 2
      const headCenterY = this.y + this.height * 0.26 // 调整这个值来改变头的上下位置
      
      this.patient.width = originalWidth * scaleRatio
      this.patient.height = originalHeight * scaleRatio
      this.patient.x = headCenterX - this.patient.width / 2
      this.patient.y = headCenterY - this.patient.height / 2 + this.patient.height * 0.3
      
      // 绘制完整病人（去掉裁剪，显示全身）
      this.patient.render(ctx)
      
      // 恢复原始值
      this.patient.x = originalX
      this.patient.y = originalY
      this.patient.width = originalWidth
      this.patient.height = originalHeight
    }
    
    // 空闲标记
    if (!this.patient) {
      ctx.fillStyle = '#BDBDBD'
      ctx.font = `${Math.max(10, this.width * 0.15)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('💤', this.x + this.width / 2, this.y + this.height / 2)
    }
  }
}

export default class BedArea {
  constructor(x, y, width, height, bedCount) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.bedCount = bedCount
    this.beds = []
    
    this.initBeds()
  }

  initBeds() {
    // 2列2行布局（4个床位）
    const cols = 2
    const rows = 2
    
    // 床位尺寸（宽度减小，留出更多走道）
    const bedWidth = this.width * 0.30
    const bedHeight = this.height * 0.38
    const gapX = (this.width - bedWidth * cols) / (cols + 1)
    const gapY = (this.height - bedHeight * rows) / (rows + 1)
    
    const startX = this.x + gapX
    const startY = this.y + gapY + this.height * 0.03
    
    for (let i = 0; i < this.bedCount; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const bedX = startX + col * (bedWidth + gapX)
      const bedY = startY + row * (bedHeight + gapY)
      this.beds.push(new Bed(i, bedX, bedY, bedWidth, bedHeight))
    }
  }

  // 获取走道区域（医生可以在这些区域行走）
  getWalkableAreas() {
    const areas = []
    const cols = 2
    const rows = 2
    const bedWidth = this.width * 0.30
    const bedHeight = this.height * 0.38
    const gapX = (this.width - bedWidth * cols) / (cols + 1)
    const gapY = (this.height - bedHeight * rows) / (rows + 1)
    const startX = this.x + gapX
    const startY = this.y + gapY + this.height * 0.1

    // 水平走道（床之间的横向走道）
    for (let row = 0; row < rows; row++) {
      const bedY = startY + row * (bedHeight + gapY)
      // 走道在床的下方（除了最后一排）
      if (row < rows - 1) {
        areas.push({
          x: this.x,
          y: bedY + bedHeight,
          width: this.width,
          height: gapY
        })
      }
    }

    // 垂直走道（床之间的纵向走道）
    for (let col = 0; col < cols - 1; col++) {
      const bedX = startX + col * (bedWidth + gapX)
      areas.push({
        x: bedX + bedWidth,
        y: this.y,
        width: gapX,
        height: this.height
      })
    }

    return areas
  }

  findEmptyBed() {
    return this.beds.find(bed => bed.isEmpty())
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

  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }

  clear() {
    this.beds.forEach(bed => bed.clear())
  }

  render(ctx) {
    // 治疗区右上角的柜子已去掉
    
    // 绘制床位
    this.beds.forEach(bed => bed.render(ctx))
  }
}
