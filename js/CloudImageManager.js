/**
 * 云存储图片管理器
 * 支持从微信云开发的云存储加载图片
 */

// 读取项目配置
let projectConfig = {}
try {
  projectConfig = require('../project.config.json')
} catch (e) {
  console.warn('[CloudImageManager] 无法读取 project.config.json')
}

const cloudConfig = projectConfig.cloudStorage || {}

// 云存储配置（优先使用 project.config.json 中的配置）
const envId = cloudConfig.envId || 'cloudbase-6gxf6ir4ef928555'
const bucketId = cloudConfig.bucketId || '1409144239'  // 正确的 bucket ID

const CLOUD_CONFIG = {
  // 云环境 ID
  env: envId,
  // 云存储基础路径
  basePath: `cloud://${envId}.636c-${envId}-${bucketId}/images/`,
  // 是否使用云存储（开发时可以先关闭，使用本地图片）
  enabled: cloudConfig.enabled !== false,  // 默认 true
  // 本地图片基础路径
  localBasePath: 'images/',
  // 混合模式：true = 只有在 CLOUD_IMAGE_MAP 中配置的图片才用云存储，其他用本地
  // false = 所有图片都用云存储
  hybridMode: cloudConfig.hybridMode !== false  // 默认 true
}

// 图片名称到云存储路径的映射
// 上传图片到云存储后，在这里记录对应的云文件 ID
const CLOUD_IMAGE_MAP = {
  // nurse
  'nurse_desk.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/nurse/nurse_desk.png',
  'nurse.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/nurse/nurse.png',
  'nurse_hello.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/nurse/nurse_hello.png',
  'nurse_hello.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/nurse/nurse_hello.png',
  'nurse_pro.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/nurse/nurse_pro.png',
  'nurse_pro_1.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/nurse/nurse_pro_1.png',
  'nurse_pro_2.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/nurse/nurse_pro_2.png',
  'nurse_pro_3.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/nurse/nurse_pro_3.png',
  //patient
  'patient_1_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_1_normal.png',
  'patient_1_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_1_sick.png',
  'patient_2_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_2_normal.png',
  'patient_2_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_2_sick.png',
  'patient_3_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_3_normal.png',
  'patient_3_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_3_sick.png',
  'patient_4_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_4_normal.png',
  'patient_4_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_4_sick.png',
  'patient_5_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_5_normal.png',
  'patient_5_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_5_sick.png',
  'patient_6_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_6_normal.png',
  'patient_6_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_6_sick.png',
  'patient_7_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_7_normal.png',
  'patient_7_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_7_sick.png',
  'patient_8_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_8_normal.png',
  'patient_8_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_8_sick.png',
  'patient_9_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_9_normal.png',
  'patient_9_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_9_sick.png',
  'patient_10_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_10_normal.png',
  'patient_10_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_10_sick.png',
  'patient_11_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_11_normal.png',
  'patient_11_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_11_sick.png',
  'patient_12_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_12_normal.png',
  'patient_12_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_12_sick.png',
  'patient_13_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_13_normal.png',
  'patient_13_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_13_sick.png',
  'patient_14_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_14_normal.png',
  'patient_14_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_14_sick.png',
  'patient_15_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_15_normal.png',
  'patient_15_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_15_sick.png',
  'patient_16_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_16_normal.png',
  'patient_16_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_16_sick.png',
  'patient_17_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_17_sick.png',
  'patient_18_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_18_sick.png',
  'patient_19_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_19_sick.png',
  'patient_20_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_20_sick.png',
  'patient_21_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_21_sick.png',
  'patient_22_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_22_sick.png',
  'patient_23_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_23_sick.png',
  'patient_24_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_24_sick.png',
  'patient_25_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_25_sick.png',
  'patient_26_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_26_sick.png',
  'patient_icon.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/patient/patient_icon.png',
  //tool_machine
  'machine_blood.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/tool_machine/machine_blood.png',
  'machine_brain.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/tool_machine/machine_brain.png',
  'machine_ct.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/tool_machine/machine_ct.png',
  'machine_heart.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/tool_machine/machine_heart.png',
  'machine_report.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/tool_machine/machine_report.png',
  'machine_super.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1409144239/images/tool_machine/machine_super.png'
}

class CloudImageManager {
  constructor() {
    this.imageCache = {}
    this.tempUrlCache = {}
    this.loadingPromises = {}
    
    // 自动初始化云环境
    if (CLOUD_CONFIG.enabled && wx.cloud) {
      this.initCloud()
    }
  }

