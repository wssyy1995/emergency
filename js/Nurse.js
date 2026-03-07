export default class Nurse {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.name = '小美护士'
    
    // 与病人一致的尺寸 - 已缩小25%
    this.baseWidth = 21
    this.baseHeight = 33.75
    this.width = this.baseWidth
    this.height = this.baseHeight
    
    this.animationTime = 0
    this.bounceOffset = 0
    this.blinkTimer = 0
    this.isBlinking = false
    this.facing = 1
    
    // 根据区域大小计算的缩放比例
    this.scale = 1
  }

  setScale(areaWidth) {
    // 根据区域宽度设置缩放比例
    this.scale = Math.max(0.7, areaWidth / 350)
    this.width = this.baseWidth * this.scale
    this.height = this.baseHeight * this.scale
  }

  update(deltaTime) {
    this.animationTime += deltaTime
    this.blinkTimer += deltaTime
    
    if (this.blinkTimer > 2000 + Math.random() * 1500) {
      this.isBlinking = true
      if (this.blinkTimer > 2100) {
        this.isBlinking = false
        this.blinkTimer = 0
      }
    }
    
    this.bounceOffset = Math.sin(this.animationTime / 500) * -2 * this.scale
  }

  render(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y + this.bounceOffset)
    ctx.scale(this.facing * this.scale, this.scale)
    
    // 裁剪区域 - 显示到腰部中间
    ctx.beginPath()
    ctx.rect(-50, -50, 100, 68)
    ctx.clip()
    
    // 护士上半身（重新设计 - 粉色护士服）
    // 身体主体
    ctx.fillStyle = '#FFB7B2'
    ctx.beginPath()
    ctx.moveTo(-12, 5)
    ctx.quadraticCurveTo(-14, 20, -11, 35)
    ctx.lineTo(11, 35)
    ctx.quadraticCurveTo(14, 20, 12, 5)
    ctx.quadraticCurveTo(0, 8, -12, 5)
    ctx.fill()
    
    // 护士服领口
    ctx.fillStyle = '#FFF'
    ctx.beginPath()
    ctx.moveTo(-8, 8)
    ctx.lineTo(0, 18)
    ctx.lineTo(8, 8)
    ctx.lineTo(5, 5)
    ctx.lineTo(-5, 5)
    ctx.closePath()
    ctx.fill()
    
    // 白色围裙
    ctx.fillStyle = '#FFF'
    ctx.beginPath()
    ctx.moveTo(-10, 15)
    ctx.lineTo(-9, 35)
    ctx.lineTo(9, 35)
    ctx.lineTo(10, 15)
    ctx.quadraticCurveTo(0, 18, -10, 15)
    ctx.fill()
    
    // 围裙粉色边框
    ctx.strokeStyle = '#FFB7B2'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-10, 15)
    ctx.lineTo(-9, 35)
    ctx.lineTo(9, 35)
    ctx.lineTo(10, 15)
    ctx.stroke()
    
    // 手臂（袖子）
    ctx.fillStyle = '#FFB7B2'
    ctx.beginPath()
    ctx.ellipse(-16, 12, 5, 10, -0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(16, 12, 5, 10, 0.4, 0, Math.PI * 2)
    ctx.fill()
    
    // 手
    ctx.fillStyle = '#FFDFC4'
    ctx.beginPath()
    ctx.arc(-18, 20, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(18, 20, 4, 0, Math.PI * 2)
    ctx.fill()
    
    // 脖子
    ctx.fillStyle = '#FFDFC4'
    ctx.fillRect(-4, 0, 8, 6)
    
    // 脸型（重新设计 - 更可爱的椭圆形）
    ctx.fillStyle = '#FFDFC4'
    ctx.beginPath()
    ctx.ellipse(0, -15, 15, 17, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 腮红（适应新脸型）
    ctx.fillStyle = 'rgba(255,150,150,0.35)'
    ctx.beginPath()
    ctx.arc(-9, -10, 3.5, 0, Math.PI * 2)
    ctx.arc(9, -10, 3.5, 0, Math.PI * 2)
    ctx.fill()
    
    // 短发（适应新脸型）
    ctx.fillStyle = '#8D6E63'
    ctx.beginPath()
    ctx.arc(0, -18, 16, Math.PI * 1.15, Math.PI * -0.15)
    ctx.fill()
    // 短发两侧
    ctx.beginPath()
    ctx.ellipse(-13, -12, 4, 8, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(13, -12, 4, 8, 0.3, 0, Math.PI * 2)
    ctx.fill()
    
    // 刘海
    ctx.beginPath()
    ctx.ellipse(-6, -26, 5, 3.5, -0.4, 0, Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(6, -26, 5, 3.5, 0.4, 0, Math.PI)
    ctx.fill()
    
    // 粉色护士帽（适应新发型）
    ctx.fillStyle = '#FFB7B2'
    ctx.beginPath()
    ctx.moveTo(-15, -30)
    ctx.lineTo(-13, -42)
    ctx.quadraticCurveTo(0, -46, 13, -42)
    ctx.lineTo(15, -30)
    ctx.quadraticCurveTo(0, -34, -15, -30)
    ctx.fill()
    
    // 帽子上的十字（适应新帽子位置）
    ctx.fillStyle = '#E74C3C'
    ctx.fillRect(-2, -40, 4, 8)
    ctx.fillRect(-4, -38, 8, 4)
    
    // 微笑的嘴巴
    ctx.strokeStyle = '#C0392B'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, -4, 3, 0.2, Math.PI - 0.2)
    ctx.stroke()
    
    // 眼睛（适应新脸型）
    if (this.isBlinking) {
      ctx.strokeStyle = '#2C3E50'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-9, -20)
      ctx.quadraticCurveTo(-5, -16, -1, -20)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(1, -20)
      ctx.quadraticCurveTo(5, -16, 9, -20)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#2C3E50'
      ctx.beginPath()
      ctx.ellipse(-5, -20, 3.5, 4.5, 0, 0, Math.PI * 2)
      ctx.ellipse(5, -20, 3.5, 4.5, 0, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.arc(-3, -22, 1.2, 0, Math.PI * 2)
      ctx.arc(7, -22, 1.2, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }
}
