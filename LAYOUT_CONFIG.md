# 🏥 急症室模拟器 - 页面布局调整文档（含行号）

本文档详细列出了游戏中所有可调整位置的地方，包含准确的**文件名**和**行号**。

---

## 一、等候区 (js/WaitingArea.js)

### 1. 护士台

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 水平位置 | `js/WaitingArea.js` | 225 | `const centerX = this.x + this.width / 2` | 居中显示 |
| 垂直位置 | `js/WaitingArea.js` | 226 | `const deskY = this.y + this.height * 0.26` | 调整 `0.26` 改变高低（越大越靠下）|
| 宽度 | `js/WaitingArea.js` | 227 | `const deskWidth = this.width * 0.60` | 调整 `0.60` 改变宽度 |
| 高度 | `js/WaitingArea.js` | 228 | `const deskHeight = this.height * 0.09` | 调整 `0.09` 改变高度 |

**代码位置：** `js/WaitingArea.js` 第 224-228 行
```javascript
renderReception(ctx) {
  const centerX = this.x + this.width / 2          // 第225行：水平居中
  const deskY = this.y + this.height * 0.26        // 第226行：调整 0.26 改变垂直位置
  const deskWidth = this.width * 0.60              // 第227行：调整 0.60 改变宽度
  const deskHeight = this.height * 0.09            // 第228行：调整 0.09 改变高度
```

---

### 2. 护士

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 水平位置 | `js/WaitingArea.js` | 13 | `this.x + this.width / 2` | 居中显示 |
| 垂直位置 | `js/WaitingArea.js` | 13 | `this.y + this.height * 0.23` | 调整 `0.23` 改变高低 |
| 基础宽度 | `js/Nurse.js` | 8 | `this.baseWidth = 21` | 原始宽度 21px |
| 基础高度 | `js/Nurse.js` | 9 | `this.baseHeight = 33.75` | 原始高度 33.75px |
| 缩放比例 | `js/Nurse.js` | 38 | `areaWidth / 350` | 调整分母 350 改变缩放 |

**代码位置1：** `js/WaitingArea.js` 第 12-14 行
```javascript
// 创建护士（放在护士台后面，只显示上半身）
this.nurse = new Nurse(this.x + this.width / 2, this.y + this.height * 0.23)  // 第13行
this.nurse.setScale(this.width)                                               // 第14行
```

**代码位置2：** `js/Nurse.js` 第 36-41 行
```javascript
setScale(areaWidth) {
  // 根据区域宽度设置缩放比例
  this.scale = Math.max(0.2, areaWidth / 350)   // 第38行：调整 350 改变整体缩放比例
  this.width = this.baseWidth * this.scale      // 第39行
  this.height = this.baseHeight * this.scale    // 第40行
}
```

---

### 3. 座位

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 行数 | `js/WaitingArea.js` | 52 | `const rows = 2` | 座位排数 |
| 列数 | `js/WaitingArea.js` | 53 | `const seatsPerRow = 4` | 每排座位数 |
| 座位宽度 | `js/WaitingArea.js` | 56 | `this.width * 0.25` | 相对区域宽度比例 |
| 座位高度 | `js/WaitingArea.js` | 57 | `this.height * 0.16` | 相对区域高度比例 |
| 左右间距 | `js/WaitingArea.js` | 58 | `this.width * 0.0001` | 水平间距（gapX）|
| 上下间距 | `js/WaitingArea.js` | 59 | `this.height * 0.1` | 垂直间距（gapY）|
| 起始Y位置 | `js/WaitingArea.js` | 62 | `this.y + this.height * 0.55` | 第一排座位起始位置 |
| 第一排偏移 | `js/WaitingArea.js` | 67 | `row === 0 ? -10 : 0` | 第一排向上偏移 -10px |

