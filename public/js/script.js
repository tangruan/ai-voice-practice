const AudioApp = (function () {
    let aiAudio, personalAudio, mediaRecorder, audioChunks = [];
    let aiWavesurfer, personalWavesurfer;
    let socket;

    function init() {
        aiAudio = document.getElementById('ai-audio');
        personalAudio = document.getElementById('personal-audio');

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

        bindEventListeners();

        // 使用全局 socket 对象
        if (window.socket) {
            socket = window.socket;
            setupSocketListeners();
        } else {
            console.error('全局 socket 对象未找到');
            return;
        }

        // 初始化 AI 语音功能
        if (typeof initAiVoice === 'function') {
            initAiVoice();
        } else {
            console.error('initAiVoice 函数未定义');
        }
    }

    function setupSocketListeners() {
        socket.on('aiVoice', handleAIVoice);
        socket.on('feedback', handleFeedback);
    }

    function bindEventListeners() {
        document.querySelector('button[onclick="AudioApp.generateAIVoice()"]').onclick = generateAIVoice;
        document.querySelector('button[onclick="AudioApp.startRecording()"]').onclick = startRecording;
        document.querySelector('button[onclick="AudioApp.stopRecording()"]').onclick = stopRecording;
        document.querySelector('button[onclick="AudioApp.uploadRecording()"]').onclick = uploadRecording;
        document.querySelector('button[onclick="AudioApp.retryRecording()"]').onclick = retryRecording;
    }

    function generateAIVoice() {
        const textInput = document.getElementById('text-input').value;
        if (textInput.trim() === "") {
            alert("请输入文本或上传文本文件。");
            return;
        }

        const cachedAudio = localStorage.getItem(textInput);
        if (cachedAudio) {
            aiAudio.src = cachedAudio;
            aiAudio.play();
            if (aiWavesurfer) {
                aiWavesurfer.load(cachedAudio);
            }
            return;
        }

        showLoading();
        fetch('http://127.0.0.1:3000/generate-voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textInput })
        })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.audio_url) {
                    const absoluteUrl = new URL(data.audio_url, 'http://127.0.0.1:3000').href;
                    aiAudio.src = absoluteUrl;
                    aiAudio.play();
                    if (aiWavesurfer) {
                        aiWavesurfer.load(absoluteUrl);
                    }
                    localStorage.setItem(textInput, absoluteUrl);
                } else {
                    alert("AI配音生成失败。");
                }
            })
            .catch(error => {
                console.error("错误:", error);
                hideLoading();
            });
    }

    function startRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('您的浏览器不支持录音功能');
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { 'type': 'audio/wav; codecs=opus' });
                    personalAudio.src = URL.createObjectURL(audioBlob);
                    personalWavesurfer.load(personalAudio.src);
                    audioChunks = [];
                };
                mediaRecorder.start();

                const microphoneIcon = document.querySelector('.fa-microphone');
                if (microphoneIcon) {
                    microphoneIcon.style.color = 'red';
                }

                const recordStatus = document.getElementById('record-status');
                if (recordStatus) {
                    recordStatus.textContent = '录音中...';
                } else {
                    console.warn('未找到 record-status 元素');
                }
            })
            .catch(err => {
                console.error("录音错误: " + err);
                alert("无法访问麦克风。请确保您已授予权限。");
            });
    }

    function stopRecording() {
        if (mediaRecorder) {
            mediaRecorder.stop();
            const microphoneIcon = document.querySelector('.fa-microphone');
            if (microphoneIcon) {
                microphoneIcon.style.color = '';
            }
            const recordStatus = document.getElementById('record-status');
            if (recordStatus) {
                recordStatus.textContent = '录音已停止';
            } else {
                console.warn('未找到 record-status 元素');
            }
        }
    }

    function uploadRecording() {
        const personalAudio = document.getElementById('personal-audio');
        if (personalAudio.src) {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav; codecs=opus' });
            const formData = new FormData();
            formData.append('file', audioBlob, 'personalRecording.wav');

            fetch('http://localhost:3000/upload', {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    alert("录音上传成功！");
                    // 显示反馈
                    if (data && data.feedback) {
                        displayFeedback(data.feedback);
                    } else {
                        displayFeedback([]); // 传递空数组作为默认值
                    }
                })
                .catch(error => {
                    console.error("上传失败:", error);
                    alert("上传时出错。");
                });
        } else {
            alert("请先录制音频。");
        }
    }

    function displayFeedback(feedback) {
        const analysisSection = document.getElementById('analysis');
        const feedbackElement = analysisSection.querySelector('#analysis-feedback');
        const tipsList = analysisSection.querySelector('#improvement-tips');

        feedbackElement.textContent = "基于分析的反馈和建议：";
        tipsList.innerHTML = ''; // 清空现有的提示

        if (Array.isArray(feedback) && feedback.length > 0) {
            feedback.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = tip;
                tipsList.appendChild(li);
            });
        } else {
            // 如果 feedback 不是数组或为空，显示一个默认消息
            const li = document.createElement('li');
            li.textContent = "暂无具体反馈。";
            tipsList.appendChild(li);
        }

        // 滚动到分析部分
        analysisSection.scrollIntoView({ behavior: 'smooth' });
    }

    function handleAIVoice(data) {
        aiAudio.src = data.audioUrl;
        aiAudio.play();
        aiWavesurfer.load(data.audioUrl);
    }

    function handleFeedback(data) {
        const feedbackElement = document.getElementById('feedback');
        feedbackElement.textContent = data.message;
    }

    function showLoading() {
        // 显示加载动画或指示器
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
    }

    function hideLoading() {
        // 隐藏加载动画或指示器
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    function retryRecording() {
        // 重置录音相关的状态
        audioChunks = [];
        const personalAudio = document.getElementById('personal-audio');
        personalAudio.src = '';

        // 重置录音状态显示
        const microphoneIcon = document.querySelector('.fa-microphone');
        if (microphoneIcon) {
            microphoneIcon.style.color = '';
        }

        const recordStatus = document.getElementById('record-status');
        if (recordStatus) {
            recordStatus.textContent = '准备录音';
        }

        // 可以在这里添加其他需要重置的元素或状态
    }

    return {
        init,
        generateAIVoice,
        startRecording,
        stopRecording,
        uploadRecording,
        retryRecording
    };
})();

// 确保 AudioApp 被添加到全局作用域
window.AudioApp = AudioApp;

// 不再在这里直接调用 AudioApp.init()
