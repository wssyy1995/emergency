import { fillRoundRect, strokeRoundRect } from './utils.js'
import { getRandomItem, getItemById, getItemImage, isMedicine } from './Items.js'

export default class Doctor {
  constructor(id, bedArea) {
    this.id = id
    this.bedArea = bedArea
    this.name = '白医生'
    
    // 位置和尺寸（动态计算，与病人一致）
    this.x = 0
    this.y = 0
    this.width = 21
    this.height = 33.75
    
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
    
    // 治疗流程相关
    this.requiredItems = [] // 需要的物品数组 [{id, name, icon, color}, ...]
    this.receivedItems = [] // 已收到的物品ID数组
    this.currentLevel = 0 // 当前关卡，用于决定申请物品数量
    
    // 兼容旧代码的别名
    this.requiredItem = null
    this.hasReceivedItem = false
    
    // 外观差异
    this.hairColor = '#5D4037' // 默认深棕色
    this.eyeSizeX = 4 // 眼睛横向大小
    this.eyeSizeY = 5 // 眼睛纵向大小
    
    this.pickRandomTarget()
  }

  pickRandomTarget() {
    // 只在走道区域行走（不能在床的上方）
    const walkableAreas = this.bedArea.getWalkableAreas()
    if (walkableAreas.length > 0) {
      // 随机选择一个走道区域
      const area = walkableAreas[Math.floor(Math.random() * walkableAreas.length)]
      // 在该走道区域内随机选择目标点
      const margin = 10
      this.targetX = area.x + margin + Math.random() * (area.width - margin * 2)
      this.targetY = area.y + margin + Math.random() * (area.height - margin * 2)
    } else {
      // 如果没有走道区域，则在治疗区边缘移动
      const margin = 20
      const side = Math.floor(Math.random() * 4)
      switch(side) {
        case 0: // 上边
          this.targetX = this.bedArea.x + margin + Math.random() * (this.bedArea.width - margin * 2)
          this.targetY = this.bedArea.y + margin
          break
        case 1: // 右边
          this.targetX = this.bedArea.x + this.bedArea.width - margin
          this.targetY = this.bedArea.y + margin + Math.random() * (this.bedArea.height - margin * 2)
          break
        case 2: // 下边
          this.targetX = this.bedArea.x + margin + Math.random() * (this.bedArea.width - margin * 2)
          this.targetY = this.bedArea.y + this.bedArea.height - margin
          break
        case 3: // 左边
          this.targetX = this.bedArea.x + margin
          this.targetY = this.bedArea.y + margin + Math.random() * (this.bedArea.height - margin * 2)
          break
      }
    }
    this.state = 'moving'
  }

  assignToBed(bed) {
    this.targetBed = bed
    // 走到病床旁边的走道区域，不能踩在病床上方
    this.targetX = this.getWalkablePointNearBed(bed).x
    this.targetY = this.getWalkablePointNearBed(bed).y
    this.state = 'moving'
  }

  // 获取病床旁边靠墙侧的走道点（医生必须走到病床和墙壁之间）
  getWalkablePointNearBed(bed) {
    // 根据床的ID确定走到哪一侧
    // 0号床（左上）：走到床和左墙之间
    // 1号床（右上）：走到床和右墙之间
    // 2号床（左下）：走到床和左墙之间
    // 3号床（右下）：走到床和右墙之间
    
    if (bed.id === 0 || bed.id === 2) {
      // 左列的床（0号和2号）：走到床和左墙之间
      return {
        x: bed.x - 15,
        y: bed.y + bed.height / 2
      }
    } else {
      // 右列的床（1号和3号）：走到床和右墙之间
      return {
        x: bed.x + bed.width + 15,
        y: bed.y + bed.height / 2
      }
    }
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
          // 只寻找未被分配医生的病床
          const needsTreatment = occupiedBeds.find(bed => 
            bed.patient && !bed.patient.isCured && bed.treatmentProgress < 1 && !bed.assignedDoctor
          )
          
          if (needsTreatment && !this.targetBed && Math.random() > 0.4) {
            // 标记病床已被分配
            needsTreatment.assignedDoctor = this
            this.assignToBed(needsTreatment)
          } else {
            this.pickRandomTarget()
          }
          this.idleTime = 0
        }
        break
        
      case 'moving':
        this.bounceOffset = Math.abs(Math.sin(this.animationTime / 120)) * -4
        