**代码位置：** `js/WaitingArea.js` 第 50-78 行
```javascript
initSeats() {
  // 两排座位，每排4个，共8个座位
  const rows = 2                                  // 第52行：行数
  const seatsPerRow = 4                           // 第53行：列数
  
  // 根据区域大小计算座位尺寸
  const seatWidth = this.width * 0.25             // 第56行：座位宽度
  const seatHeight = this.height * 0.16           // 第57行：座位高度
  const gapX = this.width * 0.0001                // 第58行：左右间距
  const gapY = this.height * 0.1                  // 第59行：上下间距
  
  // 起始位置（前台下方）
  const startY = this.y + this.height * 0.55      // 第62行：起始Y位置
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < seatsPerRow; col++) {
      // 第一排往上移动，第二排保持不变
      const rowOffset = row === 0 ? -10 : 0       // 第67行：第一排偏移量（负数往上）
```

---

### 4. 病人在座位上的位置

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 病人宽度 | `js/WaitingArea.js` | 105, 120, 161, 177 | `patient.width = 16` | 等候区病人宽度 |
| 病人高度 | `js/WaitingArea.js` | 106, 121, 162, 178 | `patient.height = 26` | 等候区病人高度 |
| 垂直偏移 | `js/WaitingArea.js` | 109, 165 | `seat.height * 0.62` | 病人在座位内的位置（0-1，越大越靠下）|

**代码位置1：** `js/WaitingArea.js` 第 104-110 行
```javascript
// 设置病人尺寸（等候区专用，较小）
patient.width = 16                              // 第105行
patient.height = 26                             // 第106行
// 病人坐在椅子中央，靠下一点
const targetX = emptySeat.x + (emptySeat.width - patient.width) / 2
const targetY = emptySeat.y + emptySeat.height * 0.62   // 第109行：调整 0.62 改变位置
```

**代码位置2：** `js/WaitingArea.js` 第 160-166 行（重新安排座位时）
```javascript
// 设置病人尺寸（等候区专用，较小）
patient.width = 16                              // 第161行
patient.height = 26                             // 第162行
// 病人坐在椅子中央，靠下一点
const targetX = seat.x + (seat.width - patient.width) / 2
const targetY = seat.y + seat.height * 0.62     // 第165行：调整 0.62 改变位置
```

---

## 二、治疗区 (js/BedArea.js)

### 1. 病床整体布局

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 病床总数 | `js/Game.js` | 198 | `new BedArea(..., 4)` | 治疗区床位数 |
| 列数 | `js/BedArea.js` | 146 | `const cols = 2` | 横向排列数 |
| 行数 | `js/BedArea.js` | 147 | `const rows = 2` | 纵向排列数 |
| 起始X位置 | `js/BedArea.js` | 156 | `const startX = this.x + gapX` | 第一列起始X |
| 起始Y位置 | `js/BedArea.js` | 158 | `const startY = this.y + gapY + this.height * 0.06` | 第一行起始Y |

---

### 2. 单个病床尺寸

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 宽度 | `js/BedArea.js` | 150 | `this.width * 0.45` | 相对区域宽度比例 |
| 高度 | `js/BedArea.js` | 151 | `this.height * 0.32` | 相对区域高度比例 |
| 垂直间距系数 | `js/BedArea.js` | 154 | `* 0.7` | 行间距压缩系数（越小越紧凑）|

**代码位置：** `js/BedArea.js` 第 144-167 行
```javascript
initBeds() {
  // 2列2行布局（4个床位）
  const cols = 2                                  // 第146行：列数
  const rows = 2                                  // 第147行：行数
  
  // 床位尺寸（高度减小，留出底部空间放托盘）
  const bedWidth = this.width * 0.45              // 第150行：床宽度
  const bedHeight = this.height * 0.32            // 第151行：床高度
  const gapX = (this.width - bedWidth * cols) / (cols + 1)
  // 减小行间距，让12和34床位更紧凑
  const gapY = (this.height - bedHeight * rows) / (rows + 1) * 0.7   // 第154行：调整 0.7 改变垂直间距
  
  const startX = this.x + gapX                    // 第156行：起始X
  // 第一行（12床位）往下移动
  const startY = this.y + gapY + this.height * 0.06   // 第158行：调整 0.06 改变整体起始高度
```

