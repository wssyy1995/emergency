import { fillRoundRect, strokeRoundRect } from './utils.js'
import Nurse from './Nurse.js'

export default class WaitingArea {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.patients = []
    
    // 创建护士（放在护士台后面，只显示上半身）
    this.nurse = new Nurse(this.x + this.width / 2, this.y + this.height * 0.20)
    this.nurse.setScale(this.width)
    
    this.seats = []
    this.initSeats()
    
    this.queuePositions = []
    this.initQueuePositions()
  }

  initSeats() {
    // 两排座位，每排4个，共8个座位
    const rows = 2
    const seatsPerRow = 4
    
    // 根据区域大小计算座位尺寸
    const seatWidth = this.width * 0.18
    const seatHeight = this.height * 0.14
    const gapX = (this.width - seatWidth * seatsPerRow) / (seatsPerRow + 1)
    const gapY = this.height * 0.15
    
    // 起始位置（前台下方）
    const startY = this.y + this.height * 0.55
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < seatsPerRow; col++) {
        this.seats.push({
          x: this.x + gapX + col * (seatWidth + gapX),
          y: startY + row * (seatHeight + gapY),
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
        y: this.y + this.height * 0.78,
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
      emptySeat.patientSeated = false  // 病人还未坐下
      patient.seat = emptySeat
      // 设置病人尺寸（等候区专用，较小）
      patient.width = 16
      patient.height = 26
      patient.moveTo(emptySeat.x + (emptySeat.width - patient.width) / 2, emptySeat.y - patient.height * 0.2)
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
        patient.seat.patientSeated = false
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
          seat.patientSeated = false  // 病人还未坐下
          patient.seat = seat
          // 设置病人尺寸（等候区专用，较小）
          patient.width = 16
          patient.height = 26
          patient.moveTo(seat.x + (seat.width - patient.width) / 2, seat.y - patient.height * 0.2)
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
      seat.patientSeated = false
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
    
    // 检查病人是否已坐下
    this.seats.forEach(seat => {
      if (seat.occupied && seat.patient && !seat.patientSeated) {
        const patient = seat.patient
        // 检查病人是否已到达座位位置（停止移动）
        if (!patient.isMoving) {
          const dx = patient.x - (seat.x + (seat.width - patient.width) / 2)
          const dy = patient.y - (seat.y - patient.height * 0.2)
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 5) {
            seat.patientSeated = true
          }
        }
      }
    })
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
    const deskY = this.y + this.height * 0.23
    const deskWidth = this.width * 0.65
    const deskHeight = this.height * 0.1
    
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

  renderSeats(ctx) {
    this.seats.forEach((seat, i) => {
      // 椅子腿
      ctx.strokeStyle = '#8B4513'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(seat.x + seat.width * 0.1, seat.y + seat.height)
      ctx.lineTo(seat.x + seat.width * 0.1, seat.y + seat.height * 0.6)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(seat.x + seat.width * 0.9, seat.y + seat.height)
      ctx.lineTo(seat.x + seat.width * 0.9, seat.y + seat.height * 0.6)
      ctx.stroke()
      
      // 座面（天蓝色）- 只有病人坐下后才变色
      ctx.fillStyle = seat.patientSeated ? '#5DADE2' : '#87CEEB'
      ctx.fillRect(seat.x + seat.width * 0.05, seat.y + seat.height * 0.5, seat.width * 0.9, seat.height * 0.18)
      ctx.strokeStyle = seat.patientSeated ? '#2E86AB' : '#5DADE2'
      ctx.lineWidth = 1.5
      ctx.strokeRect(seat.x + seat.width * 0.05, seat.y + seat.height * 0.5, seat.width * 0.9, seat.height * 0.18)
      
      // 靠背（天蓝色）- 只有病人坐下后才变色
      ctx.fillStyle = seat.patientSeated ? '#5DADE2' : '#87CEEB'
      ctx.fillRect(seat.x + seat.width * 0.05, seat.y, seat.width * 0.9, seat.height * 0.5)
      ctx.strokeStyle = seat.patientSeated ? '#2E86AB' : '#5DADE2'
      ctx.strokeRect(seat.x + seat.width * 0.05, seat.y, seat.width * 0.9, seat.height * 0.5)
      
      // 座位号（只有座位空闲时显示）
      if (!seat.occupied) {
        ctx.fillStyle = '#2E86AB'
        ctx.font = `bold ${Math.max(8, seat.width * 0.18)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${i + 1}`, seat.x + seat.width / 2, seat.y + seat.height * 0.25)
      }
    })
  }
}
