# 病人进场逻辑完整文档

## 一、进场流程概览

```
Game.start()
  ↓
前N个病人固定间隔生成 ──→ 后续病人随机间隔生成
  ↓
spawnPatientFromLeft()
  ↓
创建病人对象 ← 从 patientDetails 随机获取配置
  ↓
初始位置：等候区左侧外面 (x-50, 高度0.5处)
  ↓
waitingArea.addPatient(patient)
  ↓
分配座位/排队位置
  ↓
100ms后移动到目标位置
```

---

## 二、进场阶段详解

### 阶段1：触发进场（Game.js）

**文件位置**：`js/Game.js` 第 329-348 行

```javascript
// 前N个病人，使用固定间隔
let initialSpawnCount = 0
const spawnFirstCount = GameConfig.patient.spawnFirstCount  // 默认4个
const spawnFirstInterval = GameConfig.patient.spawnFirstInterval  // 3000ms

const spawnFirstPatients = () => {
  const maxPatients = getLevelConfig(this.currentLevel).maxPatients
  if (initialSpawnCount < spawnFirstCount && 
      this.spawnedPatientsCount < maxPatients && 
      this.isRunning) {
    this.spawnPatientFromLeft()
    initialSpawnCount++
    this.spawnedPatientsCount++
    this.initialSpawnTimer = setTimeout(spawnFirstPatients, spawnFirstInterval)
  } else {
    // 前N个生成完毕，开始后续随机生成
    this.spawnRemainingPatients()
  }
}

// 开始生成前N个病人（延迟1秒后开始）
this.initialSpawnTimer = setTimeout(spawnFirstPatients, 1000)
```

**关键配置**（`js/GameConfig.js` 第 28-35 行）：
| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `spawnFirstCount` | 4 | 前N个病人固定间隔生成 |
| `spawnFirstInterval` | 3000ms | 固定间隔时间 |
| `spawnRandomMin` | 2000ms | 随机间隔最小值 |
| `spawnRandomMax` | 4000ms | 随机间隔最大值 |

---

### 阶段2：后续病人随机生成（Game.js）

**文件位置**：`js/Game.js` 第 352-383 行

```javascript
spawnRemainingPatients() {
  const maxPatients = getLevelConfig(this.currentLevel).maxPatients
  const randomMin = GameConfig.patient.spawnRandomMin
  const randomMax = GameConfig.patient.spawnRandomMax

  const spawnNext = () => {
    if (!this.isRunning) return

    // 检查名额且等候区未满8人
    if (this.spawnedPatientsCount < maxPatients && 
        this.waitingArea.patients.length < 8) {
      this.spawnPatientFromLeft()
      this.spawnedPatientsCount++

      // 随机间隔生成下一个
      const randomDelay = randomMin + Math.random() * (randomMax - randomMin)
      this.spawnTimer = setTimeout(spawnNext, randomDelay)
    } else if (this.spawnedPatientsCount < maxPatients) {
      // 等候区满了，1秒后重试
      this.spawnTimer = setTimeout(spawnNext, 1000)
    }
  }

  spawnNext()
}
```

**限制条件**：
- 关卡总病人数限制（`maxPatients`）
- 等候区人数上限 8 人

---

### 阶段3：创建病人对象（Game.js）

**文件位置**：`js/Game.js` 第 597-627 行

```javascript
spawnPatientFromLeft() {
  // 等候区满8人则不生成
  if (this.waitingArea.patients.length >= 8) return

  // 获取随机病人配置（从 patientDetails 中随机选择）
  const patientDetail = getRandomPatientDetail()
  
  // 创建病人对象
  const patient = new Patient(
    this.patientIdCounter++,           // 唯一ID
    GameConfig.patient.initialPatience, // 初始耐心值（30秒）
    patientDetail                       // 病人详情（含暴怒值等）
  )

  // 初始位置：等候区左侧外面
  patient.x = this.waitingArea.x - 50
  patient.y = this.waitingArea.y + this.waitingArea.height * 0.5
  patient.targetX = patient.x
  patient.targetY = patient.y

  // 添加到等候区
  this.waitingArea.addPatient(patient)

  // 100ms后移动到目标位置（座位或排队位置）
  setTimeout(() => {
    const emptySeat = this.waitingArea.seats.find(seat => seat.patient === patient)
    const emptyQueue = this.waitingArea.queuePositions.find(q => q.patient === patient)

    if (emptySeat) {
      // 有座位：移动到座位中央
      const targetX = emptySeat.x + (emptySeat.width - patient.width) / 2
      const targetY = emptySeat.y + emptySeat.height * 0.62
      patient.moveTo(targetX, targetY)
    } else if (emptyQueue) {
      // 无座位：移动到排队位置
      patient.moveTo(emptyQueue.x - patient.width / 2, emptyQueue.y - patient.height)
    }
  }, 100)
}
```