        // 如果正在前往病床，检查病床是否还有效
        if (this.targetBed && (!this.targetBed.patient || this.targetBed.patient.isCured)) {
          // 病床无效，取消前往
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
        
        // 检查病床是否还有效（有病人且未治愈）
        if (!this.targetBed || !this.targetBed.patient || this.targetBed.patient.isCured) {
          // 病床无效，回到空闲状态
          if (this.targetBed) {
            this.targetBed.assignedDoctor = null
          }
          this.requiredItems = []
          this.receivedItems = []
          this.requiredItem = null
          this.hasReceivedItem = false
          this.targetBed = null
          this.state = 'idle'
          this.pickRandomTarget()
          break
        }
        
        // 治疗流程
        if (this.requiredItems.length === 0) {
          // 第一步：医生刚到达，根据关卡决定申请物品数量
          // 第0关: 1个物品, 第1关: 2个物品
          const itemCount = this.currentLevel >= 1 ? 2 : 1
          const usedIds = new Set()
          for (let i = 0; i < itemCount; i++) {
            let item = getRandomItem()
            // 避免重复
            while (usedIds.has(item.id)) {
              item = getRandomItem()
            }
            usedIds.add(item.id)
            this.requiredItems.push(item)
          }
          // 兼容旧代码
          this.requiredItem = this.requiredItems[0]
        } else if (!this.hasReceivedAllItems()) {
          // 第二步：等待用户配送物品
          // 这里不做处理，等待Game类中的配送逻辑
        } else {
          // 第三步：收到物品后，直接开始治疗，2秒后完成
          this.targetBed.treatmentProgress += deltaTime / 2000 // 2秒完成治疗
          
          // 治疗完成
          if (this.targetBed.treatmentProgress >= 1) {
            this.targetBed.patient.isCured = true
            // 清除病床的分配标记
            this.targetBed.assignedDoctor = null
            // 重置医生状态
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

  // 医生接收物品
  receiveItem(itemId) {
    // 检查是否是需要且未收到的物品
    if (this.state === 'treating' && this.isRequiredItem(itemId) && !this.checkItemReceived(itemId)) {
      this.receivedItems.push(itemId)
      // 更新兼容属性
      this.hasReceivedItem = this.hasReceivedAllItems()
      return true
    }
    return false
  }

  // 检查是否是需要且未收到的物品
  isRequiredItem(itemId) {
    return this.requiredItems.some(item => item.id === itemId)
  }

  // 检查物品是否已收到
  checkItemReceived(itemId) {
    return this.receivedItems.includes(itemId)
  }

  // 是否已收到所有物品
  hasReceivedAllItems() {
    if (this.requiredItems.length === 0) return false
    return this.requiredItems.every(item => this.receivedItems.includes(item.id))
  }

  // 获取医生当前需要的物品（第一个未收到的）
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
  
  // 获取需要的物品ID（第一个未收到的）
  getRequiredItemId() {
    const item = this.getRequiredItem()
    return item ? item.id : null
  }

  // 获取所有需要的物品ID
  getRequiredItemIds() {
    if (this.state === 'treating' && this.requiredItems.length > 0) {
      return this.requiredItems
        .filter(item => !this.receivedItems.includes(item.id))
        .map(item => item.id)
    }
    return []
  }

  // 获取所有需要的物品（未收到的）
  getAllRequiredItems() {
    if (this.state === 'treating' && this.requiredItems.length > 0) {
      return this.requiredItems.filter(item => !this.receivedItems.includes(item.id))
    }
    return []
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
    ctx.fillStyle = this.hairColor
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
      ctx.ellipse(-6 * scale, -16 * scale, this.eyeSizeX * scale, this.eyeSizeY * scale, 0, 0, Math.PI * 2)
      ctx.ellipse(6 * scale, -16 * scale, this.eyeSizeX * scale, this.eyeSizeY * scale, 0, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.arc(-4 * scale, -18 * scale, 1.5 * scale, 0, Math.PI * 2)
      ctx.arc(8 * scale, -18 * scale, 1.5 * scale, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
    
    // 显示需要的物品（大泡泡 - 所有物品在同一个气泡中）
    const requiredItems = this.getAllRequiredItems()
    if (this.state === 'treating' && requiredItems.length > 0) {
      const itemCount = requiredItems.length
      const itemSize = 36 * scale
      const padding = 8 * scale
      const gap = 6 * scale
      const bubbleWidth = itemCount * itemSize + (itemCount - 1) * gap + padding * 2
      const bubbleHeight = itemSize + padding * 2
      const bubbleX = this.x - bubbleWidth / 2
      const bubbleY = this.y - 70 * scale - bubbleHeight / 2
      
      ctx.save()
      ctx.translate(this.x, this.y - 70 * scale)
      
      // 泡泡边缘统一使用红色
      const bubbleColor = '#E74C3C'
      
      // 泡泡背景（根据物品数量调整宽度）
      ctx.fillStyle = '#FFF'
      fillRoundRect(ctx, -bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 12)
      ctx.strokeStyle = bubbleColor
      ctx.lineWidth = 4
      strokeRoundRect(ctx, -bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 12)
      
      // 小三角形指向医生
      ctx.fillStyle = bubbleColor
      ctx.beginPath()
      ctx.moveTo(-12, bubbleHeight/2)
      ctx.lineTo(0, bubbleHeight/2 + 12)
      ctx.lineTo(12, bubbleHeight/2)
      ctx.fill()
      ctx.strokeStyle = bubbleColor
      ctx.lineWidth = 2
      ctx.stroke()
      
      // 绘制所有物品图标（水平排列在同一个气泡中）
      const startIconX = -(itemCount * itemSize + (itemCount - 1) * gap) / 2 + itemSize / 2
      requiredItems.forEach((item, index) => {
        const iconX = startIconX + index * (itemSize + gap)
        
        const itemImage = getItemImage(item.id)
        if (itemImage) {
          ctx.drawImage(itemImage, iconX - itemSize/2, -itemSize/2, itemSize, itemSize)
        } else {
          ctx.fillStyle = '#2C3E50'
          ctx.font = `${itemSize}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(item.icon, iconX, 0)
        }
      })
      
      ctx.restore()
    }
    
    // 显示治疗进度条（收到所有物品后开始显示）
    if (this.state === 'treating' && this.hasReceivedAllItems() && this.targetBed) {
      ctx.save()
      ctx.translate(this.x, this.y - 55 * scale)
      
      const barW = 40 * scale
      const barH = 6 * scale
      
      // 背景
      ctx.fillStyle = '#E0E0E0'
      ctx.fillRect(-barW/2, -barH/2, barW, barH)
      
      // 进度
      ctx.fillStyle = '#27AE60'
      ctx.fillRect(-barW/2, -barH/2, barW * this.targetBed.treatmentProgress, barH)
      
      ctx.restore()
    }
  }

}
