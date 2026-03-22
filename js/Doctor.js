// 简化版医生 - 像护士一样直接使用，不依赖复杂的走道计算
import { fillRoundRect, strokeRoundRect } from './utils.js'
import { getRandomItem, getItemById, getItemImage, isMedicine } from './Items.js'
import { getDoctorItemCount, getTreatTimeByDisease } from './GameConfig.js'

// ==================== 全局医生图片缓存 ====================
const DoctorImageCache = {
  // 空闲状态图片缓存: { doctorId: image }
  idleImages: {},
  // 治疗状态图片缓存: { doctorId: image }
  treatImages: {},
  // 治疗中图标缓存
  curingImage: null,
  
  // 获取治疗中图标
  getCuringImage() {
    if (!this.curingImage) {
      const img = wx.createImage()
      img.onload = () => {
        this.curingImage = img
      }
      img.onerror = () => {
        console.warn('Failed to load curing image: images/curing.png')
      }
      img.src = 'images/curing.png'
      this.curingImage = img
    }
    return this.curingImage
  },
  
  // 获取空闲状态图片
  getIdleImage(doctorId) {
    if (!this.idleImages[doctorId]) {
      const img = wx.createImage()
      img.onload = () => {
        this.idleImages[doctorId] = img
      }
      img.onerror = () => {
        console.warn(`Failed to load doctor idle image: images/doctor_${doctorId}_idle.png`)
      }
      img.src = `images/doctor_${doctorId}_idle.png`
      this.idleImages[doctorId] = img
    }
    return this.idleImages[doctorId]
  },
  
  // 获取治疗状态图片
  getTreatImage(doctorId) {
    if (!this.treatImages[doctorId]) {
      const img = wx.createImage()
      img.onload = () => {
        this.treatImages[doctorId] = img
      }
      img.onerror = () => {
        console.warn(`Failed to load doctor treat image: images/doctor_${doctorId}_treat.png`)
      }
      img.src = `images/doctor_${doctorId}_treat.png`
      this.treatImages[doctorId] = img
    }
    return this.treatImages[doctorId]
  }
}

