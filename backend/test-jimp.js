const { Jimp } = require('jimp');
async function run() {
  const image = await Jimp.read('https://atacadaobr.vteximg.com.br/arquivos/ids/1141353/p.jpg');
  console.log('width:', image.bitmap.width, 'height:', image.bitmap.height);
}
run().catch(console.error);
