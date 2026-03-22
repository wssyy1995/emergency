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
    this.isNewPlayer = false
    
    // 逐字显示文字
    this.welcomeText = '早上好！我是护士小美，给第一天上班的你准备了一份指南，快看看！'
    this.textDisplayProgress = 0  // 当前显示到的字符位置
    this.textDisplayTimer = 0     // 文字显示计时器
    this.textDisplayInterval = 100 // 每个字间隔（毫秒），更慢
    
    // 文字显示完成后自动消失计时器
    this.welcomeCompleteTimer = 0  // 显示完成后的计时器
    this.welcomeCompleteDelay = 2000 // 显示完成后延迟2秒自动消失
    
    // 准备提示气泡
    this.readyText = '请准备，病人马上到来！'
    this.showReadyBubble = false   // 是否显示准备气泡
    this.readyBubbleTimer = 0      // 准备气泡计时器
    this.readyBubbleDuration = 3000 // 准备气泡显示时长（3秒）
    
    // 【关卡提示】第2关及以后的灯泡提示
    this.showLevelHint = false
    
    // 【升级系统】当前升级ID（null 表示未升级）
    this.currentUpgradeId = null
    this.upgradedImage = null  // 升级后的图片
    
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
    
  }
  
  // 设置新玩家模式
  setNewPlayerMode(isNewPlayer) {
    this.isNewPlayer = isNewPlayer
    if (isNewPlayer) {
      // 重置文字显示进度
      this.textDisplayProgress = 0
      this.textDisplayTimer = 0
    }
  }
  
  // 【关卡提示】设置是否显示灯泡提示（第2关及以后）
  setLevelHint(showHint) {
    this.showLevelHint = showHint
  }

  setScale(areaWidth) {
    // 护士尺寸：根据区域宽度设置缩放比例
    this.scale = Math.max(0.2, areaWidth / 400)
    this.width = this.baseWidth * this.scale
    this.height = this.baseHeight * this.scale
  }

  update(deltaTime) {
    this.animationTime += deltaTime
    
    // 【新玩家指引】更新逐字显示进度
    if (this.isNewPlayer) {
      this.textDisplayTimer += deltaTime
      if (this.textDisplayTimer >= this.textDisplayInterval) {
        this.textDisplayTimer = 0
        if (this.textDisplayProgress < this.welcomeText.length) {
          this.textDisplayProgress++
        }
      }
      
      // 文字显示完全后，延迟2秒自动消失
      if (this.textDisplayProgress >= this.welcomeText.length) {
        this.welcomeCompleteTimer += deltaTime
        if (this.welcomeCompleteTimer >= this.welcomeCompleteDelay) {
          this.isNewPlayer = false  // 隐藏欢迎气泡
        }
      }
    }
    
    // 【准备气泡】计时器更新
    if (this.showReadyBubble) {
      this.readyBubbleTimer += deltaTime
      if (this.readyBubbleTimer >= this.readyBubbleDuration) {
        this.showReadyBubble = false
        this.readyBubbleTimer = 0
      }
    }
    
    // 只有启用动画时才计算跳动效果
    if (this.animationEnabled) {
      this.bounceOffset = Math.sin(this.animationTime / 500) * -2 * this.scale
    } else {
      this.bounceOffset = 0
    }
  }
  
  // 显示准备气泡（新玩家指引第二步）
  showReadyHint() {
    this.showReadyBubble = true
    this.readyBubbleTimer = 0
  }
  
  // 启用动画（第一个病人生成后调用）
  enableAnimation() {
    this.animationEnabled = true
  }

  render(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y + this.bounceOffset)
    ctx.scale(this.facing * this.scale, this.scale)
    
    // 根据是否新玩家选择图片
    const currentImage = (this.isNewPlayer && this.nurseHelloImage && this.nurseHelloImage.width > 0) 
      ? this.nurseHelloImage 
      : this.getCurrentImage()
    
    if (currentImage && currentImage.width > 0) {
      // 使用图片绘制护士
      const targetHeight = 100
      const imageScale = targetHeight / currentImage.height
      const drawWidth = currentImage.width * imageScale
      const drawHeight = targetHeight
      
      ctx.drawImage(currentImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    }
    
    ctx.restore()
    
    // 【新玩家指引】在护士头部左侧绘制呼吸气泡
    if (this.showReadyBubble) {
      // 显示准备气泡（第二步）
      this.renderReadyBubble(ctx)
    } else if (this.isNewPlayer) {
      // 显示欢迎气泡（第一步）
      this.renderWelcomeBubble(ctx)
    }
    
    // 注意：【关卡提示】灯泡已移到 WaitingArea 中，在 guide.png 右上方显示
  }
  
  // 【iOS 兼容】绘制简单圆角矩形（不使用复杂贝塞尔曲线）
  _drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }
  
  // 【新玩家指引】渲染欢迎气泡（头部左侧，iOS 简化版）
  renderWelcomeBubble(ctx) {
    const text = this.welcomeText.substring(0, this.textDisplayProgress)
    
    // 气泡位置（护士头部左侧）
    const bubbleX = this.x - 200 * this.scale
    const bubbleY = this.y - 90 * this.scale
    const maxWidth = 180 * this.scale
    const padding = 10 * this.scale
    const lineHeight = 18 * this.scale
    const cornerRadius = 10 * this.scale
    
    ctx.save()
    
    // 分行计算文字
    ctx.font = `bold ${14 * this.scale}px "PingFang SC", sans-serif`
    const words = text.split('')
    const lines = []
    let currentLine = ''
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i]
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth - padding * 2 && currentLine !== '') {
        lines.push(currentLine)
        currentLine = words[i]
      } else {
        currentLine = testLine
      }
    }
    lines.push(currentLine)
    
    const bubbleWidth = maxWidth
    const bubbleHeight = lines.length * lineHeight + padding * 2
    
    // 小三角尺寸（放在右侧中间，指向护士）
    const triangleSize = 10 * this.scale
    const triangleY = bubbleY + bubbleHeight / 2  // 垂直居中
    
    // 绘制圆角矩形气泡主体（右侧留缺口给小三角）
    const bodyWidth = bubbleWidth - triangleSize
    ctx.fillStyle = '#FFFCF5'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
    ctx.shadowBlur = 8 * this.scale
    ctx.shadowOffsetY = 2 * this.scale
    
    this._drawRoundRect(ctx, bubbleX, bubbleY, bodyWidth, bubbleHeight, cornerRadius)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    
    // 绘制右侧小三角（指向护士）
    ctx.beginPath()
    ctx.moveTo(bubbleX + bodyWidth, triangleY - triangleSize)  // 上
    ctx.lineTo(bubbleX + bodyWidth + triangleSize, triangleY)  // 右（尖端指向护士）
    ctx.lineTo(bubbleX + bodyWidth, triangleY + triangleSize)  // 下
    ctx.closePath()
    ctx.fillStyle = '#FFFCF5'
    ctx.fill()
    
    // 绘制气泡主体边框
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.5)'
    ctx.lineWidth = 2 * this.scale
    this._drawRoundRect(ctx, bubbleX, bubbleY, bodyWidth, bubbleHeight, cornerRadius)
    ctx.stroke()
    
    // 绘制小三角边框（两条边）
    ctx.beginPath()
    ctx.moveTo(bubbleX + bodyWidth, triangleY - triangleSize)
    ctx.lineTo(bubbleX + bodyWidth + triangleSize, triangleY)
    ctx.lineTo(bubbleX + bodyWidth, triangleY + triangleSize)
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.5)'
    ctx.lineWidth = 2 * this.scale
    ctx.stroke()
    
    // 绘制文字
    ctx.fillStyle = '#5D4E37'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bubbleX + padding, bubbleY + padding + i * lineHeight)
    }
    
    // 逐字显示未完成时，绘制闪烁光标
    if (this.textDisplayProgress < this.welcomeText.length) {
      const blinkAlpha = Math.sin(this.animationTime / 200) * 0.5 + 0.5
      ctx.fillStyle = `rgba(255, 105, 180, ${blinkAlpha})`
      const lastLineIndex = lines.length - 1
      const lastLineY = bubbleY + padding + lastLineIndex * lineHeight
      const lastLineWidth = ctx.measureText(lines[lastLineIndex]).width
      ctx.fillRect(bubbleX + padding + lastLineWidth + 2, lastLineY, 2 * this.scale, 14 * this.scale)
    }
    
    ctx.restore()
  }
  
  // 【新玩家指引】渲染准备气泡（第二步，iOS 简化版）
  renderReadyBubble(ctx) {
    const text = this.readyText
    
    // 准备气泡位置（护士头部左侧）
    const bubbleX = this.x - 175 * this.scale
    const bubbleY = this.y - 70 * this.scale
    const padding = 10 * this.scale
    const lineHeight = 18 * this.scale
    const cornerRadius = 10 * this.scale
    
    ctx.save()
    
    // 计算文字（单行）
    ctx.font = `bold ${14 * this.scale}px "PingFang SC", sans-serif`
    const textWidth = ctx.measureText(text).width
    const bubbleWidth = textWidth + padding * 2
    const bubbleHeight = lineHeight + padding * 2
    
    // 小三角尺寸（放在右侧中间，指向护士）
    const triangleSize = 10 * this.scale
    const triangleY = bubbleY + bubbleHeight / 2  // 垂直居中
    
    // 绘制气泡主体（右侧留缺口给小三角）
    const bodyWidth = bubbleWidth - triangleSize
    ctx.fillStyle = '#FFFCF5'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
    ctx.shadowBlur = 8 * this.scale
    ctx.shadowOffsetY = 2 * this.scale
    
    this._drawRoundRect(ctx, bubbleX, bubbleY, bodyWidth, bubbleHeight, cornerRadius)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    
    // 绘制右侧小三角（指向护士）
    ctx.beginPath()
    ctx.moveTo(bubbleX + bodyWidth, triangleY - triangleSize)  // 上
    ctx.lineTo(bubbleX + bodyWidth + triangleSize, triangleY)  // 右（尖端指向护士）
    ctx.lineTo(bubbleX + bodyWidth, triangleY + triangleSize)  // 下
    ctx.closePath()
    ctx.fillStyle = '#FFFCF5'
    ctx.fill()
    
    // 绘制气泡主体边框
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.5)'
    ctx.lineWidth = 2 * this.scale
    this._drawRoundRect(ctx, bubbleX, bubbleY, bodyWidth, bubbleHeight, cornerRadius)
    ctx.stroke()
    
    // 绘制小三角边框（两条边）
    ctx.beginPath()
    ctx.moveTo(bubbleX + bodyWidth, triangleY - triangleSize)
    ctx.lineTo(bubbleX + bodyWidth + triangleSize, triangleY)
    ctx.lineTo(bubbleX + bodyWidth, triangleY + triangleSize)
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.5)'
    ctx.lineWidth = 2 * this.scale
    ctx.stroke()
    
    // 绘制文字
    ctx.fillStyle = '#5D4E37'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, bubbleX + bodyWidth / 2, bubbleY + bubbleHeight / 2)
    
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
  
  // 【升级系统】设置升级
  setUpgrade(upgradeId) {
    if (this.currentUpgradeId === upgradeId) return
    
    this.currentUpgradeId = upgradeId
    
    // 如果有升级，加载对应的升级图片
    if (upgradeId) {
      const img = wx.createImage()
      img.onload = () => {
        this.upgradedImage = img
        console.log('[护士升级] 加载升级图片成功:', upgradeId)
      }
      img.onerror = () => {
        console.warn('[护士升级] 加载升级图片失败:', upgradeId)
        this.upgradedImage = null
      }
      // 根据升级ID确定图片路径
      img.src = `images/nurse_pro_${upgradeId}.png`
    } else {
      // 未升级状态，使用默认图片
      this.upgradedImage = null
    }
    
    console.log('[护士升级] 设置升级:', upgradeId)
  }
  
  // 【升级系统】获取当前显示的图片
  getCurrentImage() {
    if (this.isNewPlayer && this.nurseHelloImage) {
      return this.nurseHelloImage
    }
    if (this.upgradedImage) {
      return this.upgradedImage
    }
    return this.nurseImage
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
