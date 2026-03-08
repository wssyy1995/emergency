// 音频管理器 - 管理背景音乐和音效
export default class AudioManager {
  constructor() {
    // 背景音乐
    this.bgm = null
    this.bgmVolume = 0.5  // 背景音量 0-1
    
    // 音效音量
    this.sfxVolume = 0.6
    
    // 是否静音
    this.isMuted = false
  }

  // 加载并播放背景音乐
  playBGM(src = 'audio/bgm.mp3') {
    // 如果已有背景音乐在播放，先停止
    this.stopBGM()
    
    // 创建音频实例
    this.bgm = wx.createInnerAudioContext()
    this.bgm.src = src
    this.bgm.loop = true  // 循环播放
    this.bgm.volume = this.bgmVolume
    
    // 自动播放（需要用户交互后才能播放）
    this.bgm.play()
    
    console.log('开始播放背景音乐:', src)
  }

  // 停止背景音乐
  stopBGM() {
    if (this.bgm) {
      this.bgm.stop()
      this.bgm.destroy()
      this.bgm = null
      console.log('停止背景音乐')
    }
  }

  // 暂停背景音乐
  pauseBGM() {
    if (this.bgm) {
      this.bgm.pause()
      console.log('暂停背景音乐')
    }
  }

  // 恢复播放
  resumeBGM() {
    if (this.bgm) {
      this.bgm.play()
      console.log('恢复背景音乐')
    }
  }

  // 设置背景音量
  setBGMVolume(volume) {
    this.bgmVolume = Math.max(0, Math.min(1, volume))
    if (this.bgm) {
      this.bgm.volume = this.bgmVolume
    }
  }

  // 播放音效（短音频，不循环）
  playSFX(src) {
    if (this.isMuted) return
    
    const sfx = wx.createInnerAudioContext()
    sfx.src = src
    sfx.volume = this.sfxVolume
    sfx.play()
    
    // 播放完成后销毁
    sfx.onEnded(() => {
      sfx.destroy()
    })
  }

  // 静音/取消静音
  toggleMute() {
    this.isMuted = !this.isMuted
    if (this.bgm) {
      this.bgm.volume = this.isMuted ? 0 : this.bgmVolume
    }
    return this.isMuted
  }
}

// 创建全局音频管理器实例
export const audioManager = new AudioManager()
