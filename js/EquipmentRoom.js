import { fillRoundRect, strokeRoundRect, roundRect } from './utils.js'
import { MEDICINES, TOOLS, EXAM_DEVICES, getItemById, getItemImage } from './Items.js'

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
    this.examDeviceDrawers = [] // 检验设备柜抽屉数组
    
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
    
    // 检测检验设备抽屉
    for (const drawer of this.examDeviceDrawers) {
      if (x >= drawer.x && x <= drawer.x + drawer.width &&
          y >= drawer.y && y <= drawer.y + drawer.height) {
        return drawer.itemId
      }
    }
    
    return null
  }

  render(ctx) {
    // 绘制三个柜子：药品柜、器械柜、检验设备柜
    this.renderMedicineCabinet(ctx)
    this.renderEquipmentCabinet(ctx)
    this.renderExamCabinet(ctx)
    // 绘制器材区底部的按钮（发送 + 清空）
    this.renderSendButton(ctx)
    this.renderClearButton(ctx)
  }
  
  // 绘制器材区发送按钮
  renderSendButton(ctx) {
    // 按钮位置：器材室底部偏左
    const btnWidth = this.width * 0.28
    const btnHeight = 28
    const gap = 20  // 按钮间距
    const btnX = this.x + (this.width - btnWidth * 2 - gap) / 2
    const btnY = this.y + this.height - btnHeight - 4
    
    // 是否有选中的物品
    const hasSelected = this.selectedItems.size > 0
    
    // 按钮样式配置（参考ui.txt）
    const style = {
      topColor: '#38BDF8',      // 顶层主色（天蓝色）
      bottomColor: '#0284C7',   // 底层厚度色（深蓝色）
      textColor: '#FFFFFF',     // 文字颜色（白色）
      thickness: 4,             // 3D厚度
      disabledTopColor: '#E2E8F0',     // 禁用时顶层色
      disabledBottomColor: '#CBD5E1',  // 禁用时底层色
      disabledTextColor: '#64748B'     // 禁用时文字色
    }
    
    // 根据状态选择颜色
    const isEnabled = hasSelected
    const topColor = isEnabled ? style.topColor : style.disabledTopColor
    const bottomColor = isEnabled ? style.bottomColor : style.disabledBottomColor
    const textColor = isEnabled ? style.textColor : style.disabledTextColor
    
    // 按钮按下动效
    const btnPressed = this.equipmentSendBtnPressed
    const pressOffsetY = btnPressed ? style.thickness : 0
    const radius = btnHeight / 2
    
    // 1. 绘制底层阴影/厚度（固定位置）
    ctx.fillStyle = bottomColor
    fillRoundRect(ctx, btnX, btnY + style.thickness, btnWidth, btnHeight, radius)
    
    // 2. 绘制顶层（会随按下状态移动）
    ctx.fillStyle = topColor
    fillRoundRect(ctx, btnX, btnY + pressOffsetY, btnWidth, btnHeight, radius)
    
    // 3. 绘制文字（跟着顶层一起移动）
    ctx.fillStyle = textColor
    ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const btnText = isEnabled ? `发送 (${this.selectedItems.size})` : '发送'
    ctx.fillText(btnText, btnX + btnWidth / 2, btnY + btnHeight / 2 + pressOffsetY)
    
    // 记录按钮点击区域（使用原始大小）
    this.equipmentSendBtnBounds = {
      x: btnX,
      y: btnY,
      width: btnWidth,
      height: btnHeight
    }
  }
  
  // 绘制器材区清空按钮（参考ui.txt设计 - 低存在感防误触风格）
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
    
    // 按钮样式配置（参考ui.txt - 低存在感防误触风格）
    const style = {
      topColor: '#E2E8F0',      // 顶层主色（浅灰色）
      bottomColor: '#CBD5E1',   // 底层厚度色（深灰色）
      textColor: '#64748B',     // 文字颜色（灰色）
      thickness: 4,             // 3D厚度
      disabledTopColor: '#F1F5F9',     // 禁用时顶层色（更浅灰）
      disabledBottomColor: '#E2E8F0',  // 禁用时底层色
      disabledTextColor: '#94A3B8'     // 禁用时文字色（更浅）
    }
    
    // 根据状态选择颜色
    const isEnabled = hasSelected
    const topColor = isEnabled ? style.topColor : style.disabledTopColor
    const bottomColor = isEnabled ? style.bottomColor : style.disabledBottomColor
    const textColor = isEnabled ? style.textColor : style.disabledTextColor
    
    // 按钮按下动效
    const btnPressed = this.equipmentClearBtnPressed
    const pressOffsetY = btnPressed ? style.thickness : 0
    const radius = btnHeight / 2
    
    // 1. 绘制底层阴影/厚度（固定位置）
    ctx.fillStyle = bottomColor
    fillRoundRect(ctx, btnX, btnY + style.thickness, btnWidth, btnHeight, radius)
    
    // 2. 绘制顶层（会随按下状态移动）
    ctx.fillStyle = topColor
    fillRoundRect(ctx, btnX, btnY + pressOffsetY, btnWidth, btnHeight, radius)
    
    // 3. 绘制文字（跟着顶层一起移动）
    ctx.fillStyle = textColor
    ctx.font = 'bold 13px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('清空', btnX + btnWidth / 2, btnY + btnHeight / 2 + pressOffsetY)
    
    // 记录按钮点击区域（使用原始大小）
    this.equipmentClearBtnBounds = {
      x: btnX,
      y: btnY,
      width: btnWidth,
      height: btnHeight
    }
  }

  renderMedicineCabinet(ctx) {
    // 左侧药品柜 - 宽度调小为 0.26
    const cabinetWidth = this.width * 0.26
    const cabinetX = this.x + this.width * 0.015
    const cabinetY = this.y + this.height * 0.16
    
    // 清空之前的抽屉区域
    this.medicineDrawers = []
    
    // 4个抽屉（高度减5像素，为底部发送按钮留出空间）
    const drawerCount = 4
    const drawerMargin = cabinetWidth * 0.08
    // 基于原始高度计算抽屉高度（整体高度调小）
    const originalCabinetHeight = this.height * 0.65
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
      
      // 绘制抽屉（使用较小的缩放比例）
      this.renderDrawer(ctx, drawerX, drawerY, drawerW, drawerHeight, MEDICINES[i], i, isSelected, 0.85)
      
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
    ctx.font = `bold ${Math.max(10, this.width * 0.04)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('药品柜', cabinetX + cabinetWidth / 2, cabinetY - this.height * 0.035)
  }

  renderEquipmentCabinet(ctx) {
    // 中间器械柜 - 宽度调小为 0.26
    const cabinetWidth = this.width * 0.26
    const cabinetX = this.x + this.width * 0.295  // 0.015 + 0.26 + 0.02 间距
    const cabinetY = this.y + this.height * 0.16
    
    // 清空之前的抽屉区域
    this.toolDrawers = []
    
    // 4个抽屉（高度减5像素，为底部发送按钮留出空间）
    const drawerCount = 4
    const drawerMargin = cabinetWidth * 0.08
    // 基于原始高度计算抽屉高度（整体高度调小）
    const originalCabinetHeight = this.height * 0.65
    const drawerHeight = (originalCabinetHeight - drawerMargin * (drawerCount + 1)) / drawerCount - 5
    
    // 根据实际抽屉高度计算柜体高度
    const cabinetHeight = drawerMargin + drawerCount * (drawerHeight + drawerMargin)
    
    // 柜体背景（无边框）- 和药品柜使用相同的颜色
    ctx.fillStyle = '#FFF8DC'
    ctx.fillRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    
    for (let i = 0; i < drawerCount; i++) {
      const drawerY = cabinetY + drawerMargin + i * (drawerHeight + drawerMargin)
      const drawerX = cabinetX + drawerMargin
      const drawerW = cabinetWidth - drawerMargin * 2
      
      // 检查是否被选中
      const isSelected = this.selectedItems.has(TOOLS[i].id)
      
      // 绘制抽屉（使用较小的缩放比例）
      this.renderDrawer(ctx, drawerX, drawerY, drawerW, drawerHeight, TOOLS[i], i, isSelected, 0.85)
      
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
    ctx.fillStyle = '#8B7355'
    ctx.font = `bold ${Math.max(10, this.width * 0.04)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('器械柜', cabinetX + cabinetWidth / 2, cabinetY - this.height * 0.035)
  }
  
  renderExamCabinet(ctx) {
    // 右侧检验设备柜 - 宽度 0.26
    const cabinetWidth = this.width * 0.26
    const cabinetX = this.x + this.width * 0.575  // 0.015 + 0.26 + 0.02 + 0.26 + 0.02
    const cabinetY = this.y + this.height * 0.16
    
    // 清空之前的抽屉区域
    this.examDeviceDrawers = []
    
    // 5个抽屉（高度减5像素，为底部发送按钮留出空间）
    const drawerCount = 5
    const drawerMargin = cabinetWidth * 0.08
    // 基于原始高度计算抽屉高度（整体高度调小）
    const originalCabinetHeight = this.height * 0.65
    const drawerHeight = (originalCabinetHeight - drawerMargin * (drawerCount + 1)) / drawerCount - 5
    
    // 根据实际抽屉高度计算柜体高度
    const cabinetHeight = drawerMargin + drawerCount * (drawerHeight + drawerMargin)
    
    // 柜体背景（使用淡蓝色区分）
    ctx.fillStyle = '#E8F4F8'
    ctx.fillRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    
    for (let i = 0; i < drawerCount; i++) {
      const drawerY = cabinetY + drawerMargin + i * (drawerHeight + drawerMargin)
      const drawerX = cabinetX + drawerMargin
      const drawerW = cabinetWidth - drawerMargin * 2
      
      // 检查是否被选中
      const isSelected = this.selectedItems.has(EXAM_DEVICES[i].id)
      
      // 绘制抽屉（使用较小的缩放比例）
      this.renderDrawer(ctx, drawerX, drawerY, drawerW, drawerHeight, EXAM_DEVICES[i], i, isSelected, 0.85)
      
      // 记录抽屉点击区域
      this.examDeviceDrawers.push({
        x: drawerX,
        y: drawerY,
        width: drawerW,
        height: drawerHeight,
        itemId: EXAM_DEVICES[i].id
      })
    }
    
    // 顶部标识
    ctx.fillStyle = '#5D8AA8'
    ctx.font = `bold ${Math.max(10, this.width * 0.04)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('检验设备', cabinetX + cabinetWidth / 2, cabinetY - this.height * 0.035)
  }

  // 绘制单个抽屉
  renderDrawer(ctx, x, y, width, height, item, index, isSelected = false, scale = 1.0) {
    // 马卡龙黄色卡片风格
    const cornerRadius = 8 * scale
    if (isSelected) {
      // 选中状态：浅蓝色背景 + 蓝色边框
      ctx.fillStyle = '#E0F2FE'
      fillRoundRect(ctx, x, y, width, height, cornerRadius)
      
      // 高亮边框（蓝色，与发送按钮一致）
      ctx.strokeStyle = '#38BDF8'
      ctx.lineWidth = 2.5 * scale
      strokeRoundRect(ctx, x, y, width, height, cornerRadius)
    } else {
      // 默认状态：白色卡片 + 淡黄色边框
      ctx.fillStyle = '#FFFFFF'
      fillRoundRect(ctx, x, y, width, height, cornerRadius)
      // 柔和边框
      ctx.strokeStyle = '#FFE4C4'
      ctx.lineWidth = 1.5 * scale
      strokeRoundRect(ctx, x, y, width, height, cornerRadius)
    }
    
    // 图标区域（左侧）
    const iconSize = Math.min(height * 0.6, width * 0.3) * scale
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
    ctx.font = `bold ${Math.max(9, width * 0.13 * scale)}px "PingFang SC", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'left'
    
    // 处理长名称换行
    const textX = x + width * 0.55
    const textY = y + height / 2
    
    if (item.name.length > 3) {
      ctx.textBaseline = 'bottom'
      ctx.fillText(item.name.substring(0, 2), textX, textY)
      ctx.textBaseline = 'top'
      ctx.fillText(item.name.substring(2), textX, textY + 2 * scale)
    } else {
      ctx.textBaseline = 'middle'
      ctx.fillText(item.name, textX, textY)
    }
    
    // 如果被选中，在左上角绘制勾号
    if (isSelected) {
      const checkSize = Math.min(width, height) * 0.25
      const checkX = x + checkSize * 0.5
      const checkY = y + checkSize * 0.5
      
      // 蓝色圆形背景（与发送按钮一致）
      ctx.fillStyle = '#38BDF8'
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
    
    // 查找检验设备抽屉
    for (const drawer of this.examDeviceDrawers) {
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

  
}
