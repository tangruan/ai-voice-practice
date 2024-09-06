const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const port = 3000;

// 配置 multer 用于处理文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // 确保这个目录存在
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// 确保在 app.use(express.json()) 之后添加以下代码
app.use(express.urlencoded({ extended: true }));

// 在创建 app 之后，使用路由之前添加以下代码
app.use(cors({
    origin: 'http://localhost',
    methods: ['GET', 'POST'],
    credentials: true
}));

// 确保这个路由存在
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: '没有文件被上传' });
    }
    res.json({ message: 'File successfully uploaded', filename: req.file.filename });
});

io.on('connection', (socket) => {
    console.log('客户端已连接');

    socket.emit('info', { message: '你好！来自服务器的消息！' });

    socket.on('generateAIVoice', (data) => {
        console.log(`收到生成AI语音请求: ${JSON.stringify(data)}`);
        const audioUrl = 'http://example.com/ai-voice.mp3'; // 实际音频 URL
        socket.emit('aiVoice', { audioUrl });
    });

    socket.on('uploadRecording', (data) => {
        console.log(`收到上传录音请求: ${JSON.stringify(data)}`);
        socket.emit('feedback', { message: '上传录音成功。' });
    });

    socket.on('disconnect', () => {
        console.log('客户端已断开连接');
    });
});

server.listen(port, () => {
    console.log(`Socket.IO 服务器正在监听 http://localhost:${port}`);
});
