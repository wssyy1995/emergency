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
    
    // 动画控制：第一个病人生成前暂停动画
    this.animationEnabled = false
    
    // 加载护士图片
    this.nurseImage = null
    this.nurseHelloImage = null
    this.lightbulbImage = null
    this.isNewPlayer = false
    
    this.loadImage()
  }

  loadImage() {
    // 加载普通护士图片
    const img = wx.createImage()
    img.onload = () => {
      this.nurseImage = img
    }
    img.onerror = () => {
      console.warn('Failed to load nurse image: images/nurse.png')
    }
    img.src = 'images/nurse.png'
    
    // 加载新玩家欢迎图片
    const helloImg = wx.createImage()
    helloImg.onload = () => {
      this.nurseHelloImage = helloImg
    }
    helloImg.onerror = () => {
      console.warn('Failed to load nurse hello image: images/nurse_hello.png')
    }
    helloImg.src = 'images/nurse_hello.png'
    
    // 加载灯泡图标
    const bulbImg = wx.createImage()
    bulbImg.onload = () => {
      this.lightbulbImage = bulbImg
    }
    bulbImg.onerror = () => {
      console.warn('Failed to load lightbulb image: images/lightbulb.png')
    }
    bulbImg.src = 'images/lightbulb.png'
  }
  
  // 设置新玩家模式
  setNewPlayerMode(isNewPlayer) {
    this.isNewPlayer = isNewPlayer
  }

  setScale(areaWidth) {
    // 护士尺寸：根据区域宽度设置缩放比例
    this.scale = Math.max(0.2, areaWidth / 400)
    this.width = this.baseWidth * this.scale
    this.height = this.baseHeight * this.scale
  }

  update(deltaTime) {
    this.animationTime += deltaTime
    // 只有启用动画时才计算跳动效果
    if (this.animationEnabled) {
      this.bounceOffset = Math.sin(this.animationTime / 500) * -2 * this.scale
    } else {
      this.bounceOffset = 0
    }
  }
  
  // 启用动画（第一个病人生成后调用）
  enableAnimation() {
    this.animationEnabled = true
  }

  render(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y + this.bounceOffset)
    ctx.scale(this.facing * this.scale, this.scale)
    
    // 【新玩家指引】呼吸圈效果
    if (this.isNewPlayer) {
      this.renderBreathRing(ctx)
    }
    
    // 根据是否新玩家选择图片
    const currentImage = (this.isNewPlayer && this.nurseHelloImage && this.nurseHelloImage.width > 0) 
      ? this.nurseHelloImage 
      : this.nurseImage
    
    if (currentImage && currentImage.width > 0) {
      // 使用图片绘制护士
      const targetHeight = 100
      const imageScale = targetHeight / currentImage.height
      const drawWidth = currentImage.width * imageScale
      const drawHeight = targetHeight
      
      ctx.drawImage(currentImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    }
    
    // 新玩家模式：在护士头旁边绘制灯泡图标（在护士坐标系内绘制）
    if (this.isNewPlayer && this.lightbulbImage && this.lightbulbImage.width > 0) {
      const bulbSize = 45  // 固定大小，不受 scale 影响
      // 护士头大约在 y = -45 的位置（护士高度100，中心在0，头在上半部分）
      const bulbX = 45  // 头的右侧
      const bulbY = -55  // 头的上方
      
      // 添加上下浮动动画
      const bulbBounce = Math.sin(this.animationTime / 300) * 4
      
      ctx.drawImage(this.lightbulbImage, bulbX - bulbSize / 2, bulbY - bulbSize / 2 + bulbBounce, bulbSize, bulbSize)
    }
    
    ctx.restore()
  }
  
  // 【新玩家指引】渲染聚光灯效果（四周暗，中间亮）
  renderSpotlight(ctx) {
    // 获取屏幕尺寸（使用护士位置周围的大范围）
    const screenWidth = ctx.canvas.width / (ctx.getTransform().a || 1)
    const screenHeight = ctx.canvas.height / (ctx.getTransform().d || 1)
    
    // 聚光灯中心在护士位置
    const centerX = this.x
    const centerY = this.y
    const spotlightRadius = 30 * this.scale  // 高亮区域半径
    
    ctx.save()
    
    // 创建径向渐变：中心透明，边缘半透明黑色
    const gradient = ctx.createRadialGradient(
      centerX, centerY, spotlightRadius * 0.5,  // 内圈（完全透明）
      centerX, centerY, spotlightRadius * 3      // 外圈（半透明黑色）
    )
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')           // 中心完全透明
    gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.05)')      // 轻微暗化（降低）
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.15)')      // 中等暗化（降低）
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)')        // 边缘较暗（降低）
    
    // 绘制覆盖全屏的遮罩
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, screenWidth, screenHeight)
    
    ctx.restore()
  }
  
  // 【新玩家指引】渲染呼吸圈效果
  renderBreathRing(ctx) {
    // 呼吸动画周期 2 秒
    const breathCycle = 2000
    const progress = (this.animationTime % breathCycle) / breathCycle
    
    // 使用正弦函数计算呼吸强度 (0 -> 1 -> 0)
    const breathIntensity = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5
    
    // 基础半径
    const baseRadius = 40
    // 呼吸扩展半径 (0 ~ 15)
    const expandRadius = 20 * breathIntensity
    
    // 绘制呼吸圈
    ctx.save()
    
    // 外圈（白色，带透明度）
    ctx.beginPath()
    ctx.arc(0, -10, baseRadius + expandRadius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * (1 - breathIntensity)})`
    ctx.lineWidth = 3
    ctx.stroke()
    
    // 内圈（更亮的白色）
    ctx.beginPath()
    ctx.arc(0, -10, baseRadius + expandRadius * 0.7, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * (1 - breathIntensity)})`
    ctx.lineWidth = 2
    ctx.stroke()
    
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