---

### 3. 病床上病人位置（每个床位独立可调）

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 1号床 X偏移 | `js/BedArea.js` | 110 | `0: { x: 0.7, ...` | 水平位置系数 |
| 1号床 Y偏移 | `js/BedArea.js` | 110 | `..., y: -0.1 }` | 垂直位置系数（负数向上）|
| 2号床 X偏移 | `js/BedArea.js` | 111 | `1: { x: 0.3, ...` | 水平位置系数 |
| 2号床 Y偏移 | `js/BedArea.js` | 111 | `..., y: -0.1 }` | 垂直位置系数 |
| 3号床 X偏移 | `js/BedArea.js` | 112 | `2: { x: 0.7, ...` | 水平位置系数 |
| 3号床 Y偏移 | `js/BedArea.js` | 112 | `..., y: -0.1 }` | 垂直位置系数 |
| 4号床 X偏移 | `js/BedArea.js` | 113 | `3: { x: 0.3, ...` | 水平位置系数 |
| 4号床 Y偏移 | `js/BedArea.js` | 113 | `..., y: -0.1 }` | 垂直位置系数 |
| 病人图片缩放 | `js/BedArea.js` | 100 | `this.width * 0.75` | 占床宽度比例 |

**代码位置：** `js/BedArea.js` 第 107-118 行
```javascript
// 根据床位ID设置不同的位置偏移（id: [x偏移系数, y偏移系数]）
// x偏移：0左侧，1右侧； y偏移：负数向上，正数向下
const patientOffsets = {
  0: { x: 0.7, y: -0.1 },   // 第110行：1号床：调整 x 和 y
  1: { x: 0.3, y: -0.1 },   // 第111行：2号床：调整 x 和 y
  2: { x: 0.7, y: -0.1 },   // 第112行：3号床：调整 x 和 y
  3: { x: 0.3, y: -0.1 }    // 第113行：4号床：调整 x 和 y
}
const offset = patientOffsets[this.id] || { x: 0.5, y: -0.11 }

this.patient.x = this.x + (this.width - this.patient.width) * offset.x   // 第117行
this.patient.y = this.y + this.height * offset.y                         // 第118行
```

**病人图片大小位置：** `js/BedArea.js` 第 99-101 行
```javascript
// 计算病人图片在床上的合适大小（床宽度的75%）
const targetPatientWidth = this.width * 0.75    // 第100行：调整 0.75 改变病人图片大小
const patientScale = targetPatientWidth / this.patient.baseWidth
```

---

## 三、器材室 (js/EquipmentRoom.js)

### 1. 药品柜

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 宽度 | `js/EquipmentRoom.js` | 71 | `this.width * 0.46` | 相对区域宽度比例 |
| 高度 | `js/EquipmentRoom.js` | 72 | `this.height * 0.75` | 相对区域高度比例 |
| X位置 | `js/EquipmentRoom.js` | 73 | `this.x + this.width * 0.03` | 距离左侧边距 |
| Y位置 | `js/EquipmentRoom.js` | 74 | `this.y + this.height * 0.2` | 距离顶部边距 |
| 抽屉数量 | `js/EquipmentRoom.js` | 87 | `const drawerCount = 4` | 抽屉个数 |
| 抽屉边距 | `js/EquipmentRoom.js` | 88 | `cabinetWidth * 0.06` | 抽屉与柜体边距 |
| 顶部标识高度 | `js/EquipmentRoom.js` | 111 | `this.height * 0.07` | 标识牌高度 |

