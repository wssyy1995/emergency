import { fillRoundRect, drawStar } from './utils.js'

const CONDITIONS = [
  { name: '感冒', icon: '🤒', color: '#FF9AA2', treatmentTime: 5 },
  { name: '骨折', icon: '🦴', color: '#FFB7B2', treatmentTime: 10 },
  { name: '腹痛', icon: '😣', color: '#FFDAC1', treatmentTime: 7 },
  { name: '头痛', icon: '🤕', color: '#E2F0CB', treatmentTime: 4 },
  { name: '胸闷', icon: '💔', color: '#B5EAD7', treatmentTime: 8 },
  { name: '过敏', icon: '🔴', color: '#C7CEEA', treatmentTime: 6 },
  { name: '发烧', icon: '🌡️', color: '#F8B195', treatmentTime: 6 },
  { name: '扭伤', icon: '🦵', color: '#F67280', treatmentTime: 5 }
]

const SURNAMES = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙']
const NAMES = ['伟', '芳', '娜', '敏', '静', '强', '磊', '洋', '艳', '杰', '秀', '娟']

// 外观颜色配置（用于随机组合）
const APPEARANCE_COLORS = {
  skin: ['#FFDFC4'], // 统一自然白
  // 发色：黑色、巧克力深棕、黑茶色、蓝黑色
  hair: ['#2C3E50', '#5D4037', '#3E2723', '#1A1A2E'],
  clothes: ['#FFB7B2', '#FF9AA2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#F8B195', '#F67280', 
            '#E8F4FD', '#AED6F1', '#F9E79F', '#ABEBC6', '#D7BDE2', '#FAD7A0', '#D5DBDB', '#F5B7B1']
}

