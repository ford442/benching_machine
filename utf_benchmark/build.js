import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

const utf8Dir = path.join(distDir, 'utf8-control');
const utf16Dir = path.join(distDir, 'utf16-test');

const utf16Map = {
  'index.html': 'index.1ink',
  'app.js': 'app.1ijs',
  'style.css': 'style.1iss'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeUTF8(srcPath, destPath) {
  const content = fs.readFileSync(srcPath, 'utf8');
  fs.writeFileSync(destPath, content, 'utf8');
}

function writeUTF16(srcPath, destPath) {
  const content = fs.readFileSync(srcPath, 'utf8');
  const utf16Content = '\ufeff' + content;
  fs.writeFileSync(destPath, Buffer.from(utf16Content, 'utf16le'));
}

function build() {
  ensureDir(utf8Dir);
  ensureDir(utf16Dir);

  const files = ['index.html', 'app.js', 'style.css'];

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Warning: ${file} not found in src/`);
      continue;
    }

    // UTF-8 control version
    writeUTF8(srcPath, path.join(utf8Dir, file));

    // UTF-16 test version with custom extension
    const utf16Name = utf16Map[file] || file;
    if (file === 'index.html') {
      let content = fs.readFileSync(srcPath, 'utf8');
      content = content.replace(/style\.css/g, 'style.1iss');
      content = content.replace(/app\.js/g, 'app.1ijs');
      const utf16Content = '\ufeff' + content;
      fs.writeFileSync(path.join(utf16Dir, utf16Name), Buffer.from(utf16Content, 'utf16le'));
    } else {
      writeUTF16(srcPath, path.join(utf16Dir, utf16Name));
    }
  }

  console.log('✅ Build complete');
  console.log(`   UTF-8 → ${utf8Dir}`);
  console.log(`   UTF-16 → ${utf16Dir}`);
}

build();
