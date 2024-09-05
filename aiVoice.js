// 确保 aiAudio 元素已定义
const feedbackElement = document.getElementById('feedback');
const tipsElement = document.getElementById('tips');
const aiAudio = document.getElementById('ai-audio');

// 替换WebSocket初始化
var socket = io('http://localhost:5000');

// 初始化音频录制
let audioContext; // 初始化为空

// 开始录音
function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        if (!audioContext) {
            initAudioContext(); // 确保在录音开始前初始化 AudioContext
        }
        
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
            sendAudioData(event.data);
        };
        mediaRecorder.start(1000); // 每秒发送一次音频数据

        // Socket.IO 监听反馈
        socket.on('feedback', data => {
            feedbackElement.innerText = data.feedback;
            tipsElement.innerText = data.detailed_tips.join('\n');
        });
    })
    .catch(error => console.error('Error accessing audio:', error));
}

// 停止录音
function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
}

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
        hideLoading(); // 在处理完成后隐藏加载中状态

        if (data.audio_url) {
            const absoluteUrl = new URL(data.audio_url, 'http://127.0.0.1:5000').href;
            aiAudio.src = absoluteUrl;
            aiAudio.play();
            aiWavesurfer.load(absoluteUrl);
            localStorage.setItem(textInput, absoluteUrl); // 缓存音频URL
        } else {
            alert("AI配音生成失败。");
        }
    })
    .catch(error => {
        console.error("错误:", error);
        hideLoading(); // 在发生错误时也要隐藏加载中状态
    });
}

// 处理文件上传
function handleFileUpload() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            document.getElementById('text-input').value = text;  // 将文件内容写入文本框
        };
        reader.readAsText(file);  // 读取文件为文本
    } else {
        alert("请先选择一个文本文件。");
    }
}

// 显示加载中状态
function showLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    } else {
        console.error("找不到加载中指示器元素！");
    }
}

// 隐藏加载中状态
function hideLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    } else {
        console.error("找不到加载中指示器元素！");
    }
}

// 初始化Wavesurfer
let aiWavesurfer;
document.addEventListener('DOMContentLoaded', function() {
    aiWavesurfer = WaveSurfer.create({
        container: '#ai-waveform',
        waveColor: 'violet',
        progressColor: 'purple'
    });

    // 删除这一行,因为 HTML 中没有 id 为 'start-button' 的元素
    // document.getElementById('start-button').addEventListener('click', initAudioContext);

    loadArticles(); // 加载文章列表
});

// 初始化 AudioContext
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext initialized');
    }
}

// 文章列表
const articles = [
    { title: "励志英语文章", url: "https://gist.githubusercontent.com/tangruan/050c8b1164eb49b4440c0d1f698018e6/raw/03fa775bd2e35e9ef8dbe65199b9f4569cb72982/Inspirational%2520English%2520.txt" },
    { title: "Article 2", url: "https://gist.githubusercontent.com/tangruan/050c8b1164eb49b4440c0d1f698018e6/raw/article2.txt" },
    // 可以继续添加更多文章
];

// 动态生成文章列表
function loadArticles() {
    const articlesList = document.getElementById('articles-list');
    articles.forEach(article => {
        const listItem = document.createElement('li');

        // 创建文章链接
        const articleLink = document.createElement('a');
        articleLink.href = article.url;
        articleLink.target = "_blank";
        articleLink.textContent = article.title;

        // 创建练习按钮
        const practiceButton = document.createElement('button');
        practiceButton.textContent = "练习这个";
        practiceButton.onclick = () => loadArticleText(article.url);

        listItem.appendChild(articleLink);
        listItem.appendChild(practiceButton);
        articlesList.appendChild(listItem);
    });
}

// 加载文章内容到文本框
function loadArticleText(url) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById('text-input').value = data;
        })
        .catch(error => console.error("加载文章内容失败:", error));
}

// 清理 localStorage
function clearLocalStorage() {
    localStorage.clear(); // 清除所有的缓存数据
}

// 调用清理函数，例如在页面加载时
window.addEventListener('load', function() {
    clearLocalStorage();
});

// 重试录音
function retryRecording() {
    const personalAudio = document.getElementById('personal-audio');
    if (personalAudio) {
        personalAudio.src = '';
    }
    audioChunks = []; // 清空录音数据
    alert("您可以重新录音。");
}

// 当AI角色配音文本框的内容变化时，自动同步到个人录音文本框
document.getElementById('text-input').addEventListener('input', function() {
    const aiText = this.value;
    document.getElementById('record-text-input').value = aiText;
});

// 发送音频数据的函数
function sendAudioData(audioBlob) {
    const reader = new FileReader();
    reader.onload = function() {
        const audioData = reader.result;
        socket.emit('audio_data', audioData);
    };
    reader.readAsArrayBuffer(audioBlob);
}
