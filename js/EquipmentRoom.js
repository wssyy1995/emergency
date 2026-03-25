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
    
    // 【已移除】配送按钮和启动按钮，改为直接点击医生/病人进行配送/绑定
    // 保留选中状态逻辑，移除按钮交互
    
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
    
    // 【新增】物品配送飞行动画（从器材室飞向医生）
    this.flyingItems = [] // 正在飞行的物品数组
    
    // 加载检查报告图片
    this.machineReportImage = null
    this.loadMachineReportImage()
    
    // 加载按钮图片
    this.deliveryBtnImage = null
    this.deliveryBtnDisabledImage = null
    this.startMachineBtnImage = null
    this.startMachineBtnDisabledImage = null
    this.loadButtonImages()
  }
  
  // 加载按钮图片
  loadButtonImages() {
    // 配送按钮（激活状态）
    const deliveryImg = wx.createImage()
    deliveryImg.onload = () => {
      this.deliveryBtnImage = deliveryImg
    }
    deliveryImg.onerror = () => {
      console.warn('Failed to load deliver.png')
    }
    deliveryImg.src = 'images/deliver.png'
    
    // 配送按钮（禁用状态）
    const deliveryDisabledImg = wx.createImage()
    deliveryDisabledImg.onload = () => {
      this.deliveryBtnDisabledImage = deliveryDisabledImg
    }
    deliveryDisabledImg.onerror = () => {
      console.warn('Failed to load deliver_disable.png')
    }
    deliveryDisabledImg.src = 'images/deliver_disable.png'
    
    // 启动按钮（激活状态）
    const startImg = wx.createImage()
    startImg.onload = () => {
      this.startMachineBtnImage = startImg
    }
    startImg.onerror = () => {
      console.warn('Failed to load start_machine.png')
    }
    startImg.src = 'images/start_machine.png'
    
    // 启动按钮（禁用状态）
    const startDisabledImg = wx.createImage()
    startDisabledImg.onload = () => {
      this.startMachineBtnDisabledImage = startDisabledImg
    }
    startDisabledImg.onerror = () => {
      console.warn('Failed to load start_machine_disable.png')
    }
    startDisabledImg.src = 'images/start_machine_disable.png'
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
    img.src = 'images/tool_machine/machine_report.png'
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
        // 使用设备配置的 running_time，默认为4000ms
        const runningTime = machine.running_time || 4000
        state.progress = Math.min(1, elapsed / runningTime)
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
    
    // 【新增】更新物品配送飞行动画
    this.updateFlyingItems(deltaTime)
  }
  
  // 更新报告飞行动画
  updateFlyingReports(deltaTime) {
    for (let i = this.flyingReports.length - 1; i >= 0; i--) {
      const report = this.flyingReports[i]
      report.progress += deltaTime / report.duration
      
      if (report.progress >= 1) {
        // 飞行完成，延迟300ms后通知病人开始治疗
        if (!report.notified) {
          report.notified = true
          setTimeout(() => {
            if (report.onArrive) {
              report.onArrive(report.patient)
            }
          }, 300) // 延迟300ms
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
  
  // 【新增】添加物品配送飞行动画（从器材室飞向医生）
  addFlyingItem(itemId, startX, startY, endX, endY, onArrive) {
    const item = getItemById(itemId)
    if (!item) return
    
    // 计算弧形路径的控制点（形成向上的抛物线）
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    // 控制点向上偏移，形成弧形
    const controlY = Math.min(startY, endY) - 60
    
    this.flyingItems.push({
      itemId,
      item,
      x: startX,
      y: startY,
      startX,
      startY,
      endX,
      endY,
      controlX: midX,
      controlY: controlY,
      progress: 0,
      duration: 600, // 飞行时间600ms（比报告快一点）
      onArrive
    })
  }
  
  // 【新增】更新物品配送飞行动画
  updateFlyingItems(deltaTime) {
    for (let i = this.flyingItems.length - 1; i >= 0; i--) {
      const flyingItem = this.flyingItems[i]
      flyingItem.progress += deltaTime / flyingItem.duration
      
      if (flyingItem.progress >= 1) {
        // 飞行完成
        if (flyingItem.onArrive) {
          flyingItem.onArrive()
        }
        this.flyingItems.splice(i, 1)
      }
    }
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
    
    // 【新增】绘制物品配送飞行动画
    this.renderFlyingItems(ctx)
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
  
  // 【新增】绘制物品配送飞行动画
  renderFlyingItems(ctx) {
    for (const flyingItem of this.flyingItems) {
      // 计算当前位置（二次贝塞尔曲线 - 弧形路径）
      const t = flyingItem.progress
      const easeT = 1 - Math.pow(1 - t, 3) // easeOutCubic
      
      // 二次贝塞尔曲线公式
      const oneMinusT = 1 - easeT
      const currentX = oneMinusT * oneMinusT * flyingItem.startX + 
                       2 * oneMinusT * easeT * flyingItem.controlX + 
                       easeT * easeT * flyingItem.endX
      const currentY = oneMinusT * oneMinusT * flyingItem.startY + 
                       2 * oneMinusT * easeT * flyingItem.controlY + 
                       easeT * easeT * flyingItem.endY
      
      // 图标大小（飞行过程中稍微放大）
      const iconSize = 22 * (1 + t * 0.15) // 从22px逐渐放大到25px（更小更精致）
      
      // 获取物品图片
      const itemImage = getItemImage(flyingItem.itemId)
      
      // 绘制物品图标（带阴影）
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetY = 3
      
      if (itemImage && itemImage.width > 0) {
        ctx.drawImage(itemImage, currentX - iconSize / 2, currentY - iconSize / 2, iconSize, iconSize)
      } else {
        // 备用：使用emoji
        ctx.font = `${iconSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(flyingItem.item.icon, currentX, currentY)
      }
      
      ctx.restore()
    }
  }
  
  // 绘制标题
  renderTitle(ctx) {
    ctx.fillStyle = '#374151'
    ctx.font = `bold ${Math.max(14, this.width * 0.045)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('器材室', this.x + this.width / 2, this.y + 8)
    
    // 【提示文字】点击物品后，再点击医生/病人进行配送/绑定
    ctx.fillStyle = '#9CA3AF'
    ctx.font = `${Math.max(10, this.width * 0.028)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.fillText('选中物品后点击医生/病人', this.x + this.width / 2, this.y + 28)
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
    
    // 标题（仅标题，按钮已移除）
    this.renderSectionTitle(ctx, sectionX, sectionY, sectionW, '药品工具', '#C2410C', localScale)
    
    // 清空卡片数组
    this.medicineToolCards = []
    
    // 合并药品和工具
    const allMedicineTools = [...MEDICINES, ...TOOLS]
    
    // 网格布局：2行×4列，卡片尺寸根据区域高度自适应
    const cols = 4
    const padding = 10 * localScale
    const gap = 5 * localScale
    const cardW = 44 * localScale
    const cardH = 40 * localScale
    const startX = sectionX + padding
    const startY = sectionY + 27 * localScale
    
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
    
    // 区域背景（琥珀色）
    ctx.fillStyle = '#FFFBEB'
    fillRoundRect(ctx, sectionX, sectionY, sectionW, sectionH, 10 * localScale)
    
    // 区域边框
    ctx.strokeStyle = '#FCD34D'
    ctx.lineWidth = 1.5 * localScale
    strokeRoundRect(ctx, sectionX, sectionY, sectionW, sectionH, 10 * localScale)
    
    // 标题（仅标题，按钮已移除）
    this.renderSectionTitle(ctx, sectionX, sectionY, sectionW, '检验设备', '#B45309', localScale)
    
    // 清空卡片数组
    this.examDeviceCards = []
    
    // 网格布局：2行，第一行4个，第二行1个居左，卡片尺寸根据区域高度自适应
    const padding = 10 * localScale
    const gap =  5* localScale
    const cardW = 40 * localScale
    const cardH = 39 * localScale
    const startX = sectionX + padding
    const startY = sectionY + 25 * localScale
    
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
  
  // 绘制区域标题（仅标题，按钮已移除）
  renderSectionTitle(ctx, sectionX, sectionY, sectionW, title, titleColor, localScale = this.scale) {
    const headerY = sectionY + 15 * localScale  // 往下移动5px（原来10px）
    
    // 标题居左对齐
    ctx.fillStyle = titleColor
    ctx.font = `bold ${Math.max(9.5, 11.5 * localScale)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, sectionX + 10 * localScale, headerY)
  }
  
  // 绘制单个物品卡片（药品工具用）
  renderItemCard(ctx, x, y, width, height, item, isSelected, localScale = this.scale) {
    const cornerRadius = 5 * localScale
    
    // 卡片背景
    if (isSelected) {
      // 选中状态：蓝色背景（60%透明度）
      ctx.fillStyle = 'rgba(235, 243, 255, 0.6)'
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
    
    // 药品工具图标区域（上方）- 顶部padding加大
    const iconSize = 23 * localScale
    const iconX = x + width / 2
    const iconY = y + 15 * localScale
    
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
    ctx.fillText(item.name, x + width / 2, y + 28 * localScale)
  }
  
  // 绘制检验设备卡片（带进度条和状态）
  renderMachineCard(ctx, x, y, width, height, machine, state, isSelected, localScale = this.scale) {
    const cornerRadius = 5 * localScale
    const now = Date.now()
    
    // 计算呼吸效果透明度（只用于starting状态）
    let breatheAlpha = 1
    if (state.state === 'starting') {
      breatheAlpha = 0.6 + 0.4 * Math.sin(now / 200)  // 呼吸动画，更明亮
    }
    
    // 卡片背景
    if (state.state === 'starting') {
      // 启动中：淡灰色背景
      ctx.fillStyle = '#F3F4F6'
    } else if (state.state === 'ready') {
      // 就绪：淡绿色背景（固定透明度，无呼吸）
      ctx.fillStyle = 'rgba(220, 252, 231, 0.5)'
    } else if (isSelected) {
      // 选中状态：蓝色背景（60%透明度）
      ctx.fillStyle = 'rgba(219, 234, 254, 0.6)'
    } else {
      // 默认状态：白色背景
      ctx.fillStyle = '#FFFFFF'
    }
    fillRoundRect(ctx, x, y, width, height, cornerRadius)
    
    // 卡片边框
    if (state.state === 'starting') {
      // 启动中：明亮橙黄色呼吸边框
      ctx.strokeStyle = `rgba(255, 165, 0, ${breatheAlpha})`  // 橙黄色 #FFA500
      ctx.lineWidth = 3 * localScale
    } else if (state.state === 'ready') {
      // 就绪：绿色固定边框（无呼吸）
      ctx.strokeStyle = '#22C55E'
      ctx.lineWidth = 2.5 * localScale
    } else if (isSelected) {
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 1.5 * localScale
    } else {
      ctx.strokeStyle = '#E5E7EB'
      ctx.lineWidth = 1 * localScale
    }
    strokeRoundRect(ctx, x, y, width, height, cornerRadius)
    
    // 检验设备图标区域（上方）
    const iconSize = 22 * localScale
    const iconX = x + width / 2
    const iconY = y + 14 * localScale
    
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
    ctx.fillText(machine.name, x + width / 2, y + 26 * localScale)
    
    // 启动中：显示黄色进度条和灰色遮罩
    if (state.state === 'starting') {
      const barHeight = 3 * localScale
      const barY = y + height - barHeight - 2 * localScale
      const barWidth = width - 6 * localScale
      
      // 背景条
      ctx.fillStyle = '#E5E7EB'
      fillRoundRect(ctx, x + 3 * localScale, barY, barWidth, barHeight, barHeight / 2)
      
      // 进度条（明亮橙黄色）
      const progressWidth = barWidth * state.progress
      ctx.fillStyle = '#FFA500'  // 橙黄色
      fillRoundRect(ctx, x + 3 * localScale, barY, progressWidth, barHeight, barHeight / 2)
      
      // 添加灰色遮罩
      ctx.fillStyle = 'rgba(128, 128, 128, 0.25)'
      fillRoundRect(ctx, x, y, width, height, cornerRadius)
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
  
  // 【已移除】配送按钮和启动按钮检测，改为直接点击医生/病人进行配送/绑定
  // 保留物品/设备卡片的点击检测（在 Game.js 中处理）

  // 检查点击是否在器材区发送按钮上（已废弃，返回false）
  isClickOnEquipmentSendButton(x, y) {
    return false
  }
  
  // 检查点击是否在器材区清空按钮上（已废弃，返回false）
  isClickOnEquipmentClearButton(x, y) {
    return false
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
