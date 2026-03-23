/**
 * 批量上传图片到微信云开发云存储
 * 
 * 使用方法：
 * 1. 确保已开通微信云开发
 * 2. 在小程序开发者工具中，点击"云开发"按钮进入控制台
 * 3. 在控制台中获取你的环境 ID
 * 4. 修改下面的 CLOUD_ENV_ID 为你的实际环境 ID
 * 5. 在开发者工具控制台运行此脚本
 */

const fs = wx.getFileSystemManager()

// ==================== 配置区域 ====================
const CLOUD_ENV_ID = 'cloudbase-6gxf6ir4ef928555'  // 替换为你的云开发环境 ID
const IMAGES_DIR = 'images/'  // 本地图片目录
// =================================================

// 需要上传的图片列表
const IMAGE_FILES = [
  // 物品图片
  'adrenaline.png',
  'aed.png',
  'antibiotic.png',
  'painkiller.png',
  'injection.png',
  'tape.png',
  'scissors.png',
  'thermometer.png',
  
  // UI 图标
  'cured.png',
  'curing.png',
  'honor.png',
  'timer.png',
  'patient_icon.png',
  'deliver.png',
  'start_machine.png',
  'machine_report.png',
  
  // 病人相关
  'boom.png',
  'comfort.png',
  
  // 场景图片
  'bed.png',
  'bed_area_bg.png',
  'seat_free.png',
  'seat_occupied.png',
  'tools_desk.png',
  
  // 护士台
  'nurse_desk.png',
  'nurse.png',
  'nurse_hello.png',
  'plant.png',
  'bookshelf.png',
  'guide.png',
  'finger.png',
  'lightbulb.png',
  
  // 医生
  'doctor_1_idle.png',
  'doctor_1_treat.png',
  'doctor_2_idle.png',
  'doctor_2_treat.png',
  
  // 疾病图标（1-13）
  'disease_1.png',
  'disease_2.png',
  'disease_3.png',
  'disease_4.png',
  'disease_5.png',
  'disease_6.png',
  'disease_7.png',
  'disease_8.png',
  'disease_9.png',
  'disease_10.png',
  'disease_11.png',
  'disease_12.png',
  'disease_13.png',
]

// 病人图片（1-26号）
for (let i = 1; i <= 26; i++) {
  IMAGE_FILES.push(`patient_${i}_normal.png`)
  IMAGE_FILES.push(`patient_${i}_sick.png`)
  IMAGE_FILES.push(`patient_${i}_angry.png`)
}

// 升级图片
IMAGE_FILES.push('nurse_pro_1.png', 'nurse_pro_2.png', 'nurse_pro_3.png')
IMAGE_FILES.push('doctor_pro_1.png', 'seat_pro_1.png')

class CloudUploader {
  constructor() {
    this.total = IMAGE_FILES.length
    this.success = []
    this.failed = []
  }

  async init() {
    // 初始化云开发
    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    })
    console.log('云开发初始化成功，环境ID:', CLOUD_ENV_ID)
  }

  async uploadAll() {
    console.log(`开始上传 ${this.total} 张图片...`)
    
    for (let i = 0; i < IMAGE_FILES.length; i++) {
      const filename = IMAGE_FILES[i]
      const progress = `[${i + 1}/${this.total}]`
      
      try {
        await this.uploadFile(filename)
        this.success.push(filename)
        console.log(`${progress} ✅ 上传成功: ${filename}`)
      } catch (err) {
        this.failed.push({ filename, error: err })
        console.error(`${progress} ❌ 上传失败: ${filename}`, err)
      }
    }
    
    this.printReport()
  }

  uploadFile(filename) {
    return new Promise((resolve, reject) => {
      const localPath = `${wx.env.USER_DATA_PATH}/${IMAGES_DIR}${filename}`
      const cloudPath = `images/${filename}`
      
      wx.cloud.uploadFile({
        cloudPath,
        filePath: localPath,
        success: (res) => {
          resolve(res)
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }

  printReport() {
    console.log('\n========== 上传报告 ==========')
    console.log(`总计: ${this.total}`)
    console.log(`成功: ${this.success.length}`)
    console.log(`失败: ${this.failed.length}`)
    
    if (this.failed.length > 0) {
      console.log('\n失败的文件:')
      this.failed.forEach(({ filename, error }) => {
        console.log(`  - ${filename}: ${error.message || error}`)
      })
    }
    
    console.log('\n生成的映射配置（复制到 CloudImageManager.js）:')
    console.log('const CLOUD_IMAGE_MAP = {')
    this.success.forEach(filename => {
      const fileID = `cloud://${CLOUD_ENV_ID}.xxx/images/${filename}`
      console.log(`  '${filename}': '${fileID}',`)
    })
    console.log('}')
  }
}

// 导出上传函数
function startUpload() {
  const uploader = new CloudUploader()
  uploader.init().then(() => {
    uploader.uploadAll()
  })
}

// 如果需要在控制台直接运行，取消下面的注释
// startUpload()

export { CloudUploader, startUpload, IMAGE_FILES }
