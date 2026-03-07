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
  skin: ['#FFDFC4', '#F0D5BE', '#EECAB6', '#E0B998', '#CCA586', '#F5DEB3', '#DEB887'],
  hair: ['#2C3E50', '#5D4037', '#8D6E63', '#D4A574', '#E6A57E', '#95A5A6', '#BDC3C7', '#4E342E', '#A1887F'],
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
    
    this.patience = 60 + Math.random() * 30
    this.maxPatience = this.patience
    this.isAngry = false
    this.inBed = false
    this.isCured = false
    this.cureAnimation = 0
    
    // 随机组合外观（肤色、发色、衣服、发型都不重复随机）
    this.skinColor = APPEARANCE_COLORS.skin[Math.floor(Math.random() * APPEARANCE_COLORS.skin.length)]
    this.hairColor = APPEARANCE_COLORS.hair[Math.floor(Math.random() * APPEARANCE_COLORS.hair.length)]
    this.clothesColor = APPEARANCE_COLORS.clothes[Math.floor(Math.random() * APPEARANCE_COLORS.clothes.length)]
    this.hairStyle = Math.floor(Math.random() * 3)
    
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
    
    // 身体
    ctx.fillStyle = this.clothesColor
    ctx.fillRect(-15 * scale, 3 * scale, 30 * scale, 25 * scale)
    
    // 衣服细节
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(-12 * scale, 6 * scale, 24 * scale, 2 * scale)
    
    // 腿
    ctx.fillStyle = '#34495E'
    ctx.fillRect(-12 * scale, 28 * scale, 8 * scale, 18 * scale)
    ctx.fillRect(4 * scale, 28 * scale, 8 * scale, 18 * scale)
    
    // 鞋子
    ctx.fillStyle = '#2C3E50'
    ctx.beginPath()
    ctx.ellipse(-8 * scale, 45 * scale, 6 * scale, 3 * scale, 0, 0, Math.PI * 2)
    ctx.ellipse(8 * scale, 45 * scale, 6 * scale, 3 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 手臂
    ctx.fillStyle = this.clothesColor
    ctx.fillRect(-20 * scale, 7 * scale, 5 * scale, 16 * scale)
    ctx.fillRect(15 * scale, 7 * scale, 5 * scale, 16 * scale)
    
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
    ctx.ellipse(0, -16 * scale, 16 * scale, 19 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 脸颊红晕
    if (!this.isAngry) {
      ctx.fillStyle = 'rgba(255,150,150,0.2)'
      ctx.beginPath()
      ctx.arc(-11 * scale, -12 * scale, 5 * scale, 0, Math.PI * 2)
      ctx.arc(11 * scale, -12 * scale, 5 * scale, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 头发 - 新设计，不遮挡脸部正面
    ctx.fillStyle = this.hairColor
    if (this.hairStyle === 0) {
      // 短发 - 只在头顶，两侧短
      ctx.beginPath()
      ctx.arc(0, -22 * scale, 16 * scale, Math.PI, 0)
      ctx.fill()
      // 两侧短发
      ctx.fillRect(-16 * scale, -22 * scale, 5 * scale, 8 * scale)
      ctx.fillRect(11 * scale, -22 * scale, 5 * scale, 8 * scale)
      // 刘海（中间分开）
      ctx.beginPath()
      ctx.ellipse(-6 * scale, -24 * scale, 5 * scale, 3 * scale, -0.3, 0, Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(6 * scale, -24 * scale, 5 * scale, 3 * scale, 0.3, 0, Math.PI)
      ctx.fill()
    } else if (this.hairStyle === 1) {
      // 中长发 - 头顶+两侧到耳朵，不遮脸
      ctx.beginPath()
      ctx.arc(0, -20 * scale, 17 * scale, Math.PI, 0)
      ctx.fill()
      // 两侧到耳朵位置
      ctx.beginPath()
      ctx.ellipse(-15 * scale, -15 * scale, 4 * scale, 10 * scale, -0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(15 * scale, -15 * scale, 4 * scale, 10 * scale, 0.2, 0, Math.PI * 2)
      ctx.fill()
      // 小刘海（中间空）
      ctx.beginPath()
      ctx.ellipse(-7 * scale, -22 * scale, 4 * scale, 2.5 * scale, -0.4, 0, Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(7 * scale, -22 * scale, 4 * scale, 2.5 * scale, 0.4, 0, Math.PI)
      ctx.fill()
    } else {
      // 卷发/蓬松发 - 蓬松头顶+小卷两侧
      ctx.beginPath()
      ctx.arc(0, -19 * scale, 18 * scale, Math.PI * 1.1, Math.PI * -0.1)
      ctx.fill()
      // 两侧小卷
      ctx.beginPath()
      ctx.arc(-12 * scale, -12 * scale, 5 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(12 * scale, -12 * scale, 5 * scale, 0, Math.PI * 2)
      ctx.fill()
      // 头顶蓬松感
      ctx.beginPath()
      ctx.ellipse(-5 * scale, -26 * scale, 6 * scale, 4 * scale, -0.3, 0, Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(5 * scale, -26 * scale, 6 * scale, 4 * scale, 0.3, 0, Math.PI)
      ctx.fill()
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
      ctx.strokeStyle = '#E74C3C'
      ctx.lineWidth = 1.5 * scale
      ctx.beginPath()
      ctx.moveTo(-10 * scale, -21 * scale)
      ctx.lineTo(-3 * scale, -18 * scale)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(3 * scale, -18 * scale)
      ctx.lineTo(10 * scale, -21 * scale)
      ctx.stroke()
      
      ctx.fillStyle = '#E74C3C'
      ctx.beginPath()
      ctx.arc(-6 * scale, -17 * scale, 3 * scale, 0, Math.PI * 2)
      ctx.arc(6 * scale, -17 * scale, 3 * scale, 0, Math.PI * 2)
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
    
    // 病情图标
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
    
    // 耐心条
    if (!this.inBed && !this.isCured) {
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
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }
}