**代码位置：** `js/EquipmentRoom.js` 第 69-119 行
```javascript
renderMedicineCabinet(ctx) {
  // 左侧药品柜 - 宽度增大，边距减小
  const cabinetWidth = this.width * 0.46          // 第71行：柜体宽度
  const cabinetHeight = this.height * 0.75        // 第72行：柜体高度
  const cabinetX = this.x + this.width * 0.03     // 第73行：水平位置
  const cabinetY = this.y + this.height * 0.2     // 第74行：垂直位置
  
  // 4个抽屉
  const drawerCount = 4                           // 第87行：抽屉数量
  const drawerMargin = cabinetWidth * 0.06        // 第88行：抽屉边距
  
  // 顶部标识
  ctx.fillRect(cabinetX, cabinetY - this.height * 0.07, cabinetWidth, this.height * 0.07)   // 第111行：标识高度
```

---

### 2. 器材柜

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 宽度 | `js/EquipmentRoom.js` | 123 | `this.width * 0.46` | 相对区域宽度比例 |
| 高度 | `js/EquipmentRoom.js` | 124 | `this.height * 0.75` | 相对区域高度比例 |
| X位置 | `js/EquipmentRoom.js` | 125 | `this.x + this.width - cabinetWidth - this.width * 0.03` | 距离右侧边距 |
| Y位置 | `js/EquipmentRoom.js` | 126 | `this.y + this.height * 0.2` | 距离顶部边距 |
| 抽屉数量 | `js/EquipmentRoom.js` | 139 | `const drawerCount = 4` | 抽屉个数 |
| 抽屉边距 | `js/EquipmentRoom.js` | 140 | `cabinetWidth * 0.06` | 抽屉与柜体边距 |

**代码位置：** `js/EquipmentRoom.js` 第 121-171 行
```javascript
renderEquipmentCabinet(ctx) {
  // 右侧器械柜 - 宽度增大，边距减小
  const cabinetWidth = this.width * 0.46          // 第123行：柜体宽度
  const cabinetHeight = this.height * 0.75        // 第124行：柜体高度
  const cabinetX = this.x + this.width - cabinetWidth - this.width * 0.03   // 第125行：水平位置（距右）
  const cabinetY = this.y + this.height * 0.2     // 第126行：垂直位置
  
  // 4个抽屉
  const drawerCount = 4                           // 第139行：抽屉数量
  const drawerMargin = cabinetWidth * 0.06        // 第140行：抽屉边距
```

---

### 3. 抽屉内物品布局

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 图标大小 | `js/EquipmentRoom.js` | 185 | `Math.min(height * 0.6, width * 0.3)` | 图标尺寸 |
| 图标X位置 | `js/EquipmentRoom.js` | 186 | `x + width * 0.15` | 图标水平位置 |
| 图标背景圆圈 | `js/EquipmentRoom.js` | 192 | `iconSize * 0.75` | 圆圈相对图标大小 |
| 图片大小 | `js/EquipmentRoom.js` | 199 | `iconSize * 1.3` | 图片相对图标大小 |
| 文字X位置 | `js/EquipmentRoom.js` | 217 | `x + width * 0.55` | 文字水平位置 |
| 文字字体大小 | `js/EquipmentRoom.js` | 212 | `Math.max(11, width * 0.13)` | 字体大小 |
| 圆角半径 | `js/EquipmentRoom.js` | 177 | `fillRoundRect(..., 6)` | 抽屉圆角 6px |

**代码位置：** `js/EquipmentRoom.js` 第 174-230 行
```javascript
renderDrawer(ctx, x, y, width, height, item, index) {
  // 抽屉背景
  fillRoundRect(ctx, x, y, width, height, 6)      // 第177行：圆角半径 6px
  
  // 图标区域（左侧）- 变大
  const iconSize = Math.min(height * 0.6, width * 0.3)    // 第185行：图标大小
  const iconX = x + width * 0.15                          // 第186行：图标X位置
  const iconY = y + height / 2
  
  // 图标背景圆圈 - 变大
  ctx.arc(iconX + iconSize/2, iconY, iconSize * 0.75, 0, Math.PI * 2)   // 第192行：圆圈大小
  
  // 绘制图片 - 变大
  const imgSize = iconSize * 1.3                          // 第199行：图片大小
  
  // 物品名称 - 字体变大
  ctx.font = `bold ${Math.max(11, width * 0.13)}px ...`   // 第212行：字体大小系数 0.13
  
  const textX = x + width * 0.55                          // 第217行：文字X位置
```

