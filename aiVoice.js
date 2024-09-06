function initAiVoice() {
    const feedbackElement = document.getElementById('feedback');
    const tipsElement = document.getElementById('tips');
    const aiAudio = document.getElementById('ai-audio');

    let audioContext;
    let mediaRecorder;

    // 确保 socket 已连接
    // if (!window.socket) {
    //     console.error('Socket 未连接');
    //     return;
    // }

    // 开始录音
    window.AudioApp.startRecording = function () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('您的浏览器不支持录音功能');
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = event => {
                    sendAudioData(event.data);
                };
                mediaRecorder.start(1000); // 每秒发送一次音频数据

                document.querySelector('.fa-microphone').style.color = 'red';
                document.getElementById('record-status').textContent = '录音中...';

                window.socket.on('feedback', updateFeedback);
            })
            .catch(error => {
                console.error('访问麦克风时出错:', error);
                alert('无法访问麦克风，请确保您已授予权限。');
            });
    };

    // 停止录音
    window.AudioApp.stopRecording = function () {
        if (mediaRecorder) {
            mediaRecorder.stop();
        }
    };

    // 生成AI配音
    window.AudioApp.generateAIVoice = function () {
        const text = document.getElementById('text-input').value;
        window.socket.emit('generateAIVoice', { text: text });
    };

    // 音频数据发送
    function sendAudioData(audioBlob) {
        const reader = new FileReader();
        reader.onload = function () {
            window.socket.emit('audio_data', reader.result);
        };
        reader.readAsArrayBuffer(audioBlob);
    }

    window.socket.on('aiVoice', (data) => {
        aiAudio.src = data.audioUrl;
    });

    // 更新反馈
    function updateFeedback(data) {
        if (feedbackElement) {
            feedbackElement.textContent = data.message;
        }
        if (tipsElement) {
            tipsElement.innerHTML = '';
            data.tips.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = tip;
                tipsElement.appendChild(li);
            });
        }
    }
}

// 将这些函数移动到 window.AudioApp 对象中
if (!window.AudioApp) {
    window.AudioApp = {};
}

// 修改这部分代码
window.AudioApp.initAiVoice = initAiVoice;

// 移除 DOMContentLoaded 事件监听器
// document.addEventListener('DOMContentLoaded', () => {
//     if (window.socket) {
//         initAiVoice();
//     } else {
//         console.error('Socket 未连接，无法初始化 AI 语音功能');
//     }
// });
