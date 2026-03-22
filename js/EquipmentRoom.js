import { fillRoundRect, strokeRoundRect, roundRect } from './utils.js'
import { MEDICINES, TOOLS, getItemById, getItemImage } from './Items.js'
import { GameConfig } from './GameConfig.js'

export default class EquipmentRoom {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    
    // 检测平台（用于判断是否震动）
    const sysInfo = wx.getSystemInfoSync()
    this.platform = sysInfo.platform
    
    // 可点击区域 - 物品卡片
    this.medicineToolCards = [] // 药品工具卡片数组
    this.examDeviceCards = [] // 检验设备卡片数组
    
    // 选中的物品
    this.selectedMedicineTools = new Set() // 药品工具多选
    this.selectedExamDevice = null // 检验设备单选
    
    // 配送按钮（药品工具区）
    this.deliveryBtnBounds = null
    this.deliveryBtnPressed = false
    
    // 启动按钮（检验设备区）
    this.startBtnBounds = null
    this.startBtnPressed = false
    
    // 底部发送/清空按钮区域（暂时隐藏）
    this.showBottomButtons = false
    this.equipmentSendBtnBounds = null
    this.equipmentSendBtnPressed = false
    this.equipmentClearBtnBounds = null
    this.equipmentClearBtnPressed = false
    
    // ==================== 检验设备状态管理 ====================
    // 设备状态: 'idle'(空闲), 'selected'(已选中), 'starting'(启动中), 'ready'(完成/有勾号)
    this.machineStates = {}
    // 初始化设备状态
    const machines = GameConfig.machine || []
    machines.forEach(machine => {
      this.machineStates[machine.id] = {
        state: 'idle',        // 设备状态
        progress: 0,          // 启动进度 (0-1)
        boundPatient: null,   // 绑定的病人
        startTime: 0,         // 启动开始时间
        hasCheckMark: false   // 是否有绿色勾号
      }
    })
    this.machineStartDuration = 3000  // 设备启动时间（毫秒）
    
