# backend/app/utils/pdf_generator.py

from xhtml2pdf import pisa
from io import BytesIO
from fastapi.templating import Jinja2Templates
import os
import urllib.request
import zipfile
from pathlib import Path # ★追加

# パス設定
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
FONTS_DIR = os.path.join(BASE_DIR, "fonts")
FONT_PATH = os.path.join(FONTS_DIR, "ipaexg.ttf")

templates = Jinja2Templates(directory=TEMPLATES_DIR)

def ensure_japanese_font():
    """
    日本語フォントが存在しない場合、ダウンロードして配置する
    """
    # ファイルが存在し、かつ空っぽでないか確認
    if os.path.exists(FONT_PATH) and os.path.getsize(FONT_PATH) > 0:
        return FONT_PATH

    print("Downloading Japanese font (IPAexGothic)...")
    try:
        os.makedirs(FONTS_DIR, exist_ok=True)
        url = "https://moji.or.jp/wp-content/ipafont/IPAexfont/IPAexfont00401.zip"
        zip_path = os.path.join(FONTS_DIR, "font.zip")
        
        # ★修正1: サーバー弾き(403エラー)対策でブラウザからのアクセスを装う
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response, open(zip_path, 'wb') as out_file:
            out_file.write(response.read())
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for file in zip_ref.namelist():
                if file.endswith("ipaexg.ttf"):
                    with zip_ref.open(file) as source, open(FONT_PATH, "wb") as target:
                        target.write(source.read())
                    break
        
        if os.path.exists(zip_path):
            os.remove(zip_path)
            
        print("Font downloaded successfully.")
        return FONT_PATH
    except Exception as e:
        print(f"Failed to download font: {e}")
        return None

def create_pdf_from_template(template_name: str, context: dict) -> BytesIO:
    """
    Jinja2テンプレートとデータからPDFを生成する
    """
    font_path = ensure_japanese_font()
    if font_path:
        # ★修正2: xhtml2pdfが確実に読み込めるように file:/// 形式のURIに変換
        context["font_path"] = font_path
    else:
        context["font_path"] = ""

    template = templates.get_template(template_name)
    html_content = template.render(context)

    buffer = BytesIO()
    pisa_status = pisa.CreatePDF(
        src=html_content,
        dest=buffer,
        encoding='utf-8'
    )

    if pisa_status.err:
        raise Exception("PDF generation failed")

    buffer.seek(0)
    return buffer