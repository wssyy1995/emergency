import { fillRoundRect, strokeRoundRect } from './utils.js'
import { MEDICINES, TOOLS, getItemById, getItemImage } from './Items.js'

export default class EquipmentRoom {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    
    // 可点击区域 - 现在每个抽屉是一个独立区域
    this.medicineDrawers = [] // 药品柜抽屉数组
    this.toolDrawers = [] // 器械柜抽屉数组
    
    // 托盘状态
    this.trayItems = [] // 当前托盘中的物品数组（最多2个）
    this.trayBounds = null // 托盘点击区域
    this.sendButtonBounds = null // 发送按钮点击区域
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
    // 托盘移到治疗区底部，不在器材室渲染
  }

  renderMedicineCabinet(ctx) {
    // 左侧药品柜 - 宽度增大，边距减小
    const cabinetWidth = this.width * 0.46
    const cabinetHeight = this.height * 0.75
    const cabinetX = this.x + this.width * 0.03
    const cabinetY = this.y + this.height * 0.2
    
    // 柜体外框
    ctx.fillStyle = '#FFF8DC'
    ctx.fillRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 3
    ctx.strokeRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    
    // 清空之前的抽屉区域
    this.medicineDrawers = []
    
    // 4个抽屉
    const drawerCount = 4
    const drawerMargin = cabinetWidth * 0.06
    const drawerHeight = (cabinetHeight - drawerMargin * (drawerCount + 1)) / drawerCount
    
    for (let i = 0; i < drawerCount; i++) {
      const drawerY = cabinetY + drawerMargin + i * (drawerHeight + drawerMargin)
      const drawerX = cabinetX + drawerMargin
      const drawerW = cabinetWidth - drawerMargin * 2
      
      // 绘制抽屉
      this.renderDrawer(ctx, drawerX, drawerY, drawerW, drawerHeight, MEDICINES[i], i)
      
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
    const cabinetHeight = this.height * 0.75
    const cabinetX = this.x + this.width - cabinetWidth - this.width * 0.03
    const cabinetY = this.y + this.height * 0.2
    
    // 柜体外框
    ctx.fillStyle = '#E8F8F5'
    ctx.fillRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 3
    ctx.strokeRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    
    // 清空之前的抽屉区域
    this.toolDrawers = []
    
    // 4个抽屉
    const drawerCount = 4
    const drawerMargin = cabinetWidth * 0.06
    const drawerHeight = (cabinetHeight - drawerMargin * (drawerCount + 1)) / drawerCount
    
    for (let i = 0; i < drawerCount; i++) {
      const drawerY = cabinetY + drawerMargin + i * (drawerHeight + drawerMargin)
      const drawerX = cabinetX + drawerMargin
      const drawerW = cabinetWidth - drawerMargin * 2
      
      // 绘制抽屉
      this.renderDrawer(ctx, drawerX, drawerY, drawerW, drawerHeight, TOOLS[i], i)
      
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
  renderDrawer(ctx, x, y, width, height, item, index) {
    // 抽屉背景
    ctx.fillStyle = '#F5F5F5'
    fillRoundRect(ctx, x, y, width, height, 6)
    
    // 抽屉边框
    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, x, y, width, height, 6)
    
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
    const btnSize = trayHeight * 0.7
    const btnY = trayY + (trayHeight - btnSize) / 2
    const gap = 6
    
    // 绘制重置/清空按钮（在托盘右侧，圆形）
    const resetBtnX = trayX + trayWidth + 8
    const hasItems = this.trayItems.length > 0
    
    // 重置按钮背景 - 根据是否有物品改变颜色
    ctx.fillStyle = hasItems ? '#E74C3C' : '#CCCCCC'
    ctx.beginPath()
    ctx.arc(resetBtnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2)
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
    
    // 记录重置按钮区域
    this.resetButtonBounds = {
      x: resetBtnX,
      y: btnY,
      width: btnSize,
      height: btnSize
    }
    
    // 绘制发送按钮（在重置按钮右侧，圆形）
    const sendBtnX = resetBtnX + btnSize + gap
    
    // 发送按钮背景
    ctx.fillStyle = hasItems ? '#27AE60' : '#CCCCCC'
    ctx.beginPath()
    ctx.arc(sendBtnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2)
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
    
    // 记录发送按钮区域
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
    // 检查托盘是否已满（最多2个）
    if (this.trayItems.length >= 2) {
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
  isClickOnSendButton(x, y) {
    if (!this.sendButtonBounds) return false
    // 圆形按钮检测
    const centerX = this.sendButtonBounds.x + this.sendButtonBounds.width / 2
    const centerY = this.sendButtonBounds.y + this.sendButtonBounds.height / 2
    const radius = this.sendButtonBounds.width / 2
    const dx = x - centerX
    const dy = y - centerY
    return dx * dx + dy * dy <= radius * radius
  }

  // 检查点击是否在重置按钮上
  isClickOnResetButton(x, y) {
    if (!this.resetButtonBounds) return false
    // 圆形按钮检测
    const centerX = this.resetButtonBounds.x + this.resetButtonBounds.width / 2
    const centerY = this.resetButtonBounds.y + this.resetButtonBounds.height / 2
    const radius = this.resetButtonBounds.width / 2
    const dx = x - centerX
    const dy = y - centerY
    return dx * dx + dy * dy <= radius * radius
  }

  // 检查点击是否在托盘上
  isClickOnTray(x, y) {
    if (!this.trayBounds) return false
    return x >= this.trayBounds.x && x <= this.trayBounds.x + this.trayBounds.width &&
           y >= this.trayBounds.y && y <= this.trayBounds.y + this.trayBounds.height
  }
}
