const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

// Set up express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.static('public')); // Set up a static folder for serving files

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Save files to uploads directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Rename file to avoid conflicts
    }
});
const upload = multer({ storage: storage });

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle PDF upload
app.post('/upload', upload.single('pdf'), (req, res) => {
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ filePath });
});

// Socket.IO setup
const groups = {}; // Track users in groups

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    socket.on('createGroup', (groupId) => {
        if (!groups[groupId]) {
            groups[groupId] = [];
        }
        groups[groupId].push(socket.id);
    });

    socket.on('joinGroup', (groupId) => {
        if (groups[groupId]) {
            groups[groupId].push(socket.id);
        }
    });

    socket.on('uploadPdf', (data) => {
        socket.to(data.groupId).emit('newPdf', data.filePath);
    });

    socket.on('renderPdf', (data) => {
        socket.to(data.groupId).emit('renderPdf', data.pdfPath);
    });

    socket.on('draw', (data) => {
        socket.to(data.groupId).emit('draw', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
        // Remove user from groups on disconnect
        for (const groupId in groups) {
            groups[groupId] = groups[groupId].filter(id => id !== socket.id);
        }
    });
});

// Create uploads directory if not already present
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
