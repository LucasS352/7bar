const { Jimp } = require('jimp');

async function run() {
  const image = await Jimp.read('https://atacadaobr.vteximg.com.br/arquivos/ids/1141353/p.jpg');
  
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const size = Math.floor(Math.max(w, h) * 1.2);
  
  const squareImage = new Jimp({ width: size, height: size, color: 0xFFFFFFFF });
  const x = Math.floor((size - w) / 2);
  const y = Math.floor((size - h) / 2);
  
  squareImage.composite(image, x, y);
  
  const base64 = await squareImage.getBase64('image/png');
  console.log('Base64 length:', base64.length);
  console.log('Base64 sample:', base64.substring(0, 50));
}
run().catch(console.error);
