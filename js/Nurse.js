export default class Nurse {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.name = '小美护士'
    
    // 基础尺寸
    this.baseWidth = 8
    this.baseHeight = 20
    this.width = this.baseWidth
    this.height = this.baseHeight
    
    this.animationTime = 0
    this.bounceOffset = 0
    this.facing = 1
    
    // 根据区域大小计算的缩放比例
    this.scale = 1
    
    // 加载护士图片
    this.nurseImage = null
    this.loadImage()
  }

  loadImage() {
    const img = wx.createImage()
    img.onload = () => {
      this.nurseImage = img
    }
    img.onerror = () => {
      console.warn('Failed to load nurse image: images/nurse.png')
    }
    img.src = 'images/nurse.png'
  }

  setScale(areaWidth) {
    // 护士尺寸：根据区域宽度设置缩放比例
    this.scale = Math.max(0.2, areaWidth / 400)
    this.width = this.baseWidth * this.scale
    this.height = this.baseHeight * this.scale
  }

  update(deltaTime) {
    this.animationTime += deltaTime
    this.bounceOffset = Math.sin(this.animationTime / 500) * -2 * this.scale
  }

  render(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y + this.bounceOffset)
    ctx.scale(this.facing * this.scale, this.scale)
    
    if (this.nurseImage && this.nurseImage.width > 0) {
      // 使用图片绘制护士
      const targetHeight = 100
      const imageScale = targetHeight / this.nurseImage.height
      const drawWidth = this.nurseImage.width * imageScale
      const drawHeight = targetHeight
      
      ctx.drawImage(this.nurseImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    }
    
    ctx.restore()
  }
  
  // 点击检测（扩大点击范围方便玩家点击）
  contains(x, y) {
    // 使用较大的点击区域（以护士为中心的一个矩形区域）
    const hitWidth = 60 * this.scale
    const hitHeight = 120 * this.scale
    const hitX = this.x - hitWidth / 2
    const hitY = this.y - hitHeight / 2
    
    return x >= hitX && x <= hitX + hitWidth &&
           y >= hitY && y <= hitY + hitHeight
  }
}
