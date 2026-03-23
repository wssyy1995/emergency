# 微信云开发云存储使用指南

## 概述

本项目已集成微信云开发的云存储功能，可以将本地图片上传到云端，减少小程序包体积，并支持动态更新图片资源。

## 目录结构

```
js/
├── CloudImageManager.js    # 云存储图片管理器
├── Items.js                # 已适配云存储
├── Game.js                 # 已适配云存储
└── ...

upload-images-to-cloud.js    # 批量上传脚本
```

## 使用步骤

### 第一步：开通微信云开发

1. 登录微信公众平台
2. 进入小程序后台
3. 点击左侧菜单"云开发"
4. 点击"开通"按钮
5. 创建云开发环境，记录环境 ID

### 第二步：配置云环境 ID

修改以下文件中的 `your-cloud-env-id` 为你的实际环境 ID：

1. **js/CloudImageManager.js**
   ```javascript
   const CLOUD_CONFIG = {
     env: 'your-actual-env-id',  // 替换这里
     // ...
   }
   ```

2. **js/Game.js**
   ```javascript
   this.cloudEnvId = 'your-actual-env-id'  // 替换这里
   ```

3. **upload-images-to-cloud.js**
   ```javascript
   const CLOUD_ENV_ID = 'your-actual-env-id'  // 替换这里
   ```

### 第三步：上传图片到云存储

#### 方式一：使用开发者工具控制台

1. 打开微信开发者工具
2. 在控制台运行以下代码：

```javascript
// 导入上传脚本
const { startUpload } = require('./upload-images-to-cloud.js')

// 开始上传
startUpload()
```

#### 方式二：手动上传

1. 打开微信开发者工具
2. 点击"云开发"按钮进入控制台
3. 选择"存储"标签
4. 点击"上传文件"
5. 选择 `images/` 目录下的所有图片
6. 确保上传路径为 `images/xxx.png`

### 第四步：更新图片映射

上传完成后，需要将云存储返回的 `fileID` 更新到 `js/CloudImageManager.js` 中的 `CLOUD_IMAGE_MAP`：

```javascript
const CLOUD_IMAGE_MAP = {
  'honor.png': 'cloud://your-env-id.xxx/images/honor.png',
  'cured.png': 'cloud://your-env-id.xxx/images/cured.png',
  // ... 其他图片
}
```

### 第五步：开启云存储模式

修改 `js/Game.js` 中的配置：

```javascript
// 初始化云存储
initCloudStorage() {
  this.useCloudStorage = true  // 改为 true 开启云存储
  this.cloudEnvId = 'your-actual-env-id'
  // ...
}
```

## 代码适配说明

### 已适配的文件

- ✅ `js/Items.js` - 物品图片加载
- ✅ `js/Game.js` - 游戏主逻辑和图标加载
- ✅ `js/CloudImageManager.js` - 云存储管理器

### 需要继续适配的文件

以下文件仍使用本地图片路径，需要逐步适配：

- `js/Doctor.js` - 医生图片缓存
- `js/Patient.js` - 病人图片缓存
- `js/Nurse.js` - 护士图片
- `js/BedArea.js` - 病床、输液椅图片
- `js/WaitingArea.js` - 等候区装饰图片
- `js/EquipmentRoom.js` - 按钮图片

## 适配示例

### 原有代码（本地加载）

```javascript
const img = wx.createImage()
img.onload = () => {
  this.image = img
}
img.src = 'images/xxx.png'
```

### 新代码（云存储加载）

```javascript
// 导入云存储管理器
import cloudImageManager from './CloudImageManager.js'

// 异步加载
async loadImage() {
  try {
    const img = await cloudImageManager.loadImage('xxx.png')
    this.image = img
  } catch (e) {
    // 回退到本地加载
    const img = wx.createImage()
    img.onload = () => { this.image = img }
    img.src = 'images/xxx.png'
  }
}
```

## 注意事项

1. **临时 URL 有效期**：云存储文件的临时 URL 默认有效期为 2 小时，系统会自动管理缓存和刷新

2. **网络请求数量**：云存储会增加网络请求，建议在 `Game.js` 的 `start()` 方法中预加载常用图片

3. **错误处理**：云存储加载失败时会自动回退到本地图片，确保游戏正常运行

4. **开发调试**：开发时可以关闭云存储模式，使用本地图片加快调试速度

5. **费用**：云存储和下载会消耗云开发资源，请注意控制用量

## 常见问题

### Q: 图片加载失败怎么办？

A: 检查以下几点：
1. 云环境 ID 是否正确配置
2. 图片是否已上传到云存储
3. 图片映射 `CLOUD_IMAGE_MAP` 是否正确
4. 网络连接是否正常

### Q: 如何切换回本地图片？

A: 修改 `js/Game.js`：
```javascript
initCloudStorage() {
  this.useCloudStorage = false  // 关闭云存储
  // ...
}
```

### Q: 如何批量更新图片？

A: 重新运行上传脚本，或修改 `CLOUD_IMAGE_MAP` 中的映射关系。

## 联系方式

如有问题，请联系开发团队。
