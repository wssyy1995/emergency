// 简化版医生 - 像护士一样直接使用，不依赖复杂的走道计算
import { fillRoundRect, strokeRoundRect } from './utils.js'
import { getRandomItem, getItemById, getItemImage, isMedicine } from './Items.js'
import { getDoctorItemCount } from './GameConfig.js'

export default class Doctor {
  constructor(id, bedArea) {
    this.id = id
    this.bedArea = bedArea
    this.name = id === 1 ? '白医生' : '绿医生'
    
    // 固定位置在治疗区（像护士一样固定位置）
    // 医生1在左上，医生2在右下
    if (bedArea) {
      this.x = bedArea.x + bedArea.width * (id === 1 ? 0.25 : 0.75)
      this.y = bedArea.y + bedArea.height * 0.5
    } else {
      this.x = 100
      this.y = 100
    }
    
    this.width = 21
    this.height = 33.75
    this.baseWidth = 28
    this.baseHeight = 45
    
    this.targetX = this.x
    this.targetY = this.y
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
    
    this.requiredItems = []
    this.receivedItems = []
    this.currentLevel = 0
    
    this.isLocked = false
    this.lockedByPatient = null
    
    // 加载图片
    this.idleImage = null
    this.treatImage = null
    this.loadImages()
  }
  
  loadImages() {
    const imageId = this.id
    const idlePath = `images/doctor_${imageId}_idle.png`
    const treatPath = `images/doctor_${imageId}_treat.png`
    
    const idleImg = wx.createImage()
    idleImg.onload = () => { this.idleImage = idleImg }
    idleImg.src = idlePath
    
    const treatImg = wx.createImage()
    treatImg.onload = () => { this.treatImage = treatImg }
    treatImg.src = treatPath
  }
  
  pickRandomTarget() {
    // 没有病人时，站在治疗区中心点，不乱走
    if (this.bedArea) {
      // 医生1和医生2分别站在中心点的左右两侧，避免重叠
      const offsetX = this.id === 1 ? -30 : 30
      this.targetX = this.bedArea.x + this.bedArea.width / 2 + offsetX
      this.targetY = this.bedArea.y + this.bedArea.height / 2
      this.state = 'moving'
    }
  }
  
  assignToBed(bed) {
    this.targetBed = bed
    if (bed.id === 0 || bed.id === 2) {
      this.targetX = bed.x - 15
      this.targetY = bed.y + bed.height / 2
    } else {
      this.targetX = bed.x + bed.width + 15
      this.targetY = bed.y + bed.height / 2
    }
    this.state = 'moving'
  }
  
  getWalkablePointNearBed(bed) {
    if (bed.id === 0 || bed.id === 2) {
      return { x: bed.x - 15, y: bed.y + bed.height / 2 }
    } else {
      return { x: bed.x + bed.width + 15, y: bed.y + bed.height / 2 }
    }
  }
  
