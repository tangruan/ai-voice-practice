const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');

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
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: '没有文件被上传' });
    }

    try {
        const userAudioPath = req.file.path;
        const aiAudioPath = 'path/to/ai/audio.mp3'; // 请确保这是正确的 AI 音频文件路径

        const stats = await compareAudio(userAudioPath, aiAudioPath);
        const feedback = generateFeedback(stats);

        res.json({ 
            message: '文件上传成功', 
            filename: req.file.filename,
            feedback: feedback
        });
    } catch (error) {
        console.error('音频比较错误:', error);
        res.status(500).json({ message: '音频处理过程中出错' });
    }
});

// 添加音频比较函数
function compareAudio(userAudioPath, aiAudioPath) {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i ${userAudioPath} -i ${aiAudioPath} -filter_complex "asetnsamples=n=44100,aformat=channel_layouts=mono,compand,astats[out0][out1]" -map [out0] -f null -`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            // 解析 ffmpeg 输出以获取音频统计信息
            const stats = parseFFmpegOutput(stderr);
            resolve(stats);
        });
    });
}

function parseFFmpegOutput(output) {
    // 这里需要根据 ffmpeg 的实际输出格式来解析
    // 这只是一个示例，您可能需要根据实际情况调整
    const rmsMatch = output.match(/RMS level dB: ([-\d.]+)/);
    const peakMatch = output.match(/Peak level dB: ([-\d.]+)/);
    return {
        rms: rmsMatch ? parseFloat(rmsMatch[1]) : null,
        peak: peakMatch ? parseFloat(peakMatch[1]) : null
    };
}

function generateFeedback(stats) {
    let feedback = [];

    if (stats.rms < -20) {
        feedback.push("您的音量可能偏小，建议稍微提高音量，使声音更清晰。");
    } else if (stats.rms > -10) {
        feedback.push("您的音量可能偏大，建议稍微降低音量，避免失真。");
    }

    if (stats.peak < -6) {
        feedback.push("您的发音可能不够清晰，建议更加注重每个音节的发音。");
    } else if (stats.peak > -3) {
        feedback.push("您的某些音节发音可能过于强调，建议保持平稳的语调。");
    }

    feedback.push("继续练习语音的节奏和语调，使其更接近标准发音。");
    feedback.push("注意单词之间的连音和停顿，使语句更加流畅自然。");

    return feedback;
}

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