export default class Doctor {
  constructor(id, bedArea) {
    this.id = id
    this.bedArea = bedArea
    this.name = id === 1 ? '白医生' : '绿医生'
    
    // 固定位置在治疗区（像护士一样固定位置）
    // 医生1在左上，医生2在右下
    if (bedArea) {
      this.x = bedArea.x + bedArea.width * (id === 1 ? 0.25 : 0.75)
      this.y = bedArea.y + bedArea.height * 0.5 - 15
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
    
    // 动画控制：第一个病人生成前暂停动画
    this.animationEnabled = false
    
    this.treatAnimation = 0
    this.blinkTimer = 0
    this.isBlinking = false
    
    this.requiredItems = []
    this.receivedItems = []
    this.currentLevel = 0
    
    this.isLocked = false
    this.lockedByPatient = null
    
    // 【升级系统】当前升级ID
    this.currentUpgradeId = null
    this.upgradedIdleImage = null
    this.upgradedTreatImage = null
    
    // 加载图片
    // 从全局缓存获取图片
    this.idleImage = DoctorImageCache.getIdleImage(this.id)
    this.treatImage = DoctorImageCache.getTreatImage(this.id)
    this.curingImage = DoctorImageCache.getCuringImage()
  }
  
  pickRandomTarget() {
    // 没有病人时，站在治疗区中心点，不乱走
    if (this.bedArea) {
      // 医生1和医生2分别站在中心点的左右两侧，避免重叠
      const offsetX = this.id === 1 ? -30 : 30
      this.targetX = this.bedArea.x + this.bedArea.width / 2 + offsetX
      this.targetY = this.bedArea.y + this.bedArea.height / 2 - 15
      this.state = 'moving'
    }
  }
  
  assignToBed(bed) {
    this.targetBed = bed
    if (bed.id === 0 || bed.id === 2) {
      this.targetX = bed.x + 8
      this.targetY = bed.y + bed.height / 2
    } else {
      this.targetX = bed.x + bed.width - 8
      this.targetY = bed.y + bed.height / 2
    }
    this.state = 'moving'
  }
  
  getWalkablePointNearBed(bed) {
    if (bed.id === 0 || bed.id === 2) {
      return { x: bed.x - 1, y: bed.y + bed.height / 2 }
    } else {
      return { x: bed.x + bed.width + 1, y: bed.y + bed.height / 2 }
    }
  }
  
  update(deltaTime, bedArea) {
    this.animationTime += deltaTime
    
    // 只有启用动画时才计算跳动效果
    if (!this.animationEnabled) {
      this.bounceOffset = 0
    } else if (this.isLocked) {
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
        // 待机时缓慢上下跃动（跟护士一样）
        if (this.animationEnabled) {
          this.bounceOffset = Math.sin(this.animationTime / 500) * -2
        }
        
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
        if (this.animationEnabled) {
          this.bounceOffset = Math.abs(Math.sin(this.animationTime / 120)) * -4
        }
        
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
        this.bounceOffset = 0  // 去掉申请物品时的上下跳动
        
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
        } else if (this.targetBed.patient.requiredMachineId && !this.targetBed.patient.machineCheckComplete) {
          // 病人申请了设备且检查未完成，等待设备检查完成
        } else {
          // 病人未申请设备，或设备检查完成，开始自动治疗
          const treatTime = getTreatTimeByDisease(this.targetBed.patient.condition.name)
          this.targetBed.treatmentProgress += deltaTime / treatTime
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
  
  // 启用动画（第一个病人生成后调用）
  enableAnimation() {
    this.animationEnabled = true
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
    
    // 根据状态选择图片（支持升级）
    const currentImage = this.state === 'treating' ? this.getCurrentTreatImage() : this.getCurrentIdleImage()
    
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
      const padding = 10 * scale
      const gap = 8 * scale
      const bubbleWidth = itemCount * itemSize + (itemCount - 1) * gap + padding * 2
      const bubbleHeight = itemSize + padding * 2
      
      ctx.save()
      
      // 呼吸动效：1.5秒周期，缩放 0.92 ~ 1.08（更明显）
      const breathScale = 1 + Math.sin(this.animationTime / 250) * 0.08
      ctx.translate(this.x, this.y - 75 * scale)
      ctx.scale(breathScale, breathScale)
      
      // 柔和阴影
      ctx.shadowColor = 'rgba(34, 166, 89, 0.25)'
      ctx.shadowBlur = 24 * scale
      ctx.shadowOffsetY = 8 * scale
      
      // 白色背景气泡（圆角更大，类似 rounded-3xl）
      ctx.fillStyle = '#FFF'
      fillRoundRect(ctx, -bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 16 * scale)
      
      // 重置阴影
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      
      // 气泡尾巴（白色，向下指）
      const tailWidth = 14 * scale
      const tailHeight = 10 * scale
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.moveTo(-tailWidth/2, bubbleHeight/2 - 1)  // 左下
      ctx.lineTo(tailWidth/2, bubbleHeight/2 - 1)   // 右下
      ctx.lineTo(0, bubbleHeight/2 + tailHeight)    // 顶点向下
      ctx.closePath()
      ctx.fill()
      
      // 绘制物品图标
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
      const barH = 8 * scale
      const radius = barH / 2  // 圆角半径为高度的一半，形成圆润的胶囊形状
      
      // 进度条背景（灰色圆角）
      ctx.fillStyle = '#E0E0E0'
      fillRoundRect(ctx, -barW/2, -barH/2, barW, barH, radius)
      
      // 蓝色进度条（圆角）
      ctx.fillStyle = '#3498DB'
      const progressWidth = barW * this.targetBed.treatmentProgress
      if (progressWidth > 0) {
        fillRoundRect(ctx, -barW/2, -barH/2, progressWidth, barH, radius)
      }
      
      // 绘制治疗中图标（在进度条左侧）
      if (this.curingImage && this.curingImage.width > 0) {
        const iconSize = 18 * scale
        ctx.drawImage(this.curingImage, -barW / 2 - iconSize - 3 * scale, -iconSize / 2, iconSize, iconSize)
      }
      
      ctx.restore()
    }
  }
  
  // 【升级系统】设置升级
  setUpgrade(upgradeId) {
    if (this.currentUpgradeId === upgradeId) return
    
    this.currentUpgradeId = upgradeId
    
    // 如果有升级，加载对应的升级图片
    if (upgradeId) {
      // 加载空闲图片
      const idleImg = wx.createImage()
      idleImg.onload = () => {
        this.upgradedIdleImage = idleImg
        console.log('[医生升级] 加载空闲图片成功:', upgradeId)
      }
      idleImg.onerror = () => {
        console.warn('[医生升级] 加载空闲图片失败:', upgradeId)
        this.upgradedIdleImage = null
      }
      // 所有医生使用相同的升级图片（简化处理）
      idleImg.src = `images/doctor_pro_${upgradeId}.png`
      
      // 加载治疗图片（使用相同图片）
      const treatImg = wx.createImage()
      treatImg.onload = () => {
        this.upgradedTreatImage = treatImg
      }
      treatImg.src = `images/doctor_pro_${upgradeId}.png`
    } else {
      // 未升级状态，使用默认图片
      this.upgradedIdleImage = null
      this.upgradedTreatImage = null
    }
    
    console.log('[医生升级] 设置升级:', upgradeId)
  }
  
  // 【升级系统】获取当前空闲图片
  getCurrentIdleImage() {
    if (this.upgradedIdleImage) {
      return this.upgradedIdleImage
    }
    return this.idleImage
  }
  
  // 【升级系统】获取当前治疗图片
  getCurrentTreatImage() {
    if (this.upgradedTreatImage) {
      return this.upgradedTreatImage
    }
    return this.treatImage
  }
}