**病人初始状态**：
| 属性 | 值 | 说明 |
|------|----|----|
| `x` | `waitingArea.x - 50` | 等候区左侧外面50像素 |
| `y` | `waitingArea.y + height * 0.5` | 等候区垂直居中 |
| `width` | 16 | 等候区病人宽度 |
| `height` | 26 | 等候区病人高度 |
| `patience` | 30 | 初始耐心值（秒） |

---

### 阶段4：等候区分配位置（WaitingArea.js）

**文件位置**：`js/WaitingArea.js` 第 108-140 行

```javascript
addPatient(patient) {
  if (this.patients.length >= 8) return
  this.patients.push(patient)
  this.assignPosition(patient)
}

assignPosition(patient) {
  // 1. 优先分配座位
  const emptySeat = this.seats.find(seat => !seat.occupied)
  if (emptySeat) {
    emptySeat.occupied = true
    emptySeat.patient = patient
    patient.seat = emptySeat
    
    // 设置病人尺寸（等候区专用）
    patient.width = 16
    patient.height = 26
    
    // 计算座位目标位置
    const targetX = emptySeat.x + (emptySeat.width - patient.width) / 2
    const targetY = emptySeat.y + emptySeat.height * 0.62
    patient.moveTo(targetX, targetY)
    return
  }

  // 2. 座位满了，分配排队位置
  const emptyQueue = this.queuePositions.find(pos => !pos.occupied)
  if (emptyQueue) {
    emptyQueue.occupied = true
    emptyQueue.patient = patient
    patient.queuePos = emptyQueue
    
    patient.width = 16
    patient.height = 26
    patient.moveTo(emptyQueue.x, emptyQueue.y)
  }
}
```

**座位分配规则**：
- 优先找空座位（8个座位）
- 座位满了则进入排队区（4个排队位置）
- 等候区总人数上限 8 人

**病人在座位上的位置**（`js/WaitingArea.js` 第 124-125 行）：
```javascript
const targetX = emptySeat.x + (emptySeat.width - patient.width) / 2  // 水平居中
const targetY = emptySeat.y + emptySeat.height * 0.62               // 垂直偏移62%（靠下）
```

---

### 阶段5：移动到目标位置（Patient.js）

**文件位置**：`js/Patient.js`

```javascript
moveTo(targetX, targetY) {
  this.targetX = targetX
  this.targetY = targetY
  this.isMoving = true
}

// 在 update 中执行移动
update(deltaTime) {
  if (this.isMoving) {
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const dist = Math.hypot(dx, dy)
    
    if (dist < 2) {
      // 到达目标
      this.x = this.targetX
      this.y = this.targetY
      this.isMoving = false
    } else {
      // 继续移动
      const speed = 0.12  // 移动速度
      this.x += (dx / dist) * speed * deltaTime
      this.y += (dy / dist) * speed * deltaTime
    }
  }
}
```

---

## 三、病人配置详情

### 病人详情列表（GameConfig.js 第 58-77 行）

```javascript
patientDetails: [
  { id: 1, name: '1号', info: '普通感冒患者', rageLevel: 1 },
  { id: 2, name: '2号', info: '轻微腹痛', rageLevel: 1 },
  { id: 3, name: '3号', info: '头痛患者', rageLevel: 1 },
  // ... 共18个病人
  { id: 8, name: '8号', info: '严重扭伤', rageLevel: 4 },      // 高暴怒值
  { id: 11, name: '11号', info: '反复发烧', rageLevel: 4 },    // 高暴怒值
  { id: 14, name: '14号', info: '累计剥离性骨折', rageLevel: 4 }, // 高暴怒值
]
```

### 随机选择逻辑

```javascript
export function getRandomPatientDetail() {
  const index = Math.floor(Math.random() * GameConfig.patientDetails.length)
  return GameConfig.patientDetails[index]
}
```

---

## 四、进场限制条件

| 限制 | 值 | 说明 |
|------|----|----|
| 等候区人数上限 | 8人 | 满8人时不再生成新病人 |
| 关卡总病人数 | 见 levels | 第1关15人，后续关卡4人 |
| 生成间隔-固定 | 3000ms | 前4个病人 |
| 生成间隔-随机 | 2000-4000ms | 后续病人 |
| 初始耐心值 | 30秒 | 耐心耗尽后开始离开或暴走 |

---

## 五、关键文件位置

| 功能 | 文件 | 行号 |
|------|------|------|
| 开始生成病人 | `js/Game.js` | 329-348 |
| 随机生成后续 | `js/Game.js` | 352-383 |
| 创建病人对象 | `js/Game.js` | 597-627 |
| 添加到等候区 | `js/WaitingArea.js` | 108-112 |
| 分配座位 | `js/WaitingArea.js` | 114-140 |
| 病人配置 | `js/GameConfig.js` | 28-35, 58-77 |
| 病人移动 | `js/Patient.js` | moveTo, update |
