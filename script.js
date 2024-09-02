// 选择页面上的元素
const aiAudio = document.getElementById('ai-audio');
const personalAudio = document.getElementById('personal-audio');
let mediaRecorder;
let audioChunks = [];

// 生成AI配音的函数（模拟）
function generateAIVoice() {
    const textInput = document.getElementById('text-input').value;
    if (textInput.trim() === "") {
        alert("Please enter a sentence.");
        return;
    }

    // 模拟生成AI配音
    aiAudio.src = 'ai_voice_sample.mp3'; // 这里你需要提供一个实际的AI生成的音频文件
    aiAudio.play();
}

// 开始录音的函数
function startRecording() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();

            mediaRecorder.ondataavailable = function(e) {
                audioChunks.push(e.data);
            }

            mediaRecorder.onstop = function() {
                const audioBlob = new Blob(audioChunks, { 'type': 'audio/wav; codecs=opus' });
                const audioUrl = URL.createObjectURL(audioBlob);
                personalAudio.src = audioUrl;
                personalAudio.play();
                audioChunks = [];  // 清除音频缓存
            }

            console.log("Recording started");
        }).catch(err => {
            console.error("The following error occurred: " + err);
        });
    } else {
        alert("Your browser does not support audio recording.");
    }
}

// 停止录音的函数
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        console.log("Recording stopped");
    } else {
        alert("Recording has not started yet.");
    }
}

// 上传录音的函数（模拟）
function uploadRecording() {
    if (personalAudio.src) {
        alert("Recording uploaded successfully!");  // 模拟上传成功
        // 这里你可以添加实际的上传逻辑
    } else {
        alert("Please record audio before uploading.");
    }
}

// 重试录音的函数
function retryRecording() {
    personalAudio.src = '';  // 清空个人录音
    alert("You can try recording again.");
}
