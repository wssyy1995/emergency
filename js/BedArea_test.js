import { fillRoundRect, strokeRoundRect } from './utils.js'

export default class BedArea {
  constructor(x, y, width, height, bedCount = 2) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.bedCount = bedCount
    this.beds = []
    this.ivSeats = []
    this.initBeds()
    this.initIVSeats()
  }
  
  initBeds() {
    const bedWidth = this.width * 0.58
    const bedHeight = bedWidth * (267 / 200)
    const gapX = (this.width - bedWidth * 2) / 3
    const startX = this.x + gapX
    const startY = this.y + this.height * 0.28 - bedHeight / 2 + 8
    
    for (let i = 0; i < 2; i++) {
      const bedX = startX + i * (bedWidth + gapX)
      this.beds.push({
        id: i,
        x: bedX,
        y: startY,
        width: bedWidth,
        height: bedHeight,
        patient: null,
        render: function(ctx) {}
      })
    }
  }
  
  initIVSeats() {
    const seatWidth = this.width * 0.2
    const seatHeight = this.height * 0.2
    const gapX = (this.width - seatWidth * 4) / 5
    const startX = this.x + gapX
    const startY = this.y + this.height * 0.75 + 5
    
    for (let i = 0; i < 4; i++) {
      const seatX = startX + i * (seatWidth + gapX)
      this.ivSeats.push({
        id: i,
        x: seatX,
        y: startY,
        width: seatWidth,
        height: seatHeight,
        patient: null,
        render: function(ctx) {}
      })
    }
  }
  
  render(ctx, curedImage = null) {
    // 简单的踢脚线
    ctx.save()
    ctx.strokeStyle = '#BDC3C7'
    ctx.lineWidth = 4
    ctx.beginPath()
    const lineY = this.y + this.height * 0.5
    ctx.moveTo(this.x + 3, lineY)
    ctx.lineTo(this.x + this.width - 3, lineY)
    ctx.stroke()
    ctx.restore()
    
    // 绘制病床
    this.beds.forEach(bed => bed.render(ctx))
    this.ivSeats.forEach(seat => seat.render(ctx))
  }
}
