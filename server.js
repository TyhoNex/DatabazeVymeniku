// Jednoduchý Express backend pro upload/download souborů
// Uloží soubory do složky uploads a zpřístupní je veřejně

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Povolit CORS pro všechny domény
app.use(cors());

// Vytvořit složku uploads pokud neexistuje
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Přidat timestamp pro unikátnost
    const uniqueName = Date.now() + '_' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB limit

// Upload endpoint
app.post('/upload', upload.array('files'), (req, res) => {
  const files = req.files.map(file => ({
    name: file.originalname,
    url: `/uploads/${file.filename}`,
    size: file.size,
    mimetype: file.mimetype,
    uploadDate: new Date().toISOString()
  }));
  res.json({ success: true, files });
});

// Seznam všech souborů
app.get('/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Chyba při čtení složky uploads' });
    const fileList = files.map(filename => {
      const stats = fs.statSync(path.join(uploadDir, filename));
      return {
        name: filename.split('_').slice(1).join('_'),
        url: `/uploads/${filename}`,
        size: stats.size,
        uploadDate: stats.birthtime
      };
    });
    res.json(fileList);
  });
});

// Statické soubory (veřejné odkazy)
app.use('/uploads', express.static(uploadDir));

// Smazání souboru
app.delete('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);
  fs.unlink(filePath, err => {
    if (err) return res.status(404).json({ error: 'Soubor nenalezen' });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});
