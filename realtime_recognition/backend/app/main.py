import os
import shutil
import asyncio
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.model import TranscriptEvent


app = FastAPI()

app.mount("/static", StaticFiles(directory="backend/static"), name="static")

@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
  with open(f"backend/app/audio/{file.filename}", "wb") as buffer:
    shutil.copyfileobj(file.file, buffer)
  return {"filename": file.filename}

@app.get("/")
async def serve_frontend():
  return FileResponse("backend/static/index.html")

@app.websocket("/ws/audio-stream/")
async def audio_stream(websocket: WebSocket):
  await websocket.accept()

  client = TranscribeStreamingClient(region="ap-northeast-1")

  stream = await client.start_stream_transcription(
    language_code="ja-JP",
    media_sample_rate_hz=44100,
    media_encoding="pcm"
  )

  async def audio_generator():
    while True:
      try:
        data = await websocket.receive_bytes()
        await stream.input_stream.send_audio_event(audio_chunk=data)
      except WebSocketDisconnect:
        await stream.input_stream.end_stream()
        break

  async def process_transcription():
    async for event in stream.output_stream:
      print("Received event from AWS Transcribe:", event)  # デバッグ用のログ
      if isinstance(event, TranscriptEvent):
        print("ininstance passed") # デバッグ用のログ
        print("event.transcript.results", event.transcript.results) # デバッグ用のログ
        results = event.transcript.results
        for result in results:
          print("results loop passed") # デバッグ用のログ
          if not result.is_partial:
            transcript = result.alternatives[0].transcript
            print("Sending transcript to WebSocket:", transcript)  # デバッグ用のログ
            await websocket.send_text(transcript)

  try:
    await asyncio.gather(audio_generator(), process_transcription())
  except WebSocketDisconnect:
    print("WebSocket disconnected")
  finally:
    if not websocket.client_state == WebSocketState.DISCONNECTED:
      await websocket.close()