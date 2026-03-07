import WaitingArea from './WaitingArea.js'
import BedArea from './BedArea.js'
import EquipmentRoom from './EquipmentRoom.js'
import Patient from './Patient.js'
import Doctor from './Doctor.js'
import { fillRoundRect, strokeRoundRect } from './utils.js'

export default class Game {
  constructor() {
    // 获取 Canvas
    this.canvas = wx.createCanvas()
    this.ctx = this.canvas.getContext('2d')
    
    // 获取屏幕尺寸（横屏模式）
    const sysInfo = wx.getSystemInfoSync()
    this.screenWidth = sysInfo.windowWidth
    this.screenHeight = sysInfo.windowHeight
    
    // 设置画布大小为屏幕尺寸
    this.canvas.width = this.screenWidth
    this.canvas.height = this.screenHeight
    
    // 计算地图尺寸（留边距）
    this.mapX = 10
    this.mapY = 10
    this.mapWidth = this.screenWidth - 20
    this.mapHeight = this.screenHeight - 20
    
    // 游戏状态
    this.score = 0
    this.treatedCount = 0
    this.gameTime = 0
    this.isRunning = false
    this.patientIdCounter = 1
    this.doctorIdCounter = 1
    
    // 动态计算三个区域的宽度（无间隙填满）
    this.initAreas()
    
    this.doctors = []
    this.createDoctors(2)
    
    this.selectedPatient = null
    this.dragOffset = { x: 0, y: 0 }
    this.lastTime = 0
    
    this.initTouch()
  }

  initAreas() {
    // 顶部状态栏高度
    const headerHeight = 60
    // 底部留白
    const bottomMargin = 10
    
    // 可用区域
    const availableY = this.mapY + headerHeight
    const availableHeight = this.mapHeight - headerHeight - bottomMargin
    
    // 三个区域的间距
    const gap = 10
    
    // 计算总可用宽度
    const totalGap = gap * 4  // 左右边距 + 中间两个间距
    const availableWidth = this.mapWidth - totalGap
    
    // 调整比例：等候区 35% | 治疗区 40% | 器材室 25%
    const waitingWidth = availableWidth * 0.35
    const bedWidth = availableWidth * 0.40
    const equipmentWidth = availableWidth * 0.25
    
    // 等候区（左侧）
    const waitingX = this.mapX + gap
    this.waitingArea = new WaitingArea(waitingX, availableY, waitingWidth, availableHeight)
    
    // 治疗区（中间）
    const bedX = waitingX + waitingWidth + gap
    this.bedArea = new BedArea(bedX, availableY, bedWidth, availableHeight, 6)
    
    // 器材室（右侧）- 更窄
    const equipmentX = bedX + bedWidth + gap
    this.equipmentRoom = new EquipmentRoom(equipmentX, availableY, equipmentWidth, availableHeight)
  }

  createDoctors(count) {
    for (let i = 0; i < count; i++) {
      const doctor = new Doctor(this.doctorIdCounter++, this.bedArea)
      doctor.x = this.bedArea.x + this.bedArea.width * 0.2 + i * this.bedArea.width * 0.35
      doctor.y = this.bedArea.y + this.bedArea.height * 0.3
      this.doctors.push(doctor)
    }
  }

  start() {
    this.isRunning = true
    
    // 初始生成8个随机外观的病人
    for (let i = 0; i < 8; i++) {
      this.spawnPatient()
    }
    
    this.loop(0)
    
    this.timeTimer = setInterval(() => {
      this.gameTime++
    }, 1000)
    
    // 定时补充病人（当人数少于8时）
    this.spawnTimer = setInterval(() => {
      if (this.waitingArea.patients.length < 8 && Math.random() > 0.3) {
        this.spawnPatient()
      }
    }, 5000)
  }

  loop(timestamp) {
    if (!this.isRunning) return
    
    const deltaTime = timestamp - this.lastTime
    this.lastTime = timestamp
    
    this.update(deltaTime)
    this.render()
    
    requestAnimationFrame((t) => this.loop(t))
  }

