import WaitingArea from './WaitingArea.js'
import BedArea from './BedArea.js'
import EquipmentRoom from './EquipmentRoom.js'
import Patient from './Patient.js'
import Doctor from './Doctor.js'
import { fillRoundRect, strokeRoundRect } from './utils.js'
import { getItemById, getItemImage, preloadItemImages, preloadAreaIcons, getAreaIcon, AREA_ICONS } from './Items.js'

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
    
    // 拖动物品相关
    this.draggedItem = null // 当前拖动的物品对象 {id, name, icon, color}
    this.draggedItemPos = { x: 0, y: 0 }
    
    // 图标图片
    this.honorImage = null
    this.heartImage = null
    this.loadIcons()
    
    // 浮动文字动画
    this.floatingTexts = []
    
    this.initTouch()
  }

  loadIcons() {
    // 加载荣誉点图标
    const honorImg = wx.createImage()
    honorImg.onload = () => {
      this.honorImage = honorImg
    }
    honorImg.src = 'images/honor.png'
    
    // 加载爱心图标
    const heartImg = wx.createImage()
    heartImg.onload = () => {
      this.heartImage = heartImg
    }
    heartImg.src = 'images/heart.png'
  }

  // 添加浮动文字
  addFloatingText(text, x, y, color) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      opacity: 1,
      offsetY: 0,
      life: 1000 // 1秒动画
    })
  }

  // 更新浮动文字
  updateFloatingTexts(deltaTime) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]
      ft.life -= deltaTime
      ft.offsetY -= 0.05 * deltaTime // 向上飘
      ft.opacity = ft.life / 1000
      
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1)
      }
    }
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
    this.bedArea = new BedArea(bedX, availableY, bedWidth, availableHeight, 4)
    
    // 器材室（右侧）- 更窄
    const equipmentX = bedX + bedWidth + gap
    this.equipmentRoom = new EquipmentRoom(equipmentX, availableY, equipmentWidth, availableHeight)
  }

  createDoctors(count) {
    // 获取走道区域
    const walkableAreas = this.bedArea.getWalkableAreas()
    
    // 医生外观配置
    const doctorStyles = [
      { hairColor: '#2C3E50', eyeSizeX: 3.5, eyeSizeY: 4.5 }, // 1号医生：黑发，小眼睛
      { hairColor: '#8B4513', eyeSizeX: 4.5, eyeSizeY: 5.5 }  // 2号医生：棕发，大眼睛
    ]
    
    for (let i = 0; i < count; i++) {
      const doctor = new Doctor(this.doctorIdCounter++, this.bedArea)
      
      // 设置外观差异
      const style = doctorStyles[i % doctorStyles.length]
      doctor.hairColor = style.hairColor
      doctor.eyeSizeX = style.eyeSizeX
      doctor.eyeSizeY = style.eyeSizeY
      
      // 将医生放在走道区域
      if (walkableAreas.length > 0) {
        const area = walkableAreas[i % walkableAreas.length]
        doctor.x = area.x + area.width / 2
        doctor.y = area.y + area.height / 2
      } else {
        doctor.x = this.bedArea.x + this.bedArea.width * 0.5
        doctor.y = this.bedArea.y + this.bedArea.height * 0.5
      }
      this.doctors.push(doctor)
    }
  }

  start() {
    this.isRunning = true
    
    // 预加载物品图片和区域图标
    preloadItemImages(() => {
      console.log('所有物品图片加载完成')
    })
    preloadAreaIcons(() => {
      console.log('所有区域图标加载完成')
    })
    
    this.loop(0)
    
    this.timeTimer = setInterval(() => {
      this.gameTime++
    }, 1000)
    
    // 初始渐入：每隔3秒从左侧进来一个病人，直到有4个
    let initialSpawnCount = 0
    this.initialSpawnTimer = setInterval(() => {
      if (initialSpawnCount < 4) {
        this.spawnPatientFromLeft()
        initialSpawnCount++
      } else {
        clearInterval(this.initialSpawnTimer)
      }
    }, 3000)
    
    // 定时补充病人（当人数少于8时，随机发型）
    this.spawnTimer = setInterval(() => {
      if (this.waitingArea.patients.length < 8 && Math.random() > 0.3) {
        this.spawnPatientFromLeft()
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
    
    // 更新浮动文字
    this.updateFloatingTexts(deltaTime)
    
    this.waitingArea.patients.forEach(patient => patient.update(deltaTime))
    this.bedArea.getOccupiedBeds().forEach(bed => {
      if (bed.patient) {
        bed.patient.update(deltaTime)
        // 治疗完成后病人自行离开
        if (bed.patient.isCured) {
          // 增加分数（只加一次）
          if (!bed.scoreAdded) {
            const addedScore = 10 + Math.floor(Math.random() * 20)
            this.score += addedScore
            this.treatedCount++
            bed.scoreAdded = true
            
            // 添加浮动文字动画
            this.addFloatingText(`+${addedScore}`, bed.x + bed.width / 2, bed.y, '#FFD700')
            this.addFloatingText('+❤️', bed.x + bed.width / 2, bed.y - 30, '#E74C3C')
          }
          // 清理病床，病人离开
          if (!bed.leaveTimer) {
            bed.leaveTimer = setTimeout(() => {
              bed.clear()
              bed.leaveTimer = null
              bed.scoreAdded = false
            }, 1000)
          }
        }
      }
    })
    
    this.waitingArea.patients.forEach(patient => {
      patient.patience -= deltaTime / 1000
      // 耐心归零且未开始离开流程
      if (patient.patience <= 0 && !patient.isLeaving && !patient.tomatoThrown) {
        patient.isAngry = true
        // 计算前台位置（护士台前方）
        const frontDeskX = this.waitingArea.x + this.waitingArea.width / 2
        const frontDeskY = this.waitingArea.y + this.waitingArea.height * 0.35
        patient.startLeaving(frontDeskX, frontDeskY)
        // 爱心减1（生命值减少）
        this.treatedCount = Math.max(0, this.treatedCount - 1)
      }
    })
    
    // 清理已经离开的愤怒病人
    const angryPatients = this.waitingArea.patients.filter(p => p.shouldRemove)
    angryPatients.forEach(patient => {
      this.waitingArea.removePatient(patient)
    })
  }

  spawnPatient() {
    this.spawnPatientFromLeft()
  }

  // 从左侧走进来的病人生成
  spawnPatientFromLeft() {
    if (this.waitingArea.patients.length >= 8) return
    
    const patient = new Patient(this.patientIdCounter++)
    
    // 初始位置在等候区左侧外面
    patient.x = this.waitingArea.x - 50
    patient.y = this.waitingArea.y + this.waitingArea.height * 0.5
    patient.targetX = patient.x
    patient.targetY = patient.y
    
    // 先添加到等候区
    this.waitingArea.addPatient(patient)
    
    // 然后让病人走到等候区内的目标位置
    setTimeout(() => {
      const emptySeat = this.waitingArea.seats.find(seat => seat.patient === patient)
      const emptyQueue = this.waitingArea.queuePositions.find(q => q.patient === patient)
      
      if (emptySeat) {
        patient.moveTo(
          emptySeat.x + (emptySeat.width - patient.width) / 2,
          emptySeat.y - patient.height * 0.2
        )
      } else if (emptyQueue) {
        patient.moveTo(emptyQueue.x - patient.width / 2, emptyQueue.y - patient.height)
      }
    }, 100)
  }

  spawnPatientWithHairStyle(hairStyle) {
    if (this.waitingArea.patients.length >= 8) return
    
    const patient = new Patient(this.patientIdCounter++)
    // 强制设置发型
    patient.hairStyle = hairStyle
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
    this.renderFloatingTexts()
    
    this.ctx.restore()
  }

  renderFloatingTexts() {
    const ctx = this.ctx
    ctx.save()
    
    this.floatingTexts.forEach(ft => {
      ctx.globalAlpha = ft.opacity
      ctx.fillStyle = ft.color
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // 添加阴影效果
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      
      ctx.fillText(ft.text, ft.x, ft.y + ft.offsetY)
      
      // 重置阴影
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    })
    
    ctx.restore()
  }

  renderMapBackground() {
    const ctx = this.ctx
    
    // 外边框
    ctx.fillStyle = '#FFB7B2'
    ctx.fillRect(this.mapX, this.mapY, this.mapWidth, this.mapHeight)
    
    // 内部地板
    ctx.fillStyle = '#FFE4E1'
    ctx.fillRect(this.mapX + 5, this.mapY + 5, this.mapWidth - 10, this.mapHeight - 10)
    
    // 等候区背景（浅蓝色）
    ctx.fillStyle = 'rgba(230, 243, 255, 0.7)'
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
    ctx.fillStyle = 'rgba(245, 245, 245, 0.5)'
    fillRoundRect(ctx, this.equipmentRoom.x, this.equipmentRoom.y, this.equipmentRoom.width, this.equipmentRoom.height, 15)
    ctx.strokeStyle = '#CCCCCC'
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
    
    // 渲染拖动的物品
    if (this.draggedItem) {
      const ctx = this.ctx
      ctx.save()
      
      const item = this.draggedItem
      
      // 绘制物品图标（优先使用图片）
      const itemImage = getItemImage(item.id)
      if (itemImage) {
        const imgSize = 36
        ctx.drawImage(itemImage, this.draggedItemPos.x - imgSize/2, this.draggedItemPos.y - imgSize/2, imgSize, imgSize)
      } else {
        ctx.fillStyle = '#2C3E50'
        ctx.font = '28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(item.icon, this.draggedItemPos.x, this.draggedItemPos.y)
      }
      
      ctx.restore()
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
    
    const statsX = this.mapX + this.mapWidth - 180
    
    // 荣誉点图标 + 数值
    if (this.honorImage) {
      ctx.drawImage(this.honorImage, statsX, this.mapY + 18, 20, 20)
    }
    ctx.fillStyle = '#FFF'
    ctx.fillText(`${this.score}`, statsX + 28, this.mapY + 28)
    
    // 爱心图标 + 数值
    if (this.heartImage) {
      ctx.drawImage(this.heartImage, statsX + 60, this.mapY + 18, 20, 20)
      ctx.fillText(`${this.treatedCount}`, statsX + 88, this.mapY + 28)
    } else {
      ctx.fillText(`❤️ ${this.treatedCount}`, statsX + 80, this.mapY + 28)
    }
    
    // 区域标题
    const titleY = this.mapY + 75
    const titleFontSize = Math.max(12, this.screenWidth * 0.018)
    ctx.font = `bold ${titleFontSize}px sans-serif`
    ctx.textBaseline = 'middle'
    
    // 等候区标题
    const waitingText = `等候区 (${this.waitingArea.patients.length}/8)`
    const waitingX = this.waitingArea.x + this.waitingArea.width / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = '#3498DB'
    ctx.fillText(waitingText, waitingX + 6, titleY)
    this.renderAreaIcon(ctx, 'waiting', waitingX - ctx.measureText(waitingText).width / 2 - 4, titleY, 18)
    
    // 治疗区标题
    const treatmentText = '治疗区'
    const treatmentX = this.bedArea.x + this.bedArea.width / 2
    ctx.fillStyle = '#27AE60'
    ctx.fillText(treatmentText, treatmentX + 6, titleY)
    this.renderAreaIcon(ctx, 'treatment', treatmentX - ctx.measureText(treatmentText).width / 2 - 4, titleY, 18)
    
    // 器材室标题
    const equipmentText = '器材室'
    const equipmentX = this.equipmentRoom.x + this.equipmentRoom.width / 2
    ctx.fillStyle = '#333333'
    ctx.fillText(equipmentText, equipmentX + 6, titleY)
    this.renderAreaIcon(ctx, 'equipment', equipmentX - ctx.measureText(equipmentText).width / 2 - 4, titleY, 18)
  }

  // 渲染区域图标
  renderAreaIcon(ctx, areaId, x, y, size) {
    const iconImage = getAreaIcon(areaId)
    if (iconImage) {
      ctx.drawImage(iconImage, x - size/2, y - size/2, size, size)
    } else {
      // 使用emoji回退
      const emojiMap = {
        'waiting': '🪑',
        'treatment': '🛏️',
        'equipment': '🏥'
      }
      ctx.font = `${size}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emojiMap[areaId] || '', x, y)
    }
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
      
      // 检查是否点击器材室的物品
      const itemId = this.equipmentRoom.getItemAt(x, y)
      if (itemId) {
        const item = getItemById(itemId)
        if (item) {
          this.draggedItem = item
          this.draggedItemPos.x = x
          this.draggedItemPos.y = y
        }
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
      
      if (this.draggedItem) {
        const touch = e.touches[0]
        this.draggedItemPos.x = touch.clientX
        this.draggedItemPos.y = touch.clientY
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
      
      // 处理拖动物品给医生
      if (this.draggedItem) {
        const x = this.draggedItemPos.x
        const y = this.draggedItemPos.y
        
        // 查找附近的医生
        let targetDoctor = null
        for (const doctor of this.doctors) {
          const dist = Math.hypot(doctor.x - x, doctor.y - y)
          if (dist < 50) { // 50像素范围内
            targetDoctor = doctor
            break
          }
        }
        
        // 如果找到医生，尝试给医生物品
        if (targetDoctor && targetDoctor.receiveItem(this.draggedItem.id)) {
          // 成功给医生物品
          console.log(`给了医生 ${this.draggedItem.name}`)
        }
        
        this.draggedItem = null
      }
    })
  }

  notifyDoctors(bed) {
    // 如果病床已经被分配给某个医生，或者病人已被治愈，不再通知
    if (bed.assignedDoctor || !bed.patient || bed.patient.isCured) {
      return
    }
    
    let nearestDoctor = null
    let minDist = Infinity
    
    this.doctors.forEach(doctor => {
      // 医生必须处于空闲状态，且没有其他目标病床
      if (doctor.state === 'idle' && !doctor.targetBed) {
        const dist = Math.hypot(doctor.x - bed.x, doctor.y - bed.y)
        if (dist < minDist) {
          minDist = dist
          nearestDoctor = doctor
        }
      }
    })
    
    if (nearestDoctor) {
      bed.assignedDoctor = nearestDoctor
      nearestDoctor.assignToBed(bed)
    }
  }

  reset() {
    wx.showModal({
      title: '重新开始',
      content: '要重新开始游戏吗？',
      success: (res) => {
        if (res.confirm) {
          // 清理所有定时器
          clearInterval(this.timeTimer)
          clearInterval(this.spawnTimer)
          if (this.initialSpawnTimer) {
            clearInterval(this.initialSpawnTimer)
          }
          
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
