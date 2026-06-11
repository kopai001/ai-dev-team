const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../knowledge-base/working-file/source');
const outputDir = path.join(__dirname, '../output');

const url = fs.readFileSync(sourceFile, 'utf8').trim().split('\n')[0].trim();

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputFile = path.join(outputDir, 'qr-code.jpeg');

QRCode.toFile(
  outputFile,
  url,
  {
    type: 'jpeg',
    quality: 0.95,
    width: 512,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  },
  (err) => {
    if (err) {
      console.error('Error generating QR code:', err);
      process.exit(1);
    }
    console.log(`QR code saved: ${outputFile}`);
    console.log(`URL encoded: ${url}`);
  }
);
