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
    
    // 逐字显示文字
    this.welcomeText = '早上好！我是护士小美，给第一天上班的你准备了一份"工作秘籍"，点我看看！'
    this.textDisplayProgress = 0  // 当前显示到的字符位置
    this.textDisplayTimer = 0     // 文字显示计时器
    this.textDisplayInterval = 100 // 每个字间隔（毫秒），更慢
    
    // 准备提示气泡
    this.readyText = '请准备，病人马上到来！'
    this.showReadyBubble = false   // 是否显示准备气泡
    this.readyBubbleTimer = 0      // 准备气泡计时器
    this.readyBubbleDuration = 3000 // 准备气泡显示时长（3秒）
    
    // 【关卡提示】第2关及以后的灯泡提示
    this.showLevelHint = false
    
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
      : this.nurseImage
    
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
    
    // 【关卡提示】第2关及以后，在头部右侧显示灯泡
    if (this.showLevelHint && this.lightbulbImage && this.lightbulbImage.width > 0) {
      const bulbSize = 32 * this.scale
      const bulbX = this.x + 35 * this.scale  // 头部右侧
      const bulbY = this.y - 45 * this.scale  // 头部上方
      
      // 添加上下浮动动画
      const bulbBounce = Math.sin(this.animationTime / 300) * 4
      
      ctx.drawImage(this.lightbulbImage, bulbX - bulbSize / 2, bulbY - bulbSize / 2 + bulbBounce, bulbSize, bulbSize)
    }
  }
  
  // 【新玩家指引】渲染欢迎气泡（头部左侧，带呼吸效果）
  renderWelcomeBubble(ctx) {
    // 呼吸动画周期 5 秒（更缓慢）
    const breathCycle = 5000
    const progress = (this.animationTime % breathCycle) / breathCycle
    // 呼吸强度 (0.97 -> 1.03 -> 0.97) - 幅度更小更柔和
    const breathScale = 0.98 + Math.sin(progress * Math.PI * 2) * 0.02
    
    // 获取当前应显示的文案（逐字显示）
    const text = this.welcomeText.substring(0, this.textDisplayProgress)
    
    // 欢迎气泡位置（护士头部左侧）
    const bubbleX = this.x/2 - 90 * this.scale
    const bubbleY = this.y - 110 * this.scale
    
    // 欢迎气泡气泡尺寸
    const padding = 10 * this.scale
    const maxWidth = 200 * this.scale
    const lineHeight = 20 * this.scale
    const cornerRadius = 16 * this.scale
    const triangleSize = 8 * this.scale
    
    ctx.save()
    
    // 应用呼吸缩放（以气泡中心为原点）
    const centerX = bubbleX + maxWidth / 2
    const centerY = bubbleY + 60 * this.scale
    ctx.translate(centerX, centerY)
    ctx.scale(breathScale, breathScale)
    ctx.translate(-centerX, -centerY)
    
    // 分行计算文字
    ctx.font = `bold ${14 * this.scale}px "PingFang SC", "Microsoft YaHei", sans-serif`
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
    
    // 计算气泡高度
    const bubbleWidth = maxWidth
    const bubbleHeight = lines.length * lineHeight + padding * 2 + triangleSize
    
    // 绘制气泡背景（更柔和的阴影）
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)'
    ctx.shadowBlur = 20 * this.scale
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 4 * this.scale
    
    // 气泡主体（圆角矩形）- 使用奶油色背景更柔和
    ctx.fillStyle = '#FFFCF5'
    ctx.beginPath()
    ctx.moveTo(bubbleX + cornerRadius, bubbleY)
    ctx.lineTo(bubbleX + bubbleWidth - cornerRadius, bubbleY)
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + cornerRadius)
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - cornerRadius - triangleSize)
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - triangleSize, bubbleX + bubbleWidth - cornerRadius, bubbleY + bubbleHeight - triangleSize)
    ctx.lineTo(bubbleX + bubbleWidth - 25 * this.scale, bubbleY + bubbleHeight - triangleSize)
    // 小三角（指向护士头部）- 使用贝塞尔曲线更圆润
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth - 20 * this.scale, 
      bubbleY + bubbleHeight - triangleSize * 0.5,
      bubbleX + bubbleWidth - 20 * this.scale, 
      bubbleY + bubbleHeight
    )
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth - 20 * this.scale, 
      bubbleY + bubbleHeight - triangleSize * 0.5,
      bubbleX + bubbleWidth - 35 * this.scale, 
      bubbleY + bubbleHeight - triangleSize
    )
    ctx.lineTo(bubbleX + cornerRadius, bubbleY + bubbleHeight - triangleSize)
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight - triangleSize, bubbleX, bubbleY + bubbleHeight - cornerRadius - triangleSize)
    ctx.lineTo(bubbleX, bubbleY + cornerRadius)
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + cornerRadius, bubbleY)
    ctx.closePath()
    ctx.fill()
    
    // 绘制边框
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.4)'  // 浅粉色
    ctx.lineWidth = 6 * this.scale  // 粗度保持
    ctx.stroke()
    
    // 绘制内部高光（更柔和的感觉）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 1 * this.scale
    const highlightPath = new Path2D()
    highlightPath.moveTo(bubbleX + cornerRadius + 2, bubbleY + 1)
    highlightPath.lineTo(bubbleX + bubbleWidth - cornerRadius - 2, bubbleY + 1)
    ctx.stroke(highlightPath)
    
    // 绘制文字
    ctx.fillStyle = '#5D4E37'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    
    for (let i = 0; i < lines.length; i++) {
      const lineY = bubbleY + padding + i * lineHeight
      ctx.fillText(lines[i], bubbleX + padding, lineY)
    }
    
    // 逐字显示未完成时，绘制闪烁光标
    if (this.textDisplayProgress < this.welcomeText.length) {
      const blinkAlpha = Math.sin(this.animationTime / 200) * 0.5 + 0.5
      ctx.fillStyle = `rgba(255, 105, 180, ${blinkAlpha})`
      
      // 计算光标位置（最后一行末尾）
      const lastLineIndex = lines.length - 1
      const lastLineY = bubbleY + padding + lastLineIndex * lineHeight
      const lastLineWidth = ctx.measureText(lines[lastLineIndex]).width
      const cursorX = bubbleX + padding + lastLineWidth + 2
      const cursorY = lastLineY
      const cursorHeight = 14 * this.scale
      
      ctx.fillRect(cursorX, cursorY, 2 * this.scale, cursorHeight)
    }
    
    ctx.restore()
  }
  
  // 【新玩家指引】渲染准备气泡（第二步，样式完全同欢迎气泡）
  renderReadyBubble(ctx) {
    // 呼吸动画周期 5 秒（同欢迎气泡）
    const breathCycle = 5000
    const progress = (this.animationTime % breathCycle) / breathCycle
    // 呼吸强度 (0.97 -> 1.03 -> 0.97)
    const breathScale = 0.98 + Math.sin(progress * Math.PI * 2) * 0.01
    
    // 准备气泡文案
    const text = this.readyText
    
    // 准备气泡位置（护士头部左侧，同欢迎气泡）
    const bubbleX = this.x - 190 * this.scale
    const bubbleY = this.y - 80 * this.scale
    
    // 准备气泡尺寸（同欢迎气泡）
    const padding = 12 * this.scale
    const maxWidth = 200 * this.scale
    const lineHeight = 18 * this.scale
    const cornerRadius = 12 * this.scale
    const triangleSize = 14 * this.scale
    
    ctx.save()
    
    // 应用呼吸缩放（同欢迎气泡）
    const centerX = bubbleX + maxWidth / 2
    const centerY = bubbleY + 60 * this.scale
    ctx.translate(centerX, centerY)
    ctx.scale(breathScale, breathScale)
    ctx.translate(-centerX, -centerY)
    
    // 计算文字（单行）
    ctx.font = `bold ${14 * this.scale}px "PingFang SC", "Microsoft YaHei", sans-serif`
    const textWidth = ctx.measureText(text).width
    const bubbleWidth = Math.max(textWidth + padding * 2, maxWidth * 0.8)
    const bubbleHeight = lineHeight + padding * 2 + triangleSize
    
    // 绘制气泡背景（同欢迎气泡）
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)'
    ctx.shadowBlur = 20 * this.scale
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 4 * this.scale
    
    // 气泡主体（圆角矩形）- 使用奶油色背景（同欢迎气泡）
    ctx.fillStyle = '#FFFCF5'
    ctx.beginPath()
    ctx.moveTo(bubbleX + cornerRadius, bubbleY)
    ctx.lineTo(bubbleX + bubbleWidth - cornerRadius, bubbleY)
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + cornerRadius)
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - cornerRadius - triangleSize)
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - triangleSize, bubbleX + bubbleWidth - cornerRadius, bubbleY + bubbleHeight - triangleSize)
    ctx.lineTo(bubbleX + bubbleWidth - 25 * this.scale, bubbleY + bubbleHeight - triangleSize)
    // 小三角（指向护士头部）
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth - 20 * this.scale, 
      bubbleY + bubbleHeight - triangleSize * 0.5,
      bubbleX + bubbleWidth - 20 * this.scale, 
      bubbleY + bubbleHeight
    )
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth - 20 * this.scale, 
      bubbleY + bubbleHeight - triangleSize * 0.5,
      bubbleX + bubbleWidth - 35 * this.scale, 
      bubbleY + bubbleHeight - triangleSize
    )
    ctx.lineTo(bubbleX + cornerRadius, bubbleY + bubbleHeight - triangleSize)
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight - triangleSize, bubbleX, bubbleY + bubbleHeight - cornerRadius - triangleSize)
    ctx.lineTo(bubbleX, bubbleY + cornerRadius)
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + cornerRadius, bubbleY)
    ctx.closePath()
    ctx.fill()
    
    // 绘制边框
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.4)'  // 浅粉色
    ctx.lineWidth = 6 * this.scale  // 粗度保持
    ctx.stroke()
    
    // 绘制内部高光（同欢迎气泡）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 1 * this.scale
    const highlightPath = new Path2D()
    highlightPath.moveTo(bubbleX + cornerRadius + 2, bubbleY + 1)
    highlightPath.lineTo(bubbleX + bubbleWidth - cornerRadius - 2, bubbleY + 1)
    ctx.stroke(highlightPath)
    
    // 绘制文字（同欢迎气泡颜色）
    ctx.fillStyle = '#5D4E37'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const textX = bubbleX + bubbleWidth / 2
    const textY = bubbleY + padding + lineHeight / 2
    ctx.fillText(text, textX, textY)
    
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
