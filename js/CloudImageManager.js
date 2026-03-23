/**
 * 云存储图片管理器
 * 支持从微信云开发的云存储加载图片
 */

// 云存储配置
const CLOUD_CONFIG = {
  // 云环境 ID
  env: 'cloudbase-6gxf6ir4ef928555',
  // 云存储基础路径
  basePath: 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/',
  // 是否使用云存储（开发时可以先关闭，使用本地图片）
  enabled: false,
  // 本地图片基础路径
  localBasePath: 'images/',
  // 混合模式：true = 只有在 CLOUD_IMAGE_MAP 中配置的图片才用云存储，其他用本地
  // false = 所有图片都用本地
  hybridMode: true
}

// 图片名称到云存储路径的映射
// 上传图片到云存储后，在这里记录对应的云文件 ID
const CLOUD_IMAGE_MAP = {
  // 物品图片
  'adrenaline.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/adrenaline.png',
  'aed.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/aed.png',
  'antibiotic.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/antibiotic.png',
  'painkiller.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/painkiller.png',
  'injection.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/injection.png',
  'tape.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/tape.png',
  'scissors.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/scissors.png',
  'thermometer.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/thermometer.png',
  
  // UI 图标
  'cured.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/cured.png',
  'curing.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/curing.png',
  'honor.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/honor.png',
  'timer.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/timer.png',
  'patient_icon.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/patient_icon.png',
  'start_level.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/start_level.png',
  'deliver.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/deliver.png',
  'start_machine.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/start_machine.png',
  'machine_report.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/machine_report.png',
  
  // 病人相关
  'boom.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/boom.png',
  'comfort.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/comfort.png',
  
  // 场景图片
  'bed.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/bed.png',
  'bed_area_bg.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/bed_area_bg.png',
  'seat_free.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/seat_free.png',
  'seat_occupied.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/seat_occupied.png',
  'tools_desk.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/tools_desk.png',
  
  // 护士台
  'nurse_desk.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/nurse_desk.png',
  'nurse.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/nurse.png',
  'nurse_hello.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/nurse_hello.png',
  'plant.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/plant.png',
  'bookshelf.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/bookshelf.png',
  'guide.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/guide.png',
  'finger.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/finger.png',
  'lightbulb.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/lightbulb.png',
  
  // 医生
  'doctor_1_idle.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/doctor_1_idle.png',
  'doctor_1_treat.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/doctor_1_treat.png',
  'doctor_2_idle.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/doctor_2_idle.png',
  'doctor_2_treat.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/doctor_2_treat.png',
  
  // 疾病图标
  'disease_1.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_1.png',
  'disease_2.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_2.png',
  'disease_3.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_3.png',
  'disease_4.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_4.png',
  'disease_5.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_5.png',
  'disease_6.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_6.png',
  'disease_7.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_7.png',
  'disease_8.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_8.png',
  'disease_9.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_9.png',
  'disease_10.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_10.png',
  'disease_11.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_11.png',
  'disease_12.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_12.png',
  'disease_13.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/disease_13.png',
  
  // 病人图片
  'patient_1_normal.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/patient_1_normal.png',
  'patient_1_sick.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/patient_1_sick.png',
  'patient_1_angry.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/patient_1_angry.png',
  
  // 升级图片
  'nurse_pro_1.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/nurse_pro_1.png',
  'nurse_pro_2.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/nurse_pro_2.png',
  'nurse_pro_3.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/nurse_pro_3.png',
  'doctor_pro_1.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/doctor_pro_1.png',
  'seat_pro_1.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/seat_pro_1.png',
}

class CloudImageManager {
  constructor() {
    this.imageCache = {}
    this.tempUrlCache = {}
    this.loadingPromises = {}
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
      return this.loadingPromises[fileID]
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
      wx.cloud.getTempFileURL({
        fileList: [fileID],
        success: (res) => {
          if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
            resolve(res.fileList[0].tempFileURL)
          } else {
            reject(new Error('获取临时 URL 失败'))
          }
        },
        fail: (err) => {
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
    // 检查缓存
    if (this.imageCache[imageName]) {
      return this.imageCache[imageName]
    }
    
    // 获取图片路径
    const path = this.getImagePath(imageName)
    
    // 如果是云存储路径，先获取临时 URL
    let imageUrl = path
    if (path.startsWith('cloud://')) {
      try {
        imageUrl = await this.getTempUrl(path)
      } catch (err) {
        console.error('[CloudImageManager] 加载云图片失败，回退到本地:', imageName)
        imageUrl = CLOUD_CONFIG.localBasePath + imageName
      }
    }
    
    // 创建图片对象
    return new Promise((resolve, reject) => {
      const img = wx.createImage()
      img.onload = () => {
        this.imageCache[imageName] = img
        resolve(img)
      }
      img.onerror = (err) => {
        console.error('[CloudImageManager] 图片加载失败:', imageName, err)
        reject(err)
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
