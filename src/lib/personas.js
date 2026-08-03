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
    // exige o mp4: é o formato que todo navegador toca. O webm é ganho de
    // tamanho onde houver, mas sozinho não sustenta a página.
    if (fs.existsSync(path.join(DIR, `${nome}.mp4`))) _comVideo.add(nome);
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
