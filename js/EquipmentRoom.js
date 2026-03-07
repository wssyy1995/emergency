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
  }

  renderMedicineCabinet(ctx) {
    // 左侧药品柜
    const cabinetWidth = this.width * 0.4
    const cabinetHeight = this.height * 0.75
    const cabinetX = this.x + this.width * 0.06
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
    ctx.font = `bold ${Math.max(14, this.width * 0.05)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('药品柜', cabinetX + cabinetWidth / 2, cabinetY - this.height * 0.035)
  }

  renderEquipmentCabinet(ctx) {
    // 右侧器械柜
    const cabinetWidth = this.width * 0.4
    const cabinetHeight = this.height * 0.75
    const cabinetX = this.x + this.width - cabinetWidth - this.width * 0.06
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
    ctx.font = `bold ${Math.max(14, this.width * 0.05)}px sans-serif`
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
    
    // 图标区域（左侧）
    const iconSize = Math.min(height * 0.5, width * 0.25)
    const iconX = x + width * 0.12
    const iconY = y + height / 2
    
    // 图标背景圆圈
    ctx.fillStyle = '#E8E8E8'
    ctx.beginPath()
    ctx.arc(iconX + iconSize/2, iconY, iconSize * 0.7, 0, Math.PI * 2)
    ctx.fill()
    
    // 绘制图标（优先使用图片，如果没有则使用emoji）
    const itemImage = getItemImage(item.id)
    if (itemImage) {
      // 绘制图片
      const imgSize = iconSize * 1.2
      ctx.drawImage(itemImage, iconX + iconSize/2 - imgSize/2, iconY - imgSize/2, imgSize, imgSize)
    } else {
      // 使用emoji回退
      ctx.fillStyle = '#2C3E50'
      ctx.font = `${iconSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.icon, iconX + iconSize/2, iconY)
    }
    
    // 物品名称（与icon之间增加间距）
    ctx.fillStyle = '#2C3E50'
    ctx.font = `bold ${Math.max(10, width * 0.12)}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.name, x + width * 0.40, y + height / 2)
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
}
