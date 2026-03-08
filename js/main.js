import Game from './Game.js'
import { audioManager } from './AudioManager.js'

// 微信小游戏入口
wx.onShow(() => {
  console.log('急症室小游戏启动')
})

// 音频管理器导出到全局，方便其他模块使用
wx.audioManager = audioManager

// 适配不同屏幕尺寸
const sysInfo = wx.getSystemInfoSync()
console.log('屏幕尺寸:', sysInfo.windowWidth, 'x', sysInfo.windowHeight)

// 创建游戏实例
const game = new Game()

// 启动游戏
wx.onShow(() => {
  if (!game.isRunning) {
    game.start()
  }
})

// 首次启动（延迟确保环境准备好）
setTimeout(() => {
  if (!game.isRunning) {
    game.start()
  }
}, 100)
