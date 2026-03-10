import Game from './Game.js'
import { audioManager } from './AudioManager.js'

// 音频管理器导出到全局
wx.audioManager = audioManager

// 创建游戏实例
const game = new Game()

// 标记是否是首次启动
let isFirstLaunch = true

// 启动游戏（首次和重新进入都会触发）
wx.onShow(() => {
  if (isFirstLaunch) {
    // 首次启动：开始新游戏
    isFirstLaunch = false
    game.start()
  } else {
    // 仅仅调用 resume，尺寸纠正完全交给 wx.onWindowResize 和 Game 内部的逻辑去处理
    game.resume()
  }
})
