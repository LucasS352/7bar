const { Jimp } = require('jimp');

async function run() {
  const image = await Jimp.read('https://atacadaobr.vteximg.com.br/arquivos/ids/1141353/p.jpg');
  
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const size = Math.max(w, h);
  
  console.log(`Original: ${w}x${h}`);
  console.log(`Padded to: ${size}x${size}`);

  const squareImage = new Jimp({ width: size, height: size, color: 0xFFFFFFFF });
  const x = Math.floor((size - w) / 2);
  const y = Math.floor((size - h) / 2);
  
  squareImage.composite(image, x, y);
  
  const buffer = await squareImage.getBuffer('image/png');
  console.log('Buffer created:', buffer.length);
}
run().catch(console.error);
