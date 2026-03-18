# 🏥 急症室模拟器 - 功能文档

## 目录
1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [核心玩法](#核心玩法)
4. [模块详解](#模块详解)
5. [游戏配置](#游戏配置)
6. [资源文件](#资源文件)
7. [开发规范](#开发规范)

---

## 项目概述

**急症室模拟器**是一款微信小程序游戏，采用 Canvas 2D 渲染，玩家扮演医院管理者，通过分诊、治疗病人来完成关卡目标。

### 基本信息
| 项目 | 内容 |
|------|------|
| 名称 | 急症室模拟器 |
| 类型 | 模拟经营 / 时间管理 |
| 平台 | 微信小程序 |
| 屏幕方向 | 横屏 (landscape) |
| 核心引擎 | Canvas 2D |

---

## 技术架构

### 文件结构
```
emergency/
├── game.js                 # 游戏入口，导入主模块
├── game.json               # 游戏配置（屏幕方向等）
├── project.config.json     # 微信项目配置
├── js/
│   ├── main.js            # 程序入口，初始化游戏
│   ├── Game.js            # 游戏主类（约3000行）
│   ├── GameConfig.js      # 游戏配置（关卡、疾病、物品）
│   ├── Patient.js         # 病人类
│   ├── Doctor.js          # 医生类
│   ├── Nurse.js           # 护士类
│   ├── WaitingArea.js     # 等候区
│   ├── BedArea.js         # 治疗区（病床+输液椅）
│   ├── EquipmentRoom.js   # 器材室
│   ├── Items.js           # 物品定义与管理
│   ├── AudioManager.js    # 音频管理
│   └── utils.js           # 工具函数
├── images/                # 图片资源（约90+张）
├── audio/                 # 音频资源
│   └── bgm.mp3           # 背景音乐
└── LAYOUT_CONFIG.md      # 布局调整文档
```

### 核心类图

```
┌─────────────────────────────────────────────────────────────┐
│                         Game                                │
├─────────────────────────────────────────────────────────────┤
│  - canvas: Canvas                                          │
│  - ctx: Context                                            │
│  - waitingArea: WaitingArea                                │
│  - bedArea: BedArea                                        │
│  - equipmentRoom: EquipmentRoom                            │
│  - doctors: Doctor[]                                       │
│  - score: number                                           │
│  - currentLevel: number                                    │
│  - timeRemaining: number                                   │
└────────────┬────────────────────────────────────────────────┘
             │ 包含/管理
    ┌────────┴────────┬─────────────┬─────────────┐
    ▼                 ▼             ▼             ▼
┌──────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐
│WaitingArea│   │ BedArea  │  │Equipment │  │ Doctor   │
├──────────┤   ├──────────┤  ├──────────┤  ├──────────┤
│ - nurse  │   │ - beds[] │  │ - medicine│  │ - state  │
│ - patients│  │ - ivSeats│  │   Drawers │  │ - target │
└──────────┘   └──────────┘  └──────────┘  └──────────┘
```

---

## 核心玩法

### 1. 游戏流程

```
新玩家指引 → 病人生成 → 分诊决策 → 治疗/输液 → 治愈/离开 → 关卡完成
```

### 2. 三大区域

#### 🪑 等候区 (WaitingArea)
- **护士台**: 护士小美驻守，点击可查看疾病指南
- **站立排队区**: 8个位置（4列×2行），病人从左侧进入
- **功能**: 
  - 病人排队等待分诊
  - 点击病人弹出分诊弹窗
  - 点击护士查看疾病清单

#### 🛏️ 治疗区 (BedArea)
- **急救间**: 2张病床，医生进行紧急治疗
- **治疗椅**: 4张输液椅，病人自动治疗
- **功能**:
  - 病床：医生治疗，需要配送物品
  - 输液椅：自动治疗，点击完成治愈

#### 🏥 器材室 (EquipmentRoom)
- **药品柜**: 4种药品（抗生素、止痛药、肾上腺素、注射液）
- **器械柜**: 4种器械（AED、医用绷带、手术剪、体温计）
- **功能**:
  - 点击抽屉选中/取消物品
  - 发送按钮配送物品给医生
  - 清空按钮重置选择

### 3. 分诊系统

点击排队病人后弹出分诊弹窗，提供三个选项：

| 选项 | 颜色 | 消耗 | 效果 |
|------|------|------|------|
| 急救 | 🔴 红色 | 无 | 直接送往病床，医生治疗 |
| 治疗 | 🔵 蓝色 | 无 | 送往输液椅，自动治疗 |
| 安抚 | 🩷 粉色 | 10荣誉点 | 暂停耐心减少5秒 |

### 4. 治疗流程

```
病床治疗流程:
病人上病床 → 医生申请物品 → 玩家配送物品 → 治疗进度 → 治愈离开

输液治疗流程:
病人上输液椅 → 自动治疗计时 → 进度条满 → 点击治愈 → 离开
```

### 5. 暴走机制

- **触发条件**: 病人耐心归零时，根据暴怒值概率触发
- **暴走效果**: 
  - 病人走向治疗区
  - 锁定一位医生，医生显示"SOS"
  - 医生停止工作
- **解救方式**: 拖动暴走病人回等候区
- **失败后果**: 医生被锁定，影响治疗效率

---

## 模块详解

### Game.js - 游戏主类

核心职责：游戏状态管理、渲染循环、事件处理

#### 关键方法

| 方法 | 功能 |
|------|------|
| `start()` | 启动游戏，初始化关卡 |
| `resume()` | 小程序重新进入时恢复游戏 |
| `update(deltaTime)` | 每帧更新游戏逻辑 |
| `render()` | 每帧渲染画面 |
| `initTouch()` | 初始化触摸事件 |
| `spawnPatientFromLeft()` | 从左侧生成病人 |
| `checkLevelComplete()` | 检查关卡是否完成 |

#### 游戏状态

```javascript
{
  score: number,           // 荣誉点
  currentLevel: number,    // 当前关卡
  timeRemaining: number,   // 倒计时（秒）
  curedCount: number,      // 已治愈人数
  spawnedPatientsCount: number,  // 已生成病人数
  hasRagingPatient: boolean,     // 是否有暴走病人
  isRunning: boolean       // 游戏是否运行中
}
```

---

### Patient.js - 病人类

核心职责：病人状态管理、移动动画、渲染

#### 病人状态

| 状态 | 说明 |
|------|------|
| `queuing` | 前台排队中 |
| `seated` | 坐在输液椅上 |
| `movingToBed` | 走向病床 |
| `inbed` | 在病床上 |
| `isLeaving` | 正在离开 |
| `isRaging` | 暴走状态 |

#### 关键属性

```javascript
{
  id: number,              // 唯一ID
  name: string,            // 名字（如"1号"）
  disease: object,         // 疾病配置
  patience: number,        // 耐心值（秒）
  rageLevel: number,       // 暴怒值 1-5
  state: string,           // 当前状态
  patientType: number      // 外观类型 1-26
}
```

#### 图片资源

- `patient_{type}_normal.png` - 正常状态
- `patient_{type}_sick.png` - 生病状态（默认显示）
- `patient_{type}_angry.png` - 愤怒状态

---

### Doctor.js - 医生类

核心职责：医生AI、治疗逻辑、物品需求

#### 医生状态

| 状态 | 说明 |
|------|------|
| `idle` | 空闲，等待病人 |
| `moving` | 走向病床 |
| `treating` | 治疗中，申请物品 |

#### 治疗流程

```javascript
// 1. 检测到未治疗病人
if (needsTreatment && !this.targetBed) {
  this.assignToBed(needsTreatment)
}

// 2. 到达病床，申请物品
if (this.requiredItems.length === 0) {
  this.requiredItems = getRandomItems(itemCount)
}

// 3. 收到所有物品，开始治疗
if (this.hasReceivedAllItems()) {
  bed.treatmentProgress += deltaTime / treatTime
}

// 4. 治疗完成
if (bed.treatmentProgress >= 1) {
  bed.patient.isCured = true
}
```

#### 图片资源

- `doctor_{id}_idle.png` - 空闲状态
- `doctor_{id}_treat.png` - 治疗状态

---

### Nurse.js - 护士类

核心职责：新玩家指引、疾病清单展示

#### 新玩家指引流程

1. **欢迎阶段**: 护士挥手，显示欢迎气泡（逐字显示）
2. **准备阶段**: 点击护士后，显示"请准备，病人马上到来！"
3. **游戏开始**: 第一个病人生成，恢复正常模式

#### 关卡提示（第2关及以后）

- 护士头部右侧显示灯泡图标
- 点击护士后灯泡消失
- 状态保存到本地缓存

---

### BedArea.js - 治疗区

核心职责：病床和输液椅管理

#### 类结构

```javascript
class BedArea {
  beds: Bed[]        // 2张病床
  ivSeats: IVSeat[]  // 4张输液椅
}

class Bed {
  id: number
  patient: Patient
  treatmentProgress: number  // 0-1
  assignedDoctor: Doctor
}

class IVSeat {
  id: number
  patient: Patient
  ivTreatmentProgress: number  // 0-1
}
```

#### 输液椅特殊逻辑

- **紧急疾病** (priority=1): 耐心值继续减少，需及时点击急救
- **非紧急疾病**: 耐心值暂停，自动治疗完成

---

### EquipmentRoom.js - 器材室

核心职责：物品选择、发送逻辑

#### 交互流程

```
点击抽屉 → 选中/取消物品 → 点击发送 → 匹配医生需求 → 配送物品
```

#### 发送规则

1. 必须选择至少一个物品才能发送
2. 所有选中物品必须属于同一位医生的需求列表
3. 一次只能给一位医生配送
4. 医生必须正在治疗状态（treating）

---

### GameConfig.js - 游戏配置

#### 关卡配置

```javascript
levels: [
  {
    id: 1,
    timeLimit: 60,        // 倒计时（秒）
    cureTarget: 5,        // 治愈目标
    doctorItemCount: 1,   // 医生需求物品数量
    patients: [1,2,3,14,15,16]  // 本关病人ID列表
  }
  // ... 共10关
]
```

#### 疾病配置

```javascript
diseases: [
  {
    disease_id: 1,
    disease_name: '发烧',
    diseases_priority: 2,      // 1=紧急, 2=普通, 3=轻微
    patience: 20,              // 耐心值（秒）
    emerge_treat_time: 3000,   // 医生治疗时间（毫秒）
    auto_treat_time: 9000,     // 自动治疗时间（毫秒）
    treat_need: ['thermometer', 'antibiotic'],
    unlock_level: 1
  }
  // ... 共13种疾病
]
```

#### 病人详细配置

```javascript
patientDetails: [
  {
    id: 1,
    name: '1号',
    rageLevel: 1,      // 暴怒值 1-5
    disease_id: 1      // 关联疾病ID
  }
  // ... 共26个病人
]
```

#### 暴走概率计算

```javascript
// 暴怒值 1-5 对应概率
rageLevel: 1 -> 10%
rageLevel: 2 -> 20%
rageLevel: 3 -> 30%
rageLevel: 4 -> 40%
rageLevel: 5 -> 50%
```

---

### Items.js - 物品系统

#### 药品列表

| ID | 名称 | 图标 | 解锁关卡 |
|----|------|------|----------|
| antibiotic | 抗生素 | 💊 | 1 |
| painkiller | 止痛药 | 💉 | 1 |
| adrenaline | 肾上腺素 | 💓 | 2 |
| injection | 注射液 | 🧪 | 1 |

#### 器械列表

| ID | 名称 | 图标 | 解锁关卡 |
|----|------|------|----------|
| aed | AED | ⚡ | 2 |
| tape | 医用绷带 | 🩹 | 1 |
| scissors | 手术剪 | ✂️ | 2 |
| thermometer | 体温计 | 🌡️ | 1 |

---

### AudioManager.js - 音频管理

#### 功能

- 背景音乐播放/暂停/停止
- 音效播放
- 静音切换

#### 使用

```javascript
// 播放背景音乐
audioManager.playBGM('audio/bgm.mp3')

// 播放音效
audioManager.playSFX('audio/effect.mp3')

// 静音切换
audioManager.toggleMute()
```

---

## 资源文件

### 图片命名规范

#### 病人图片
- `patient_{1-26}_normal.png` - 正常状态
- `patient_{1-26}_sick.png` - 生病状态
- `patient_{1-26}_angry.png` - 愤怒状态

#### 医生图片
- `doctor_{1-2}_idle.png` - 空闲状态
- `doctor_{1-2}_treat.png` - 治疗状态

#### 疾病图标
- `disease_{1-13}.png` - 13种疾病图标

#### UI元素
- `bed.png` - 病床
- `seat_free.png` / `seat_occupied.png` - 输液椅
- `nurse.png` / `nurse_hello.png` - 护士
- `nurse_desk.png` - 护士台
- `boom.png` - 暴走爆炸图标
- `comfort.png` - 安抚图标
- `curing.png` / `cured.png` - 治疗中/已治愈图标
- `honor.png` - 荣誉点图标
- `timer.png` - 倒计时图标
- `lightbulb.png` - 灯泡提示

#### 物品图片
- `antibiotic.png`, `painkiller.png`, `adrenaline.png`, `injection.png`
- `aed.png`, `tape.png`, `scissors.png`, `thermometer.png`

---

## 开发规范

### 代码风格

- 使用 ES6 模块系统 (`import`/`export`)
- 类名使用大驼峰 (PascalCase)
- 方法和变量使用小驼峰 (camelCase)
- 常量使用大写加下划线 (UPPER_SNAKE_CASE)

### 坐标系统

- 左上角为原点 (0, 0)
- X轴向右递增
- Y轴向下递增
- 所有尺寸基于屏幕宽度自适应

### 性能优化

1. **图片缓存**: 使用全局缓存避免重复加载
2. **离屏渲染**: 静态元素预渲染
3. **按需更新**: 只有变化时才重绘
4. **对象池**: 复用病人对象（待实现）

### 调试功能

- 点击标题"🏥 急诊室模拟器"打开调试面板
- 调试面板功能：
  - 跳转到指定关卡
  - 增加荣誉点
  - 生成测试病人
  - 重置新玩家状态

### 本地存储

```javascript
// 存储键名
const STORAGE_KEY = 'emergency_game_data'

// 存储内容
{
  is_new_player: boolean,      // 是否新玩家
  levelHints: {                // 关卡提示状态
    [levelIndex]: boolean
  }
}
```

---

## 扩展指南

### 添加新关卡

在 `GameConfig.js` 的 `levels` 数组中添加：

```javascript
{
  id: 11,
  timeLimit: 120,
  cureTarget: 15,
  doctorItemCount: { min: 2, max: 3, probability: 0.5 },
  patients: [/* 病人ID列表 */]
}
```

### 添加新疾病

在 `GameConfig.js` 的 `diseases` 数组中添加：

```javascript
{
  disease_id: 14,
  disease_name: '新疾病',
  diseases_priority: 2,
  patience: 20,
  emerge_treat_time: 3000,
  auto_treat_time: 6000,
  treat_need: ['item1', 'item2'],
  unlock_level: 5
}
```

### 添加新病人

1. 在 `patientDetails` 中添加配置
2. 准备对应的图片资源
3. 在关卡配置中引用

---

## 更新日志

### v1.0.0
- 基础游戏流程实现
- 10个关卡
- 13种疾病
- 暴走机制
- 新玩家指引

---

*文档最后更新: 2026-03-18*
