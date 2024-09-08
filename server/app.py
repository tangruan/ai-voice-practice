from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from gtts import gTTS
import os
import uuid
import librosa
import numpy as np

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

AUDIO_DIR = os.path.join(os.path.dirname(__file__), '..', 'audio_files')
TEMP_DIR = os.path.join(os.path.dirname(__file__), '..', 'temp')
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'uploads')

for directory in [AUDIO_DIR, TEMP_DIR, UPLOAD_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)

@app.route('/')
def home():
    return "欢迎使用Flask应用！"

@app.route('/generate-voice', methods=['POST'])
def generate_voice():
    try:
        text = request.json.get('text')
        if not text:
            return jsonify({'error': '未提供文本'}), 400

        # 生成新的语音文件
        tts = gTTS(text=text, lang='en')
        audio_filename = f"{uuid.uuid4()}.mp3"
        audio_path = os.path.join(AUDIO_DIR, audio_filename)
        tts.save(audio_path)

        # 返回音频文件的URL
        audio_url = f'/audio/{audio_filename}'
        return jsonify({'audio_url': audio_url}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    return send_from_directory(AUDIO_DIR, filename, mimetype='audio/mpeg')

@socketio.on('connect')
def handle_connect():
    print('客户端已连接')
    emit('info', {'message': '你好！来自服务器的消息！'})

@socketio.on('disconnect')
def handle_disconnect():
    print('客户端已断开连接')

@socketio.on('generateAIVoice')
def handle_generate_ai_voice(data):
    try:
        text = data.get('text')
        if not text:
            emit('error', {'message': '未提供文本'})
            return

        # 检查是否有缓存的音频
        cached_audio_path = os.path.join(AUDIO_DIR, f"{hash(text)}.mp3")
        if os.path.exists(cached_audio_path):
            audio_url = request.host_url + 'audio/' + os.path.basename(cached_audio_path)
            emit('aiVoice', {'audioUrl': audio_url})
            return

        # 生成新的语音文件
        tts = gTTS(text=text, lang='en')
        audio_filename = f"{uuid.uuid4()}.mp3"
        audio_path = os.path.join(AUDIO_DIR, audio_filename)
        tts.save(audio_path)

        audio_url = request.host_url + 'audio/' + audio_filename
        emit('aiVoice', {'audioUrl': audio_url})
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('uploadRecording')
def handle_upload_recording(data):
    try:
        # 处理上传录音的逻辑
        emit('feedback', {'data': '上传录音成功。'})
    except Exception as e:
        emit('error', {'message': str(e)})

def calculate_mfcc(file_path):
    audio, sr = librosa.load(file_path)
    mfcc = librosa.feature.mfcc(audio, sr=sr)
    return np.mean(mfcc, axis=1)

def compare_audio(file1_path, file2_path):
    mfcc1 = calculate_mfcc(file1_path)
    mfcc2 = calculate_mfcc(file2_path)
    distance = np.linalg.norm(mfcc1 - mfcc2)
    similarity = 1 / (1 + distance)  # 将距离转换为0到1之间的相似度
    return similarity

if __name__ == "__main__":
    socketio.run(app, debug=True, port=5000)  # 修改端口为 5000