---

### 4. 托盘和按钮（在治疗区底部）

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 托盘宽度 | `js/Game.js` | 593 | `bedArea.width * 0.5` | 相对治疗区宽度 |
| 托盘高度 | `js/Game.js` | 594 | `const trayHeight = 32` | 固定高度 32px |
| 托盘X位置 | `js/Game.js` | 595 | `(bedArea.width - trayWidth) / 2 - 20` | 水平居中往左移20px |
| 托盘Y位置 | `js/Game.js` | 596 | `bedArea.height - trayHeight - 8` | 距底部 8px |
| 按钮大小 | `js/EquipmentRoom.js` | 328 | `trayHeight * 0.85` | 相对托盘高度 |
| 按钮间距 | `js/EquipmentRoom.js` | 330 | `const gap = 12` | 两按钮间距 12px |
| 重置按钮X | `js/EquipmentRoom.js` | 333 | `trayX + trayWidth + 8` | 托盘右侧 +8px |

**托盘位置代码：** `js/Game.js` 第 590-600 行
```javascript
renderTrayAtBedArea() {
  const bedArea = this.bedArea
  // 托盘位置：治疗区底部居中，宽度为治疗区的一半
  const trayWidth = bedArea.width * 0.5           // 第593行：托盘宽度
  const trayHeight = 32                           // 第594行：托盘高度
  const trayX = bedArea.x + (bedArea.width - trayWidth) / 2 - 20   // 第595行：水平位置（-20往左）
  const trayY = bedArea.y + bedArea.height - trayHeight - 8        // 第596行：垂直位置（距底8px）
```

**按钮代码：** `js/EquipmentRoom.js` 第 327-405 行
```javascript
// 计算按钮区域
const btnSize = trayHeight * 0.85               // 第328行：按钮大小系数
const btnY = trayY + (trayHeight - btnSize) / 2
const gap = 12                                  // 第330行：按钮间距

// 绘制重置/清空按钮（在托盘右侧，圆形）
const resetBtnX = trayX + trayWidth + 8         // 第333行：重置按钮X位置

// 绘制发送按钮（在重置按钮右侧，圆形）
const sendBtnX = resetBtnX + btnSize + gap      // 第371行：发送按钮X位置
```

---

## 四、整体区域布局 (js/Game.js)

### 1. 三个主区域比例

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 等候区宽度 | `js/Game.js` | 188 | `availableWidth * 0.35` | 占可用宽度 35% |
| 治疗区宽度 | `js/Game.js` | 189 | `availableWidth * 0.35` | 占可用宽度 35% |
| 器材室宽度 | `js/Game.js` | 190 | `availableWidth * 0.30` | 占可用宽度 30% |
| 区域间距 | `js/Game.js` | 181 | `const gap = 10` | 区域之间的间隙 10px |

**代码位置：** `js/Game.js` 第 168-203 行
```javascript
initAreas() {
  // 三个区域的间距
  const gap = 10                                  // 第181行：区域间距
  
  // 调整比例：等候区 35% | 治疗区 35% | 器材室 30%
  const waitingWidth = availableWidth * 0.35      // 第188行：等候区宽度
  const bedWidth = availableWidth * 0.35          // 第189行：治疗区宽度
  const equipmentWidth = availableWidth * 0.30    // 第190行：器材室宽度
```

---

### 2. 顶部状态栏和边距

