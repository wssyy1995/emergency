// 绘制圆角矩形的工具函数
export function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

// 绘制圆角矩形（只填充）
export function fillRoundRect(ctx, x, y, width, height, radius) {
  roundRect(ctx, x, y, width, height, radius)
  ctx.fill()
}

// 绘制圆角矩形（只描边）
export function strokeRoundRect(ctx, x, y, width, height, radius) {
  roundRect(ctx, x, y, width, height, radius)
  ctx.stroke()
}

// 绘制星星
export function drawStar(ctx, x, y, size, color = '#FFD700') {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const angle = (18 + i * 72) * Math.PI / 180
    const innerAngle = (54 + i * 72) * Math.PI / 180
    ctx.lineTo(Math.cos(angle) * size, -Math.sin(angle) * size)
    ctx.lineTo(Math.cos(innerAngle) * size / 2, -Math.sin(innerAngle) * size / 2)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
