import asyncio
import boto3
from botocore.exceptions import ClientError
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect, Form
from fastapi.websockets import WebSocketState
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.model import TranscriptEvent
from pydantic import BaseModel

app = FastAPI()

# CORSの設定を追加
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 許可するオリジンを指定（* で全て許可も可）
    allow_credentials=True,
    allow_methods=["*"],  # 全てのHTTPメソッドを許可
    allow_headers=["*"],  # 全てのヘッダーを許可
)

bedrock_model_id = 'anthropic.claude-3-5-sonnet-20240620-v1:0'
# bedrock_model_id = 'anthropic.claude-3-haiku-20240307-v1:0'
bedrock_client = boto3.client("bedrock-runtime", region_name="ap-northeast-1")

# 会話履歴
conversation_history = []


# システムプロンプト
system_prompt = '''\
- 下記のような会話と関係ない言葉のみの入力については「NoResponseNeeded」という文字列を返してください。
  -「あの」、「えーと」などのつなぎ言葉
  -「うーん、」「おっと」、「しまった」などの独り言
  -「はあ」、「ふぅ」などの息
- 軽いお喋りチャットなので返答は十数語程度、また音声合成ソフトに文字列を渡すので感じを使わずひらがなカタカナのみで返してください。
'''
class PromptData(BaseModel):
    system_prompt: str
@app.post("/change-system-prompt/")
def change_system_prompt(data: PromptData):
  global system_prompt
  system_prompt = data.system_prompt
  print(system_prompt)
  return {"message": "System prompt changed successfully"}

@app.websocket("/ws/audio-stream/")
async def audio_stream(websocket: WebSocket):
  await websocket.accept()

  transcripbe_client = TranscribeStreamingClient(region="ap-northeast-1")

  stream = await transcripbe_client.start_stream_transcription(
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
            user_message = {
                "role": "user",
                "content": [{"text": transcript}]
              }
            conversation_history.append(user_message)
            await websocket.send_json(user_message)
            
            try:

              response = bedrock_client.converse(
                modelId=bedrock_model_id,
                system=[{'text': system_prompt}],
                messages=conversation_history,
                inferenceConfig={"maxTokens": 256, "temperature": 0.5, "topP": 0.9},
              )
              response_text = response["output"]["message"]["content"][0]["text"]

              assistant_message = {
                  "role": "assistant",
                  "content": [{"text": response_text}]
                }
              conversation_history.append(assistant_message)
              await websocket.send_json(assistant_message)

              # streaming_response = bedrock_client.converse_stream(
              #   modelId=bedrock_model_id,
              #   messages=conversation_history,
              #   inferenceConfig={"maxTokens": 4096, "temperature": 0.5, "topP": 0.9}
              # )

              # for chunk in streaming_response["stream"]:
              #   if "contentBlockDelta" in chunk:
              #     text = chunk["contentBlockDelta"]["delta"]["text"]
              #     print(text, end="")

            except (ClientError, Exception) as e:
              print(e)

  try:
    await asyncio.gather(audio_generator(), process_transcription())
  except WebSocketDisconnect:
    print("WebSocket disconnected")
  finally:
    if not websocket.client_state == WebSocketState.DISCONNECTED:
      await websocket.close()