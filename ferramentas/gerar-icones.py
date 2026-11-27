"""Gera os ícones PNG do PWA em publico/icones/ (requer: pip install pillow).

Uso, a partir da raiz do projeto:
    python3 ferramentas/gerar-icones.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

DESTINO = Path(__file__).resolve().parent.parent / 'publico' / 'icones'
COR_FUNDO = '#173f5f'
COR_CRUZ = '#1f74c4'

# Mesmo traçado do logo.svg (coordenadas de 0 a 200): quatro curvas de Bézier formando o coração.
CURVAS = [
    ((100, 160), (48, 124), (38, 96), (38, 78)),
    ((38, 78), (38, 58), (53, 46), (70, 46)),
    ((70, 46), (84, 46), (95, 54), (100, 66)),
    ((100, 66), (105, 54), (116, 46), (130, 46)),
    ((130, 46), (147, 46), (162, 58), (162, 78)),
    ((162, 78), (162, 96), (152, 124), (100, 160)),
]


def ponto_da_curva(p0, p1, p2, p3, t):
    mt = 1 - t
    x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
    y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
    return (x, y)


CORACAO = [ponto_da_curva(*curva, i / 40) for curva in CURVAS for i in range(41)]


def desenhar(tamanho, arredondado, escala=1.0):
    """Desenha em 4x o tamanho final e reduz, para suavizar as bordas."""
    ampliacao = 4
    lado = tamanho * ampliacao
    k = lado / 200
    imagem = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    pincel = ImageDraw.Draw(imagem)

    if arredondado:
        pincel.rounded_rectangle([0, 0, lado - 1, lado - 1], radius=44 * k, fill=COR_FUNDO)
    else:
        pincel.rectangle([0, 0, lado, lado], fill=COR_FUNDO)

    def mapear(x, y):
        # a escala é aplicada em torno do centro do símbolo
        return ((100 + (x - 100) * escala) * k, (100 + (y - 103) * escala) * k)

    pincel.polygon([mapear(*p) for p in CORACAO], fill='#ffffff')
    for x0, y0, x1, y1 in [(90, 72, 110, 118), (77, 85, 123, 105)]:
        a, b = mapear(x0, y0), mapear(x1, y1)
        pincel.rounded_rectangle([a[0], a[1], b[0], b[1]], radius=4 * k * escala, fill=COR_CRUZ)

    return imagem.resize((tamanho, tamanho), Image.LANCZOS)


if __name__ == '__main__':
    DESTINO.mkdir(parents=True, exist_ok=True)
    desenhar(512, True).save(DESTINO / 'icone-512.png')
    desenhar(192, True).save(DESTINO / 'icone-192.png')
    desenhar(180, False).save(DESTINO / 'icone-180.png')  # o iOS aplica o arredondamento
    desenhar(512, False, escala=0.62).save(DESTINO / 'icone-mascara-512.png')  # versão "maskable"
    print('Ícones gerados em', DESTINO)
