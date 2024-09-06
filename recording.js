let audioChunks = [];
let recordingInProgress = false;
let mediaRecorder;

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

            document.querySelector('.fa-microphone').style.color = 'red';
            document.getElementById('record-status').textContent = '录音中...';

            mediaRecorder.ondataavailable = function (e) {
                audioChunks.push(e.data);
            };

            mediaRecorder.onstop = function () {
                const audioBlob = new Blob(audioChunks, { 'type': 'audio/wav; codecs=opus' });
                document.getElementById('personal-audio').src = URL.createObjectURL(audioBlob);
                audioChunks = [];
                recordingInProgress = false;

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

function uploadRecording() {
    const personalAudio = document.getElementById('personal-audio');
    if (personalAudio.src) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav; codecs=opus' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'personalRecording.wav');

        fetch('http://localhost:3000/upload', {  // 注意这里的 URL 更改
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
                alert(data.message === 'File successfully uploaded' ? "录音上传成功！" : "录音上传失败。");
            })
            .catch(error => {
                console.error("上传失败:", error);
                alert("上传时出错。");
            });
    } else {
        alert("请先录制音频。");
    }
}
