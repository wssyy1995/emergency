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
  }

  isEmpty() {
    return this.patient === null
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }

  render(ctx) {
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.beginPath()
    ctx.ellipse(this.x + this.width / 2, this.y + this.height - this.height * 0.02, this.width / 2 - this.width * 0.02, this.height * 0.05, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 床头板
    ctx.fillStyle = '#81D4C1'
    const boardWidth = this.width * 0.06
    fillRoundRect(ctx, this.x, this.y, boardWidth, this.height, boardWidth / 2)
    
    // 床尾板
    fillRoundRect(ctx, this.x + this.width - boardWidth, this.y, boardWidth, this.height, boardWidth / 2)
    
    // 床垫
    ctx.fillStyle = this.patient ? '#E8F5E9' : '#F5F5F5'
    ctx.fillRect(this.x + boardWidth + this.width * 0.01, this.y + this.height * 0.04, this.width - boardWidth * 2 - this.width * 0.02, this.height * 0.92)
    
    // 枕头
    ctx.fillStyle = '#FFF'
    ctx.beginPath()
    ctx.ellipse(this.x + this.width * 0.15, this.y + this.height * 0.15, this.width * 0.06, this.height * 0.06, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 被子
    if (this.patient) {
      ctx.fillStyle = '#A5D6A7'
      const coverWidth = this.width - boardWidth * 2 - this.width * 0.03
      const coverHeight = this.height * 0.7
      fillRoundRect(ctx, this.x + boardWidth + this.width * 0.015, this.y + this.height * 0.25, coverWidth, coverHeight, this.width * 0.015)
    }
    
    // 床边框
    ctx.strokeStyle = this.patient ? '#66BB6A' : '#BDBDBD'
    ctx.lineWidth = Math.max(1, this.width * 0.008)
    ctx.strokeRect(this.x + boardWidth + this.width * 0.01, this.y + this.height * 0.04, this.width - boardWidth * 2 - this.width * 0.02, this.height * 0.92)
    
    // 床位号
    ctx.fillStyle = '#FFF'
    ctx.beginPath()
    ctx.arc(this.x + this.width / 2, this.y - this.height * 0.03, this.width * 0.06, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#81D4C1'
    ctx.lineWidth = Math.max(1, this.width * 0.01)
    ctx.stroke()
    
    ctx.fillStyle = '#27AE60'
    ctx.font = `bold ${Math.max(8, this.width * 0.08)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${this.id + 1}`, this.x + this.width / 2, this.y - this.height * 0.03)
    
    // 病人头像
    if (this.patient && !this.patient.isCured) {
      const headSize = this.width * 0.1
      ctx.fillStyle = this.patient.skinColor
      ctx.beginPath()
      ctx.arc(this.x + this.width / 2, this.y + this.height * 0.18, headSize, 0, Math.PI * 2)
      ctx.fill()
      
      // 头发
      ctx.fillStyle = this.patient.hairColor
      ctx.beginPath()
      ctx.arc(this.x + this.width / 2, this.y + this.height * 0.15, headSize, Math.PI, 0)
      ctx.fill()
      
      // 眼睛
      ctx.fillStyle = '#2C3E50'
      ctx.beginPath()
      ctx.arc(this.x + this.width / 2 - headSize * 0.3, this.y + this.height * 0.18, headSize * 0.15, 0, Math.PI * 2)
      ctx.arc(this.x + this.width / 2 + headSize * 0.3, this.y + this.height * 0.18, headSize * 0.15, 0, Math.PI * 2)
      ctx.fill()
      
      // 病情图标
      ctx.fillStyle = this.patient.condition.color
      ctx.beginPath()
      ctx.arc(this.x + this.width * 0.85, this.y + this.height * 0.1, this.width * 0.05, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFF'
      ctx.font = `${Math.max(6, this.width * 0.05)}px sans-serif`
      ctx.fillText(this.patient.condition.icon, this.x + this.width * 0.85, this.y + this.height * 0.1)
    }
    
    // 治疗进度条
    if (this.patient && !this.patient.isCured && this.treatmentProgress > 0) {
      const barWidth = this.width * 0.7
      const barHeight = this.height * 0.04
      const barX = this.x + this.width * 0.15
      const barY = this.y + this.height + this.height * 0.02
      
      ctx.fillStyle = '#E0E0E0'
      fillRoundRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2)
      
      ctx.fillStyle = '#66BB6A'
      fillRoundRect(ctx, barX, barY, barWidth * Math.min(this.treatmentProgress, 1), barHeight, barHeight / 2)
    }
    
    // 空闲标记
    if (!this.patient) {
      ctx.fillStyle = '#BDBDBD'
      ctx.font = `${Math.max(10, this.width * 0.12)}px sans-serif`
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
    // 2列3行布局
    const cols = 2
    const rows = 3
    
    // 更小的床位尺寸（占区域比例更小）
    const bedWidth = this.width * 0.32
    const bedHeight = this.height * 0.22
    const gapX = (this.width - bedWidth * cols) / (cols + 1)
    const gapY = (this.height - bedHeight * rows) / (rows + 1)
    
    const startX = this.x + gapX
    const startY = this.y + gapY + this.height * 0.05
    
    for (let i = 0; i < this.bedCount; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const bedX = startX + col * (bedWidth + gapX)
      const bedY = startY + row * (bedHeight + gapY)
      this.beds.push(new Bed(i, bedX, bedY, bedWidth, bedHeight))
    }
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
    // 医疗设备柜（动态尺寸）
    const cabinetWidth = this.width * 0.1
    const cabinetHeight = this.height * 0.2
    const cabinetX = this.x + this.width - cabinetWidth - this.width * 0.02
    const cabinetY = this.y + this.height * 0.06
    
    ctx.fillStyle = '#E8F5E9'
    fillRoundRect(ctx, cabinetX, cabinetY, cabinetWidth, cabinetHeight, cabinetWidth * 0.1)
    ctx.strokeStyle = '#81C784'
    ctx.lineWidth = Math.max(1, this.width * 0.005)
    strokeRoundRect(ctx, cabinetX, cabinetY, cabinetWidth, cabinetHeight, cabinetWidth * 0.1)
    
    // 柜子门
    ctx.strokeStyle = '#A5D6A7'
    ctx.beginPath()
    ctx.moveTo(cabinetX + cabinetWidth / 2, cabinetY)
    ctx.lineTo(cabinetX + cabinetWidth / 2, cabinetY + cabinetHeight)
    ctx.stroke()
    
    // 把手
    ctx.fillStyle = '#FFD54F'
    ctx.beginPath()
    ctx.arc(cabinetX + cabinetWidth * 0.35, cabinetY + cabinetHeight / 2, cabinetWidth * 0.06, 0, Math.PI * 2)
    ctx.arc(cabinetX + cabinetWidth * 0.65, cabinetY + cabinetHeight / 2, cabinetWidth * 0.06, 0, Math.PI * 2)
    ctx.fill()
    
    // 医疗箱
    ctx.fillStyle = '#EF5350'
    const boxSize = cabinetWidth * 0.35
    fillRoundRect(ctx, cabinetX + cabinetWidth * 0.1, cabinetY + cabinetHeight * 0.12, boxSize, boxSize * 0.7, boxSize * 0.1)
    ctx.fillStyle = '#FFF'
    const crossWidth = boxSize * 0.25
    const crossHeight = boxSize * 0.1
    ctx.fillRect(cabinetX + cabinetWidth * 0.1 + boxSize / 2 - crossWidth / 2, cabinetY + cabinetHeight * 0.12 + boxSize * 0.3, crossWidth, crossHeight)
    ctx.fillRect(cabinetX + cabinetWidth * 0.1 + boxSize / 2 - crossHeight / 2, cabinetY + cabinetHeight * 0.12 + boxSize * 0.2, crossHeight, crossWidth)
    
    // 绘制床位
    this.beds.forEach(bed => bed.render(ctx))
  }
}
