from flask import Flask, request, jsonify, send_file
from gtts import gTTS
from flask_cors import CORS
import os
import uuid

app = Flask(__name__)
CORS(app)

AUDIO_DIR = "audio_files"
if not os.path.exists(AUDIO_DIR):
    os.makedirs(AUDIO_DIR)

@app.route('/')
def home():
    return "Welcome to the Flask app!"

@app.route('/generate-voice', methods=['POST'])
def generate_voice():
    try:
        text = request.json.get('text')
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        tts = gTTS(text=text, lang='en')
        audio_filename = f"{uuid.uuid4()}.mp3"
        audio_path = os.path.join(AUDIO_DIR, audio_filename)
        
        tts.save(audio_path)
        
        audio_url = request.host_url + 'audio/' + audio_filename
        
        return jsonify({'audio_url': audio_url}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    audio_path = os.path.join(AUDIO_DIR, filename)
    if os.path.exists(audio_path):
        return send_file(audio_path, as_attachment=True)
    else:
        return jsonify({'error': 'File not found'}), 404

if __name__ == "__main__":
    app.run(debug=True)