    // 加载检查报告图片
    this.machineReportImage = null
    this.loadMachineReportImage()
  }
  
  // 加载检查报告图片
  loadMachineReportImage() {
    const img = wx.createImage()
    img.onload = () => {
      this.machineReportImage = img
    }
    img.onerror = () => {
      console.warn('Failed to load machine_report.png')
    }
    img.src = 'images/machine_report.png'
  }
  
  // 触发震动（仅在真机上生效，开发者工具中不震动）
  vibrate() {
    if (this.platform !== 'devtools') {
      wx.vibrateShort({ type: 'light' })
    }
  }

  update(deltaTime) {
    // 更新设备启动进度
    const machines = GameConfig.machine || []
    machines.forEach(machine => {
      const state = this.machineStates[machine.id]
      if (state.state === 'starting') {
        const elapsed = Date.now() - state.startTime
        state.progress = Math.min(1, elapsed / this.machineStartDuration)
        if (state.progress >= 1) {
          // 启动完成
          state.state = 'ready'
          state.hasCheckMark = true
        }
      }
    })
  }

  // 检测点击位置是哪个物品
  getItemAt(x, y) {
    // 检测药品工具卡片
    for (const card of this.medicineToolCards) {
      if (x >= card.x && x <= card.x + card.width &&
          y >= card.y && y <= card.y + card.height) {
        return { itemId: card.itemId, type: 'medicineTool' }
      }
    }
    
    // 检测检验设备卡片
    for (const card of this.examDeviceCards) {
      if (x >= card.x && x <= card.x + card.width &&
          y >= card.y && y <= card.y + card.height) {
        return { itemId: card.itemId, type: 'examDevice' }
      }
    }
    
    return null
  }

  render(ctx) {
    // 绘制药品工具区域（橙色背景）
    this.renderMedicineToolsSection(ctx)
    
    // 绘制检验设备区域（绿色背景）
    this.renderExamDevicesSection(ctx)
    
    // 底部发送/清空按钮（暂时隐藏）
    if (this.showBottomButtons) {
      this.renderSendButton(ctx)
      this.renderClearButton(ctx)
    }
  }
  
  // 绘制标题
  renderTitle(ctx) {
    ctx.fillStyle = '#374151'
    ctx.font = `bold ${Math.max(14, this.width * 0.045)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('器材室', this.x + this.width / 2, this.y + 8)
  }
  
  // 绘制药品工具区域
  renderMedicineToolsSection(ctx) {
    const sectionX = this.x + 6
    const sectionY = this.y + this.height * 0.1
    const sectionW = this.width - 12
    const sectionH = 125
    
    // 区域背景（橙色/暖黄色）
    ctx.fillStyle = '#FFF7ED'
    fillRoundRect(ctx, sectionX, sectionY, sectionW, sectionH, 10)
    
    // 区域边框
    ctx.strokeStyle = '#FED7AA'
    ctx.lineWidth = 1.5
    strokeRoundRect(ctx, sectionX, sectionY, sectionW, sectionH, 10)
    
    // 标题和配送按钮行
    this.renderSectionHeader(ctx, sectionX, sectionY, sectionW, '药品工具', '#C2410C', 'delivery')
    
    // 清空卡片数组
    this.medicineToolCards = []
    
    // 合并药品和工具
    const allMedicineTools = [...MEDICINES, ...TOOLS]
    
    // 网格布局：2行×4列，卡片46×44，间距5px
    const cols = 4
    const padding = 6
    const gap = 5
    const cardW = 44
    const cardH = 42
    const startX = sectionX + padding
    const startY = sectionY + 32
    
    for (let i = 0; i < allMedicineTools.length; i++) {
      const item = allMedicineTools[i]
      const col = i % cols
      const row = Math.floor(i / cols)
      const cardX = startX + col * (cardW + gap)
      const cardY = startY + row * (cardH + gap)
      
      const isSelected = this.selectedMedicineTools.has(item.id)
      this.renderItemCard(ctx, cardX, cardY, cardW, cardH, item, isSelected)
      
      this.medicineToolCards.push({
        x: cardX,
        y: cardY,
        width: cardW,
        height: cardH,
        itemId: item.id
      })
    }
  }
  
  // 绘制检验设备区域
  renderExamDevicesSection(ctx) {
    const sectionX = this.x + 6
    const sectionY = this.y + this.height * 0.1 + 125 + 10
    const sectionW = this.width - 12
    const sectionH = 125
    
    // 区域背景（绿色）
    ctx.fillStyle = '#F0FDF4'
    fillRoundRect(ctx, sectionX, sectionY, sectionW, sectionH, 10)
    
    // 区域边框
    ctx.strokeStyle = '#BBF7D0'
    ctx.lineWidth = 1.5
    strokeRoundRect(ctx, sectionX, sectionY, sectionW, sectionH, 10)
    
    // 标题和启动按钮行
    this.renderSectionHeader(ctx, sectionX, sectionY, sectionW, '检验设备', '#15803D', 'start')
    
    // 清空卡片数组
    this.examDeviceCards = []
    
    // 网格布局：2行，第一行4个，第二行1个居左，卡片46×44，间距5px
    const padding = 6
    const gap = 5
    const cardW = 44
    const cardH = 42
    const startX = sectionX + padding
    const startY = sectionY + 32
    
    // 从 GameConfig 获取检验设备清单
    const machines = GameConfig.machine || []
    
    // 第一行：4个
    for (let i = 0; i < 4 && i < machines.length; i++) {
      const machine = machines[i]
      const cardX = startX + i * (cardW + gap)
      const cardY = startY
      const state = this.machineStates[machine.id]
      const isSelected = this.selectedExamDevice === machine.id && state.state === 'idle'
      
      this.renderMachineCard(ctx, cardX, cardY, cardW, cardH, machine, state, isSelected)
      
      this.examDeviceCards.push({
        x: cardX,
        y: cardY,
        width: cardW,
        height: cardH,
        itemId: machine.id
      })
    }
    
    // 第二行：1个居左对齐
    if (machines.length > 4) {
      const machine = machines[4]
      const cardX = startX
      const cardY = startY + cardH + gap
      const state = this.machineStates[machine.id]
      const isSelected = this.selectedExamDevice === machine.id && state.state === 'idle'
      
      this.renderMachineCard(ctx, cardX, cardY, cardW, cardH, machine, state, isSelected)
      
      this.examDeviceCards.push({
        x: cardX,
        y: cardY,
        width: cardW,
        height: cardH,
        itemId: machine.id
      })
    }
  }
  
  // 绘制区域标题和操作按钮
  renderSectionHeader(ctx, sectionX, sectionY, sectionW, title, titleColor, btnType) {
    const headerY = sectionY + 6
    const btnWidth = 50
    const btnHeight = 20
    
    // 标题（左侧）
    ctx.fillStyle = titleColor
    ctx.font = `bold 12px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, sectionX + 10, headerY + btnHeight / 2)
    
    // 按钮（右侧）
    const btnX = sectionX + sectionW - btnWidth - 10
    const btnY = headerY
    
    // 判断按钮状态
    let hasSelected = false
    let btnText = ''
    let isPressed = false
    
    if (btnType === 'delivery') {
      hasSelected = this.selectedMedicineTools.size > 0
      btnText = hasSelected ? `配送(${this.selectedMedicineTools.size})` : '配送'
      isPressed = this.deliveryBtnPressed
    } else {
      hasSelected = this.selectedExamDevice !== null
      btnText = '启动'
      isPressed = this.startBtnPressed
    }
    
    // 按钮样式
    const isEnabled = hasSelected
    const btnColor = btnType === 'delivery' ? '#F97316' : '#22C55E'
    // 未激活状态：透明度高的橙色/绿色
    const btnDisabledColor = btnType === 'delivery' ? 'rgba(249, 115, 22, 0.35)' : 'rgba(34, 197, 94, 0.35)'
    const textColor = isEnabled ? '#FFFFFF' : (btnType === 'delivery' ? '#9A3412' : '#166534')
    
    // 按钮背景
    ctx.fillStyle = isEnabled ? btnColor : btnDisabledColor
    if (isPressed && isEnabled) {
      ctx.fillStyle = btnType === 'delivery' ? '#EA580C' : '#16A34A'
    }
    fillRoundRect(ctx, btnX, btnY, btnWidth, btnHeight, 10)
    
    // 按钮文字
    ctx.fillStyle = textColor
    ctx.font = `bold 10px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(btnText, btnX + btnWidth / 2, btnY + btnHeight / 2)
    
    // 记录按钮区域
    const bounds = { x: btnX, y: btnY, width: btnWidth, height: btnHeight }
    if (btnType === 'delivery') {
      this.deliveryBtnBounds = bounds
    } else {
      this.startBtnBounds = bounds
    }
  }
  
  // 绘制单个物品卡片（药品工具用）
  renderItemCard(ctx, x, y, width, height, item, isSelected) {
    const cornerRadius = 5
    
    // 卡片背景
    if (isSelected) {
      // 选中状态：蓝色背景
      ctx.fillStyle = '#DBEAFE'
    } else {
      // 默认状态：白色背景
      ctx.fillStyle = '#FFFFFF'
    }
    fillRoundRect(ctx, x, y, width, height, cornerRadius)
    
    // 卡片边框
    if (isSelected) {
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 1.5
    } else {
      ctx.strokeStyle = '#E5E7EB'
      ctx.lineWidth = 1
    }
    strokeRoundRect(ctx, x, y, width, height, cornerRadius)
    
    // 图标区域（上方）- 顶部padding加大
    const iconSize = 20
    const iconX = x + width / 2
    const iconY = y + 14
    
    // 绘制图标（优先使用图片）
    const itemImage = getItemImage(item.id)
    if (itemImage) {
      ctx.drawImage(itemImage, iconX - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize)
    } else {
      ctx.font = `${iconSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#4B5563'
      ctx.fillText(item.icon, iconX, iconY)
    }
    
    // 物品名称（下方）- 与icon距离缩小
    ctx.fillStyle = '#374151'
    ctx.font = `10px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(item.name, x + width / 2, y + 28)
  }
  
  // 绘制检验设备卡片（带进度条和状态）
  renderMachineCard(ctx, x, y, width, height, machine, state, isSelected) {
    const cornerRadius = 5
    const now = Date.now()
    
    // 计算呼吸效果透明度（用于starting和ready状态）
    let breatheAlpha = 1
    if (state.state === 'starting' || state.state === 'ready') {
      breatheAlpha = 0.5 + 0.5 * Math.sin(now / 200)  // 呼吸动画
    }
    
    // 卡片背景
    if (state.state === 'starting' || state.state === 'ready') {
      // 启动中或就绪：淡绿色背景
      ctx.fillStyle = `rgba(220, 252, 231, ${0.3 + 0.2 * breatheAlpha})`
    } else if (isSelected) {
      // 选中状态：蓝色背景
      ctx.fillStyle = '#DBEAFE'
    } else {
      // 默认状态：白色背景
      ctx.fillStyle = '#FFFFFF'
    }
    fillRoundRect(ctx, x, y, width, height, cornerRadius)
    
    // 卡片边框
    if (state.state === 'starting' || state.state === 'ready') {
      // 绿色呼吸边框
      ctx.strokeStyle = `rgba(34, 197, 94, ${breatheAlpha})`
      ctx.lineWidth = 2
    } else if (isSelected) {
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 1.5
    } else {
      ctx.strokeStyle = '#E5E7EB'
      ctx.lineWidth = 1
    }
    strokeRoundRect(ctx, x, y, width, height, cornerRadius)
    
    // 图标区域（上方）
    const iconSize = 20
    const iconX = x + width / 2
    const iconY = y + 12
    
    // 绘制图标
    const itemImage = getItemImage(machine.id)
    if (itemImage) {
      ctx.drawImage(itemImage, iconX - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize)
    } else {
      ctx.font = `${iconSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#4B5563'
      ctx.fillText(machine.icon, iconX, iconY)
    }
    
    // 设备名称（下方）
    ctx.fillStyle = '#374151'
    ctx.font = `9px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(machine.name, x + width / 2, y + 26)
    
    // 启动中：显示绿色进度条
    if (state.state === 'starting') {
      const barHeight = 3
      const barY = y + height - barHeight - 2
      const barWidth = width - 6
      
      // 背景条
      ctx.fillStyle = '#E5E7EB'
      fillRoundRect(ctx, x + 3, barY, barWidth, barHeight, barHeight / 2)
      
      // 进度条
      const progressWidth = barWidth * state.progress
      ctx.fillStyle = '#22C55E'
      fillRoundRect(ctx, x + 3, barY, progressWidth, barHeight, barHeight / 2)
    }
    
    // 就绪状态：显示绿色勾号
    if (state.hasCheckMark) {
      const checkSize = 16
      const checkX = x - 4
      const checkY = y - 4
      
      // 绿色圆形背景
      ctx.fillStyle = '#22C55E'
      ctx.beginPath()
      ctx.arc(checkX + checkSize / 2, checkY + checkSize / 2, checkSize / 2, 0, Math.PI * 2)
      ctx.fill()
      
      // 白色对勾
      ctx.strokeStyle = '#FFF'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(checkX + 4, checkY + checkSize / 2 + 1)
      ctx.lineTo(checkX + checkSize / 2 - 1, checkY + checkSize - 4)
      ctx.lineTo(checkX + checkSize - 4, checkY + 4)
      ctx.stroke()
    }
  }

  // ==================== 点击检测 ====================

  // 检查点击是否在配送按钮上
  isClickOnDeliveryButton(x, y) {
    if (!this.deliveryBtnBounds) return false
    const isHit = x >= this.deliveryBtnBounds.x && 
                  x <= this.deliveryBtnBounds.x + this.deliveryBtnBounds.width &&
                  y >= this.deliveryBtnBounds.y && 
                  y <= this.deliveryBtnBounds.y + this.deliveryBtnBounds.height
    if (isHit) {
      this.vibrate()
    }
    return isHit
  }

  // 检查点击是否在启动按钮上
  isClickOnStartButton(x, y) {
    if (!this.startBtnBounds) return false
    const isHit = x >= this.startBtnBounds.x && 
                  x <= this.startBtnBounds.x + this.startBtnBounds.width &&
                  y >= this.startBtnBounds.y && 
                  y <= this.startBtnBounds.y + this.startBtnBounds.height
    if (isHit) {
      this.vibrate()
    }
    return isHit
  }

  // 检查点击是否在器材区发送按钮上（兼容旧接口）
  isClickOnEquipmentSendButton(x, y) {
    if (!this.showBottomButtons) return false
    if (!this.equipmentSendBtnBounds) return false
    const isHit = x >= this.equipmentSendBtnBounds.x && 
                  x <= this.equipmentSendBtnBounds.x + this.equipmentSendBtnBounds.width &&
                  y >= this.equipmentSendBtnBounds.y && 
                  y <= this.equipmentSendBtnBounds.y + this.equipmentSendBtnBounds.height
    if (isHit) {
      this.vibrate()
    }
    return isHit
  }
  
  // 检查点击是否在器材区清空按钮上（兼容旧接口）
  isClickOnEquipmentClearButton(x, y) {
    if (!this.showBottomButtons) return false
    if (!this.equipmentClearBtnBounds) return false
    const isHit = x >= this.equipmentClearBtnBounds.x && 
                  x <= this.equipmentClearBtnBounds.x + this.equipmentClearBtnBounds.width &&
                  y >= this.equipmentClearBtnBounds.y && 
                  y <= this.equipmentClearBtnBounds.y + this.equipmentClearBtnBounds.height
    if (isHit) {
      this.vibrate()
    }
    return isHit
  }

  // ==================== 选择操作 ====================

  // 切换药品工具选中状态（多选）
  toggleMedicineToolSelection(itemId) {
    if (this.selectedMedicineTools.has(itemId)) {
      this.selectedMedicineTools.delete(itemId)
      return false
    } else {
      this.selectedMedicineTools.add(itemId)
      return true
    }
  }

  // 切换检验设备选中状态（单选）
  toggleExamDeviceSelection(itemId) {
    // 如果点击已选中的，取消选择；否则选中新的（自动取消旧的）
    if (this.selectedExamDevice === itemId) {
      this.selectedExamDevice = null
      return false
    } else {
      this.selectedExamDevice = itemId
      return true
    }
  }

  // 获取选中的药品工具列表（用于配送）
  getSelectedMedicineTools() {
    return Array.from(this.selectedMedicineTools).map(id => getItemById(id)).filter(item => item !== null)
  }

  // 获取选中的检验设备（用于启动）
  getSelectedExamDevice() {
    return this.selectedExamDevice ? getItemById(this.selectedExamDevice) : null
  }

  // 清空药品工具选择
  clearMedicineToolSelection() {
    this.selectedMedicineTools.clear()
  }

  // 清空检验设备选择
  clearExamDeviceSelection() {
    this.selectedExamDevice = null
  }
  
  // ==================== 检验设备操作 ====================
  
  // 启动选中的设备
  startSelectedMachine(patient) {
    if (!this.selectedExamDevice) return false
    
    const state = this.machineStates[this.selectedExamDevice]
    if (!state || state.state !== 'idle') return false
    
    // 检查该病人是否申请了此设备
    if (patient.requiredMachineId !== this.selectedExamDevice) return false
    
    // 启动设备
    state.state = 'starting'
    state.startTime = Date.now()
    state.progress = 0
    state.boundPatient = patient
    patient.boundMachineId = this.selectedExamDevice
    
    return true
  }
  
  // 使用设备开始治疗（点击有勾号的设备）
  useMachineForTreatment(machineId) {
    const state = this.machineStates[machineId]
    if (!state || state.state !== 'ready' || !state.hasCheckMark) return null
    
    const patient = state.boundPatient
    if (!patient) return null
    
    // 标记病人检查完成，可以开始正式治疗
    patient.machineCheckComplete = true
    patient.showMachineBubble = false
    
    // 重置设备状态
    state.state = 'idle'
    state.progress = 0
    state.hasCheckMark = false
    state.boundPatient = null
    patient.boundMachineId = null
    
    return patient
  }
  
  // 获取设备状态
  getMachineState(machineId) {
    return this.machineStates[machineId] || null
  }

  // 清空所有选择（兼容旧接口）
  clearSelection() {
    this.selectedMedicineTools.clear()
    this.selectedExamDevice = null
  }

  // 获取所有选中物品（兼容旧接口）
  getSelectedItems() {
    const items = this.getSelectedMedicineTools()
    const examDevice = this.getSelectedExamDevice()
    if (examDevice) {
      items.push(examDevice)
    }
    return items
  }

  // ==================== 按钮状态 ====================

  // 设置配送按钮按下状态
  setDeliveryBtnPressed(pressed) {
    this.deliveryBtnPressed = pressed
  }

  // 设置启动按钮按下状态
  setStartBtnPressed(pressed) {
    this.startBtnPressed = pressed
  }

  // 设置发送按钮按下状态（兼容旧接口）
  setEquipmentSendBtnPressed(pressed) {
    this.equipmentSendBtnPressed = pressed
  }

  // 设置清空按钮按下状态（兼容旧接口）
  setEquipmentClearBtnPressed(pressed) {
    this.equipmentClearBtnPressed = pressed
  }

  // ==================== 旧的渲染方法（兼容）====================

  renderSendButton(ctx) {
    // 底部发送按钮（暂时隐藏，保留方法兼容）
  }

  renderClearButton(ctx) {
    // 底部清空按钮（暂时隐藏，保留方法兼容）
  }

  // ==================== 获取物品位置（用于动画）====================

  // 获取卡片的中心位置（用于拖拽时显示物品起点）
  getCardCenter(itemId) {
    // 查找药品工具卡片
    for (const card of this.medicineToolCards) {
      if (card.itemId === itemId) {
        return {
          x: card.x + card.width / 2,
          y: card.y + card.height / 2,
          item: getItemById(itemId)
        }
      }
    }
    
    // 查找检验设备卡片
    for (const card of this.examDeviceCards) {
      if (card.itemId === itemId) {
        return {
          x: card.x + card.width / 2,
          y: card.y + card.height / 2,
          item: getItemById(itemId)
        }
      }
    }
    
    return null
  }

  // 兼容旧方法
  getDrawerCenter(itemId) {
    return this.getCardCenter(itemId)
  }
}
