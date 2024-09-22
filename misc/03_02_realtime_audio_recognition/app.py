"""Demonstrate real-time audio recognition using Amazon Transcribe Streaming API."""

import asyncio

import pyaudio
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.handlers import TranscriptResultStreamHandler
from amazon_transcribe.model import TranscriptEvent
from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = "your_secret_key"
socketio = SocketIO(app, async_mode=None)


class MyEventHandler(TranscriptResultStreamHandler):
    """Handle the transcription event."""

    async def handle_transcript_event(self, transcript_event: TranscriptEvent):
        """Handle the transcription event."""
        results = transcript_event.transcript.results
        for result in results:
            for alt in result.alternatives:
                print(alt.transcript)
                socketio.emit("transcript", {"text": alt.transcript})


async def basic_transcribe():
    """Start a stream transcription."""
    try:
        client = TranscribeStreamingClient(region="ap-northeast-1")
        stream = await client.start_stream_transcription(
            language_code="ja-JP",
            media_sample_rate_hz=44100,
            media_encoding="pcm",
        )

        async def write_chunks():
            p = pyaudio.PyAudio()
            stream_in = p.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=44100,
                input=True,
                frames_per_buffer=4096,
            )
            try:
                while True:
                    data = stream_in.read(1024)
                    await stream.input_stream.send_audio_event(audio_chunk=data)
            except asyncio.CancelledError:
                # キャンセルされた場合は、すべてのリソースを解放
                stream_in.stop_stream()
                stream_in.close()
                p.terminate()
                await stream.input_stream.end_stream()
                raise

        handler = MyEventHandler(stream.output_stream)
        await asyncio.gather(write_chunks(), handler.handle_events())

    except asyncio.CancelledError:
        await stream.input_stream.end_stream()


@app.route("/")
def index():
    """Return the index page."""
    return render_template("index.html")


@socketio.on("start_transcription")
def handle_start_transcription_event(data):
    """Start the transcription."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(basic_transcribe())


@socketio.on("stop_transcription")
def handle_stop_transcription_event(data):
    """Stop the transcription."""
    loop = asyncio.get_event_loop()
    for task in asyncio.all_tasks(loop):
        task.cancel()
    emit("transcript", {"text": "音声認識が停止されました。"})


if __name__ == "__main__":
    socketio.run(app, debug=True, use_reloader=False)
