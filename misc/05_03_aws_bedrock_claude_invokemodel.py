import boto3
import json
from botocore.exceptions import ClientError

client = boto3.client("bedrock-runtime", region_name="ap-northeast-1")

model_id = 'anthropic.claude-3-5-sonnet-20240620-v1:0'

native_request = {
  "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 2096,
    "temperature": 0.5,
    "messages": [
        {
            "role": "user",
            "content": [{"type": "text", "text": "奈須きのこ氏の代表作、Fateシリーズについて。原作本編の聖杯と、Extraシリーズの聖杯の願望成就の方法の違いは?"}],
        }
    ],
}

request = json.dumps(native_request)

try:
  response = client.invoke_model(modelId=model_id, body=request)
except (ClientError, Exception) as e:
  print(f"ERROR: Can't invoke '{model_id}'. Reason: {e}")
  exit(1)

model_response = json.loads(response["body"].read())

response_text = model_response["content"][0]["text"]
print(response_text)
