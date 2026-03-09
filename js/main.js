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
    // 重新进入：恢复 Canvas，然后继续游戏
    game.resize()
    game.resume()
  }
})