| 参数 | 文件名 | 行号 | 代码 | 说明 |
|------|--------|------|------|------|
| 状态栏高度 | `js/Game.js` | 170 | `const headerHeight = 45` | 顶部状态栏 |
| 底部边距 | `js/Game.js` | 172 | `const bottomMargin = 10` | 底部留白 |
| 顶部间距 | `js/Game.js` | 174 | `const topPadding = 12` | 状态栏与区域间距 |

**代码位置：** `js/Game.js` 第 168-178 行
```javascript
initAreas() {
  // 顶部状态栏高度
  const headerHeight = 45                         // 第170行
  // 底部留白
  const bottomMargin = 10                         // 第172行
  // 顶部状态栏与三个区域之间的间距
  const topPadding = 12                           // 第174行
```

---

## 五、快速调整参考表

### 常用调整场景

| 调整目标 | 文件 | 行号 | 修改内容 |
|----------|------|------|----------|
| 护士台太高/太矮 | `js/WaitingArea.js` | 226 | 修改 `this.height * 0.26` |
| 护士台太宽/太窄 | `js/WaitingArea.js` | 227 | 修改 `this.width * 0.60` |
| 座位太挤/太松 | `js/WaitingArea.js` | 58-59 | 修改 `gapX`, `gapY` |
| 第一排座位位置 | `js/WaitingArea.js` | 67 | 修改 `rowOffset` 的 `-10` |
| 病人坐姿位置 | `js/WaitingArea.js` | 109, 165 | 修改 `seat.height * 0.62` |
| 护士大小 | `js/Nurse.js` | 38 | 修改 `areaWidth / 350` |
| 病床太小/太大 | `js/BedArea.js` | 150-151 | 修改 `0.45`, `0.32` |
| 病床行间距 | `js/BedArea.js` | 154 | 修改 `* 0.7` 系数 |
| 病人在床上位置 | `js/BedArea.js` | 109-114 | 修改 `patientOffsets` |
| 病人图片大小 | `js/BedArea.js` | 100 | 修改 `this.width * 0.75` |
| 药品柜宽度 | `js/EquipmentRoom.js` | 71 | 修改 `this.width * 0.46` |
| 药品柜位置 | `js/EquipmentRoom.js` | 73-74 | 修改 `0.03`, `0.2` |
| 抽屉间距 | `js/EquipmentRoom.js` | 88, 140 | 修改 `cabinetWidth * 0.06` |
| 抽屉内图标大小 | `js/EquipmentRoom.js` | 185 | 修改 `height * 0.6, width * 0.3` |
| 抽屉内文字大小 | `js/EquipmentRoom.js` | 212 | 修改 `width * 0.13` |
| 托盘宽度 | `js/Game.js` | 593 | 修改 `bedArea.width * 0.5` |
| 托盘位置 | `js/Game.js` | 595-596 | 修改 `-20` 和 `-8` |
| 按钮大小 | `js/EquipmentRoom.js` | 328 | 修改 `trayHeight * 0.85` |
| 按钮间距 | `js/EquipmentRoom.js` | 330 | 修改 `gap = 12` |
| 三区域比例 | `js/Game.js` | 188-190 | 修改 `0.35`, `0.35`, `0.30` |

---

## 六、注意事项

1. **比例 vs 固定像素**：大部分尺寸使用相对比例（如 `* 0.25`），会随屏幕自适应；少量使用固定像素（如 `-10px`）

2. **病人尺寸**：
   - 等候区病人：`16 x 26`（`js/WaitingArea.js` 第 105-106, 120-121, 161-162, 177-178 行）
   - 病床上病人：动态计算，基础尺寸 `21 x 33.75`（`js/BedArea.js` 第 100-101 行）

3. **镜像床位**：2号和4号病床（id=1 和 id=3）会水平镜像翻转（`js/BedArea.js` 第 65 行）

4. **重新安排座位时的位置**：修改 `assignPosition()` 后，记得同步修改 `reorganizeQueue()` 中的相同数值
