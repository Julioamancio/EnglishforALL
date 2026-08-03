# -*- coding: utf-8 -*-
"""
Transforma os videos de fundo preto em WebM com transparencia.

O truque que evita esburacar o personagem: nao basta apagar o que e escuro.
O visor do Max, os cabelos da Sofia e da Maya e os olhos do Leo tambem sao
escuros — um recorte por luminancia comeria de 9 mil a 23 mil pixels DENTRO
deles. Entao o que vira transparente e so o preto LIGADO A BORDA: preenche-se
a partir dos quatro cantos, e o escuro que estiver cercado por personagem
continua opaco.

(Fundo branco nao ajudaria: estes personagens sao claros. O Max perderia ate
31% do corpo, porque ele proprio e branco.)

Saida: WebM/VP9 com alfa (yuva420p). O -auto-alt-ref 0 e obrigatorio — com os
quadros de referencia alternativos ligados, o libvpx descarta o canal alfa.

Uso: python3 processa.py ORIGEM.mp4 nome-de-saida
"""
import os
import subprocess
import sys
import glob
from PIL import Image, ImageDraw

ALTURA = 440       # eles aparecem com 220px; o dobro cobre telas 2x
LIMIAR = 70        # tolerancia do preenchimento a partir do canto.
                   # Medido: de 34 para 70 o residuo escuro cai de 513 para
                   # 373 px e o corpo perde so 2%, que e a franja do brilho.
                   # Acima de 70 nao melhora mais.
MARGEM = 6         # respiro depois do corte

origem, nome = sys.argv[1], sys.argv[2]
T = f'/tmp/proc-{nome}'
subprocess.run(['rm', '-rf', T], check=True)
os.makedirs(T + '/cru', exist_ok=True)
os.makedirs(T + '/rgba', exist_ok=True)

print(f'{nome}: extraindo quadros…', flush=True)
subprocess.run([
    'ffmpeg', '-v', 'error', '-y', '-i', origem,
    '-vf', f'scale=-2:{ALTURA}', f'{T}/cru/%04d.png'
], check=True)

quadros = sorted(glob.glob(f'{T}/cru/*.png'))
print(f'{nome}: {len(quadros)} quadros, recortando o fundo…', flush=True)

MARCA = (255, 0, 255)
caixa = None
for i, q in enumerate(quadros):
    im = Image.open(q).convert('RGB')
    w, h = im.size
    # preenche a partir dos quatro cantos: so o preto que toca a moldura sai
    for canto in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(im, canto, MARCA, thresh=LIMIAR)
    dados = im.load()
    alfa = Image.new('L', (w, h), 255)
    ad = alfa.load()
    linhas_corpo = [0] * h
    for y in range(h):
        for x in range(w):
            if dados[x, y] == MARCA:
                ad[x, y] = 0
                dados[x, y] = (0, 0, 0)
            else:
                linhas_corpo[y] += 1

    # Particulas soltas: restos do brilho que ficaram opacos longe do corpo.
    # Preenche-se o corpo a partir de dentro; o que continuar opaco e ilha.
    y0 = linhas_corpo.index(max(linhas_corpo))
    x0 = next(x for x in range(w) if ad[x, y0] == 255)
    x0 = next((x for x in range(x0, w) if ad[x, y0] == 255 and ad[min(x + 3, w - 1), y0] == 255), x0)
    ImageDraw.floodfill(alfa, (x0, y0), 200, thresh=10)
    for y in range(h):
        for x in range(w):
            v = ad[x, y]
            if v == 255:          # opaco que o preenchimento do corpo nao alcancou
                ad[x, y] = 0
                dados[x, y] = (0, 0, 0)
            elif v == 200:
                ad[x, y] = 255
    im.putalpha(alfa)
    b = im.getbbox()
    caixa = b if caixa is None else (min(caixa[0], b[0]), min(caixa[1], b[1]),
                                     max(caixa[2], b[2]), max(caixa[3], b[3]))
    im.save(f'{T}/rgba/{i + 1:04d}.png')

# a caixa e a UNIAO de todos os quadros: se cortasse por quadro, o personagem
# tremeria dentro do enquadramento ao longo da animacao
e, t, d, b = caixa
im0 = Image.open(f'{T}/rgba/0001.png')
e = max(0, e - MARGEM); t = max(0, t - MARGEM)
d = min(im0.size[0], d + MARGEM); b = min(im0.size[1], b + MARGEM)
lar, alt = d - e, b - t
lar -= lar % 2; alt -= alt % 2          # VP9 exige dimensao par
print(f'{nome}: corte {lar}x{alt} (de {im0.size[0]}x{im0.size[1]})', flush=True)

for f in sorted(glob.glob(f'{T}/rgba/*.png')):
    Image.open(f).crop((e, t, e + lar, t + alt)).save(f)

saida = f'/var/www/banco-questoes/public/video/personas/{nome}.webm'
subprocess.run([
    'ffmpeg', '-v', 'error', '-y', '-framerate', '24', '-i', f'{T}/rgba/%04d.png',
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
    '-auto-alt-ref', '0',          # sem isto o alfa se perde
    '-b:v', '0', '-crf', '38',
    '-row-mt', '1', '-an', saida
], check=True)

kb = os.path.getsize(saida) / 1024
print(f'{nome}: {saida} — {kb:.0f} KB', flush=True)
subprocess.run(['rm', '-rf', T], check=True)
