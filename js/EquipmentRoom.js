import { fillRoundRect, strokeRoundRect, roundRect } from './utils.js'
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
    
    // 选中的物品（新的选择模式）
    this.selectedItems = new Set() // 存储选中的 itemId
    
    // 器材区发送按钮
    this.equipmentSendBtnBounds = null // 发送按钮点击区域
    this.equipmentSendBtnPressed = false // 发送按钮按下状态
    
    // 器材区清空按钮
    this.equipmentClearBtnBounds = null // 清空按钮点击区域
    this.equipmentClearBtnPressed = false // 清空按钮按下状态
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
    // 绘制器材区底部的按钮（发送 + 清空）
    this.renderSendButton(ctx)
    this.renderClearButton(ctx)
  }
  
  // 绘制器材区发送按钮（深蓝果冻发光风格）
  renderSendButton(ctx) {
    // 按钮位置：器材室底部偏左
    const btnWidth = this.width * 0.28
    const btnHeight = 28
    const gap = 20  // 按钮间距
    const btnX = this.x + (this.width - btnWidth * 2 - gap) / 2
    const btnY = this.y + this.height - btnHeight - 4
    
    // 是否有选中的物品
    const hasSelected = this.selectedItems.size > 0
    
    // 按钮按下动效 - Q弹回弹效果
    const btnScale = this.equipmentSendBtnPressed ? 0.92 : 1
    const btnOffsetY = this.equipmentSendBtnPressed ? 2 : 0
    const scaleOffsetX = (btnWidth * (1 - btnScale)) / 2
    const scaleOffsetY = (btnHeight * (1 - btnScale)) / 2
    const drawX = btnX + scaleOffsetX
    const drawY = btnY + scaleOffsetY + btnOffsetY
    const drawW = btnWidth * btnScale
    const drawH = btnHeight * btnScale
    const radius = drawH / 2  // 大圆角，Q版精髓
    
    // 绘制底盘发光弥散阴影
    if (hasSelected && !this.equipmentSendBtnPressed) {
      ctx.save()
      ctx.shadowColor = 'rgba(56, 189, 248, 0.4)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetY = 6
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)'
      fillRoundRect(ctx, drawX, drawY, drawW, drawH, radius)
      ctx.restore()
    }
    
    // 绘制渐变背景（天蓝色果冻）
    const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH)
    if (hasSelected) {
      if (this.equipmentSendBtnPressed) {
        // 按下时颜色变深
        gradient.addColorStop(0, '#38BDF8')
        gradient.addColorStop(1, '#0EA5E9')
      } else {
        // 正常状态：天蓝色渐变
        gradient.addColorStop(0, '#7DD3FC')
        gradient.addColorStop(1, '#38BDF8')
      }
    } else {
      // 未选中状态：浅灰色
      gradient.addColorStop(0, '#E5E7EB')
      gradient.addColorStop(1, '#D1D5DB')
    }
    ctx.fillStyle = gradient
    fillRoundRect(ctx, drawX, drawY, drawW, drawH, radius)
    
    // 绘制顶部高光（内发光效果）- 使用fillRoundRect裁剪
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, drawX + 2, drawY + 2, drawW - 4, drawH / 2 - 2, radius - 2)
    ctx.clip()
    const highlightGradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH / 2)
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = highlightGradient
    ctx.fillRect(drawX, drawY, drawW, drawH / 2)
    ctx.restore()
    
    // 绘制底部暗角厚度
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, drawX + 2, drawY + drawH / 2, drawW - 4, drawH / 2 - 2, radius - 2)
    ctx.clip()
    const shadowGradient = ctx.createLinearGradient(drawX, drawY + drawH / 2, drawX, drawY + drawH)
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
    ctx.fillStyle = shadowGradient
    ctx.fillRect(drawX, drawY + drawH / 2, drawW, drawH / 2)
    ctx.restore()
    
    // 绘制粗白边框（果冻表皮反光）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, drawX, drawY, drawW, drawH, radius)
    
    // 按钮文字
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const btnText = hasSelected ? `发送 (${this.selectedItems.size})` : '发送'
    ctx.fillText(btnText, drawX + drawW / 2, drawY + drawH / 2 + 1)
    
    // 记录按钮点击区域（使用原始大小，不受按下动效影响）
    this.equipmentSendBtnBounds = {
      x: btnX,
      y: btnY,
      width: btnWidth,
      height: btnHeight
    }
  }
  
  // 绘制器材区清空按钮（深海幽暗通透风格）
  renderClearButton(ctx) {
    // 按钮位置：器材室底部偏右（发送按钮右侧）
    const btnWidth = this.width * 0.28
    const btnHeight = 28
    const gap = 20  // 按钮间距
    const sendBtnX = this.x + (this.width - btnWidth * 2 - gap) / 2
    const btnX = sendBtnX + btnWidth + gap
    const btnY = this.y + this.height - btnHeight - 4
    
    // 是否有选中的物品
    const hasSelected = this.selectedItems.size > 0
    
    // 按钮按下动效 - Q弹回弹效果
    const btnScale = this.equipmentClearBtnPressed ? 0.92 : 1
    const btnOffsetY = this.equipmentClearBtnPressed ? 2 : 0
    const scaleOffsetX = (btnWidth * (1 - btnScale)) / 2
    const scaleOffsetY = (btnHeight * (1 - btnScale)) / 2
    const drawX = btnX + scaleOffsetX
    const drawY = btnY + scaleOffsetY + btnOffsetY
    const drawW = btnWidth * btnScale
    const drawH = btnHeight * btnScale
    const radius = drawH / 2  // 大圆角，Q版精髓
    
    // 绘制底盘弥散阴影
    if (hasSelected && !this.equipmentClearBtnPressed) {
      ctx.save()
      ctx.shadowColor = 'rgba(56, 189, 248, 0.25)'
      ctx.shadowBlur = 10
      ctx.shadowOffsetY = 4
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)'
      fillRoundRect(ctx, drawX, drawY, drawW, drawH, radius)
      ctx.restore()
    }
    
    // 绘制背景（天蓝色透明）
    if (hasSelected) {
      if (this.equipmentClearBtnPressed) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'
      } else {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)'
      }
    } else {
      ctx.fillStyle = 'rgba(209, 213, 219, 0.4)'
    }
    fillRoundRect(ctx, drawX, drawY, drawW, drawH, radius)
    
    // 绘制内部高光
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, drawX + 2, drawY + 2, drawW - 4, drawH / 2 - 2, radius - 2)
    ctx.clip()
    const highlightGradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH / 2)
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)')
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = highlightGradient
    ctx.fillRect(drawX, drawY, drawW, drawH / 2)
    ctx.restore()
    
    // 绘制粗白边框（果冻表皮反光）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, drawX, drawY, drawW, drawH, radius)
    
    // 按钮文字（天蓝色）
    if (hasSelected) {
      ctx.fillStyle = '#0284C7'
    } else {
      ctx.fillStyle = '#9CA3AF'
    }
    ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('清空', drawX + drawW / 2, drawY + drawH / 2 + 1)
    
    // 记录按钮点击区域（使用原始大小，不受按下动效影响）
    this.equipmentClearBtnBounds = {
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
    
    // 柜体背景（无边框）
    ctx.fillStyle = '#FFF8DC'
    ctx.fillRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    
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
    
    // 顶部标识（居中文字）
    ctx.fillStyle = '#8B7355'
    ctx.font = `bold ${Math.max(12, this.width * 0.05)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
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
    
    // 柜体背景（无边框）
    ctx.fillStyle = '#E8F8F5'
    ctx.fillRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    
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
    // 顶部标识（居中文字）
    ctx.fillStyle = '#8B7355'
    ctx.font = `bold ${Math.max(12, this.width * 0.05)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('器械柜', cabinetX + cabinetWidth / 2, cabinetY - this.height * 0.035)
  }

  // 绘制单个抽屉
  renderDrawer(ctx, x, y, width, height, item, index, isSelected = false) {
    // 马卡龙黄色卡片风格
    if (isSelected) {
      // 选中状态：浅黄色背景 + 橙色边框
      ctx.fillStyle = '#FFF8E7'
      fillRoundRect(ctx, x, y, width, height, 8)
      
      // 高亮边框
      ctx.strokeStyle = '#F0C050'
      ctx.lineWidth = 2.5
      strokeRoundRect(ctx, x, y, width, height, 8)
    } else {
      // 默认状态：白色卡片 + 淡黄色边框
      ctx.fillStyle = '#FFFFFF'
      fillRoundRect(ctx, x, y, width, height, 8)
      // 柔和边框
      ctx.strokeStyle = '#FFE4C4'
      ctx.lineWidth = 1.5
      strokeRoundRect(ctx, x, y, width, height, 8)
    }
    
    // 图标区域（左侧）
    const iconSize = Math.min(height * 0.6, width * 0.3)
    const iconX = x + width * 0.15
    const iconY = y + height / 2
    
    // 图标背景圆圈 - 马卡龙淡黄色
    ctx.fillStyle = '#FFF5E6'
    ctx.beginPath()
    ctx.arc(iconX + iconSize/2, iconY, iconSize * 0.75, 0, Math.PI * 2)
    ctx.fill()
    
    // 绘制图标（优先使用图片，如果没有则使用emoji）
    const itemImage = getItemImage(item.id)
    if (itemImage) {
      const imgSize = iconSize * 1.3
      ctx.drawImage(itemImage, iconX + iconSize/2 - imgSize/2, iconY - imgSize/2, imgSize, imgSize)
    } else {
      ctx.fillStyle = '#5D4E37'
      ctx.font = `${iconSize * 1.2}px "PingFang SC", "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.icon, iconX + iconSize/2, iconY)
    }
    
    // 物品名称
    ctx.fillStyle = '#5D4E37'
    ctx.font = `bold ${Math.max(11, width * 0.13)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    
    // 处理长名称换行
    const textX = x + width * 0.55
    const textY = y + height / 2
    
    if (item.name.length > 3) {
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
      
      // 橙黄色圆形背景
      ctx.fillStyle = '#F0C050'
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
  
  // 检查点击是否在器材区清空按钮上
  isClickOnEquipmentClearButton(x, y) {
    if (!this.equipmentClearBtnBounds) return false
    const isHit = x >= this.equipmentClearBtnBounds.x && 
                  x <= this.equipmentClearBtnBounds.x + this.equipmentClearBtnBounds.width &&
                  y >= this.equipmentClearBtnBounds.y && 
                  y <= this.equipmentClearBtnBounds.y + this.equipmentClearBtnBounds.height
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
