import { fillRoundRect, strokeRoundRect } from './utils.js'
import { MEDICINES, TOOLS, getItemById, getItemImage } from './Items.js'

export default class EquipmentRoom {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    
    // 检测平台（用于判断是否震动）
    const sysInfo = wx.getSystemInfoSync()
    this.platform = sysInfo.platform
    
    // 可点击区域 - 现在每个抽屉是一个独立区域
    this.medicineDrawers = [] // 药品柜抽屉数组
    this.toolDrawers = [] // 器械柜抽屉数组
    
    // 托盘状态
    this.trayItems = [] // 当前托盘中的物品数组（最多4个）
    this.trayBounds = null // 托盘点击区域
    
    // 选中的物品（新的选择模式）
    this.selectedItems = new Set() // 存储选中的 itemId
    
    // 器材区发送按钮
    this.equipmentSendBtnBounds = null // 发送按钮点击区域
    this.equipmentSendBtnPressed = false // 发送按钮按下状态
  }
  
  // 触发震动（仅在真机上生效，开发者工具中不震动）
  vibrate() {
    if (this.platform !== 'devtools') {
      wx.vibrateShort({ type: 'light' })
    }
  }

  update(deltaTime) {
    // 无需更新
  }

  // 检测点击位置是哪个物品
  getItemAt(x, y) {
    // 检测药品抽屉
    for (const drawer of this.medicineDrawers) {
      if (x >= drawer.x && x <= drawer.x + drawer.width &&
          y >= drawer.y && y <= drawer.y + drawer.height) {
        return drawer.itemId
      }
    }
    
    // 检测器械抽屉
    for (const drawer of this.toolDrawers) {
      if (x >= drawer.x && x <= drawer.x + drawer.width &&
          y >= drawer.y && y <= drawer.y + drawer.height) {
        return drawer.itemId
      }
    }
    
    return null
  }

  render(ctx) {
    // 绘制两个柜子：药品柜和器械柜
    this.renderMedicineCabinet(ctx)
    this.renderEquipmentCabinet(ctx)
    // 绘制器材区底部的发送按钮
    this.renderSendButton(ctx)
  }
  
  // 绘制器材区发送按钮
  renderSendButton(ctx) {
    // 按钮位置：器材室底部居中
    const btnWidth = this.width * 0.4
    const btnHeight = 25
    const btnX = this.x + (this.width - btnWidth) / 2
    const btnY = this.y + this.height - btnHeight -1
    
    // 是否有选中的物品
    const hasSelected = this.selectedItems.size > 0
    
    // 按钮按下动效
    const btnScale = this.equipmentSendBtnPressed ? 0.95 : 1
    const scaleOffsetX = (btnWidth * (1 - btnScale)) / 2
    const scaleOffsetY = (btnHeight * (1 - btnScale)) / 2
    const drawX = btnX + scaleOffsetX
    const drawY = btnY + scaleOffsetY
    const drawW = btnWidth * btnScale
    const drawH = btnHeight * btnScale
    
    // 按钮背景（圆角）
    if (this.equipmentSendBtnPressed) {
      ctx.fillStyle = hasSelected ? '#1E8449' : '#888888'  // 按下时颜色变深
    } else {
      ctx.fillStyle = hasSelected ? '#27AE60' : '#CCCCCC'  // 正常状态
    }
    fillRoundRect(ctx, drawX, drawY, drawW, drawH, 8)
    
    // 按钮边框
    ctx.strokeStyle = hasSelected ? '#1E8449' : '#AAAAAA'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, drawX, drawY, drawW, drawH, 8)
    
    // 按钮文字
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const btnText = hasSelected ? `发送 (${this.selectedItems.size})` : '发送'
    ctx.fillText(btnText, drawX + drawW / 2, drawY + drawH / 2)
    
    // 记录按钮点击区域（使用原始大小，不受按下动效影响）
    this.equipmentSendBtnBounds = {
      x: btnX,
      y: btnY,
      width: btnWidth,
      height: btnHeight
    }
  }

  renderMedicineCabinet(ctx) {
    // 左侧药品柜 - 宽度增大，边距减小
    const cabinetWidth = this.width * 0.46
    const cabinetX = this.x + this.width * 0.03
    const cabinetY = this.y + this.height * 0.2
    
    // 清空之前的抽屉区域
    this.medicineDrawers = []
    
    // 4个抽屉（高度减5像素，为底部发送按钮留出空间）
    const drawerCount = 4
    const drawerMargin = cabinetWidth * 0.06
    // 基于原始高度计算抽屉高度
    const originalCabinetHeight = this.height * 0.75
    const drawerHeight = (originalCabinetHeight - drawerMargin * (drawerCount + 1)) / drawerCount - 5
    
    // 根据实际抽屉高度计算柜体高度
    const cabinetHeight = drawerMargin + drawerCount * (drawerHeight + drawerMargin)
    
    // 柜体外框（在计算完高度后绘制）
    ctx.fillStyle = '#FFF8DC'
    ctx.fillRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 3
    ctx.strokeRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    
    for (let i = 0; i < drawerCount; i++) {
      const drawerY = cabinetY + drawerMargin + i * (drawerHeight + drawerMargin)
      const drawerX = cabinetX + drawerMargin
      const drawerW = cabinetWidth - drawerMargin * 2
      
      // 检查是否被选中
      const isSelected = this.selectedItems.has(MEDICINES[i].id)
      
      // 绘制抽屉
      this.renderDrawer(ctx, drawerX, drawerY, drawerW, drawerHeight, MEDICINES[i], i, isSelected)
      
      // 记录抽屉点击区域
      this.medicineDrawers.push({
        x: drawerX,
        y: drawerY,
        width: drawerW,
        height: drawerHeight,
        itemId: MEDICINES[i].id
      })
    }
    
    // 顶部标识
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(cabinetX, cabinetY - this.height * 0.07, cabinetWidth, this.height * 0.07)
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 2
    ctx.strokeRect(cabinetX, cabinetY - this.height * 0.07, cabinetWidth, this.height * 0.07)
    ctx.fillStyle = '#555555'
    ctx.font = `bold ${Math.max(14, this.width * 0.05)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('药品柜', cabinetX + cabinetWidth / 2, cabinetY - this.height * 0.035)
  }

  renderEquipmentCabinet(ctx) {
    // 右侧器械柜 - 宽度增大，边距减小
    const cabinetWidth = this.width * 0.46
    const cabinetX = this.x + this.width - cabinetWidth - this.width * 0.03
    const cabinetY = this.y + this.height * 0.2
    
    // 清空之前的抽屉区域
    this.toolDrawers = []
    
    // 4个抽屉（高度减5像素，为底部发送按钮留出空间）
    const drawerCount = 4
    const drawerMargin = cabinetWidth * 0.06
    // 基于原始高度计算抽屉高度
    const originalCabinetHeight = this.height * 0.75
    const drawerHeight = (originalCabinetHeight - drawerMargin * (drawerCount + 1)) / drawerCount - 5
    
    // 根据实际抽屉高度计算柜体高度
    const cabinetHeight = drawerMargin + drawerCount * (drawerHeight + drawerMargin)
    
    // 柜体外框（在计算完高度后绘制）
    ctx.fillStyle = '#E8F8F5'
    ctx.fillRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 3
    ctx.strokeRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    
    for (let i = 0; i < drawerCount; i++) {
      const drawerY = cabinetY + drawerMargin + i * (drawerHeight + drawerMargin)
      const drawerX = cabinetX + drawerMargin
      const drawerW = cabinetWidth - drawerMargin * 2
      
      // 检查是否被选中
      const isSelected = this.selectedItems.has(TOOLS[i].id)
      
      // 绘制抽屉
      this.renderDrawer(ctx, drawerX, drawerY, drawerW, drawerHeight, TOOLS[i], i, isSelected)
      
      // 记录抽屉点击区域
      this.toolDrawers.push({
        x: drawerX,
        y: drawerY,
        width: drawerW,
        height: drawerHeight,
        itemId: TOOLS[i].id
      })
    }
    
    // 顶部标识
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(cabinetX, cabinetY - this.height * 0.07, cabinetWidth, this.height * 0.07)
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 2
    ctx.strokeRect(cabinetX, cabinetY - this.height * 0.07, cabinetWidth, this.height * 0.07)
    ctx.fillStyle = '#555555'
    ctx.font = `bold ${Math.max(14, this.width * 0.05)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('器械柜', cabinetX + cabinetWidth / 2, cabinetY - this.height * 0.035)
  }

  // 绘制单个抽屉
  renderDrawer(ctx, x, y, width, height, item, index, isSelected = false) {
    // 抽屉背景（选中时高亮）
    if (isSelected) {
      ctx.fillStyle = '#E3F2FD' // 浅蓝色高亮背景
      fillRoundRect(ctx, x, y, width, height, 6)
      // 高亮边框
      ctx.strokeStyle = '#3498DB'
      ctx.lineWidth = 3
      strokeRoundRect(ctx, x, y, width, height, 6)
    } else {
      ctx.fillStyle = '#F5F5F5'
      fillRoundRect(ctx, x, y, width, height, 6)
      // 普通边框
      ctx.strokeStyle = '#CCCCCC'
      ctx.lineWidth = 2
      strokeRoundRect(ctx, x, y, width, height, 6)
    }
    
    // 图标区域（左侧）- 变大
    const iconSize = Math.min(height * 0.6, width * 0.3)
    const iconX = x + width * 0.15
    const iconY = y + height / 2
    
    // 图标背景圆圈 - 变大
    ctx.fillStyle = '#E8E8E8'
    ctx.beginPath()
    ctx.arc(iconX + iconSize/2, iconY, iconSize * 0.75, 0, Math.PI * 2)
    ctx.fill()
    
    // 绘制图标（优先使用图片，如果没有则使用emoji）
    const itemImage = getItemImage(item.id)
    if (itemImage) {
      // 绘制图片 - 变大
      const imgSize = iconSize * 1.3
      ctx.drawImage(itemImage, iconX + iconSize/2 - imgSize/2, iconY - imgSize/2, imgSize, imgSize)
    } else {
      // 使用emoji回退 - 变大
      ctx.fillStyle = '#2C3E50'
      ctx.font = `${iconSize * 1.2}px "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.icon, iconX + iconSize/2, iconY)
    }
    
    // 物品名称 - 字体变大，长名称换行显示
    ctx.fillStyle = '#2C3E50'
    ctx.font = `bold ${Math.max(11, width * 0.13)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    
    // 处理长名称换行（医用胶带、肾上腺素）
    const maxTextWidth = width * 0.5
    const textX = x + width * 0.55  // 增加与图标的间距
    const textY = y + height / 2
    
    if (item.name.length > 3) {
      // 长名称分两行显示
      ctx.textBaseline = 'bottom'
      ctx.fillText(item.name.substring(0, 2), textX, textY)
      ctx.textBaseline = 'top'
      ctx.fillText(item.name.substring(2), textX, textY + 2)
    } else {
      ctx.textBaseline = 'middle'
      ctx.fillText(item.name, textX, textY)
    }
    
    // 如果被选中，在左上角绘制勾号
    if (isSelected) {
      const checkSize = Math.min(width, height) * 0.25
      const checkX = x + checkSize * 0.5
      const checkY = y + checkSize * 0.5
      
      // 绿色圆形背景
      ctx.fillStyle = '#27AE60'
      ctx.beginPath()
      ctx.arc(checkX, checkY, checkSize * 0.6, 0, Math.PI * 2)
      ctx.fill()
      
      // 白色对勾
      ctx.strokeStyle = '#FFF'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(checkX - checkSize * 0.25, checkY)
      ctx.lineTo(checkX - checkSize * 0.08, checkY + checkSize * 0.2)
      ctx.lineTo(checkX + checkSize * 0.25, checkY - checkSize * 0.15)
      ctx.stroke()
    }
  }

  // 获取抽屉的中心位置（用于拖拽时显示物品起点）
  getDrawerCenter(itemId) {
    // 查找药品抽屉
    for (const drawer of this.medicineDrawers) {
      if (drawer.itemId === itemId) {
        return {
          x: drawer.x + drawer.width / 2,
          y: drawer.y + drawer.height / 2,
          item: getItemById(itemId)
        }
      }
    }
    
    // 查找器械抽屉
    for (const drawer of this.toolDrawers) {
      if (drawer.itemId === itemId) {
        return {
          x: drawer.x + drawer.width / 2,
          y: drawer.y + drawer.height / 2,
          item: getItemById(itemId)
        }
      }
    }
    
    return null
  }

  // 绘制托盘和发送按钮（在指定位置）
  renderTray(ctx, trayX, trayY, trayWidth, trayHeight) {
    // 如果没有传入位置参数，使用默认位置（治疗区底部）
    if (trayX === undefined) {
      trayX = this.x + this.width * 0.05
      trayY = this.y + this.height * 0.82
      trayWidth = this.width * 0.5
      trayHeight = this.height * 0.12
    }
    
    // 托盘背景（浅灰色圆角矩形）
    ctx.fillStyle = '#F0F0F0'
    fillRoundRect(ctx, trayX, trayY, trayWidth, trayHeight, 8)
    
    // 托盘边框
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, trayX, trayY, trayWidth, trayHeight, 8)
    
    // 托盘内文字或物品
    if (this.trayItems.length > 0) {
      // 计算每个物品的显示位置和大小
      const itemCount = this.trayItems.length
      const iconSize = trayHeight * 0.55
      const spacing = trayWidth * 0.1
      const totalWidth = itemCount * iconSize * 1.5 + (itemCount - 1) * spacing
      const startX = trayX + (trayWidth - totalWidth) / 2 + iconSize * 0.75
      
      this.trayItems.forEach((item, index) => {
        const iconX = startX + index * (iconSize * 1.5 + spacing)
        const iconY = trayY + trayHeight / 2
        
        // 物品背景圆圈 - 统一使用浅灰色
        ctx.fillStyle = '#E0E0E0'
        ctx.beginPath()
        ctx.arc(iconX, iconY, iconSize * 0.85, 0, Math.PI * 2)
        ctx.fill()
        
        // 绘制物品图标（图标比背景圆圈大一些）
        const itemImage = getItemImage(item.id)
        if (itemImage) {
          const imgSize = iconSize * 1.3
          ctx.drawImage(itemImage, iconX - imgSize/2, iconY - imgSize/2, imgSize, imgSize)
        } else {
          ctx.fillStyle = '#2C3E50'
          ctx.font = `${iconSize * 1.2}px "PingFang SC", "Microsoft YaHei", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(item.icon, iconX, iconY)
        }
      })
    } else {
      // 空托盘提示文字
      ctx.fillStyle = '#999'
      ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('点击器材并配送', trayX + trayWidth / 2, trayY + trayHeight / 2)
    }
    
    // 记录托盘区域
    this.trayBounds = {
      x: trayX,
      y: trayY,
      width: trayWidth,
      height: trayHeight
    }
    
    // 计算按钮区域
    const btnSize = trayHeight * 0.85  // 调整此系数改变按钮大小
    const btnY = trayY + (trayHeight - btnSize) / 2
    const gap = 12  // 调整此值改变按钮间距
    
    // 绘制重置/清空按钮（在托盘右侧，圆形）
    const resetBtnX = trayX + trayWidth + 8
    const hasItems = this.trayItems.length > 0
    
    // 重置按钮按下动效（缩小并颜色变深）
    const resetScale = this.resetButtonPressed ? 0.92 : 1
    const resetOffset = (btnSize * (1 - resetScale)) / 2
    
    // 重置按钮背景 - 根据是否有物品改变颜色（按下时颜色变深）
    if (this.resetButtonPressed) {
      ctx.fillStyle = hasItems ? '#A93226' : '#888888'
    } else {
      ctx.fillStyle = hasItems ? '#E74C3C' : '#CCCCCC'
    }
    ctx.beginPath()
    ctx.arc(resetBtnX + resetOffset + btnSize * resetScale / 2, btnY + resetOffset + btnSize * resetScale / 2, btnSize * resetScale / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // 重置按钮边框
    ctx.strokeStyle = hasItems ? '#C0392B' : '#AAAAAA'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // 重置图标（✕ 清除）
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('✕', resetBtnX + btnSize / 2, btnY + btnSize / 2)
    
    // 记录重置按钮区域（使用原始大小，不受按下动效影响）
    this.resetButtonBounds = {
      x: resetBtnX,
      y: btnY,
      width: btnSize,
      height: btnSize
    }
    
    // 绘制发送按钮（在重置按钮右侧，圆形）
    const sendBtnX = resetBtnX + btnSize + gap
    
    // 发送按钮按下动效（缩小并颜色变深）
    const sendScale = this.sendButtonPressed ? 0.92 : 1
    const sendOffset = (btnSize * (1 - sendScale)) / 2
    
    // 发送按钮背景（按下时颜色变深）
    if (this.sendButtonPressed) {
      ctx.fillStyle = hasItems ? '#1E7E3E' : '#888888'
    } else {
      ctx.fillStyle = hasItems ? '#27AE60' : '#CCCCCC'
    }
    ctx.beginPath()
    ctx.arc(sendBtnX + sendOffset + btnSize * sendScale / 2, btnY + sendOffset + btnSize * sendScale / 2, btnSize * sendScale / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // 发送按钮边框
    ctx.strokeStyle = hasItems ? '#1E8449' : '#AAAAAA'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // 发送图标（纸飞机）
    ctx.fillStyle = '#FFF'
    ctx.font = 'bold 14px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('➤', sendBtnX + btnSize / 2, btnY + btnSize / 2)
    
    // 记录发送按钮区域（使用原始大小）
    this.sendButtonBounds = {
      x: sendBtnX,
      y: btnY,
      width: btnSize,
      height: btnSize
    }
  }

  // 添加物品到托盘（如果不在托盘中）
  addItemToTray(item) {
    // 检查是否已在托盘中
    const exists = this.trayItems.some(i => i.id === item.id)
    if (exists) {
      return { success: false, reason: 'duplicate' }
    }
    // 检查托盘是否已满（最多4个）
    if (this.trayItems.length >= 4) {
      return { success: false, reason: 'full' }
    }
    this.trayItems.push(item)
    return { success: true }
  }

  // 从托盘中移除物品
  removeItemFromTray(itemId) {
    const index = this.trayItems.findIndex(i => i.id === itemId)
    if (index >= 0) {
      this.trayItems.splice(index, 1)
      return true
    }
    return false
  }

  // 清空托盘
  clearTray() {
    this.trayItems = []
  }

  // 获取托盘中的所有物品
  getTrayItems() {
    return this.trayItems
  }

  // 获取托盘物品ID集合（用于匹配）
  getTrayItemIds() {
    return this.trayItems.map(i => i.id).sort()
  }

  // 检查点击是否在发送按钮上
  // 检查点击是否在器材区发送按钮上
  isClickOnEquipmentSendButton(x, y) {
    if (!this.equipmentSendBtnBounds) return false
    const isHit = x >= this.equipmentSendBtnBounds.x && 
                  x <= this.equipmentSendBtnBounds.x + this.equipmentSendBtnBounds.width &&
                  y >= this.equipmentSendBtnBounds.y && 
                  y <= this.equipmentSendBtnBounds.y + this.equipmentSendBtnBounds.height
    if (isHit) {
      // 触发短震动（仅真机）
      this.vibrate()
    }
    return isHit
  }
  
  // 切换物品的选中状态
  toggleItemSelection(itemId) {
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId)
      return false  // 取消选中
    } else {
      this.selectedItems.add(itemId)
      return true  // 选中
    }
  }
  
  // 获取选中的物品列表
  getSelectedItems() {
    return Array.from(this.selectedItems).map(id => getItemById(id)).filter(item => item !== null)
  }
  
  // 清空选中状态
  clearSelection() {
    this.selectedItems.clear()
  }

  // 【废弃】旧的发送按钮检测（治疗区托盘用）
  isClickOnSendButton(x, y) {
    return false
  }

  // 【废弃】重置按钮检测
  isClickOnResetButton(x, y) {
    return false
  }

  // 【废弃】托盘检测
  isClickOnTray(x, y) {
    return false
  }
}
