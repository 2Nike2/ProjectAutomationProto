import os
import shutil
import asyncio
import ffmpeg
import io
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.model import TranscriptEvent

app = FastAPI()

@app.websocket("/ws/audio-stream/")
async def audio_stream(websocket: WebSocket):
  await websocket.accept()

  client = TranscribeStreamingClient(region="ap-northeast-1")

  stream = await client.start_stream_transcription(
    language_code="ja-JP",
    media_sample_rate_hz=44100,
    media_encoding="pcm",
  )

  async def audio_generator():
    buffer = bytearray()
    batch_size = 32768

    while True:
      try:
        data = await websocket.receive_bytes()
        buffer.extend(data)

        if len(buffer) >= batch_size:
          print('len(buffer):', len(buffer))
          await stream.input_stream.send_audio_event(audio_chunk=buffer[:batch_size])
          buffer = buffer[batch_size:]

      except WebSocketDisconnect:
        await stream.input_stream.end_stream()
        break

  async def process_transcription():
    async for event in stream.output_stream:
      if isinstance(event, TranscriptEvent):
        results = event.transcript.results
        for result in results:

          if not result.is_partial:
            transcript = result.alternatives[0].transcript
            print(transcript)
            await websocket.send_text(transcript)

  try:
    await asyncio.gather(audio_generator(), process_transcription())
  except WebSocketDisconnect:
    print("WebSocket disconnected")
  finally:
    if not websocket.client_state == WebSocketState.DISCONNECTED:
      await websocket.close()