# 未使用代码/配置/Toast 整理报告

## 一、Toast 提示（当前正在使用）

### 1. Game.js 中的 Toast（10个）

| 行号 | 触发条件 | 提示内容 | 建议 |
|-----|---------|---------|-----|
| 609 | 暴走病人首次出现 | "将暴走病人拖回等待区，解救医生！" | ✅ 保留（教程提示） |
| 1208 | 托盘已满 | "托盘已满(最多4个)" | ⚠️ 可简化或去掉 |
| 1288 | 成功制止暴走病人 | "成功制止暴走病人！" | ⚠️ 可去掉（已有爱心-1动效） |
| 1463 | 椅子类型已满 | "急症已满"/"危重已满"/"普通已满" | ✅ 保留（用户反馈） |
| 1837 | 发送按钮点击但托盘为空 | "请先选择物品" | ✅ 保留（用户引导） |
| 1858 | 发送按钮点击但无医生需要 | "暂无医生需要物品" | ✅ 保留（用户引导） |
| 1901 | 托盘物品匹配多个医生 | "一次仅能配送一位医生" | ✅ 保留（规则提示） |
| 1913 | 托盘物品完全不匹配 | "需要: xxx、xxx" | ✅ 保留（引导提示） |
| 1961 | 物品发送成功但医生还需要 | "还需: xxx" | ✅ 保留（进度提示） |
| 2262 | 点击"原地复活"按钮 | "原地复活功能开发中" | ❌ 应去掉或替换为游戏结束 |

**建议去掉的 Toast：**
- 1288: 成功制止暴走病人（已有动效）
- 2262: 原地复活功能开发中（应直接隐藏该按钮或改为重新开始）

---

## 二、未被调用的函数

### 1. GameConfig.js

| 函数名 | 导出位置 | 状态 | 说明 |
|-------|---------|-----|-----|
| `checkPatientRage(patientDetail)` | 151行 | ❌ 未使用 | 检查病人是否会暴走，但代码中直接用了 `getRageProbability` |
| `getPatientDetail(patientId)` | 123行 | ⚠️ 导出但未使用 | 通过ID获取病人配置，但项目中使用 `getRandomPatientDetail` |

### 2. Game.js

| 函数名 | 定义位置 | 状态 | 说明 |
|-------|---------|-----|-----|
| `spawnPatientWithHairStyle(hairStyle)` | 702行 | ❌ 未使用 | 创建特定发型的病人，函数存在但从未被调用 |
| `renderLevelCompleteModal()` | 2114行 | ❌ 不会执行 | 渲染函数被调用，但 `levelCompleteModal` 永远不会被设置为可见对象 |
| `handleLevelCompleteTouch(x, y)` | 1810行 | ❌ 不会执行 | 触摸处理函数被调用，但直接返回 false（因为 modal 不可见） |
| `renderDebugLogs()` | 766行 | ❌ 被注释掉 | 调试日志渲染函数，render 中被注释 |

### 3. Items.js

| 函数名 | 导出位置 | 状态 | 说明 |
|-------|---------|-----|-----|
| `isMedicine(id)` | 127行 | ❌ 导入但未调用 | 被 Doctor.js 导入，但从未调用 |
| `isTool(id)` | 132行 | ❌ 未使用 | 从未被导入或调用 |
| `isImageLoaded(itemId)` | 101行 | ❌ 未使用 | 检查图片是否加载完成，从未被调用 |

---

## 三、未使用的配置项

### 1. GameConfig.patient 中的未使用配置

```javascript
patient: {
  // ✅ 正在使用：
  spawnFirstCount: 4,
  spawnFirstInterval: 4000,
  spawnRandomMin: 2000,
  spawnRandomMax: 6000,
  
  // ❌ 未使用：
  spawnInterval: 4000  // 基础间隔，代码中使用的是 spawnRandomMin/Max
}
```

### 2. GameConfig.doctor 中的未使用配置

```javascript
doctor: {
  // ❌ 未使用：
  baseSpeed: 0.12,        // 医生移动速度，代码中硬编码为 0.12
  treatmentTime: 2000     // 治疗时间，代码中硬编码为 2000
}
```

### 3. GameConfig.areas 配置

```javascript
areas: {
  waitingWidth: 0.35,     // ✅ 使用
  bedWidth: 0.35,         // ✅ 使用
  equipmentWidth: 0.30    // ✅ 使用
}
```

---

## 四、未使用的变量/状态

### 1. Game.js

| 变量名 | 定义位置 | 状态 | 说明 |
|-------|---------|-----|-----|
| `levelCompleteModal` | 127行 | ❌ 永不设置 | 弹窗状态对象，只有 null，不会被设置为可见对象 |
| `debugLogs` | 20行 | ⚠️ 部分使用 | 被 `addDebugLog` 写入，但 `renderDebugLogs` 被注释 |

### 2. Patient.js

| 变量名 | 定义位置 | 状态 | 说明 |
|-------|---------|-----|-----|
| `info` | 已删除 | ✅ 已清理 | 之前版本的病人信息字段，已删除 |

---

## 五、建议清理的代码

### 高优先级（建议立即删除）

1. **移除 `checkPatientRage` 函数**（GameConfig.js:151）
   - 原因：被导入但从未调用，且功能可由 `getRageProbability` 替代

2. **移除或修复 `levelCompleteModal` 相关代码**（Game.js）
   - 包括：`renderLevelCompleteModal()`、`handleLevelCompleteTouch()`
   - 原因：永远不会显示，当前使用 `levelToast` 代替

3. **移除 `isMedicine` 和 `isTool` 函数**（Items.js）
   - 原因：从未被调用

4. **移除 `isImageLoaded` 函数**（Items.js:101）
   - 原因：从未被调用

5. **移除 `spawnPatientWithHairStyle` 函数**（Game.js:702）
   - 原因：从未被调用

### 中优先级（可选清理）

1. **移除未使用的 GameConfig 配置**
   - `patient.spawnInterval`
   - `doctor.baseSpeed`
   - `doctor.treatmentTime`

2. **简化或移除部分 Toast**
   - "成功制止暴走病人！"（已有爱心-1动效）
   - "原地复活功能开发中"（应隐藏按钮）

3. **移除 `renderDebugLogs` 相关代码**
   - 包括：`addDebugLog` 方法和 `debugLogs` 数组

---

## 六、检查清单

请确认以下内容是否需要保留：

- [ ] `checkPatientRage` 函数是否保留（当前未使用）
- [ ] `levelCompleteModal` 弹窗是否要启用（当前使用轻量提示 `levelToast`）
- [ ] "原地复活"按钮是否要保留（功能未实现）
- [ ] 调试日志功能是否要保留（当前被注释）
- [ ] `spawnPatientWithHairStyle` 是否要保留（可能是未来功能）