  update(deltaTime) {
    this.waitingArea.update(deltaTime)
    this.equipmentRoom.update(deltaTime)
    this.doctors.forEach(doctor => doctor.update(deltaTime, this.bedArea))
    
    this.waitingArea.patients.forEach(patient => patient.update(deltaTime))
    this.bedArea.getOccupiedBeds().forEach(bed => {
      if (bed.patient) {
        bed.patient.update(deltaTime)
        if (!bed.patient.isCured) {
          bed.treatmentProgress += deltaTime / (bed.patient.condition.treatmentTime * 1000)
          if (bed.treatmentProgress >= 1) {
            this.curePatient(bed)
          }
        }
      }
    })
    
    this.waitingArea.patients.forEach(patient => {
      patient.patience -= deltaTime / 1000
      if (patient.patience <= 0) {
        patient.isAngry = true
      }
    })
  }

  curePatient(bed) {
    bed.patient.isCured = true
    this.score += 10 + Math.floor(Math.random() * 20)
    this.treatedCount++
    
    setTimeout(() => {
      bed.clear()
    }, 2500)
  }

  spawnPatient() {
    if (this.waitingArea.patients.length >= 8) return
    
    const patient = new Patient(this.patientIdCounter++)
    // 从左侧入口进入
    patient.x = this.waitingArea.x + 20
    patient.y = this.waitingArea.y + 80
    patient.targetX = patient.x
    patient.targetY = patient.y
    this.waitingArea.addPatient(patient)
  }

  render() {
    this.ctx.save()
    
    // 清空画布
    this.ctx.fillStyle = '#FFF5F5'
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 绘制地图背景
    this.renderMapBackground()
    
    // 绘制各个区域
    this.waitingArea.render(this.ctx)
    this.bedArea.render(this.ctx)
    this.equipmentRoom.render(this.ctx)
    this.doctors.forEach(doctor => doctor.render(this.ctx))
    this.renderPatients()
    this.renderUI()
    
    this.ctx.restore()
  }

  renderMapBackground() {
    const ctx = this.ctx
    
    // 外边框
    ctx.fillStyle = '#FFB7B2'
    ctx.fillRect(this.mapX, this.mapY, this.mapWidth, this.mapHeight)
    
    // 内部地板
    ctx.fillStyle = '#FFE4E1'
    ctx.fillRect(this.mapX + 5, this.mapY + 5, this.mapWidth - 10, this.mapHeight - 10)
    
    // 等候区背景（白色）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    fillRoundRect(ctx, this.waitingArea.x, this.waitingArea.y, this.waitingArea.width, this.waitingArea.height, 15)
    ctx.strokeStyle = '#E0E0E0'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, this.waitingArea.x, this.waitingArea.y, this.waitingArea.width, this.waitingArea.height, 15)
    
