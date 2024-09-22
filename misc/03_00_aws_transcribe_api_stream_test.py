"""Check AWS Transcribe API streaming transcription.

Notes:
    The standard AWS SDK for Python (Boto3) does not support streaming with
    Amazon Transcribe.

    See more detail here:
    https://docs.aws.amazon.com/ja_jp/transcribe/latest/dg/getting-started-sdk.html
    https://github.com/awslabs/amazon-transcribe-streaming-sdk
"""

import asyncio

# This example uses aiofile for asynchronous file reads.
# It's not a dependency of the project but can be installed
# with `pip install aiofile`.
import aiofile
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

    # Start transcription to generate async stream
    stream = await client.start_stream_transcription(
        language_code="ja-JP",
        media_sample_rate_hz=44100,
        media_encoding="pcm",
    )

    async def write_chunks():
        """Write chunks to stream.

        Notes: For pre-recorded files longer than 5 minutes, the sent audio
        chunks should be rate limited to match the real-time bitrate of the
        audio stream to avoid signing issues.
        """
        async with aiofile.AIOFile("example.wav", "rb") as afp:
            reader = aiofile.Reader(afp, chunk_size=1024 * 16)
            async for chunk in reader:
                await stream.input_stream.send_audio_event(audio_chunk=chunk)
        await stream.input_stream.end_stream()

    # Instantiate our handler and start processing events
    handler = MyEventHandler(stream.output_stream)
    await asyncio.gather(write_chunks(), handler.handle_events())


loop = asyncio.get_event_loop()
loop.run_until_complete(basic_transcribe())
loop.close()
