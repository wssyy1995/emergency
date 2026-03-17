from PIL import Image
import os
from pathlib import Path

def compress_png(input_path, output_path, quality=85):
    """压缩 PNG 图片"""
    img = Image.open(input_path)
    
    # 如果图片尺寸很大，可以适当缩小
    max_size = 512  # 最大边长
    if max(img.size) > max_size:
        ratio = max_size / max(img.size)
        new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    # 保存为优化过的 PNG
    img.save(output_path, 'PNG', optimize=True)

def main():
    images_dir = Path('images')
    
    # 统计压缩前大小
    original_size = sum(f.stat().st_size for f in images_dir.glob('*.png'))
    
    compressed_count = 0
    for png_file in images_dir.glob('*.png'):
        try:
            compress_png(png_file, png_file)
            compressed_count += 1
            print(f"✓ {png_file.name}")
        except Exception as e:
            print(f"✗ {png_file.name}: {e}")
    
    # 统计压缩后大小
    compressed_size = sum(f.stat().st_size for f in images_dir.glob('*.png'))
    
    print(f"\n压缩完成: {compressed_count} 张图片")
    print(f"原大小: {original_size / 1024 / 1024:.2f} MB")
    print(f"压缩后: {compressed_size / 1024 / 1024:.2f} MB")
    print(f"节省: {(original_size - compressed_size) / 1024 / 1024:.2f} MB ({(1 - compressed_size/original_size)*100:.1f}%)")

if __name__ == '__main__':
    main()
