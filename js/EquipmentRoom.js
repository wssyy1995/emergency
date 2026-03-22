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
    
    // 计算屏幕缩放因子（以 375px 宽度为基准）
    this.scale = sysInfo.windowWidth / 375
    // 限制缩放范围，避免过大或过小
    this.scale = Math.max(0.85, Math.min(1.15, this.scale))
    
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
    
    // ==================== 报告飞行动画 ====================
    this.flyingReports = [] // 正在飞行的报告图标数组
    
    // 加载检查报告图片
    this.machineReportImage = null
    this.loadMachineReportImage()
    
    // 加载按钮图片
    this.deliveryBtnImage = null
    this.startMachineBtnImage = null
    this.loadButtonImages()
  }
  
  // 加载按钮图片
  loadButtonImages() {
    // 配送按钮
    const deliveryImg = wx.createImage()
    deliveryImg.onload = () => {
      this.deliveryBtnImage = deliveryImg
    }
    deliveryImg.onerror = () => {
      console.warn('Failed to load deliver.png')
    }
    deliveryImg.src = 'images/deliver.png'
    
    // 启动按钮
    const startImg = wx.createImage()
    startImg.onload = () => {
      this.startMachineBtnImage = startImg
    }
    startImg.onerror = () => {
      console.warn('Failed to load start_machine.png')
    }
    startImg.src = 'images/start_machine.png'
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
          // 【新增】给绑定的病人设置就绪标记，气泡背景变绿色
          if (state.boundPatient) {
            state.boundPatient.machineReady = true
          }
        }
      }
    })
    
    // 更新报告飞行动画
    this.updateFlyingReports(deltaTime)
  }
  
  // 更新报告飞行动画
  updateFlyingReports(deltaTime) {
    for (let i = this.flyingReports.length - 1; i >= 0; i--) {
      const report = this.flyingReports[i]
      report.progress += deltaTime / report.duration
      
      if (report.progress >= 1) {
        // 飞行完成，延迟600ms后通知病人开始治疗
        if (!report.notified) {
          report.notified = true
          setTimeout(() => {
            if (report.onArrive) {
              report.onArrive(report.patient)
            }
          }, 600) // 延迟600ms
        }
        this.flyingReports.splice(i, 1)
      }
    }
  }
  
  // 添加报告飞行动画（弧形路径）
  addFlyingReport(startX, startY, endX, endY, patient, onArrive) {
    // 计算弧形路径的控制点（在起始点上方，形成向上的抛物线）
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    // 控制点向上偏移，形成弧形
    const controlY = Math.min(startY, endY) - 80
    
    this.flyingReports.push({
      x: startX,
      y: startY,
      startX,
      startY,
      endX,
      endY,
      controlX: midX,      // 贝塞尔曲线控制点X
      controlY: controlY,  // 贝塞尔曲线控制点Y（向上弧形）
      patient,
      progress: 0,
      duration: 800, // 飞行时间800ms
      notified: false,
      onArrive
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
    
    // 绘制报告飞行动画（在最上层）
    this.renderFlyingReports(ctx)
  }
  
  // 绘制报告飞行动画
  renderFlyingReports(ctx) {
    for (const report of this.flyingReports) {
      // 计算当前位置（二次贝塞尔曲线 - 弧形路径）
      const t = report.progress
      // 使用缓动函数使动画更自然
      const easeT = 1 - Math.pow(1 - t, 3) // easeOutCubic
      
      // 二次贝塞尔曲线公式：B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const oneMinusT = 1 - easeT
      const currentX = oneMinusT * oneMinusT * report.startX + 
                       2 * oneMinusT * easeT * report.controlX + 
                       easeT * easeT * report.endX
      const currentY = oneMinusT * oneMinusT * report.startY + 
                       2 * oneMinusT * easeT * report.controlY + 
                       easeT * easeT * report.endY
      
      // 图标大小（飞行过程中稍微缩小）
      const iconSize = 24 * (1 - t * 0.3) // 从24px逐渐缩小到16px
      
      // 绘制报告图标
      if (this.machineReportImage && this.machineReportImage.width > 0) {
        ctx.drawImage(this.machineReportImage, currentX - iconSize / 2, currentY - iconSize / 2, iconSize, iconSize)
      } else {
        // 备用：绘制绿色方块
        ctx.fillStyle = '#22C55E'
        fillRoundRect(ctx, currentX - iconSize / 2, currentY - iconSize / 2, iconSize, iconSize, 4)
      }
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
    const sectionX = this.x + 2 * this.scale
    const sectionW = this.width - 6 * this.scale
    // 【修复】高度基于容器高度的比例，而非固定值，确保手机端正常显示
    const sectionH = this.height * 0.44
    const sectionY = this.y + this.height * 0.08
    
    // 【修复】基于区域高度计算局部缩放因子，确保卡片随容器高度自适应
    const localScale = sectionH / 115  // 以设计高度115为基准
    
    // 区域背景（橙色/暖黄色）
    ctx.fillStyle = '#FFF7ED'
    fillRoundRect(ctx, sectionX, sectionY, sectionW, sectionH, 10 * localScale)
    
    // 区域边框
    ctx.strokeStyle = '#FED7AA'
    ctx.lineWidth = 1.5 * localScale
    strokeRoundRect(ctx, sectionX, sectionY, sectionW, sectionH, 10 * localScale)
    
    // 标题和配送按钮行
    this.renderSectionHeader(ctx, sectionX, sectionY, sectionW, '药品工具', '#C2410C', 'delivery', localScale)
    
    // 清空卡片数组
    this.medicineToolCards = []
    
    // 合并药品和工具
    const allMedicineTools = [...MEDICINES, ...TOOLS]
    
    // 网格布局：2行×4列，卡片尺寸根据区域高度自适应
    const cols = 4
    const padding = 8 * localScale
    const gap = 6 * localScale
    const cardW = 37 * localScale
    const cardH = 36 * localScale
    const startX = sectionX + padding
    const startY = sectionY + 30 * localScale
    
    for (let i = 0; i < allMedicineTools.length; i++) {
      const item = allMedicineTools[i]
      const col = i % cols
      const row = Math.floor(i / cols)
      const cardX = startX + col * (cardW + gap)
      const cardY = startY + row * (cardH + gap)
      
      const isSelected = this.selectedMedicineTools.has(item.id)
      this.renderItemCard(ctx, cardX, cardY, cardW, cardH, item, isSelected, localScale)
      
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
    const sectionX = this.x + 2 * this.scale
    const sectionW = this.width - 6 * this.scale
    // 【修复】高度基于容器高度的比例，而非固定值，确保手机端正常显示
    const sectionH = this.height * 0.45
    const sectionY = this.y + this.height * 0.54
    
    // 【修复】基于区域高度计算局部缩放因子，确保卡片随容器高度自适应
    const localScale = sectionH / 110  // 以设计高度110为基准
    
    // 区域背景（绿色）
    ctx.fillStyle = '#F0FDF4'
    fillRoundRect(ctx, sectionX, sectionY, sectionW, sectionH, 10 * localScale)
    
    // 区域边框
    ctx.strokeStyle = '#BBF7D0'
    ctx.lineWidth = 1.5 * localScale
    strokeRoundRect(ctx, sectionX, sectionY, sectionW, sectionH, 10 * localScale)
    
    // 标题和启动按钮行
    this.renderSectionHeader(ctx, sectionX, sectionY, sectionW, '检验设备', '#15803D', 'start', localScale)
    
    // 清空卡片数组
    this.examDeviceCards = []
    
    // 网格布局：2行，第一行4个，第二行1个居左，卡片尺寸根据区域高度自适应
    const padding = 8 * localScale
    const gap = 5 * localScale
    const cardW = 37 * localScale
    const cardH = 36 * localScale
    const startX = sectionX + padding
    const startY = sectionY + 30 * localScale
    
    // 从 GameConfig 获取检验设备清单
    const machines = GameConfig.machine || []
    
    // 第一行：4个
    for (let i = 0; i < 4 && i < machines.length; i++) {
      const machine = machines[i]
      const cardX = startX + i * (cardW + gap)
      const cardY = startY
      const state = this.machineStates[machine.id]
      const isSelected = this.selectedExamDevice === machine.id && state.state === 'idle'
      
      this.renderMachineCard(ctx, cardX, cardY, cardW, cardH, machine, state, isSelected, localScale)
      
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
      
      this.renderMachineCard(ctx, cardX, cardY, cardW, cardH, machine, state, isSelected, localScale)
      
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
  renderSectionHeader(ctx, sectionX, sectionY, sectionW, title, titleColor, btnType, localScale = this.scale) {
    const headerY = sectionY + 6 * localScale
    // 【调整】按钮尺寸变大
    const btnWidth = 135 * localScale
    const btnHeight = 50 * localScale
    
    // 标题（左侧）- 字体稍小，位置上移5px
    ctx.fillStyle = titleColor
    ctx.font = `bold ${Math.max(9, 11 * localScale)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    // 【调整】标题往上
    ctx.fillText(title, sectionX + 10 * localScale, headerY + btnHeight / 2 - 15 * localScale )
    
    // 按钮（右侧）
    // 【调整】按钮往右移动 
    const btnX = sectionX + sectionW - btnWidth + 55 * localScale
    // 【调整】按钮往上移动 3px
    const btnY = headerY -23 * localScale
    
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
    
    // 按下后的偏移量
    const pressOffset = (isPressed && hasSelected) ? 2 * localScale : 0
    
    // 获取对应按钮图片
    const btnImage = btnType === 'delivery' ? this.deliveryBtnImage : this.startMachineBtnImage
    
    // 绘制按钮图片（如果有）
    if (btnImage && btnImage.width > 0) {
      // 未选中时降低透明度（颜色更深）
      ctx.save()
      if (!hasSelected) {
        ctx.globalAlpha = 0.95
      }
      
      // 【修复】保持图片比例，不压扁，并放大1.2倍
      const imgRatio = btnImage.width / btnImage.height
      const btnRatio = btnWidth / btnHeight
      const scaleFactor = 1.2  // 图片放大系数
      let drawWidth, drawHeight
      if (imgRatio > btnRatio) {
        // 图片更宽，以按钮宽度为基准
        drawWidth = btnWidth * scaleFactor
        drawHeight = (btnWidth / imgRatio) * scaleFactor
      } else {
        // 图片更高，以按钮高度为基准
        drawHeight = btnHeight * scaleFactor
        drawWidth = (btnHeight * imgRatio) * scaleFactor
      }
      // 居中绘制
      const drawX = btnX + (btnWidth - drawWidth) / 2
      const drawY = btnY + pressOffset + (btnHeight - drawHeight) / 2
      ctx.drawImage(btnImage, drawX, drawY, drawWidth, drawHeight)
      
      ctx.restore()
    } else {
      // 备用：绘制简单按钮
      const btnColor = btnType === 'delivery' ? '#F97316' : '#22C55E'
      const btnDisabledColor = btnType === 'delivery' ? 'rgba(249, 115, 22, 0.5)' : 'rgba(34, 197, 94, 0.5)'
      ctx.fillStyle = hasSelected ? btnColor : btnDisabledColor
      fillRoundRect(ctx, btnX, btnY + pressOffset, btnWidth, btnHeight, 10 * localScale)
      
      // 按钮文字
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `bold ${Math.max(9, 10 * localScale)}px "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(btnText, btnX + btnWidth / 2, btnY + btnHeight / 2 + pressOffset)
    }
    
    // 记录按钮区域
    const bounds = { x: btnX, y: btnY, width: btnWidth, height: btnHeight }
    if (btnType === 'delivery') {
      this.deliveryBtnBounds = bounds
    } else {
      this.startBtnBounds = bounds
    }
  }
  
  // 绘制单个物品卡片（药品工具用）
  renderItemCard(ctx, x, y, width, height, item, isSelected, localScale = this.scale) {
    const cornerRadius = 5 * localScale
    
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
      ctx.lineWidth = 1.5 * localScale
    } else {
      ctx.strokeStyle = '#E5E7EB'
      ctx.lineWidth = 1 * localScale
    }
    strokeRoundRect(ctx, x, y, width, height, cornerRadius)
    
    // 图标区域（上方）- 顶部padding加大
    const iconSize = 22 * localScale
    const iconX = x + width / 2
    const iconY = y + 13 * localScale
    
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
    ctx.font = `${Math.max(9, 8 * localScale)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(item.name, x + width / 2, y + 25 * localScale)
  }
  
  // 绘制检验设备卡片（带进度条和状态）
  renderMachineCard(ctx, x, y, width, height, machine, state, isSelected, localScale = this.scale) {
    const cornerRadius = 5 * localScale
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
      ctx.lineWidth = 2 * localScale
    } else if (isSelected) {
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 1.5 * localScale
    } else {
      ctx.strokeStyle = '#E5E7EB'
      ctx.lineWidth = 1 * localScale
    }
    strokeRoundRect(ctx, x, y, width, height, cornerRadius)
    
    // 图标区域（上方）
    const iconSize = 20 * localScale
    const iconX = x + width / 2
    const iconY = y + 13 * localScale
    
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
    ctx.font = `${Math.max(8, 8 * localScale)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(machine.name, x + width / 2, y + 25 * localScale)
    
    // 启动中：显示绿色进度条
    if (state.state === 'starting') {
      const barHeight = 3 * localScale
      const barY = y + height - barHeight - 2 * localScale
      const barWidth = width - 6 * localScale
      
      // 背景条
      ctx.fillStyle = '#E5E7EB'
      fillRoundRect(ctx, x + 3 * localScale, barY, barWidth, barHeight, barHeight / 2)
      
      // 进度条
      const progressWidth = barWidth * state.progress
      ctx.fillStyle = '#22C55E'
      fillRoundRect(ctx, x + 3 * localScale, barY, progressWidth, barHeight, barHeight / 2)
    }
    
    // 就绪状态：显示绿色勾号
    if (state.hasCheckMark) {
      const checkSize = 16 * localScale
      const checkX = x - 4 * localScale
      const checkY = y - 4 * localScale
      
      // 绿色圆形背景
      ctx.fillStyle = '#22C55E'
      ctx.beginPath()
      ctx.arc(checkX + checkSize / 2, checkY + checkSize / 2, checkSize / 2, 0, Math.PI * 2)
      ctx.fill()
      
      // 白色对勾
      ctx.strokeStyle = '#FFF'
      ctx.lineWidth = 2.5 * localScale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(checkX + 4 * localScale, checkY + checkSize / 2 + 1 * localScale)
      ctx.lineTo(checkX + checkSize / 2 - 1 * localScale, checkY + checkSize - 4 * localScale)
      ctx.lineTo(checkX + checkSize - 4 * localScale, checkY + 4 * localScale)
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
  // 返回 { patient, startFlying } 对象，需要调用 startFlying 才开始飞行动画
  useMachineForTreatment(machineId, cardX, cardY) {
    const state = this.machineStates[machineId]
    if (!state || state.state !== 'ready' || !state.hasCheckMark) return null
    
    const patient = state.boundPatient
    if (!patient) return null
    
    // 获取病人位置（用于飞行动画目标）
    const patientX = patient.x + patient.width / 2
    const patientY = patient.y - 20 // 气泡位置
    
    // 【修复】点击绿色勾号后立即隐藏病人气泡
    patient.showMachineBubble = false
    
    // 返回对象，包含病人和开始飞行动画的回调
    return {
      patient,
      startFlying: (onArrive) => {
        // 添加飞行动画（从设备卡片飞到病人）
        this.addFlyingReport(
          cardX, cardY,      // 起始位置（设备卡片）
          patientX, patientY, // 目标位置（病人头上）
          patient,
          onArrive           // 到达后的回调
        )
        
        // 立即重置设备状态（绿色勾号消失）
        state.state = 'idle'
        state.progress = 0
        state.hasCheckMark = false
        state.boundPatient = null
        patient.boundMachineId = null
        patient.machineReady = false
      }
    }
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
