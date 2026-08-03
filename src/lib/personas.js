/**
 * Quais personagens têm vídeo de apresentação.
 *
 * A lista é lida uma vez, no boot, e não a cada requisição: são quatro
 * arquivos que só mudam quando alguém os troca no disco. Se um dia trocarem
 * com o serviço no ar, um restart resolve.
 *
 * O vídeo entra SÓ na apresentação da turma, em /gramatica. Numa página de
 * tópico a mesma persona aparece 15 vezes — quinze vídeos de 8 segundos
 * tocando juntos travariam o celular do aluno e comeriam a internet dele.
 * Ali continua a imagem.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'public', 'video', 'personas');
const NOMES = ['sofia', 'maya', 'leo', 'max'];

let _comVideo = new Set();

function carregar() {
  _comVideo = new Set();
  if (!fs.existsSync(DIR)) return;
  for (const nome of NOMES) {
    // Exige o webm: MP4/H.264 não carrega canal alfa, e a transparência é o
    // ponto — o personagem tem que flutuar sobre o fundo da página, não vir
    // num retângulo. Quem não decodificar WebM com alfa não seleciona a fonte
    // e fica no poster, que é a mesma PNG.
    if (fs.existsSync(path.join(DIR, `${nome}.webm`))) _comVideo.add(nome);
  }
}

carregar();

module.exports = {
  recarregar: carregar,
  temVideo: (nome) => _comVideo.has(nome),
  /** Extensões disponíveis para um personagem, na ordem de preferência. */
  formatos(nome) {
    if (!_comVideo.has(nome)) return [];
    return ['webm', 'mp4'].filter((ext) => fs.existsSync(path.join(DIR, `${nome}.${ext}`)));
  },
  quantos: () => _comVideo.size,
};