    // 治疗区背景
    ctx.fillStyle = 'rgba(181, 234, 215, 0.4)'
    fillRoundRect(ctx, this.bedArea.x, this.bedArea.y, this.bedArea.width, this.bedArea.height, 15)
    ctx.strokeStyle = '#B5EAD7'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, this.bedArea.x, this.bedArea.y, this.bedArea.width, this.bedArea.height, 15)
    
    // 器材室背景
    ctx.fillStyle = 'rgba(255, 248, 220, 0.4)'
    fillRoundRect(ctx, this.equipmentRoom.x, this.equipmentRoom.y, this.equipmentRoom.width, this.equipmentRoom.height, 15)
    ctx.strokeStyle = '#F4D03F'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, this.equipmentRoom.x, this.equipmentRoom.y, this.equipmentRoom.width, this.equipmentRoom.height, 15)
  }

  renderPatients() {
    this.waitingArea.patients.forEach(patient => {
      patient.render(this.ctx)
    })
    
    if (this.selectedPatient) {
      this.selectedPatient.render(this.ctx, true)
    }
  }

  renderUI() {
    const ctx = this.ctx
    
    // 顶部状态栏
    const gradient = ctx.createLinearGradient(this.mapX, 0, this.mapX + this.mapWidth, 0)
    gradient.addColorStop(0, '#FFB7B2')
    gradient.addColorStop(1, '#FF9AA2')
    ctx.fillStyle = gradient
    ctx.fillRect(this.mapX, this.mapY, this.mapWidth, 55)
    
    // 标题
    ctx.fillStyle = '#FFF'
    ctx.font = `bold ${Math.max(16, this.screenWidth * 0.025)}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('🏥 急症室模拟器', this.mapX + 15, this.mapY + 28)
    
    // 统计
    const fontSize = Math.max(12, this.screenWidth * 0.018)
    ctx.font = `${fontSize}px sans-serif`
    const mins = Math.floor(this.gameTime / 60).toString().padStart(2, '0')
    const secs = (this.gameTime % 60).toString().padStart(2, '0')
    
    const statsX = this.mapX + this.mapWidth - 250
    ctx.fillText(`⏰ ${mins}:${secs}`, statsX, this.mapY + 28)
    ctx.fillText(`⭐ ${this.score}`, statsX + 80, this.mapY + 28)
    ctx.fillText(`💊 ${this.treatedCount}`, statsX + 160, this.mapY + 28)
    
    // 区域标题
    const titleY = this.mapY + 75
    const titleFontSize = Math.max(12, this.screenWidth * 0.018)
    ctx.font = `bold ${titleFontSize}px sans-serif`
    
    ctx.fillStyle = '#E74C3C'
    ctx.textAlign = 'center'
    ctx.fillText(`🪑 等候区 (${this.waitingArea.patients.length}/8)`, this.waitingArea.x + this.waitingArea.width / 2, titleY)
    
    ctx.font = `bold ${titleFontSize}px sans-serif`
    ctx.fillStyle = '#27AE60'
    ctx.fillText('🛏️ 治疗区', this.bedArea.x + this.bedArea.width / 2, titleY)
    
    ctx.fillStyle = '#F39C12'
    ctx.fillText('🏥 器材室', this.equipmentRoom.x + this.equipmentRoom.width / 2, titleY)
  }

  initTouch() {
    wx.onTouchStart((e) => {
      const touch = e.touches[0]
      const x = touch.clientX
      const y = touch.clientY
      
      // 检查是否在重置按钮区域（右上角）
      if (x > this.screenWidth - 100 && y < 60) {
        this.reset()
        return
      }
      
      const patient = this.waitingArea.getPatientAt(x, y)
      if (patient && !patient.inBed) {
        this.selectedPatient = patient
        this.dragOffset.x = x - patient.x
        this.dragOffset.y = y - patient.y
      }
    })
    
    wx.onTouchMove((e) => {
      if (this.selectedPatient) {
        const touch = e.touches[0]
        this.selectedPatient.x = touch.clientX - this.dragOffset.x
        this.selectedPatient.y = touch.clientY - this.dragOffset.y
      }
    })
    
    wx.onTouchEnd((e) => {
      if (this.selectedPatient) {
        const x = this.selectedPatient.x
        const y = this.selectedPatient.y
        
        const bed = this.bedArea.getBedAt(x, y)
        if (bed && bed.isEmpty()) {
          this.waitingArea.removePatient(this.selectedPatient)
          bed.assignPatient(this.selectedPatient)
          this.selectedPatient.inBed = true
          this.notifyDoctors(bed)
        } else {
          this.selectedPatient.x = this.selectedPatient.targetX
          this.selectedPatient.y = this.selectedPatient.targetY
        }
        
        this.selectedPatient = null
      }
    })
  }

  notifyDoctors(bed) {
    let nearestDoctor = null
    let minDist = Infinity
    
    this.doctors.forEach(doctor => {
      if (!doctor.targetBed) {
        const dist = Math.hypot(doctor.x - bed.x, doctor.y - bed.y)
        if (dist < minDist) {
          minDist = dist
          nearestDoctor = doctor
        }
      }
    })
    
    if (nearestDoctor) {
      nearestDoctor.assignToBed(bed)
    }
  }

  reset() {
    wx.showModal({
      title: '重新开始',
      content: '要重新开始游戏吗？',
      success: (res) => {
        if (res.confirm) {
          this.score = 0
          this.treatedCount = 0
          this.gameTime = 0
          this.patientIdCounter = 1
          this.waitingArea.clear()
          this.bedArea.clear()
          this.doctors.forEach(doctor => {
            doctor.targetBed = null
            doctor.state = 'idle'
          })
        }
      }
    })
  }
}
