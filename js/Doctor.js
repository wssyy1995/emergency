export default class Doctor {
  constructor(id, bedArea) {
    this.id = id
    this.bedArea = bedArea
    this.name = '白医生'
    
    // 位置和尺寸（动态计算，与病人一致）- 已缩小25%
    this.x = 0
    this.y = 0
    this.width = 21  // 基础宽度，与Patient一致
    this.height = 33.75 // 基础高度，与Patient一致
    
    this.targetX = 0
    this.targetY = 0
    this.targetBed = null
    this.state = 'idle'
    this.idleTime = 0
    
    this.speed = 0.12
    this.animationTime = 0
    this.bounceOffset = 0
    this.facing = 1
    
    this.treatAnimation = 0
    this.blinkTimer = 0
    this.isBlinking = false
    
    this.pickRandomTarget()
  }

  pickRandomTarget() {
    // 在治疗区内随机移动
    const margin = this.bedArea.width * 0.12
    this.targetX = this.bedArea.x + margin + Math.random() * (this.bedArea.width - margin * 2)
    this.targetY = this.bedArea.y + margin + Math.random() * (this.bedArea.height - margin * 2)
    this.state = 'moving'
  }

  assignToBed(bed) {
    this.targetBed = bed
    // 根据床位大小调整目标位置
    this.targetX = bed.x + bed.width / 2
    this.targetY = bed.y + bed.height / 2 + bed.height * 0.08
    this.state = 'moving'
  }

  update(deltaTime, bedArea) {
    this.animationTime += deltaTime
    this.blinkTimer += deltaTime
    
    if (this.blinkTimer > 2500 + Math.random() * 1500) {
      this.isBlinking = true
      if (this.blinkTimer > 2600) {
        this.isBlinking = false
        this.blinkTimer = 0
      }
    }
    
    switch (this.state) {
      case 'idle':
        this.idleTime += deltaTime
        this.bounceOffset = Math.sin(this.animationTime / 600) * -2
        
        if (this.idleTime > 2000 + Math.random() * 2000) {
          const occupiedBeds = bedArea.getOccupiedBeds()
          const needsTreatment = occupiedBeds.find(bed => 
            bed.patient && !bed.patient.isCured && bed.treatmentProgress < 1
          )
          
          if (needsTreatment && !this.targetBed && Math.random() > 0.4) {
            this.assignToBed(needsTreatment)
          } else {
            this.pickRandomTarget()
          }
          this.idleTime = 0
        }
        break
        
      case 'moving':
        this.bounceOffset = Math.abs(Math.sin(this.animationTime / 120)) * -4
        
        const dx = this.targetX - this.x
        const dy = this.targetY - this.y
        const dist = Math.hypot(dx, dy)
        
        if (dist > this.width * 0.15) {
          const moveSpeed = this.speed * deltaTime
          this.x += (dx / dist) * moveSpeed
          this.y += (dy / dist) * moveSpeed
          this.facing = dx > 0 ? 1 : -1
        } else {
          if (this.targetBed) {
            this.state = 'treating'
            this.treatAnimation = 0
          } else {
            this.state = 'idle'
          }
        }
        break
        
      case 'treating':
        this.treatAnimation += deltaTime
        this.bounceOffset = Math.sin(this.animationTime / 80) * -2
        
        if (this.targetBed && this.targetBed.patient && !this.targetBed.patient.isCured) {
          this.targetBed.treatmentProgress += deltaTime / (this.targetBed.patient.condition.treatmentTime * 400)
        }
        
        if (this.treatAnimation > 2500 || (this.targetBed && this.targetBed.isEmpty())) {
          this.targetBed = null
          this.state = 'idle'
          this.pickRandomTarget()
        }
        break
    }
  }

  render(ctx) {
    // 根据病人尺寸计算缩放（保持与病人一致）
    const baseWidth = 28
    const scale = this.width / baseWidth
    
    ctx.save()
    ctx.translate(this.x, this.y + this.bounceOffset)
    ctx.scale(this.facing, 1)
    
    // 阴影（动态）
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.beginPath()
    ctx.ellipse(0, 28 * scale, 18 * scale, 6 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // Q版医生身体（动态比例）
    ctx.fillStyle = '#C7CEEA'
    ctx.beginPath()
    ctx.ellipse(0, 15 * scale, 13 * scale, 11 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 白大褂
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.moveTo(-11 * scale, 8 * scale)
    ctx.quadraticCurveTo(-14 * scale, 22 * scale, -11 * scale, 30 * scale)
    ctx.lineTo(11 * scale, 30 * scale)
    ctx.quadraticCurveTo(14 * scale, 22 * scale, 11 * scale, 8 * scale)
    ctx.fill()
    
    // 听诊器
    ctx.strokeStyle = '#7F8C8D'
    ctx.lineWidth = 2 * scale
    ctx.beginPath()
    ctx.moveTo(-10 * scale, 10 * scale)
    ctx.quadraticCurveTo(-5 * scale, 22 * scale, 0, 18 * scale)
    ctx.quadraticCurveTo(5 * scale, 22 * scale, 10 * scale, 10 * scale)
    ctx.stroke()
    ctx.fillStyle = '#95A5A6'
    ctx.beginPath()
    ctx.arc(5 * scale, 22 * scale, 3 * scale, 0, Math.PI * 2)
    ctx.fill()
    
    // 腿
    ctx.fillStyle = '#FFDFC4'
    ctx.beginPath()
    ctx.ellipse(-7 * scale, 32 * scale, 4 * scale, 6 * scale, 0, 0, Math.PI * 2)
    ctx.ellipse(7 * scale, 32 * scale, 4 * scale, 6 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 鞋子
    ctx.fillStyle = '#5D6D7E'
    ctx.beginPath()
    ctx.ellipse(-7 * scale, 36 * scale, 5 * scale, 3 * scale, 0, 0, Math.PI * 2)
    ctx.ellipse(7 * scale, 36 * scale, 5 * scale, 3 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 手臂
    ctx.fillStyle = '#FFDFC4'
    ctx.beginPath()
    ctx.ellipse(-18 * scale, 14 * scale, 4 * scale, 7 * scale, -0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(18 * scale, 14 * scale, 4 * scale, 7 * scale, 0.4, 0, Math.PI * 2)
    ctx.fill()
    
    // 治疗时的工具
    if (this.state === 'treating') {
      ctx.fillStyle = '#3498DB'
      ctx.fillRect(14 * scale, 8 * scale, 10 * scale, 8 * scale)
      ctx.fillStyle = '#FFF'
      ctx.fillRect(16 * scale, 10 * scale, 6 * scale, 4 * scale)
      ctx.fillStyle = '#E74C3C'
      ctx.fillRect(18 * scale, 11 * scale, 2 * scale, 1 * scale)
      ctx.fillRect(18.5 * scale, 10 * scale, 1 * scale, 2 * scale)
    }
    
    // 大头（与病人比例一致）
    ctx.fillStyle = '#FFDFC4'
    ctx.beginPath()
    ctx.arc(0, -12 * scale, 16 * scale, 0, Math.PI * 2)
    ctx.fill()
    
    // 腮红
    ctx.fillStyle = 'rgba(255,150,150,0.25)'
    ctx.beginPath()
    ctx.arc(-9 * scale, -8 * scale, 4 * scale, 0, Math.PI * 2)
    ctx.arc(9 * scale, -8 * scale, 4 * scale, 0, Math.PI * 2)
    ctx.fill()
    
    // 头发
    ctx.fillStyle = '#5D4037'
    ctx.beginPath()
    ctx.arc(0, -16 * scale, 17 * scale, Math.PI * 1.1, Math.PI * -0.1)
    ctx.fill()
    
    // 刘海
    ctx.beginPath()
    ctx.ellipse(-7 * scale, -22 * scale, 6 * scale, 4 * scale, -0.4, 0, Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(7 * scale, -22 * scale, 6 * scale, 4 * scale, 0.4, 0, Math.PI)
    ctx.fill()
    
    // 医生帽
    ctx.fillStyle = '#FFF'
    ctx.beginPath()
    ctx.moveTo(-16 * scale, -26 * scale)
    ctx.lineTo(-14 * scale, -38 * scale)
    ctx.quadraticCurveTo(0, -42 * scale, 14 * scale, -38 * scale)
    ctx.lineTo(16 * scale, -26 * scale)
    ctx.quadraticCurveTo(0, -30 * scale, -16 * scale, -26 * scale)
    ctx.fill()
    
    // 十字
    ctx.fillStyle = '#E74C3C'
    ctx.fillRect(-3 * scale, -36 * scale, 6 * scale, 2 * scale)
    ctx.fillRect(-1 * scale, -38 * scale, 2 * scale, 6 * scale)
    
    // 口罩
    ctx.fillStyle = '#B5EAD7'
    ctx.beginPath()
    ctx.moveTo(-12 * scale, -5 * scale)
    ctx.lineTo(-12 * scale, 4 * scale)
    ctx.quadraticCurveTo(-12 * scale, 8 * scale, -8 * scale, 8 * scale)
    ctx.lineTo(8 * scale, 8 * scale)
    ctx.quadraticCurveTo(12 * scale, 8 * scale, 12 * scale, 4 * scale)
    ctx.lineTo(12 * scale, -5 * scale)
    ctx.quadraticCurveTo(12 * scale, -9 * scale, 8 * scale, -9 * scale)
    ctx.lineTo(-8 * scale, -9 * scale)
    ctx.quadraticCurveTo(-12 * scale, -9 * scale, -12 * scale, -5 * scale)
    ctx.fill()
    
    // 口罩褶皱
    ctx.strokeStyle = '#81D4C7'
    ctx.lineWidth = 1 * scale
    ctx.beginPath()
    ctx.moveTo(-8 * scale, -1 * scale)
    ctx.lineTo(8 * scale, -1 * scale)
    ctx.moveTo(-8 * scale, 3 * scale)
    ctx.lineTo(8 * scale, 3 * scale)
    ctx.stroke()
    
    // 挂绳
    ctx.strokeStyle = '#81D4C7'
    ctx.lineWidth = 1.5 * scale
    ctx.beginPath()
    ctx.moveTo(-12 * scale, -3 * scale)
    ctx.quadraticCurveTo(-18 * scale, -8 * scale, -18 * scale, -18 * scale)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(12 * scale, -3 * scale)
    ctx.quadraticCurveTo(18 * scale, -8 * scale, 18 * scale, -18 * scale)
    ctx.stroke()
    
    // 眼睛
    if (this.isBlinking) {
      ctx.strokeStyle = '#2C3E50'
      ctx.lineWidth = 2 * scale
      ctx.beginPath()
      ctx.moveTo(-10 * scale, -16 * scale)
      ctx.quadraticCurveTo(-6 * scale, -12 * scale, -2 * scale, -16 * scale)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(2 * scale, -16 * scale)
      ctx.quadraticCurveTo(6 * scale, -12 * scale, 10 * scale, -16 * scale)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#2C3E50'
      ctx.beginPath()
      ctx.ellipse(-6 * scale, -16 * scale, 4 * scale, 5 * scale, 0, 0, Math.PI * 2)
      ctx.ellipse(6 * scale, -16 * scale, 4 * scale, 5 * scale, 0, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.arc(-4 * scale, -18 * scale, 1.5 * scale, 0, Math.PI * 2)
      ctx.arc(8 * scale, -18 * scale, 1.5 * scale, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
    
    // 状态指示器（动态位置）
    ctx.save()
    ctx.translate(this.x, this.y - 45 * scale + this.bounceOffset)
    
    let statusEmoji = ''
    let bubbleColor = ''
    if (this.state === 'idle') {
      statusEmoji = '💤'
      bubbleColor = '#95A5A6'
    } else if (this.state === 'moving') {
      statusEmoji = '💨'
      bubbleColor = '#3498DB'
    } else if (this.state === 'treating') {
      statusEmoji = '💉'
      bubbleColor = '#E74C3C'
    }
    
    const bubbleSize = 10 * scale
    ctx.fillStyle = bubbleColor
    ctx.beginPath()
    ctx.arc(0, 0, bubbleSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FFF'
    ctx.lineWidth = 2 * scale
    ctx.stroke()
    
    ctx.fillStyle = '#FFF'
    ctx.font = `${10 * scale}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(statusEmoji, 0, 0)
    
    ctx.restore()
  }
}
