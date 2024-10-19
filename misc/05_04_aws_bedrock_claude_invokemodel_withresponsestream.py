import boto3
import json

client = boto3.client("bedrock-runtime", region_name="ap-northeast-1")

model_id = 'anthropic.claude-3-5-sonnet-20240620-v1:0'

native_request = {
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 1048,
    "temperature": 0.5,
    "messages": [
        {
            "role": "user",
            "content": [{"type": "text", "text": "高見広春の「バトル・ロワイアル」が世間や文化に与えた影響は?"}],
        }
    ],
}

request = json.dumps(native_request)

streaming_response = client.invoke_model_with_response_stream(modelId=model_id, body=request)

for event in streaming_response['body']:
  chunk = json.loads(event["chunk"]["bytes"])
  if chunk["type"] == "content_block_delta":
    print(chunk["delta"].get("text", ""), end="")