import boto3
from botocore.exceptions import ClientError

client = boto3.client("bedrock-runtime", region_name="ap-northeast-1")

model_id = 'anthropic.claude-3-5-sonnet-20240620-v1:0'

conversation = [
  {
    "role": "user",
    # "content": [{"text": "こんにちは、色々とお話ししたいです。よろしくね。"}],
    "content": [{"text": "ディープラーニングの姿勢推定モデルについて、トップダウン型、ボトルアップ型それぞれの詳細な説明と代表的なモデルの提示をお願いします。"}]
  }
]

try:
  streaming_response = client.converse_stream(
    modelId=model_id,
    messages=conversation,
    inferenceConfig={"maxTokens": 4096, "temperature": 0.5, "topP": 0.9}
  )

  for chunk in streaming_response["stream"]:
    if "contentBlockDelta" in chunk:
      text = chunk["contentBlockDelta"]["delta"]["text"]
      print(text, end="")

except (ClientError, Exception) as e:
  print(f"ERROR: Can't invoke '{model_id}'. Reason: {e}")
  exit(1)
