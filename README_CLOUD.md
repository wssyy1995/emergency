# 云存储改造 - 快速开始

## 3 步开启云存储

### 第 1 步：开通云开发

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序后台 → 点击左侧"云开发"
3. 点击"开通"，创建环境，记录**环境 ID**

### 第 2 步：修改配置

打开 `js/Game.js`，修改第 250 行左右：

```javascript
initCloudStorage() {
  this.useCloudStorage = true  // 改为 true
  this.cloudEnvId = 'wx1234567890abcdef'  // 替换为你的环境ID
  // ...
}
```

### 第 3 步：上传图片

在微信开发者工具中：

1. 点击"云开发"按钮
2. 选择"存储" → "上传文件"
3. 将 `images/` 文件夹下的所有图片上传到 `images/` 目录

完成！重新编译即可使用云存储。

---

## 常见问题

**Q: 图片加载不出来？**

A: 检查以下几点：
- 环境 ID 是否正确
- 图片是否已上传到云存储
- 网络连接是否正常
- 查看控制台是否有错误信息

**Q: 如何切换回本地图片？**

A: 修改 `js/Game.js`：
```javascript
this.useCloudStorage = false  // 关闭云存储
```

**Q: 上传图片后需要更新代码吗？**

A: 如果使用 `upload-images-to-cloud.js` 脚本上传，会自动生成映射配置。手动上传时，需要更新 `js/CloudImageManager.js` 中的 `CLOUD_IMAGE_MAP`。

---

## 详细文档

- 完整使用指南：`CLOUD_STORAGE_GUIDE.md`
- 改造总结：`CLOUD_MIGRATION_SUMMARY.md`

---

## 文件结构

```
js/
├── CloudImageManager.js    # 云存储管理器（新增）
├── Items.js                # 已适配云存储（修改）
├── Game.js                 # 已适配云存储（修改）
├── Doctor.js               # 已适配云存储（修改）
└── ...

upload-images-to-cloud.js    # 批量上传脚本（新增）
README_CLOUD.md              # 本文件
```
