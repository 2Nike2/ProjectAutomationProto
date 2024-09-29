import asyncio
import pyaudio
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.handlers import TranscriptResultStreamHandler
from amazon_transcribe.model import TranscriptEvent


class MyEventHandler(TranscriptResultStreamHandler):
    """Handle transcript event."""

    async def handle_transcript_event(self, transcript_event: TranscriptEvent):
        """Handle transcriptions from Amazon Transcribe."""
        results = transcript_event.transcript.results
        for result in results:
            for alt in result.alternatives:
                print(alt.transcript)


class Transcriber:
    """Handles audio streaming to AWS Transcribe."""

    def __init__(self, region: str, language_code: str, sample_rate: int = 44100):
        self.client = TranscribeStreamingClient(region=region)
        self.language_code = language_code
        self.sample_rate = sample_rate

    async def start(self):
        """Start transcription stream."""
        # AWS Transcribe ストリームを開始
        self.stream = await self.client.start_stream_transcription(
            language_code=self.language_code,
            media_sample_rate_hz=self.sample_rate,
            media_encoding="pcm",
        )

        # ハンドラをセットアップ
        handler = MyEventHandler(self.stream.output_stream)

        # 音声データをストリーミングで送信
        await asyncio.gather(self._write_chunks(), handler.handle_events())

    async def _write_chunks(self):
        """Write chunks to stream from microphone."""
        p = pyaudio.PyAudio()

        # PyAudioストリームを開く
        stream_in = p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=self.sample_rate,
            input=True,
            frames_per_buffer=1024,
        )

        try:
            # 音声データを取得してTranscribeに送信
            while True:
                data = stream_in.read(1024)
                await self.stream.input_stream.send_audio_event(audio_chunk=data)

        finally:
            # ストリームとPyAudioオブジェクトを閉じる
            stream_in.close()
            p.terminate()


async def main():
    transcriber = Transcriber(region="ap-northeast-1", language_code="ja-JP")
    await transcriber.start()


if __name__ == "__main__":
    asyncio.run(main())
