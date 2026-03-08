export default class Nurse {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.name = '小美护士'
    
    // 基础尺寸
    this.baseWidth = 21
    this.baseHeight = 33.75
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
    // 根据区域宽度设置缩放比例
    this.scale = Math.max(0.2, areaWidth / 350)
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
}
