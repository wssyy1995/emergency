/**
 * 游戏资源预加载器
 * 在游戏开始前加载所有云存储图片，避免游戏中的占位符问题
 */

import cloudImageManager from './CloudImageManager.js'
import { CLOUD_IMAGE_MAP } from './CloudImageManager.js'

class Preloader {
  constructor() {
    this.onComplete = null
    this.progress = 0
    this.totalCount = 0
    this.loadedCount = 0
    this.failedCount = 0
    this.isLoading = false
    this.statusText = '准备加载...'
    this.detailText = ''
    this.animationFrame = 0
    this.pulseAnimation = 0
    this.bgImage = null
    this.bgImageLoaded = false
  }

  /**
   * 初始化预加载器
   * @param {Function} onComplete - 加载完成后的回调
   */
  init(onComplete) {
    this.onComplete = onComplete
  }

  /**
   * 预加载背景图
   */
  async preloadBgImage() {
    // 尝试从云存储加载背景图
    try {
      const img = await cloudImageManager.loadImage('loading_bg.png')
      // 确保图片已完全加载（width > 0）
      if (img && img.width > 0) {
        this.bgImage = img
        this.bgImageLoaded = true
        console.log(`[Preloader] 背景图加载成功: ${img.width}x${img.height}`)
      } else {
        throw new Error('图片尺寸无效')
      }
    } catch (err) {
      // 云存储没有配置，尝试本地加载
      console.log('[Preloader] 背景图不在云存储，尝试本地加载')
      await new Promise((resolve) => {
        const img = wx.createImage()
        img.onload = () => {
          if (img.width > 0) {
            this.bgImage = img
            this.bgImageLoaded = true
            console.log(`[Preloader] 背景图本地加载成功: ${img.width}x${img.height}`)
          } else {
            console.log('[Preloader] 背景图本地加载失败: 尺寸无效')
          }
          resolve()
        }
        img.onerror = (err) => {
          console.log('[Preloader] 背景图本地加载失败:', err)
          resolve()
        }
        img.src = 'images/loading_bg.png'
      })
    }
  }

  /**
   * 开始加载所有资源
   * @param {CanvasRenderingContext2D} ctx - 游戏画布上下文
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   */
  async startLoading(ctx, width, height) {
    if (this.isLoading) return
    this.isLoading = true
    
    // 保存绘制参数
    this.ctx = ctx
    this.width = width
    this.height = height
    
    // 先加载背景图
    await this.preloadBgImage()
    
    // 收集需要加载的所有图片
    const imagesToLoad = this.collectImagesToLoad()
    this.totalCount = imagesToLoad.length
    
    console.log(`[Preloader] 开始加载 ${this.totalCount} 张图片`)
    console.log(`[Preloader] 画布尺寸: ${width}x${height}`)
    this.statusText = '正在加载游戏资源...'
    
    // 启动动画循环
    this.startAnimationLoop()
    
    // 分批加载，避免同时发起过多请求
    const batchSize = 5
    for (let i = 0; i < imagesToLoad.length; i += batchSize) {
      const batch = imagesToLoad.slice(i, i + batchSize)
      await this.loadBatch(batch)
      
      // 更新进度
      this.progress = Math.floor((this.loadedCount / this.totalCount) * 100)
    }
    
    // 加载完成
    this.statusText = '加载完成！'
    this.progress = 100
    
    console.log(`[Preloader] 加载完成: 成功=${this.loadedCount}, 失败=${this.failedCount}`)
    
    // 延迟一下让用户看到100%进度
    setTimeout(() => {
      console.log('[Preloader] 执行 onComplete 回调')
      this.stopAnimationLoop()
      if (this.onComplete) {
        this.onComplete()
      }
    }, 800)
  }

  /**
   * 启动动画循环
   */
  startAnimationLoop() {
    const animate = () => {
      if (!this.isLoading) return
      
      this.animationFrame++
      this.pulseAnimation = Math.sin(this.animationFrame * 0.05) * 0.5 + 0.5 // 0-1 脉冲
      
      this.render()
      this.animationId = requestAnimationFrame(animate)
    }
    animate()
  }

  /**
   * 停止动画循环
   */
  stopAnimationLoop() {
    this.isLoading = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }

  /**
   * 收集需要加载的图片列表
   */
  collectImagesToLoad() {
    const images = []
    
    // 从 CLOUD_IMAGE_MAP 获取所有配置了云存储的图片
    Object.keys(CLOUD_IMAGE_MAP).forEach(imageName => {
      images.push(imageName)
    })
    
    // 加载检验设备图片（如果未在 CLOUD_IMAGE_MAP 中，则会回退到本地）
    const machineImages = [
      'machine_ct.png',
      'machine_super.png',
      'machine_blood.png',
      'machine_heart.png',
      'machine_brain.png',
      'machine_report.png'
    ]
    machineImages.forEach(img => {
      if (!images.includes(img)) {
        images.push(img)
      }
    })
    
    return images
  }

