import { fillRoundRect, strokeRoundRect } from './utils.js'

export default class EquipmentRoom {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  update(deltaTime) {
    // 无需更新
  }

  render(ctx) {
    // 只绘制两个柜子：药品柜和器械柜
    this.renderMedicineCabinet(ctx)
    this.renderEquipmentCabinet(ctx)
  }

  renderMedicineCabinet(ctx) {
    // 左侧药品柜
    const cabinetWidth = this.width * 0.4
    const cabinetHeight = this.height * 0.7
    const cabinetX = this.x + this.width * 0.08
    const cabinetY = this.y + this.height * 0.15
    
    // 柜体
    ctx.fillStyle = '#FFF8DC'
    ctx.fillRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    ctx.strokeStyle = '#DAA520'
    ctx.lineWidth = 2
    ctx.strokeRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    
    // 抽屉
    const drawerCount = 4
    const drawerHeight = cabinetHeight * 0.18
    const drawerGap = cabinetHeight * 0.04
    
    for (let i = 0; i < drawerCount; i++) {
      const drawerY = cabinetY + drawerGap + i * (drawerHeight + drawerGap)
      
      ctx.fillStyle = '#FFE4B5'
      ctx.fillRect(cabinetX + cabinetWidth * 0.05, drawerY, cabinetWidth * 0.9, drawerHeight)
      ctx.strokeStyle = '#DEB887'
      ctx.lineWidth = 1
      ctx.strokeRect(cabinetX + cabinetWidth * 0.05, drawerY, cabinetWidth * 0.9, drawerHeight)
      
      // 把手
      ctx.fillStyle = '#8B4513'
      ctx.beginPath()
      ctx.arc(cabinetX + cabinetWidth / 2, drawerY + drawerHeight / 2, 3, 0, Math.PI * 2)
      ctx.fill()
      
      // 标签
      ctx.fillStyle = '#8B4513'
      ctx.font = `${Math.max(8, this.width * 0.025)}px sans-serif`
      ctx.textAlign = 'center'
      const labels = ['抗生素', '止痛药', '维生素', '注射液']
      ctx.fillText(labels[i], cabinetX + cabinetWidth / 2, drawerY + drawerHeight * 0.75)
    }
    
    // 顶部标识
    ctx.fillStyle = '#E74C3C'
    ctx.fillRect(cabinetX, cabinetY - this.height * 0.06, cabinetWidth, this.height * 0.06)
    ctx.fillStyle = '#FFF'
    ctx.font = `bold ${Math.max(10, this.width * 0.035)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('💊 药品柜', cabinetX + cabinetWidth / 2, cabinetY - this.height * 0.03)
  }

  renderEquipmentCabinet(ctx) {
    // 右侧器械柜
    const cabinetWidth = this.width * 0.4
    const cabinetHeight = this.height * 0.6
    const cabinetX = this.x + this.width - cabinetWidth - this.width * 0.08
    const cabinetY = this.y + this.height * 0.15
    
    // 柜体
    ctx.fillStyle = '#E8F8F5'
    ctx.fillRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    ctx.strokeStyle = '#1ABC9C'
    ctx.lineWidth = 2
    ctx.strokeRect(cabinetX, cabinetY, cabinetWidth, cabinetHeight)
    
    
    // 内部器械
    ctx.font = `${Math.max(14, this.width * 0.06)}px sans-serif`
    ctx.textAlign = 'center'
    const tools = ['🩺', '💉', '✂️', '🌡️']
    for (let i = 0; i < 4; i++) {
      const row = Math.floor(i / 2)
      const col = i % 2
      const toolX = cabinetX + cabinetWidth * 0.25 + col * cabinetWidth * 0.4
      const toolY = cabinetY + cabinetHeight * 0.25 + row * cabinetHeight * 0.25
      ctx.fillText(tools[i], toolX, toolY)
    }
    
    // 顶部标识
    ctx.fillStyle = '#27AE60'
    ctx.fillRect(cabinetX, cabinetY - this.height * 0.06, cabinetWidth, this.height * 0.06)
    ctx.fillStyle = '#FFF'
    ctx.font = `bold ${Math.max(10, this.width * 0.035)}px sans-serif`
    ctx.fillText('🩺 器械柜', cabinetX + cabinetWidth / 2, cabinetY - this.height * 0.03)
  }
}