  /**
   * 初始化云环境
   */
  initCloud(env) {
    if (env) {
      CLOUD_CONFIG.env = env
    }
    
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: CLOUD_CONFIG.env,
        traceUser: true
      })
      console.log('[CloudImageManager] 云环境初始化成功:', CLOUD_CONFIG.env)
    } else {
      console.warn('[CloudImageManager] 当前环境不支持云开发')
    }
  }

  /**
   * 设置是否使用云存储
   */
  setEnabled(enabled) {
    CLOUD_CONFIG.enabled = enabled
    console.log('[CloudImageManager] 云存储模式:', enabled ? '开启' : '关闭')
  }

  /**
   * 判断图片是否使用云存储
   * @param {string} imageName - 图片文件名
   * @returns {boolean} 是否使用云存储
   */
  shouldUseCloud(imageName) {
    // 如果云存储未启用，不使用
    if (!CLOUD_CONFIG.enabled) {
      return false
    }
    
    // 混合模式：只有在 CLOUD_IMAGE_MAP 中配置的图片才用云存储
    if (CLOUD_CONFIG.hybridMode) {
      return !!CLOUD_IMAGE_MAP[imageName]
    }
    
    // 全量模式：所有图片都用云存储（未配置的会警告并回退到本地）
    return true
  }

  /**
   * 获取图片路径（根据配置返回本地或云存储路径）
   * @param {string} imageName - 图片文件名
   * @returns {string} 图片路径
   */
  getImagePath(imageName) {
    if (this.shouldUseCloud(imageName)) {
      const cloudPath = CLOUD_IMAGE_MAP[imageName]
      if (cloudPath) {
        return cloudPath
      }
      console.warn('[CloudImageManager] 图片未配置云存储路径:', imageName)
    }
    
    // 默认使用本地路径
    return CLOUD_CONFIG.localBasePath + imageName
  }

  /**
   * 获取云存储文件的临时 URL
   * 云存储文件需要使用临时 URL 才能在 canvas 中绘制
   * @param {string} fileID - 云文件 ID
   * @returns {Promise<string>} 临时 URL
   */
  async getTempUrl(fileID) {
    // 检查缓存
    if (this.tempUrlCache[fileID]) {
      return this.tempUrlCache[fileID]
    }
    
    // 检查是否正在加载
    if (this.loadingPromises[fileID]) {
      try {
        const url = await this.loadingPromises[fileID]
        return url
      } catch (err) {
        // 之前的加载失败了，清除缓存重试
        delete this.loadingPromises[fileID]
      }
    }
    
    // 开始加载
    const promise = this._fetchTempUrl(fileID)
    this.loadingPromises[fileID] = promise
    
    try {
      const url = await promise
      this.tempUrlCache[fileID] = url
      delete this.loadingPromises[fileID]
      return url
    } catch (err) {
      delete this.loadingPromises[fileID]
      throw err
    }
  }

  /**
   * 内部方法：调用云 API 获取临时 URL
   */
  _fetchTempUrl(fileID) {
    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        console.error('[CloudImageManager] 获取临时URL超时:', fileID)
        reject(new Error('获取临时URL超时'))
      }, 8000) // 8秒超时
      
      wx.cloud.getTempFileURL({
        fileList: [fileID],
        success: (res) => {
          clearTimeout(timeoutId)
          console.log('[CloudImageManager] API返回:', res)
          if (res.fileList && res.fileList[0]) {
            const fileInfo = res.fileList[0]
            if (fileInfo.tempFileURL) {
              resolve(fileInfo.tempFileURL)
            } else if (fileInfo.status === -1) {
              reject(new Error('云文件不存在: ' + fileID))
            } else {
              reject(new Error('获取临时URL失败: ' + JSON.stringify(fileInfo)))
            }
          } else {
            reject(new Error('获取临时 URL 失败: 返回格式错误'))
          }
        },
        fail: (err) => {
          clearTimeout(timeoutId)
          console.error('[CloudImageManager] 获取临时 URL 失败:', err)
          reject(err)
        }
      })
    })
  }

  /**
   * 加载图片（支持本地和云存储）
   * @param {string} imageName - 图片文件名
   * @returns {Promise<HTMLImageElement>} 图片对象
   */
  async loadImage(imageName) {
    // 检查缓存：如果有且有效（width > 0），直接返回
    const cached = this.imageCache[imageName]
    if (cached && cached.width > 0) {
      return cached
    }
    
    // 获取图片路径
    const path = this.getImagePath(imageName)
    // 日志已移除
    
    // 如果是云存储路径，先获取临时 URL
    let imageUrl = path
    if (path.startsWith('cloud://')) {
      // 云路径处理
      try {
        imageUrl = await this.getTempUrl(path)
        // 获取临时 URL 成功
      } catch (err) {
        console.error('[CloudImageManager] 获取临时 URL 失败:', err)
        console.error('[CloudImageManager] 回退到本地:', imageName)
        // 从云路径中提取本地路径（cloud://.../images/nurse/xxx.png -> images/nurse/xxx.png）
        const localPathMatch = path.match(/images\/.+$/)
        imageUrl = localPathMatch ? localPathMatch[0] : CLOUD_CONFIG.localBasePath + imageName
      }
    }
    
    // 创建图片对象
    return new Promise((resolve, reject) => {
      const img = wx.createImage()
      
      // 设置超时，防止永远等待
      const timeoutId = setTimeout(() => {
        console.error('[CloudImageManager] 图片加载超时:', imageName, 'url:', imageUrl?.substring(0, 50))
        reject(new Error('图片加载超时'))
      }, 10000) // 10秒超时
      
      img.onload = () => {
        clearTimeout(timeoutId)
        this.imageCache[imageName] = img
        resolve(img)
      }
      img.onerror = (err) => {
        clearTimeout(timeoutId)
        console.error('[CloudImageManager] 图片加载失败:', imageName, err)
        reject(err)
      }
      
      // 确保 imageUrl 有效
      if (!imageUrl) {
        clearTimeout(timeoutId)
        reject(new Error('图片 URL 为空'))
        return
      }
      
      img.src = imageUrl
    })
  }

  /**
   * 预加载多张图片
   * @param {string[]} imageNames - 图片文件名数组
   * @param {Function} onProgress - 进度回调 (loaded, total)
   * @returns {Promise<void>}
   */
  async preloadImages(imageNames, onProgress) {
    const total = imageNames.length
    let loaded = 0
    
    const promises = imageNames.map(async (name) => {
      try {
        await this.loadImage(name)
        loaded++
        if (onProgress) {
          onProgress(loaded, total)
        }
      } catch (err) {
        console.warn('[CloudImageManager] 预加载失败:', name)
      }
    })
    
    await Promise.all(promises)
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.imageCache = {}
    this.tempUrlCache = {}
    this.loadingPromises = {}
  }

  /**
   * 更新云存储图片映射
   * @param {Object} newMap - 新的图片映射 {文件名: 云文件ID}
   */
  updateImageMap(newMap) {
    Object.assign(CLOUD_IMAGE_MAP, newMap)
    console.log('[CloudImageManager] 图片映射已更新')
  }
  
  /**
   * 配置单张图片使用云存储
   * 用法：cloudImageManager.useCloudImage('honor.png', 'cloud://xxx/images/honor.png')
   * 
   * @param {string} imageName - 图片文件名（如 'honor.png'）
   * @param {string} cloudPath - 云文件路径（如 'cloud://env-id.xxx/images/honor.png'）
   * @param {boolean} preload - 是否立即预加载
   */
  useCloudImage(imageName, cloudPath, preload = false) {
    CLOUD_IMAGE_MAP[imageName] = cloudPath
    console.log('[CloudImageManager] 已配置云存储图片:', imageName)
    
    // 如果需要立即加载
    if (preload) {
      return this.loadImage(imageName)
    }
    return Promise.resolve()
  }
  
  /**
   * 移除图片的云存储配置（回退到本地）
   * @param {string} imageName - 图片文件名
   */
  useLocalImage(imageName) {
    delete CLOUD_IMAGE_MAP[imageName]
    // 清除缓存，下次加载时会从本地重新加载
    delete this.imageCache[imageName]
    delete this.tempUrlCache[imageName]
    console.log('[CloudImageManager] 已切换为本地图片:', imageName)
  }

  /**
   * 批量上传本地图片到云存储
   * @param {string[]} imageNames - 要上传的图片文件名数组
   * @param {Function} onProgress - 进度回调 (loaded, total, currentFile)
   * @returns {Promise<Object>} 上传结果 {成功: [], 失败: []}
   */
  async uploadImages(imageNames, onProgress) {
    const results = {
      success: [],
      failed: []
    }
    
    for (let i = 0; i < imageNames.length; i++) {
      const name = imageNames[i]
      const localPath = `${CLOUD_CONFIG.localBasePath}${name}`
      const cloudPath = `images/${name}`
      
      if (onProgress) {
        onProgress(i, imageNames.length, name)
      }
      
      try {
        const uploadRes = await this._uploadFile(localPath, cloudPath)
        results.success.push({
          name,
          fileID: uploadRes.fileID
        })
        // 更新映射
        CLOUD_IMAGE_MAP[name] = uploadRes.fileID
      } catch (err) {
        console.error('[CloudImageManager] 上传失败:', name, err)
        results.failed.push({ name, error: err })
      }
    }
    
    return results
  }

  /**
   * 内部方法：上传单个文件
   */
  _uploadFile(filePath, cloudPath) {
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath,
        filePath,
        success: resolve,
        fail: reject
      })
    })
  }
}

// 导出单例
const cloudImageManager = new CloudImageManager()

export default cloudImageManager
export { CLOUD_CONFIG, CLOUD_IMAGE_MAP }
