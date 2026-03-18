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
    patient.y = this.y + this.height * 0.55  // 往下挪，让病人躺在病床上
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
        0: { x: 0.6, y: 0.21 },  // 往下挪，让病人显示在病床上
        1: { x: 0.4, y: 0.21 }
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
    
    // 【升级系统】
    this.currentUpgradeId = 'ivseat_default'
    this.upgradedFreeImage = null
    this.upgradedOccupiedImage = null
  }
  
  // 【升级系统】设置升级
  setUpgrade(upgradeId) {
    if (this.currentUpgradeId === upgradeId) return
    
    this.currentUpgradeId = upgradeId
    
    // 如果不是默认升级，加载升级图片
    if (upgradeId !== 'ivseat_default') {
      const freeImg = wx.createImage()
      freeImg.onload = () => {
        this.upgradedFreeImage = freeImg
      }
      freeImg.src = `images/${upgradeId}.png`
      
      const occupiedImg = wx.createImage()
      occupiedImg.onload = () => {
        this.upgradedOccupiedImage = occupiedImg
      }
      occupiedImg.src = `images/${upgradeId}.png`
    } else {
      this.upgradedFreeImage = null
      this.upgradedOccupiedImage = null
    }
  }
  
  // 【升级系统】获取当前空闲图片
  getCurrentFreeImage() {
    return this.upgradedFreeImage || this.seatFreeImage
  }
  
  // 【升级系统】获取当前占用图片
  getCurrentOccupiedImage() {
    return this.upgradedOccupiedImage || this.seatOccupiedImage
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
    const currentImage = this.patient ? this.getCurrentOccupiedImage() : this.getCurrentFreeImage()
    
    if (currentImage && currentImage.width > 0) {
      // 使用椅子定义的宽高，保持图片比例
      const imgRatio = currentImage.width / currentImage.height
      let drawWidth = this.width
      let drawHeight = this.width / imgRatio
      
      // 如果计算的高度超过定义的高度，则以高度为基准
      if (drawHeight > this.height * 1.3) {
        drawHeight = this.height * 1.3
        drawWidth = drawHeight * imgRatio
      }
      
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
    
    // 加载两张病床之间的小桌子图片
    this.toolsDeskImage = null
    this.loadToolsDeskImage()
    
    this.initBeds()
    this.initIVSeats()
  }
  
  loadToolsDeskImage() {
    const img = wx.createImage()
    img.onload = () => {
      this.toolsDeskImage = img
    }
    img.onerror = () => {
      console.warn('Failed to load tools desk image: images/tools_desk.png')
    }
    img.src = 'images/tools_desk.png'
  }

  initBeds() {
    // 上半部分：2张病床，横排
    const bedWidth = this.width * 0.58
    // 病床大小：保持图片原始比例 (200:267 = 1:1.335)，以宽度为基准自适应高度
    const bedHeight = bedWidth * (267 / 200)
    const gapX = (this.width - bedWidth * 2) / 3
    
    const startX = this.x + gapX
    // 调整起始位置，让病床在急救间区域内垂直居中（往下8px+3px）
    const startY = this.y + this.height * 0.28 - bedHeight / 2 + 8 + 3
    
    for (let i = 0; i < 2; i++) {
      const bedX = startX + i * (bedWidth + gapX)
      this.beds.push(new Bed(i, bedX, startY, bedWidth, bedHeight))
    }
  }

  initIVSeats() {
    // 输液治疗椅子区域：高度为治疗区的三分之一，横排4张椅子
    const seatWidth = this.width * 0.26
    const seatHeight = this.height * 0.2  // 高度增加适应区域
    const gapX = (this.width - seatWidth * 4) / 5
    const startX = this.x + gapX
    // 输液区域再治疗区底部（往下5px）
    const startY = this.y + this.height * 0.75 + 5
    
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
    
    // 在两张病床之间绘制小桌子
    if (this.toolsDeskImage && this.toolsDeskImage.width > 0 && this.beds.length >= 2) {
      const bed1 = this.beds[0]
      const bed2 = this.beds[1]
      
      // 计算桌子位置：两张病床之间的中间位置（往下3px）
      const deskX = bed1.x + bed1.width + (bed2.x - (bed1.x + bed1.width)) / 2
      const deskY = bed1.y + bed1.height * 0.23 + 3
      
      // 桌子大小
      const deskWidth = 70
      const deskHeight = (this.toolsDeskImage.height / this.toolsDeskImage.width) * deskWidth
      
      ctx.drawImage(
        this.toolsDeskImage,
        deskX - deskWidth / 2,
        deskY,
        deskWidth,
        deskHeight
      )
    }
    
    // ========== 【急救间】胶囊形标签 ==========
    // 急救间使用红色系配色（加深版本，75%不透明）
    const emergencyColors = {
      bgColor: '#E74C3C',          // 内部红色底色（加深）
      innerBorderColor: '#C0392B', // 内层深红描边
      outerBorderColor: '#E74C3C', // 外层红色边框（加深）
      textColor: '#FFFFFF',        // 文字白色
      textStrokeColor: '#FFFFFF',  // 文字无描边
      alpha: 0.75                  // 75%不透明度
    }
    // 计算【急救间】胶囊位置和尺寸，用于绘制灯
    const emergencyLabelY = this.y + 30
    const fontSize = 15
    const paddingX = 12
    const textWidth = ctx.measureText('急救间').width
    const labelWidth = textWidth + paddingX * 2
    const labelHeight = fontSize + 10
    
    // 绘制【急救间】胶囊
    this.drawPillLabel(ctx, this.x + this.width / 2, emergencyLabelY, '急救间', emergencyColors)
    
    // 【急救间】下方虚线（暂时隐藏）
    // ctx.save()
    // ctx.strokeStyle = emergencyColors.outerBorderColor
    // ctx.lineWidth = 2
    // ctx.setLineDash([6, 4])
    // ctx.beginPath()
    // ctx.moveTo(this.x, this.y + 42)
    // ctx.lineTo(this.x + this.width, this.y + 42)
    // ctx.stroke()
    // ctx.restore()
    
    // 绘制输液椅（底部1/3区域）
    this.ivSeats.forEach(seat => seat.render(ctx, curedImage))
    
    // ========== 【治疗椅】胶囊形标签 ==========
    // 治疗椅使用蓝色系配色（加深版本，80%不透明）
    const treatmentColors = {
      bgColor: '#3498DB',          // 内部蓝色底色（加深）
      innerBorderColor: '#2980B9', // 内层深蓝描边
      outerBorderColor: '#3498DB', // 外层蓝色边框（加深）
      textColor: '#FFFFFF',        // 文字白色
      textStrokeColor: '#FFFFFF',  // 文字无描边
      alpha: 0.8                   // 80%不透明度
    }
    this.drawPillLabel(ctx, this.x + this.width / 2, this.y + this.height * 0.65, '治疗椅', treatmentColors)
    
    // 【治疗椅】下方虚线（暂时隐藏）
    // ctx.save()
    // ctx.strokeStyle = treatmentColors.outerBorderColor
    // ctx.lineWidth = 1.5
    // ctx.setLineDash([6, 4])
    // ctx.beginPath()
    // ctx.moveTo(this.x, this.y + this.height * 0.63 + 14)
    // ctx.lineTo(this.x + this.width, this.y + this.height * 0.63 + 14)
    // ctx.stroke()
    // ctx.restore()
  }
  
  /**
   * 绘制胶囊形标签（参考ui.txt三层设计）
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {number} x - 中心点X坐标
   * @param {number} y - 中心点Y坐标
   * @param {string} text - 标签文字
   * @param {Object} colors - 颜色配置对象
   */
  drawPillLabel(ctx, x, y, text, colors) {
    const fontSize = 11            // 字体大小
    const paddingX =8           // 左右内边距
    const paddingY = 4            // 上下内边距（
    const outerBorderThickness = 1.5  // 外层边框厚度
    const innerBorderThickness = 2  // 内层（白边）厚度
    
    const { bgColor, innerBorderColor, outerBorderColor, textColor, textStrokeColor } = colors
    
    // 计算最内层尺寸（文字区域）
    ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
    const textWidth = ctx.measureText(text).width
    const innerWidth = textWidth + paddingX * 2
    const innerHeight = fontSize + paddingY * 2
    
    // 计算各层尺寸（由内到外）
    const middleWidth = innerWidth + innerBorderThickness * 2   // 中间层（白边）
    const middleHeight = innerHeight + innerBorderThickness * 2
    const outerWidth = middleWidth + outerBorderThickness * 2   // 最外层（彩色边）
    const outerHeight = middleHeight + outerBorderThickness * 2
    
    // 辅助函数：绘制指定尺寸的胶囊路径
    const drawPillPath = (width, height) => {
      const startX = x - width / 2
      const startY = y - height / 2
      const radius = height / 2
      
      ctx.beginPath()
      ctx.moveTo(startX + radius, startY)
      ctx.lineTo(startX + width - radius, startY)
      ctx.arc(startX + width - radius, startY + radius, radius, -Math.PI / 2, Math.PI / 2)
      ctx.lineTo(startX + radius, startY + height)
      ctx.arc(startX + radius, startY + radius, radius, Math.PI / 2, -Math.PI / 2)
      ctx.closePath()
    }
    
    // 获取透明度（默认0.8）
    const alpha = colors.alpha || 0.8
    
    ctx.save()
    
    // 第一步：绘制最外层（红色/蓝色边框，带透明度）
    ctx.globalAlpha = alpha
    drawPillPath(outerWidth, outerHeight)
    ctx.fillStyle = outerBorderColor
    ctx.fill()
    
    // 第二步：绘制中间层（白色边框，不透明）
    ctx.globalAlpha = 1.0
    drawPillPath(middleWidth, middleHeight)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    
    // 第三步：绘制内层（红色/蓝色底色，与最外层同色，带透明度）
    ctx.globalAlpha = alpha
    drawPillPath(innerWidth, innerHeight)
    ctx.fillStyle = outerBorderColor
    ctx.fill()
    
    // 恢复透明度
    ctx.globalAlpha = 1.0
    
    // 第四步：绘制文字（纯白色文字，无描边）
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(text, x, y)
    
    ctx.restore()
  }
  
  // 【升级系统】设置输液椅升级
  setUpgrade(upgradeId) {
    console.log('[BedArea升级] 设置输液椅升级:', upgradeId)
    this.ivSeats.forEach(seat => {
      seat.setUpgrade(upgradeId)
    })
  }
}
