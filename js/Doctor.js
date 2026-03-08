import { fillRoundRect, strokeRoundRect } from './utils.js'
import { getRandomItem, getItemById, getItemImage, isMedicine } from './Items.js'
import { getDoctorItemCount } from './GameConfig.js'

export default class Doctor {
  constructor(id, bedArea) {
    this.id = id
    this.bedArea = bedArea
    this.name = '白医生'
    
    // 位置和尺寸（动态计算，与病人一致）
    this.x = 0
    this.y = 0
    this.baseWidth = 28  // 基础宽度，用于计算缩放
    this.baseHeight = 45 // 基础高度
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
    
    // 加载两种状态的图片
    this.idleImage = null
    this.treatImage = null
    this.loadImages()
    
    this.pickRandomTarget()
  }

  loadImages() {
    // 根据医生ID确定图片文件名
    // 医生1: doctor_1_idle.png / doctor_1_treat.png
    // 医生2: doctor_2_idle.png / doctor_2_treat.png
    const idlePath = `images/doctor_${this.id}_idle.png`
    const treatPath = `images/doctor_${this.id}_treat.png`
    
    // 加载空闲状态图片
    const idleImg = wx.createImage()
    idleImg.onload = () => {
      this.idleImage = idleImg
    }
    idleImg.onerror = () => {
      console.warn(`Failed to load doctor idle image: ${idlePath}`)
    }
    idleImg.src = idlePath
    
    // 加载治疗状态图片
    const treatImg = wx.createImage()
    treatImg.onload = () => {
      this.treatImage = treatImg
    }
    treatImg.onerror = () => {
      console.warn(`Failed to load doctor treat image: ${treatPath}`)
    }
    treatImg.src = treatPath
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
        
        // 立即检查是否有病人需要治疗（优先级最高）
        const occupiedBeds = bedArea.getOccupiedBeds()
        const needsTreatment = occupiedBeds.find(bed => 
          bed.patient && !bed.patient.isCured && bed.treatmentProgress < 1 && !bed.assignedDoctor
        )
        
        // 如果有病人需要治疗，立即前往（无需等待）
        if (needsTreatment && !this.targetBed) {
          needsTreatment.assignedDoctor = this
          this.assignToBed(needsTreatment)
          this.idleTime = 0
        } else if (this.idleTime > 1500 + Math.random() * 1000) {
          // 没有病人时，短暂休息后继续巡逻
          this.pickRandomTarget()
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
          // 从 GameConfig.js 获取
          const itemCount = getDoctorItemCount(this.currentLevel)
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
    const scale = this.width / this.baseWidth
    
    ctx.save()
    ctx.translate(this.x, this.y + this.bounceOffset)
    ctx.scale(this.facing, 1)
    
    // 阴影（动态）
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.beginPath()
    ctx.ellipse(0, 28 * scale, 18 * scale, 6 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 根据状态选择图片
    const currentImage = this.state === 'treating' ? this.treatImage : this.idleImage
    
    if (currentImage && currentImage.width > 0) {
      // 使用图片绘制医生
      const targetDisplayWidth = 75 // 医生显示宽度（像素），调整此值改变医生大小
      const imageScale = targetDisplayWidth / currentImage.width
      const drawWidth = currentImage.width * imageScale
      const drawHeight = currentImage.height * imageScale
      ctx.drawImage(currentImage, -drawWidth / 2, -drawHeight / 2 + 5, drawWidth, drawHeight)
    }
    
    ctx.restore()
  }
  
  // 单独渲染气泡（在所有病人渲染完成后调用，确保气泡在最上层）
  renderBubble(ctx) {
    // 根据基础尺寸计算缩放比例
    const scale = this.width / this.baseWidth
    
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
      
      // 泡泡边缘统一使用绿色
      const bubbleColor = '#27AE60'
      
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
          ctx.font = `${itemSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
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