  update(deltaTime, bedArea) {
    this.animationTime += deltaTime
    
    if (this.isLocked) {
      this.bounceOffset = Math.sin(this.animationTime / 300) * -1.5
      return
    }
    
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
        
        const occupiedBeds = bedArea.getOccupiedBeds()
        const needsTreatment = occupiedBeds.find(bed => 
          bed.patient && !bed.patient.isCured && bed.treatmentProgress < 1 && !bed.assignedDoctor
        )
        
        if (needsTreatment && !this.targetBed) {
          needsTreatment.assignedDoctor = this
          this.assignToBed(needsTreatment)
          this.idleTime = 0
        }
        // 没有病人时，不需要每段时间重新定位，保持在中心点即可
        break
        
      case 'moving':
        this.bounceOffset = Math.abs(Math.sin(this.animationTime / 120)) * -4
        
        if (this.targetBed && (!this.targetBed.patient || this.targetBed.patient.isCured)) {
          this.targetBed.assignedDoctor = null
          this.targetBed = null
          this.state = 'idle'
          this.pickRandomTarget()
          break
        }
        
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
        
        if (!this.targetBed || !this.targetBed.patient || this.targetBed.patient.isCured) {
          if (this.targetBed) {
            this.targetBed.assignedDoctor = null
          }
          this.requiredItems = []
          this.receivedItems = []
          this.targetBed = null
          this.state = 'idle'
          this.pickRandomTarget()
          break
        }
        
        if (this.requiredItems.length === 0) {
          const itemCount = getDoctorItemCount(this.currentLevel)
          const usedIds = new Set()
          for (let i = 0; i < itemCount; i++) {
            let item = getRandomItem()
            while (usedIds.has(item.id)) {
              item = getRandomItem()
            }
            usedIds.add(item.id)
            this.requiredItems.push(item)
          }
          this.requiredItem = this.requiredItems[0]
        } else if (!this.hasReceivedAllItems()) {
          // 等待物品
        } else {
          this.targetBed.treatmentProgress += deltaTime / 2000
          if (this.targetBed.treatmentProgress >= 1) {
            this.targetBed.patient.isCured = true
            this.targetBed.assignedDoctor = null
            this.requiredItems = []
            this.receivedItems = []
            this.requiredItem = null
            this.hasReceivedItem = false
            this.targetBed = null
            this.state = 'idle'
            this.pickRandomTarget()
          }
        }
        break
    }
  }
  
  receiveItem(itemId) {
    if (this.state === 'treating' && this.isRequiredItem(itemId) && !this.checkItemReceived(itemId)) {
      this.receivedItems.push(itemId)
      this.hasReceivedItem = this.hasReceivedAllItems()
      return true
    }
    return false
  }
  
  isRequiredItem(itemId) {
    return this.requiredItems.some(item => item.id === itemId)
  }
  
  checkItemReceived(itemId) {
    return this.receivedItems.includes(itemId)
  }
  
  hasReceivedAllItems() {
    if (this.requiredItems.length === 0) return false
    return this.requiredItems.every(item => this.receivedItems.includes(item.id))
  }
  
  getRequiredItem() {
    if (this.state === 'treating' && this.requiredItems.length > 0) {
      for (const item of this.requiredItems) {
        if (!this.receivedItems.includes(item.id)) {
          return item
        }
      }
    }
    return null
  }
  
  getRequiredItemId() {
    const item = this.getRequiredItem()
    return item ? item.id : null
  }
  
  lockByPatient(patient) {
    this.isLocked = true
    this.lockedByPatient = patient
    this.state = 'idle'
    this.targetBed = null
    this.requiredItems = []
    this.receivedItems = []
  }
  
  unlockByPatient() {
    this.isLocked = false
    this.lockedByPatient = null
    this.state = 'idle'
    this.idleTime = 0
    this.pickRandomTarget()
  }
  
  getRequiredItemIds() {
    if (this.state === 'treating' && this.requiredItems.length > 0) {
      return this.requiredItems
        .filter(item => !this.receivedItems.includes(item.id))
        .map(item => item.id)
    }
    return []
  }
  
  getAllRequiredItems() {
    if (this.state === 'treating' && this.requiredItems.length > 0) {
      return this.requiredItems.filter(item => !this.receivedItems.includes(item.id))
    }
    return []
  }
  
  render(ctx) {
    const scale = this.width / this.baseWidth
    
    ctx.save()
    ctx.translate(this.x, this.y + this.bounceOffset)
    ctx.scale(this.facing, 1)
    
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.beginPath()
    ctx.ellipse(0, 28 * scale, 18 * scale, 6 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 根据状态选择图片
    const currentImage = this.state === 'treating' ? this.treatImage : this.idleImage
    
    if (currentImage && currentImage.width > 0) {
      // 使用图片
      const targetDisplayWidth = 75
      const imageScale = targetDisplayWidth / currentImage.width
      const drawWidth = currentImage.width * imageScale
      const drawHeight = currentImage.height * imageScale
      ctx.drawImage(currentImage, -drawWidth / 2, -drawHeight / 2 + 5, drawWidth, drawHeight)
    } else {
      // 图片未加载时显示简单图形（像护士一样）
      // 身体（圆形）
      ctx.fillStyle = this.id === 1 ? '#3498DB' : '#27AE60'
      ctx.beginPath()
      ctx.arc(0, 0, 25, 0, Math.PI * 2)
      ctx.fill()
      
      // 医生标识
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('👨‍⚕️', 0, 0)
    }
    
    // 锁定状态特效
    if (this.isLocked) {
      ctx.save()
      ctx.translate(0, -35)
      // 抵消之前的水平翻转，确保SOS文字不镜像
      ctx.scale(this.facing, 1)
      const bounceOffset = Math.sin(this.animationTime / 150) * 3
      
      ctx.fillStyle = 'rgba(231, 76, 60, 0.3)'
      ctx.beginPath()
      ctx.arc(0, bounceOffset, 22 * scale, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#E74C3C'
      ctx.font = `bold ${14 * scale}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('SOS', 0, bounceOffset)
      
      const pulseAlpha = 0.5 + Math.sin(this.animationTime / 200) * 0.3
      ctx.strokeStyle = `rgba(231, 76, 60, ${pulseAlpha})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, bounceOffset, 25 * scale, 0, Math.PI * 2)
      ctx.stroke()
      
      ctx.restore()
    }
    
    ctx.restore()
  }
  
  renderBubble(ctx) {
    const scale = this.width / this.baseWidth
    const requiredItems = this.getAllRequiredItems()
    
    if (this.state === 'treating' && requiredItems.length > 0) {
      const itemCount = requiredItems.length
      const itemSize = 36 * scale
      const padding = 8 * scale
      const gap = 6 * scale
      const bubbleWidth = itemCount * itemSize + (itemCount - 1) * gap + padding * 2
      const bubbleHeight = itemSize + padding * 2
      
      ctx.save()
      ctx.translate(this.x, this.y - 70 * scale)
      
      const bubbleColor = '#27AE60'
      
      ctx.fillStyle = '#FFF'
      fillRoundRect(ctx, -bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 12)
      ctx.strokeStyle = bubbleColor
      ctx.lineWidth = 4
      strokeRoundRect(ctx, -bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 12)
      
      ctx.fillStyle = bubbleColor
      ctx.beginPath()
      ctx.moveTo(-12, bubbleHeight/2)
      ctx.lineTo(0, bubbleHeight/2 + 12)
      ctx.lineTo(12, bubbleHeight/2)
      ctx.fill()
      ctx.strokeStyle = bubbleColor
      ctx.lineWidth = 2
      ctx.stroke()
      
      const startIconX = -(itemCount * itemSize + (itemCount - 1) * gap) / 2 + itemSize / 2
      requiredItems.forEach((item, index) => {
        const iconX = startIconX + index * (itemSize + gap)
        const itemImage = getItemImage(item.id)
        if (itemImage) {
          ctx.drawImage(itemImage, iconX - itemSize/2, -itemSize/2, itemSize, itemSize)
        } else {
          ctx.fillStyle = '#2C3E50'
          ctx.font = `${itemSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(item.icon, iconX, 0)
        }
      })
      
      ctx.restore()
    }
    
    if (this.state === 'treating' && this.hasReceivedAllItems() && this.targetBed) {
      ctx.save()
      ctx.translate(this.x, this.y - 55 * scale)
      
      const barW = 40 * scale
      const barH = 6 * scale
      
      ctx.fillStyle = '#E0E0E0'
      ctx.fillRect(-barW/2, -barH/2, barW, barH)
      
      ctx.fillStyle = '#27AE60'
      ctx.fillRect(-barW/2, -barH/2, barW * this.targetBed.treatmentProgress, barH)
      
      ctx.restore()
    }
  }
}
