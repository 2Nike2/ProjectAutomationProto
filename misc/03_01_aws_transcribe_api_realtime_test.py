"""Check AWS Transcribe API REALTIME streaming transcription."""

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


async def basic_transcribe():
    """Set up our client with your chosen Region."""
    client = TranscribeStreamingClient(region="ap-northeast-1")

    stream = await client.start_stream_transcription(
        language_code="ja-JP",
        media_sample_rate_hz=44100,
        media_encoding="pcm",
    )

    async def write_chunks():
        """Write chunks to stream."""
        p = pyaudio.PyAudio()
        stream_in = p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=44100,
            input=True,
            frames_per_buffer=1024,
        )

        while True:
            data = stream_in.read(1024)
            await stream.input_stream.send_audio_event(audio_chunk=data)

    handler = MyEventHandler(stream.output_stream)
    await asyncio.gather(write_chunks(), handler.handle_events())


loop = asyncio.get_event_loop()
loop.run_until_complete(basic_transcribe())
loop.close()
