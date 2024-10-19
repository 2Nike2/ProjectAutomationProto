import boto3

bedrock = boto3.client('bedrock-runtime', region_name='ap-northeast-1')


conversation = [{"role": "user", "content": [{"text": "こんにちは、よろしくね。"}]}]

model_id = 'anthropic.claude-3-5-sonnet-20240620-v1:0'

response = bedrock.converse(
  modelId=model_id,
  messages=conversation,
  inferenceConfig={"maxTokens": 512, "temperature": 0.5, "topP": 0.9},
)
response_text = response["output"]["message"]["content"][0]["text"]

print(response_text)