const aiAudio = document.getElementById('ai-audio');
const personalAudio = document.getElementById('personal-audio');
let mediaRecorder;
let audioChunks = [];

// 文件上传处理函数
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('file-name').textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('text-input').value = e.target.result;
        };
        reader.readAsText(file);
    }
}

document.getElementById('file-input').addEventListener('change', handleFileUpload);

// 生成AI配音
function generateAIVoice() {
    const textInput = document.getElementById('text-input').value;
    if (textInput.trim() === "") {
        alert("请输入文本或上传文本文件。");
        return;
    }

    // 缓存检查
    const cachedAudio = localStorage.getItem(textInput);
    if (cachedAudio) {
        aiAudio.src = cachedAudio;
        aiAudio.play();
        return;
    }

    showLoading();
    fetch('http://127.0.0.1:5000/generate-voice', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textInput })
    })
    .then(response => response.json())
    .then(data => {
        if (data.audio_url) {
            const absoluteUrl = new URL(data.audio_url, 'http://127.0.0.1:5000').href;
            aiAudio.src = absoluteUrl;
            aiAudio.play();
            aiWavesurfer.load(absoluteUrl);
            localStorage.setItem(textInput, absoluteUrl); // 缓存音频URL
        } else {
            alert("AI配音生成失败。");
        }
        hideLoading();
    })
    .catch(error => {
        console.error("错误:", error);
        hideLoading();
    });
}

// AI音频加载失败处理
aiAudio.onerror = function() {
    alert("音频加载失败，请重试。");
};

// 开始录音
function startRecording() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();

            mediaRecorder.ondataavailable = function(e) {
                audioChunks.push(e.data);
            };

            mediaRecorder.onstop = function() {
                const audioBlob = new Blob(audioChunks, { 'type': 'audio/wav; codecs=opus' });
                const audioUrl = URL.createObjectURL(audioBlob);
                personalAudio.src = audioUrl;
                personalWavesurfer.load(audioUrl);
                audioChunks = [];
            };
        }).catch(err => {
            console.error("发生错误: " + err);
        });
    } else {
        alert("您的浏览器不支持音频录制。");
    }
}

// 停止录音
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    } else {
        alert("录音尚未开始。");
    }
}

// 上传录音
function uploadRecording() {
    if (personalAudio.src) {
        alert("录音上传成功！");
    } else {
        alert("请先录制音频。");
    }
}

// 重试录音
function retryRecording() {
    personalAudio.src = '';
    alert("您可以重新录音。");
}

// 显示加载中状态
function showLoading() {
    document.getElementById('loading-indicator').style.display = 'flex';
}

// 隐藏加载中状态
function hideLoading() {
    document.getElementById('loading-indicator').style.display = 'none';
}

let aiWavesurfer, personalWavesurfer;

// 初始化Wavesurfer
document.addEventListener('DOMContentLoaded', function() {
    aiWavesurfer = WaveSurfer.create({
        container: '#ai-waveform',
        waveColor: 'violet',
        progressColor: 'purple'
    });

    personalWavesurfer = WaveSurfer.create({
        container: '#personal-waveform',
        waveColor: 'orange',
        progressColor: 'red'
    });
});
