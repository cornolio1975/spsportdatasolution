const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building dist.zip bundle...');

const stageDir = path.join(__dirname, 'dist_stage');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    // Read buffer to bypass locks
    try {
      const data = fs.readFileSync(src);
      fs.writeFileSync(dest, data);
    } catch (err) {
      console.warn('Warning copying file:', src, err.message);
    }
  }
}

try {
  if (fs.existsSync(stageDir)) {
    fs.rmSync(stageDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stageDir, { recursive: true });

  const itemsToCopy = ['index.html', 'styles.css', 'app.js', 'package.json', 'assets', 'karatetech', 'kabadditech'];
  itemsToCopy.forEach(item => {
    const srcPath = path.join(__dirname, item);
    const destPath = path.join(stageDir, item);
    if (fs.existsSync(srcPath)) {
      copyRecursiveSync(srcPath, destPath);
    }
  });

  const zipPath = path.join(__dirname, 'dist.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Compress using PowerShell from stageDir
  execSync(`powershell -Command "Set-Location '${stageDir}'; Compress-Archive -Path * -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });

  // Copy to KarateTech folder as well
  const karateDist = 'C:\\Users\\svana\\KarateTech\\dist.zip';
  fs.copyFileSync(zipPath, karateDist);

  // Clean stageDir
  fs.rmSync(stageDir, { recursive: true, force: true });

  console.log('✅ dist.zip successfully created and updated!');
} catch (error) {
  console.error('Build dist failed:', error);
  process.exit(1);
}
