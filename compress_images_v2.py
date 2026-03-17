from PIL import Image
import os
from pathlib import Path

def compress_png(input_path, output_path):
    """更激进的 PNG 压缩"""
    img = Image.open(input_path)
    
    # 转换为 RGBA 模式（如果不是的话）
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # 根据原图大小决定是否缩小尺寸
    w, h = img.size
    max_dimension = max(w, h)
    
    # 根据尺寸决定缩放比例
    if max_dimension > 1024:
        target = 512
    elif max_dimension > 512:
        target = 384
    elif max_dimension > 256:
        target = 256
    else:
        target = max_dimension
    
    if max_dimension > target:
        ratio = target / max_dimension
        new_size = (int(w * ratio), int(h * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    # 保存为优化过的 PNG，使用最高压缩级别
    img.save(output_path, 'PNG', optimize=True, compress_level=9)

def main():
    images_dir = Path('images')
    
    # 统计压缩前大小
    original_size = sum(f.stat().st_size for f in images_dir.glob('*.png'))
    
    compressed_count = 0
    for png_file in images_dir.glob('*.png'):
        try:
            compress_png(png_file, png_file)
            compressed_count += 1
        except Exception as e:
            print(f"✗ {png_file.name}: {e}")
    
    # 统计压缩后大小
    compressed_size = sum(f.stat().st_size for f in images_dir.glob('*.png'))
    
    print(f"✓ 压缩完成: {compressed_count} 张图片")
    print(f"原大小: {original_size / 1024 / 1024:.2f} MB")
    print(f"压缩后: {compressed_size / 1024 / 1024:.2f} MB")
    print(f"节省: {(original_size - compressed_size) / 1024 / 1024:.2f} MB ({(1 - compressed_size/original_size)*100:.1f}%)")

if __name__ == '__main__':
    main()
