const { Jimp } = require('jimp');

async function run() {
  const image = await Jimp.read('https://atacadaobr.vteximg.com.br/arquivos/ids/1141353/p.jpg');
  
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const size = Math.floor(Math.max(w, h) * 1.85);
  
  const squareImage = new Jimp({ width: size, height: size, color: 0xFFFFFFFF });
  const x = Math.floor((size - w) / 2);
  const y = Math.floor((size - h) / 2);
  
  squareImage.composite(image, x, y);
  
  // Add a tiny dot to trick auto-crop
  squareImage.setPixelColor(0xFEFEFEFF, 0, 0);
  squareImage.setPixelColor(0xFEFEFEFF, size - 1, size - 1);
  
  const base64Str = await squareImage.getBase64('image/png');
  console.log('Success, length:', base64Str.length);
}
run().catch(console.error);
