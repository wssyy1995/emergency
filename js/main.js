import Game from './Game.js'
import { audioManager } from './AudioManager.js'
import preloader from './Preloader.js'

// 音频管理器导出到全局
wx.audioManager = audioManager

// 标记是否是首次启动
let isFirstLaunch = true
let game = null

console.log('[Main] main.js 加载完成')

// 启动游戏（首次和重新进入都会触发）
wx.onShow(() => {
  console.log('[Main] wx.onShow 触发, isFirstLaunch=', isFirstLaunch)
  
  if (isFirstLaunch) {
    // 首次启动：先创建 Game 实例（初始化画布），然后预加载资源
    isFirstLaunch = false
    
    console.log('[Main] 首次启动，创建 Game 实例')
    
    // 创建游戏实例（只初始化，不开始游戏）
    game = new Game()
    
    // 初始化预加载器
    preloader.init(() => {
      // 预加载完成后，开始游戏
      console.log('[Main] 预加载完成，启动游戏')
      game.start()
    })
    
    // 延迟一帧开始加载，确保模块初始化完成
    requestAnimationFrame(() => {
      console.log('[Main] 开始加载资源')
      // 使用逻辑尺寸（因为 ctx 已经被 scale(pixelRatio) 缩放了）
      preloader.startLoading(game.ctx, game.screenWidth, game.screenHeight)
    })
    
  } else {
    // 非首次启动：直接恢复游戏
    console.log('[Main] 非首次启动，尝试恢复游戏')
    if (game) {
      game.resume()
    } else {
      console.warn('[Main] game 实例为空，无法恢复')
    }
  }
})
