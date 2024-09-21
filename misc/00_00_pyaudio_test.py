"""Record audio and save it to a WAV file."""

import wave

import pyaudio

# 録音設定
FORMAT = pyaudio.paInt16  # 16-bit resolution
CHANNELS = 1  # モノラル録音
RATE = 44100  # 44.1kHzサンプリングレート
CHUNK = 1024  # 1024サンプルごとのチャンク
RECORD_SECONDS = 5  # 録音時間（秒）
OUTPUT_FILENAME = "output.wav"  # 出力ファイル名

# PyAudioインスタンスの生成
audio = pyaudio.PyAudio()

# 録音開始
stream = audio.open(
    format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK
)
print("録音開始...")

frames = []

for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
    data = stream.read(CHUNK)
    frames.append(data)

print("録音終了")

# 録音の停止とストリームの終了
stream.stop_stream()
stream.close()
audio.terminate()

# 録音データをWAVファイルに保存
wavefile = wave.open(OUTPUT_FILENAME, "wb")
wavefile.setnchannels(CHANNELS)
wavefile.setsampwidth(audio.get_sample_size(FORMAT))
wavefile.setframerate(RATE)
wavefile.writeframes(b"".join(frames))
wavefile.close()

print(f"録音が完了しました。'{OUTPUT_FILENAME}'として保存されました。")
