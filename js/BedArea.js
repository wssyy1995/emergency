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
    
    // 加载病床图片
    this.bedImage = null
    this.loadImage()
  }
  
  loadImage() {
    const img = wx.createImage()
    img.onload = () => {
      this.bedImage = img
    }
    img.onerror = () => {
      console.warn('Failed to load bed image: images/bed.png')
    }
    img.src = 'images/bed.png'
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
    // 绘制病床图片（2号和4号病床左右镜像翻转）
    if (this.bedImage && this.bedImage.width > 0) {
      // 2号(id=1)和4号(id=3)病床进行水平翻转
      if (this.id === 1 || this.id === 3) {
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
    
    // 绘制床上的病人（图片居中显示在床上）
    if (this.patient && !this.patient.isCured) {
      // 保存原始状态
      const originalX = this.patient.x
      const originalY = this.patient.y
      const originalWidth = this.patient.width
      const originalHeight = this.patient.height
      
      // 计算病人图片在床上的合适大小（床宽度的75%）
      const targetPatientWidth = this.width * 0.75
      const patientScale = targetPatientWidth / this.patient.baseWidth
      
      // 设置病人在床上的位置（每个床位可独立调整）
      this.patient.width = this.patient.baseWidth * patientScale
      this.patient.height = this.patient.baseHeight * patientScale
      
      // 根据床位ID设置不同的位置偏移（id: [x偏移系数, y偏移系数]）
      // x偏移：0左侧，1右侧； y偏移：负数向上，正数向下
      const patientOffsets = {
        0: { x: 0.7, y: -0.1 },   // 1号床：居中，略微靠上
        1: { x: 0.3, y: -0.1 },   // 2号床：居中，略微靠上
        2: { x: 0.7, y: -0.1 },   // 3号床：居中，略微靠上
        3: { x: 0.3, y: -0.1 }    // 4号床：居中，略微靠上
      }
      const offset = patientOffsets[this.id] || { x: 0.5, y: -0.11 }
      
      this.patient.x = this.x + (this.width - this.patient.width) * offset.x
      this.patient.y = this.y + this.height * offset.y
      
      // 绘制病人
      this.patient.render(ctx)
      
      // 恢复原始值
      this.patient.x = originalX
      this.patient.y = originalY
      this.patient.width = originalWidth
      this.patient.height = originalHeight
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
    
    // 床位尺寸（高度减小，留出底部空间放托盘）
    const bedWidth = this.width * 0.45
    const bedHeight = this.height * 0.32
    const gapX = (this.width - bedWidth * cols) / (cols + 1)
    // 减小行间距，让12和34床位更紧凑
    const gapY = (this.height - bedHeight * rows) / (rows + 1) * 0.7
    
    const startX = this.x + gapX
    // 第一行（12床位）往下移动
    const startY = this.y + gapY + this.height * 0.06
    
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
    const bedWidth = this.width * 0.45
    const bedHeight = this.height * 0.32
    const gapX = (this.width - bedWidth * cols) / (cols + 1)
    const gapY = (this.height - bedHeight * rows) / (rows + 1) * 0.7
    const startX = this.x + gapX
    const startY = this.y + gapY + this.height * 0.06

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