export default class Patient {
  constructor(id) {
    this.id = id
    // 使用代号作为名字（1-8号）
    this.name = `${id}号`
    this.age = Math.floor(Math.random() * 50) + 15
    this.condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)]
    
    // 位置和尺寸（根据屏幕自适应）
    this.x = 0
    this.y = 0
    this.targetX = 0
    this.targetY = 0
    // 基础尺寸（较小的基准值，用于缩放计算）- 已缩小25%
    this.baseWidth = 21
    this.baseHeight = 33.75
    this.width = this.baseWidth
    this.height = this.baseHeight
    
    this.animationTime = 0
    this.bounceOffset = 0
    this.facing = 1
    this.isMoving = false
    
    this.patience = 20
    this.maxPatience = this.patience
    this.isAngry = false
    this.inBed = false
    this.isCured = false
    this.cureAnimation = 0
    
    // 离开相关状态
    this.isLeaving = false
    this.tomatoThrown = false
    this.leaveTargetX = 0
    this.leaveTargetY = 0
    
    // 随机组合外观（肤色、发色、衣服、发型都不重复随机）
    this.skinColor = APPEARANCE_COLORS.skin[Math.floor(Math.random() * APPEARANCE_COLORS.skin.length)]
    this.hairColor = APPEARANCE_COLORS.hair[Math.floor(Math.random() * APPEARANCE_COLORS.hair.length)]
    this.clothesColor = APPEARANCE_COLORS.clothes[Math.floor(Math.random() * APPEARANCE_COLORS.clothes.length)]
    this.hairStyle = Math.floor(Math.random() * 8)
    
    // 长发（4-7号）有50%概率穿裙子
    this.isDress = this.hairStyle >= 4 && Math.random() < 0.5
    
    this.blinkTimer = 0
    this.isBlinking = false
  }

  update(deltaTime) {
    this.animationTime += deltaTime
    this.blinkTimer += deltaTime
    
    if (this.blinkTimer > 3000 + Math.random() * 2000) {
      this.isBlinking = true
      if (this.blinkTimer > 3100) {
        this.isBlinking = false
        this.blinkTimer = 0
      }
    }
    
    if (this.isMoving) {
      this.bounceOffset = Math.abs(Math.sin(this.animationTime / 150)) * -2
      
      const dx = this.targetX - this.x
      const dy = this.targetY - this.y
      const dist = Math.hypot(dx, dy)
      
      if (dist > 2) {
        const speed = 0.12 * deltaTime
        this.x += (dx / dist) * speed
        this.y += (dy / dist) * speed
        this.facing = dx > 0 ? 1 : -1
      } else {
        this.isMoving = false
        this.bounceOffset = 0
        
        // 如果正在离开且到达前台位置，显示大火焰
        if (this.isLeaving && !this.tomatoThrown) {
          this.tomatoThrown = true
          // 大火焰停留1.5秒钟后离开
          setTimeout(() => {
            this.shouldRemove = true
          }, 1500)
        }
      }
    } else {
      this.bounceOffset = Math.sin(this.animationTime / 500) * -1
    }
    
    if (this.isCured) {
      this.cureAnimation += deltaTime / 200
      this.bounceOffset = Math.sin(this.cureAnimation * 3) * -3
    }
  }

  moveTo(x, y) {
    this.targetX = x
    this.targetY = y
    this.isMoving = true
  }

  // 开始离开流程（去前台扔番茄）
  startLeaving(frontDeskX, frontDeskY) {
    this.isLeaving = true
    this.isAngry = true
    this.leaveTargetX = frontDeskX
    this.leaveTargetY = frontDeskY
    // 走到前台
    this.moveTo(frontDeskX, frontDeskY)
  }

  render(ctx, isDragging = false) {
    ctx.save()
    
    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2
    
    ctx.translate(centerX, centerY + this.bounceOffset)
    
    if (isDragging) {
      ctx.scale(1.1, 1.1)
    }
    
    ctx.scale(this.facing, 1)
    
    // 根据基础尺寸计算缩放比例
    const scale = this.width / this.baseWidth
    
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.beginPath()
    ctx.ellipse(0, 30 * scale, 20 * scale, 6 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 身体（上衣 - 圆角肩膀）
    ctx.fillStyle = this.clothesColor
    ctx.beginPath()
    // 左上圆角（肩膀）
    ctx.moveTo(-15 * scale, 8 * scale)
    ctx.quadraticCurveTo(-15 * scale, 3 * scale, -10 * scale, 3 * scale)
    // 上边
    ctx.lineTo(10 * scale, 3 * scale)
    // 右上圆角（肩膀）
    ctx.quadraticCurveTo(15 * scale, 3 * scale, 15 * scale, 8 * scale)
    
    if (this.isDress) {
      // 上衣只到腰部（腰线位置）
      ctx.lineTo(14 * scale, 18 * scale)
      ctx.quadraticCurveTo(0, 20 * scale, -14 * scale, 18 * scale)
    } else {
      // 普通衣服（直筒到裤脚）
      ctx.lineTo(15 * scale, 28 * scale)
      ctx.lineTo(-15 * scale, 28 * scale)
    }
    ctx.closePath()
    ctx.fill()
    
    // 衣服细节（上衣）
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    if (this.isDress) {
      // 上衣装饰
      ctx.fillRect(-10 * scale, 6 * scale, 20 * scale, 2 * scale)
    } else {
      ctx.fillRect(-12 * scale, 6 * scale, 24 * scale, 2 * scale)
    }
    
    // 裙子（深灰色，与上衣分开）
    if (this.isDress) {
      ctx.fillStyle = '#4A5568' // 深灰色裙子
      ctx.beginPath()
      // 裙子从腰线开始
      ctx.moveTo(-14 * scale, 18 * scale)
      ctx.quadraticCurveTo(0, 20 * scale, 14 * scale, 18 * scale)
      // A字形裙摆
      ctx.lineTo(24 * scale, 35 * scale)
      ctx.quadraticCurveTo(0, 40 * scale, -24 * scale, 35 * scale)
      ctx.closePath()
      ctx.fill()
      
      // 裙子褶皱线条
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1 * scale
      ctx.beginPath()
      ctx.moveTo(-8 * scale, 22 * scale)
      ctx.lineTo(-14 * scale, 33 * scale)
      ctx.moveTo(0, 22 * scale)
      ctx.lineTo(0, 36 * scale)
      ctx.moveTo(8 * scale, 22 * scale)
      ctx.lineTo(14 * scale, 33 * scale)
      ctx.stroke()
      
      // 腿（裙子下面露一点小腿）
      ctx.fillStyle = '#FFDFC4' // 肤色
      ctx.fillRect(-9 * scale, 34 * scale, 5 * scale, 6 * scale)
      ctx.fillRect(4 * scale, 34 * scale, 5 * scale, 6 * scale)
      
      // 鞋子（小鞋子）
      ctx.fillStyle = '#2C3E50'
      ctx.beginPath()
      ctx.ellipse(-6.5 * scale, 40 * scale, 4 * scale, 2 * scale, 0, 0, Math.PI * 2)
      ctx.ellipse(6.5 * scale, 40 * scale, 4 * scale, 2 * scale, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // 普通裤子腿
      ctx.fillStyle = '#34495E'
      ctx.fillRect(-12 * scale, 28 * scale, 8 * scale, 18 * scale)
      ctx.fillRect(4 * scale, 28 * scale, 8 * scale, 18 * scale)
      
      // 鞋子
      ctx.fillStyle = '#2C3E50'
      ctx.beginPath()
      ctx.ellipse(-8 * scale, 45 * scale, 6 * scale, 3 * scale, 0, 0, Math.PI * 2)
      ctx.ellipse(8 * scale, 45 * scale, 6 * scale, 3 * scale, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 手臂（圆角）
    ctx.fillStyle = this.clothesColor
    // 左臂（顶部圆角与肩膀衔接）
    ctx.beginPath()
    ctx.moveTo(-16 * scale, 5 * scale)
    ctx.quadraticCurveTo(-20 * scale, 5 * scale, -20 * scale, 9 * scale)
    ctx.lineTo(-20 * scale, 21 * scale)
    ctx.quadraticCurveTo(-20 * scale, 23 * scale, -17.5 * scale, 23 * scale)
    ctx.lineTo(-15 * scale, 23 * scale)
    ctx.quadraticCurveTo(-12.5 * scale, 23 * scale, -12.5 * scale, 21 * scale)
    ctx.lineTo(-12.5 * scale, 9 * scale)
    ctx.quadraticCurveTo(-12.5 * scale, 5 * scale, -16 * scale, 5 * scale)
    ctx.fill()
    // 右臂（顶部圆角与肩膀衔接）
    ctx.beginPath()
    ctx.moveTo(16 * scale, 5 * scale)
    ctx.quadraticCurveTo(12.5 * scale, 5 * scale, 12.5 * scale, 9 * scale)
    ctx.lineTo(12.5 * scale, 21 * scale)
    ctx.quadraticCurveTo(12.5 * scale, 23 * scale, 15 * scale, 23 * scale)
    ctx.lineTo(17.5 * scale, 23 * scale)
    ctx.quadraticCurveTo(20 * scale, 23 * scale, 20 * scale, 21 * scale)
    ctx.lineTo(20 * scale, 9 * scale)
    ctx.quadraticCurveTo(20 * scale, 5 * scale, 16 * scale, 5 * scale)
    ctx.fill()
    
    // 手
    ctx.fillStyle = this.skinColor
    ctx.beginPath()
    ctx.arc(-17.5 * scale, 23 * scale, 4 * scale, 0, Math.PI * 2)
    ctx.arc(17.5 * scale, 23 * scale, 4 * scale, 0, Math.PI * 2)
    ctx.fill()
    
    // 脖子
    ctx.fillStyle = this.skinColor
    ctx.fillRect(-5 * scale, -4 * scale, 10 * scale, 7 * scale)
    
    // 头型
    ctx.fillStyle = this.skinColor
    ctx.beginPath()
    ctx.ellipse(0, -16 * scale, 14 * scale, 17 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 脸颊红晕
    if (!this.isAngry) {
      ctx.fillStyle = 'rgba(255,150,150,0.2)'
      ctx.beginPath()
      ctx.arc(-11 * scale, -12 * scale, 5 * scale, 0, Math.PI * 2)
      ctx.arc(11 * scale, -12 * scale, 5 * scale, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 头发 - 8种发型设计（4种短发+4种长发），都不遮挡脸部正面
    ctx.fillStyle = this.hairColor
    
    if (this.hairStyle === 0) {
      // 发型1: 自然中短发（模仿1号风格）
      // 头顶基础
      ctx.beginPath()
      ctx.arc(0, -22 * scale, 16 * scale, Math.PI, 0)
      ctx.fill()
      // 顶部微蓬（比1号低一些）
      ctx.beginPath()
      ctx.moveTo(-9 * scale, -26 * scale)
      ctx.quadraticCurveTo(-7 * scale, -33 * scale, 0, -35 * scale)
      ctx.quadraticCurveTo(7 * scale, -33 * scale, 9 * scale, -26 * scale)
      ctx.quadraticCurveTo(0, -29 * scale, -9 * scale, -26 * scale)
      ctx.fill()
      // 两侧到耳下（比1号稍短）
      ctx.beginPath()
      ctx.moveTo(-16 * scale, -22 * scale)
      ctx.quadraticCurveTo(-17 * scale, -12 * scale, -14 * scale, -3 * scale)
      ctx.lineTo(-10 * scale, -3 * scale)
      ctx.quadraticCurveTo(-12 * scale, -12 * scale, -12 * scale, -22 * scale)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(16 * scale, -22 * scale)
      ctx.quadraticCurveTo(17 * scale, -12 * scale, 14 * scale, -3 * scale)
      ctx.lineTo(10 * scale, -3 * scale)
      ctx.quadraticCurveTo(12 * scale, -12 * scale, 12 * scale, -22 * scale)
      ctx.fill()
      // 碎刘海（比1号更碎）
      ctx.beginPath()
      ctx.ellipse(-4 * scale, -24 * scale, 3 * scale, 2 * scale, -0.2, 0, Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(4 * scale, -24 * scale, 3 * scale, 2 * scale, 0.2, 0, Math.PI)
      ctx.fill()
      
    } else if (this.hairStyle === 1) {
      // 发型2: 蓬松中短发 - 有造型感的中短发
      // 头顶基础
      ctx.beginPath()
      ctx.arc(0, -22 * scale, 16 * scale, Math.PI, 0)
      ctx.fill()
      // 向上蓬松造型
      ctx.beginPath()
      ctx.moveTo(-10 * scale, -26 * scale)
      ctx.quadraticCurveTo(-8 * scale, -36 * scale, 0, -38 * scale)
      ctx.quadraticCurveTo(8 * scale, -36 * scale, 10 * scale, -26 * scale)
      ctx.quadraticCurveTo(0, -30 * scale, -10 * scale, -26 * scale)
      ctx.fill()
      // 两侧长度到耳下（中短）
      ctx.beginPath()
      ctx.moveTo(-16 * scale, -22 * scale)
      ctx.quadraticCurveTo(-18 * scale, -10 * scale, -14 * scale, 0)
      ctx.lineTo(-10 * scale, 0)
      ctx.quadraticCurveTo(-12 * scale, -10 * scale, -12 * scale, -22 * scale)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(16 * scale, -22 * scale)
      ctx.quadraticCurveTo(18 * scale, -10 * scale, 14 * scale, 0)
      ctx.lineTo(10 * scale, 0)
      ctx.quadraticCurveTo(12 * scale, -10 * scale, 12 * scale, -22 * scale)
      ctx.fill()
      // 光泽
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.beginPath()
      ctx.ellipse(-3 * scale, -32 * scale, 3 * scale, 5 * scale, -0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = this.hairColor
      // 短刘海
      ctx.fillRect(-8 * scale, -25 * scale, 16 * scale, 3 * scale)
      
    } else if (this.hairStyle === 2) {
      // 发型3: 蓬松背头 + 酷酷的帽子
      // 先画头发（在帽子下面露出一点）
      // 头顶基础
      ctx.beginPath()
      ctx.arc(0, -20 * scale, 15 * scale, Math.PI, 0)
      ctx.fill()
      // 两侧蓬松（发量多）
      ctx.beginPath()
      ctx.moveTo(-15 * scale, -22 * scale)
      ctx.quadraticCurveTo(-18 * scale, -12 * scale, -14 * scale, -4 * scale)
      ctx.lineTo(-10 * scale, -4 * scale)
      ctx.quadraticCurveTo(-12 * scale, -12 * scale, -11 * scale, -22 * scale)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(15 * scale, -22 * scale)
      ctx.quadraticCurveTo(18 * scale, -12 * scale, 14 * scale, -4 * scale)
      ctx.lineTo(10 * scale, -4 * scale)
      ctx.quadraticCurveTo(12 * scale, -12 * scale, 11 * scale, -22 * scale)
      ctx.fill()
      
      // 酷酷的鸭舌帽（黑色）
      ctx.fillStyle = '#2C3E50'
      // 帽顶（圆顶）
      ctx.beginPath()
      ctx.arc(0, -26 * scale, 16 * scale, Math.PI, 0)
      ctx.fill()
      // 帽檐（向前伸出）
      ctx.beginPath()
      ctx.moveTo(-16 * scale, -26 * scale)
      ctx.lineTo(-18 * scale, -22 * scale)
      ctx.lineTo(18 * scale, -22 * scale)
      ctx.lineTo(16 * scale, -26 * scale)
      ctx.fill()
      // 帽檐前沿（更突出）
      ctx.beginPath()
      ctx.moveTo(-18 * scale, -22 * scale)
      ctx.quadraticCurveTo(0, -18 * scale, 18 * scale, -22 * scale)
      ctx.lineTo(17 * scale, -24 * scale)
      ctx.quadraticCurveTo(0, -20 * scale, -17 * scale, -24 * scale)
      ctx.fill()
      // 帽子上的标志（黄色闪电）
      ctx.fillStyle = '#F1C40F'
      ctx.beginPath()
      ctx.moveTo(2 * scale, -34 * scale)
      ctx.lineTo(-2 * scale, -28 * scale)
      ctx.lineTo(1 * scale, -28 * scale)
      ctx.lineTo(-1 * scale, -22 * scale)
      ctx.lineTo(3 * scale, -28 * scale)
      ctx.lineTo(0, -28 * scale)
      ctx.closePath()
      ctx.fill()
      // 帽子光泽
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      ctx.ellipse(-6 * scale, -30 * scale, 4 * scale, 2 * scale, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = this.hairColor
      
    } else if (this.hairStyle === 3) {
      // 发型4: 背头/油头 - 梳到后面
      ctx.beginPath()
      ctx.arc(0, -22 * scale, 15 * scale, Math.PI, 0)
      ctx.fill()
      // 全部向后梳
      ctx.beginPath()
      ctx.moveTo(-12 * scale, -26 * scale)
      ctx.quadraticCurveTo(0, -36 * scale, 12 * scale, -26 * scale)
      ctx.lineTo(13 * scale, -22 * scale)
      ctx.quadraticCurveTo(0, -28 * scale, -13 * scale, -22 * scale)
      ctx.fill()
      // 两侧服帖
      ctx.fillRect(-14 * scale, -22 * scale, 4 * scale, 6 * scale)
      ctx.fillRect(10 * scale, -22 * scale, 4 * scale, 6 * scale)
      // 光泽
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      ctx.ellipse(-4 * scale, -28 * scale, 3 * scale, 1.5 * scale, -0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = this.hairColor
      
    } else if (this.hairStyle === 4) {
      // 发型5: 单侧马尾（模仿5号双马尾风格）
      // 先画背后的单马尾（在身体后面，偏向一侧）
      ctx.beginPath()
      ctx.ellipse(10 * scale, 2 * scale, 5 * scale, 20 * scale, 0.3, 0, Math.PI * 2)
      ctx.fill()
      // 马尾层次感
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(8 * scale + i * 2 * scale, -5 * scale + i * 7 * scale, 3 * scale, 0, Math.PI * 2)
        ctx.fill()
      }
      // 头顶
      ctx.beginPath()
      ctx.arc(0, -22 * scale, 15 * scale, Math.PI, 0)
      ctx.fill()
      // 左侧头发（到耳后）
      ctx.fillRect(-15 * scale, -22 * scale, 5 * scale, 15 * scale)
      // 右侧头发收拢到马尾
      ctx.beginPath()
      ctx.moveTo(15 * scale, -22 * scale)
      ctx.quadraticCurveTo(18 * scale, -12 * scale, 12 * scale, -5 * scale)
      ctx.lineTo(8 * scale, -5 * scale)
      ctx.quadraticCurveTo(12 * scale, -12 * scale, 10 * scale, -22 * scale)
      ctx.fill()
      // 绑带（蓝色发圈，在右侧耳后）
      ctx.fillStyle = '#5DADE2'
      ctx.beginPath()
      ctx.arc(12 * scale, -8 * scale, 3 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = this.hairColor
      // 斜刘海
      ctx.beginPath()
      ctx.ellipse(-4 * scale, -24 * scale, 5 * scale, 3 * scale, -0.4, 0, Math.PI)
      ctx.fill()
      
    } else if (this.hairStyle === 5) {
      // 发型6: 低双马尾（模仿5号，位置更低）
      // 先画背后的双马尾（低位置）
      // 左侧马尾
      ctx.beginPath()
      ctx.ellipse(-14 * scale, 8 * scale, 4.5 * scale, 16 * scale, -0.3, 0, Math.PI * 2)
      ctx.fill()
      // 右侧马尾
      ctx.beginPath()
      ctx.ellipse(14 * scale, 8 * scale, 4.5 * scale, 16 * scale, 0.3, 0, Math.PI * 2)
      ctx.fill()
      // 头顶
      ctx.beginPath()
      ctx.arc(0, -22 * scale, 15 * scale, Math.PI, 0)
      ctx.fill()
      // 两侧长发到绑带（更低的位置）
      ctx.fillRect(-15 * scale, -22 * scale, 5 * scale, 20 * scale)
      ctx.fillRect(10 * scale, -22 * scale, 5 * scale, 20 * scale)
      // 绑带（绿色发圈，在肩膀两侧）
      ctx.fillStyle = '#58D68D'
      ctx.beginPath()
      ctx.arc(-14 * scale, -3 * scale, 3 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(14 * scale, -3 * scale, 3 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = this.hairColor
      // 齐刘海
      ctx.fillRect(-10 * scale, -24 * scale, 20 * scale, 3 * scale)
      
    } else if (this.hairStyle === 6) {
      // 发型7: 小啾啾双马尾（模仿5号，更短更Q）
      // 先画背后的双马尾（短小）
      // 左侧小啾啾
      ctx.beginPath()
      ctx.arc(-16 * scale, -5 * scale, 5 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(-18 * scale, 2 * scale, 4 * scale, 0, Math.PI * 2)
      ctx.fill()
      // 右侧小啾啾
      ctx.beginPath()
      ctx.arc(16 * scale, -5 * scale, 5 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(18 * scale, 2 * scale, 4 * scale, 0, Math.PI * 2)
      ctx.fill()
      // 头顶
      ctx.beginPath()
      ctx.arc(0, -22 * scale, 15 * scale, Math.PI, 0)
      ctx.fill()
      // 两侧短发到绑带
      ctx.fillRect(-15 * scale, -22 * scale, 4 * scale, 12 * scale)
      ctx.fillRect(11 * scale, -22 * scale, 4 * scale, 12 * scale)
      // 绑带（黄色发圈，在耳上位置）
      ctx.fillStyle = '#F4D03F'
      ctx.beginPath()
      ctx.arc(-14 * scale, -12 * scale, 2.5 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(14 * scale, -12 * scale, 2.5 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = this.hairColor
      // 碎发刘海
      ctx.beginPath()
      ctx.ellipse(-5 * scale, -25 * scale, 3 * scale, 2 * scale, -0.3, 0, Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(5 * scale, -25 * scale, 3 * scale, 2 * scale, 0.3, 0, Math.PI)
      ctx.fill()
      
    } else {
      // 发型8: 原5号双马尾长发（保留）
      // 先画背后的双马尾（在身体后面）
      // 左侧马尾（在背后，正面只能看到一点点根部）
      ctx.beginPath()
      ctx.ellipse(-12 * scale, 0, 4 * scale, 18 * scale, -0.2, 0, Math.PI * 2)
      ctx.fill()
      // 右侧马尾
      ctx.beginPath()
      ctx.ellipse(12 * scale, 0, 4 * scale, 18 * scale, 0.2, 0, Math.PI * 2)
      ctx.fill()
      // 头顶
      ctx.beginPath()
      ctx.arc(0, -22 * scale, 15 * scale, Math.PI, 0)
      ctx.fill()
      // 两侧到绑带（耳后位置）
      ctx.fillRect(-15 * scale, -22 * scale, 5 * scale, 15 * scale)
      ctx.fillRect(10 * scale, -22 * scale, 5 * scale, 15 * scale)
      // 绑带（粉色发圈，在耳后两侧）
      ctx.fillStyle = '#FF69B4'
      ctx.beginPath()
      ctx.arc(-12 * scale, -8 * scale, 2.5 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(12 * scale, -8 * scale, 2.5 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = this.hairColor
    }
    
    // 耳朵
    ctx.fillStyle = this.skinColor
    ctx.beginPath()
    ctx.ellipse(-16 * scale, -16 * scale, 3 * scale, 5 * scale, 0, 0, Math.PI * 2)
    ctx.ellipse(16 * scale, -16 * scale, 3 * scale, 5 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 眉毛
    ctx.strokeStyle = this.hairColor
    ctx.lineWidth = 1.5 * scale
    ctx.beginPath()
    ctx.moveTo(-10 * scale, -22 * scale)
    ctx.lineTo(-4 * scale, -22 * scale)
    ctx.moveTo(4 * scale, -22 * scale)
    ctx.lineTo(10 * scale, -22 * scale)
    ctx.stroke()
    
    // 眼睛
    if (this.isCured) {
      drawStar(ctx, -7 * scale, -18 * scale, 4 * scale, '#FFD700')
      drawStar(ctx, 7 * scale, -18 * scale, 4 * scale, '#FFD700')
    } else if (this.isBlinking) {
      ctx.strokeStyle = '#2C3E50'
      ctx.lineWidth = 1.5 * scale
      ctx.beginPath()
      ctx.moveTo(-10 * scale, -18 * scale)
      ctx.quadraticCurveTo(-7 * scale, -15 * scale, -4 * scale, -18 * scale)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(4 * scale, -18 * scale)
      ctx.quadraticCurveTo(7 * scale, -15 * scale, 10 * scale, -18 * scale)
      ctx.stroke()
    } else if (this.isAngry) {
      // 生气时眼睛保持正常（不变成红色）
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.ellipse(-6.5 * scale, -18 * scale, 4 * scale, 5 * scale, 0, 0, Math.PI * 2)
      ctx.ellipse(6.5 * scale, -18 * scale, 4 * scale, 5 * scale, 0, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#2C3E50'
      ctx.beginPath()
      ctx.arc(-6.5 * scale, -18 * scale, 2.5 * scale, 0, Math.PI * 2)
      ctx.arc(6.5 * scale, -18 * scale, 2.5 * scale, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.arc(-5.5 * scale, -20 * scale, 1.2 * scale, 0, Math.PI * 2)
      ctx.arc(7.5 * scale, -20 * scale, 1.2 * scale, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.ellipse(-6.5 * scale, -18 * scale, 4 * scale, 5 * scale, 0, 0, Math.PI * 2)
      ctx.ellipse(6.5 * scale, -18 * scale, 4 * scale, 5 * scale, 0, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#2C3E50'
      ctx.beginPath()
      ctx.arc(-6.5 * scale, -18 * scale, 2.5 * scale, 0, Math.PI * 2)
      ctx.arc(6.5 * scale, -18 * scale, 2.5 * scale, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#FFF'
      ctx.beginPath()
      ctx.arc(-5.5 * scale, -20 * scale, 1.2 * scale, 0, Math.PI * 2)
      ctx.arc(7.5 * scale, -20 * scale, 1.2 * scale, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 鼻子
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 1 * scale
    ctx.beginPath()
    ctx.moveTo(0, -15 * scale)
    ctx.lineTo(-1.5 * scale, -11 * scale)
    ctx.lineTo(1 * scale, -11 * scale)
    ctx.stroke()
    
    // 嘴巴
    ctx.strokeStyle = '#C0392B'
    ctx.lineWidth = 1.5 * scale
    ctx.beginPath()
    if (this.isCured) {
      ctx.arc(0, -8 * scale, 4 * scale, 0, Math.PI)
    } else if (this.isAngry) {
      ctx.moveTo(-3 * scale, -7 * scale)
      ctx.lineTo(3 * scale, -7 * scale)
    } else {
      ctx.moveTo(-3 * scale, -8 * scale)
      ctx.quadraticCurveTo(0, -6 * scale, 3 * scale, -8 * scale)
      ctx.stroke()
    }
    ctx.stroke()
    
    ctx.restore()
    
    // 病情图标（已隐藏）
    /*
    ctx.save()
    ctx.translate(centerX, centerY + this.bounceOffset - 40 * scale)
    
    ctx.fillStyle = '#FFF'
    ctx.beginPath()
    ctx.arc(0, 0, 11 * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = this.condition.color
    ctx.lineWidth = 2 * scale
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(-4 * scale, 9 * scale)
    ctx.lineTo(0, 14 * scale)
    ctx.lineTo(4 * scale, 9 * scale)
    ctx.fillStyle = '#FFF'
    ctx.fill()
    
    ctx.fillStyle = this.condition.color
    ctx.font = `${10 * scale}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.condition.icon, 0, 0)
    
    ctx.restore()
    */
    
    // 耐心条（只在非离开状态显示）
    if (!this.inBed && !this.isCured && !this.isLeaving) {
      const patiencePercent = Math.max(0, this.patience / this.maxPatience)
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(centerX - 18 * scale, this.y - 28 * scale + this.bounceOffset, 36 * scale, 5 * scale)
      ctx.fillStyle = patiencePercent > 0.3 ? '#2ECC71' : '#E74C3C'
      ctx.fillRect(centerX - 18 * scale, this.y - 28 * scale + this.bounceOffset, 36 * scale * patiencePercent, 5 * scale)
      ctx.restore()
    }
    
    // 治愈特效
    if (this.isCured) {
      ctx.save()
      ctx.translate(centerX, centerY)
      
      for (let i = 0; i < 6; i++) {
        const angle = (this.cureAnimation + i * Math.PI / 3)
        const starX = Math.cos(angle) * 35 * scale
        const starY = Math.sin(angle) * 35 * scale
        const color = i % 2 === 0 ? '#FFD700' : '#FF69B4'
        drawStar(ctx, starX, starY, 5 * scale, color)
      }
      
      ctx.fillStyle = '#FF69B4'
      ctx.font = `${16 * scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('❤️', 0, -45 * scale)
      
      ctx.restore()
    }
    
    // 小火焰（到达前台后显示在头顶）
    if (this.tomatoThrown) {
      ctx.save()
      ctx.translate(centerX, this.y - 35 * scale + this.bounceOffset)
      
      const flameTime = this.animationTime / 60
      const wobble = Math.sin(flameTime) * 2 * scale
      
      // 外焰（红色）- 会摇摆
      ctx.fillStyle = '#FF4444'
      ctx.beginPath()
      ctx.moveTo(-6 * scale + wobble, 0)
      ctx.quadraticCurveTo(-4 * scale + wobble * 0.5, -12 * scale, 0 + wobble * 0.3, -18 * scale)
      ctx.quadraticCurveTo(4 * scale + wobble * 0.5, -12 * scale, 6 * scale + wobble, 0)
      ctx.fill()
      
      // 内焰（橙色）
      ctx.fillStyle = '#FF8800'
      ctx.beginPath()
      ctx.moveTo(-4 * scale + wobble * 0.7, 0)
      ctx.quadraticCurveTo(-2 * scale + wobble * 0.3, -8 * scale, 0, -14 * scale)
      ctx.quadraticCurveTo(2 * scale + wobble * 0.3, -8 * scale, 4 * scale + wobble * 0.7, 0)
      ctx.fill()
      
      // 焰心（黄色）
      ctx.fillStyle = '#FFDD00'
      ctx.beginPath()
      ctx.moveTo(-2 * scale, 0)
      ctx.quadraticCurveTo(-1 * scale, -5 * scale, 0, -8 * scale)
      ctx.quadraticCurveTo(1 * scale, -5 * scale, 2 * scale, 0)
      ctx.fill()
      
      ctx.restore()
    }
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }
}