  /**
   * 加载一批图片
   */
  async loadBatch(imageNames) {
    const promises = imageNames.map(name => this.loadSingleImage(name))
    await Promise.all(promises)
  }

  /**
   * 加载单张图片
   */
  async loadSingleImage(imageName) {
    this.detailText = `正在加载: ${imageName}`
    
    try {
      await cloudImageManager.loadImage(imageName)
      this.loadedCount++
      console.log(`[Preloader] ✓ ${imageName}`)
    } catch (err) {
      this.failedCount++
      console.warn(`[Preloader] ✗ ${imageName}`, err?.message || '')
    }
  }

  /**
   * 绘制加载页面
   */
  render() {
    if (!this.ctx) return
    
    const ctx = this.ctx
    const w = this.width
    const h = this.height
    const centerX = w / 2
    
    // ===== 1. 绘制背景 =====
    if (this.bgImageLoaded && this.bgImage && this.bgImage.width > 0 && this.bgImage.height > 0) {
      // 使用图片背景，填满屏幕（cover 模式，允许裁剪，无黑边）
      const imgW = this.bgImage.width
      const imgH = this.bgImage.height
      const imgRatio = imgW / imgH
      const screenRatio = w / h
      
      let drawW, drawH, drawX, drawY
      
      if (imgRatio > screenRatio) {
        // 图片较宽，以屏幕高度为基准，宽度超出裁剪
        drawH = h
        drawW = h * imgRatio
        drawX = (w - drawW) / 2
        drawY = 0
      } else {
        // 图片较高，以屏幕宽度为基准，高度超出裁剪
        drawW = w
        drawH = w / imgRatio
        drawX = 0
        drawY = (h - drawH) / 2
      }
      
      // 调试日志（只打印一次）
      if (this.animationFrame === 1) {
        console.log(`[Preloader] 背景图渲染: ${imgW}x${imgH} -> ${drawW.toFixed(0)}x${drawH.toFixed(0)} @ (${drawX.toFixed(0)}, ${drawY.toFixed(0)})`)
      }
      
      // 绘制图片（填满屏幕）
      ctx.drawImage(this.bgImage, drawX, drawY, drawW, drawH)
    } else {
      // 背景图未加载，使用纯色背景
      ctx.fillStyle = '#74c3e8'
      ctx.fillRect(0, 0, w, h)
    }
    
    // ===== 2. 绘制半透明遮罩（让进度条更清晰）=====
    const overlayGradient = ctx.createLinearGradient(0, h * 0.6, 0, h)
    overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)')
    ctx.fillStyle = overlayGradient
    ctx.fillRect(0, h * 0.6, w, h * 0.4)
    
    // ===== 3. 绘制状态文字 =====
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    ctx.font = '14px "PingFang SC", sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    // 添加阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 1
    ctx.fillText(this.statusText, centerX, h * 0.75)
    // 重置阴影
    ctx.shadowColor = 'transparent'
    
    // ===== 4. 绘制进度条 =====
    const barWidth = Math.min(300, w * 0.7)
    const barHeight = 14
    const barX = centerX - barWidth / 2
    const barY = h * 0.80
    const radius = barHeight / 2
    
    // 进度条背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.roundRect(ctx, barX, barY, barWidth, barHeight, radius)
    ctx.fill()
    
    // 进度条填充（带光泽效果）
    const progressWidth = (this.progress / 100) * barWidth
    if (progressWidth > 0) {
      // 主色
      ctx.fillStyle = '#FFFFFF'
      this.roundRect(ctx, barX, barY, progressWidth, barHeight, radius)
      ctx.fill()
      
      // 光泽效果
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.fillRect(barX, barY, progressWidth, barHeight / 2)
    }
    
    // ===== 5. 绘制进度百分比 =====
    ctx.font = 'bold 16px "PingFang SC", sans-serif'
    ctx.fillStyle = '#FFFFFF'
    // 添加阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 1
    ctx.fillText(`${this.progress}%`, centerX, barY + 30)
    // 重置阴影
    ctx.shadowColor = 'transparent'
  }

  /**
   * 绘制圆角矩形辅助方法
   */
  roundRect(ctx, x, y, width, height, radius) {
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
}

// 导出单例
const preloader = new Preloader()
export default preloader
