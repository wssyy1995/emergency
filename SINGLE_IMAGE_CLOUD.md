# 单张图片使用云存储 - 使用说明

## 模式说明

当前使用的是**混合模式**：
- 只有在 `CLOUD_IMAGE_MAP` 中配置的图片才会使用云存储
- 未配置的图片自动使用本地图片

## 方法一：修改配置文件（推荐）

### 步骤1：上传图片到云存储

1. 打开微信开发者工具
2. 点击"云开发"按钮
3. 选择"存储" → "上传文件"
4. 选择要上传的图片（如 `honor.png`）
5. 记录上传后的文件 ID（如 `cloud://cloudbase-6gxf6ir4ef928555.xxx/images/honor.png`）

### 步骤2：修改配置

打开 `js/CloudImageManager.js`，在 `CLOUD_IMAGE_MAP` 中添加：

```javascript
const CLOUD_IMAGE_MAP = {
  // 只配置你需要用云存储的图片
  'honor.png': 'cloud://cloudbase-6gxf6ir4ef928555.636c-cloudbase-6gxf6ir4ef928555-1326381979/images/honor.png',
  
  // 其他图片不配置，自动使用本地
}
```

### 步骤3：重新编译

完成！只有 `honor.png` 会从云存储加载，其他图片仍然使用本地。

---

## 方法二：代码动态配置

在 `Game.js` 中，修改 `initCloudStorage` 方法：

```javascript
initCloudStorage() {
  // ... 原有代码 ...
  
  // 配置单张图片使用云存储
  // 取消下面的注释，填写实际的云文件路径
  this.configCloudImage('honor.png', 'cloud://cloudbase-6gxf6ir4ef928555.xxx/images/honor.png')
  this.configCloudImage('cured.png', 'cloud://cloudbase-6gxf6ir4ef928555.xxx/images/cured.png')
}
```

或者在游戏运行时动态配置（如在某个按钮点击后）：

```javascript
// 比如在某个事件处理中
onSomeButtonClick() {
  // 配置并立即加载
  cloudImageManager.useCloudImage('honor.png', 'cloud://xxx/images/honor.png', true)
    .then(img => {
      console.log('图片加载成功:', img)
    })
}
```

---

## 方法三：批量配置

如果要配置多张图片：

```javascript
// 在 Game.js 的 initCloudStorage 中
const cloudImages = {
  'honor.png': 'cloud://cloudbase-6gxf6ir4ef928555.xxx/images/honor.png',
  'cured.png': 'cloud://cloudbase-6gxf6ir4ef928555.xxx/images/cured.png',
  'boom.png': 'cloud://cloudbase-6gxf6ir4ef928555.xxx/images/global_icon/boom.png'
}

cloudImageManager.updateImageMap(cloudImages)
```

---

## 查看配置是否生效

打开开发者工具控制台，查看输出：

```
[Game] 云存储已初始化（混合模式：只有配置的图片才使用云存储）
[CloudImageManager] 已配置云存储图片: honor.png
```

如果看到这些日志，说明配置成功了。

---

## 切换回本地图片

如果某张图片不想用云存储了：

```javascript
// 方法1：从配置中移除
// 打开 CloudImageManager.js，从 CLOUD_IMAGE_MAP 中删除对应行

// 方法2：代码动态移除
cloudImageManager.useLocalImage('honor.png')
```

---

## 常见问题

### Q: 配置了云存储，但图片加载失败？

A: 检查以下几点：
1. 图片是否已上传到云存储
2. 云文件路径是否正确
3. 网络连接是否正常

### Q: 如何知道图片是从云端还是本地加载的？

A: 查看控制台输出：
```
[CloudImageManager] 加载云图片: honor.png  // 从云端加载
Failed to load image: images/xxx.png  // 从本地加载失败
```

### Q: 可以部分图片云端、部分图片本地吗？

A: 可以！这就是混合模式的优势：
- 配置在 `CLOUD_IMAGE_MAP` 中的 → 云端加载
- 没配置的 → 自动使用本地 `images/xxx.png`
