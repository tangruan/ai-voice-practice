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

        // 添加以下代码来初始化文章列表
        initializeArticlesList();
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

        showLoading();
        fetch('http://localhost:5000/generate-voice', {  // 修改端口为 5000
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textInput })
        })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.audio_url) {
                    const audioUrl = `http://localhost:5000${data.audio_url}`;  // 修改端口为 5000
                    aiAudio.src = audioUrl;
                    aiAudio.play();
                    if (aiWavesurfer) {
                        aiWavesurfer.load(audioUrl);
                    }
                } else {
                    alert("AI配音生成失败。");
                }
            })
            .catch(error => {
                console.error("错误:", error);
                hideLoading();
                alert("生成AI配音时出错。");
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

            showLoading();

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
                    hideLoading();
                    console.log("服务器响应:", data); // 添加这行来查看服务器响应
                    if (data.message === 'File successfully uploaded') {
                        alert("录音上传成功！");
                        if (data.feedback) {
                            if (Array.isArray(data.feedback)) {
                                displayFeedback(data.feedback);
                            } else if (typeof data.feedback === 'string') {
                                displayFeedback([data.feedback]);
                            } else {
                                console.error("未收到预期的反馈数据格式");
                                displayFeedback(["暂无具体反馈。"]);
                            }
                        } else {
                            console.error("未收到反馈数据");
                            displayFeedback(["暂无具体反馈。"]);
                        }
                    } else {
                        alert("录音上传失败。");
                    }
                })
                .catch(error => {
                    hideLoading();
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

        if (!feedbackElement || !tipsList) {
            console.error('未找到反馈显示元素');
            return;
        }

        feedbackElement.textContent = "基于分析的反馈和建议：";
        tipsList.innerHTML = ''; // 清空现有的提示

        if (Array.isArray(feedback) && feedback.length > 0) {
            feedback.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = tip;
                tipsList.appendChild(li);
            });
        } else {
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

    // 添加以下函数来初始化文章列表
    function initializeArticlesList() {
        const articles = [
            { name: "Life Is Not Perfect", url: "https://gist.githubusercontent.com/tangruan/43ef1a512c296afe022233662d9b5f7a/raw/5eef715e78926bd8d8d35a54f90eed532ba363b9/Life%2520Is%2520%2520Perfect" },
            { name: "Time doesn't wait", url: "https://gist.githubusercontent.com/tangruan/18cd4471dba701dcc8babab16ee99a70/raw/1e6efa996797f00d9392395779d9ba330a08ce47/Time%2520doesn't%2520wait" },
            { name: "Always Follow Your Heart", url: "https://gist.githubusercontent.com/tangruan/e88f274684748c740400867cd64d6dbf/raw/66fc88e36d4ff63b5e211660c262864191e9fa21/Always%2520Follow%2520Your%2520Heart" }
        ];

        const articlesList = document.getElementById('articles-list');
        articles.forEach(article => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${article.name}
                <button onclick="addArticleToTextInput('${article.url}')">添加</button>
            `;
            articlesList.appendChild(li);
        });
    }

    // 添加以下函数来处理添加文章到文本框
    function addArticleToTextInput(url) {
        fetch(url)
            .then(response => response.text())
            .then(text => {
                document.getElementById('text-input').value = text;
            })
            .catch(error => {
                console.error('获取文章内容时出错:', error);
                alert('无法加载文章内容,请稍后再试。');
            });
    }

    return {
        init,
        generateAIVoice,
        startRecording,
        stopRecording,
        uploadRecording,
        retryRecording,
        addArticleToTextInput // 添加这个新函数
    };
})();

// 确保 AudioApp 被添加到全局作用域
window.AudioApp = AudioApp;

// 不再在这里直接调用 AudioApp.init()
