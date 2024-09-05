let audioChunks = [];
let recordingInProgress = false;
let mediaRecorder;

// 统一控制录音状态
function startRecording() {
    if (recordingInProgress) {
        alert("录音已在进行中。");
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();
        recordingInProgress = true;

        // 更新UI以显示录音状态
        document.querySelector('.fa-microphone').style.color = 'red';
        document.getElementById('record-status').textContent = '录音中...';

        mediaRecorder.ondataavailable = function(e) {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = function() {
            const audioBlob = new Blob(audioChunks, { 'type': 'audio/wav; codecs=opus' });
            const audioUrl = URL.createObjectURL(audioBlob);
            document.getElementById('personal-audio').src = audioUrl;
            audioChunks = [];
            recordingInProgress = false;

            // 恢复UI
            document.querySelector('.fa-microphone').style.color = '';
            document.getElementById('record-status').textContent = '录音已停止';
        };
    })
    .catch(err => {
        console.error("录音错误: " + err);
        alert("无法访问麦克风。请确保您已授予权限。");
        recordingInProgress = false;
    });
}

// function stopRecording() {
//     if (mediaRecorder && mediaRecorder.state === "recording") {
//         mediaRecorder.stop();
//     } else {
//         alert("录音尚未开始。");
//     }
// }

function uploadRecording() {
    const personalAudio = document.getElementById('personal-audio');
    if (personalAudio.src) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav; codecs=opus' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'personalRecording.wav');

        fetch('http://127.0.0.1:5000/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'File successfully uploaded') {
                alert("录音上传成功！");
            } else {
                alert("录音上传失败。");
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

// 清理 localStorage
function clearLocalStorage() {
    localStorage.clear(); // 清除所有的缓存数据
}

// 调用清理函数，例如在页面加载时
window.addEventListener('load', function() {
    clearLocalStorage();
});

// 当AI角色配音文本框的内容变化时，自动同步到个人录音文本框
document.getElementById('text-input').addEventListener('input', function() {
    const aiText = this.value;
    document.getElementById('record-text-input').value = aiText;
});
