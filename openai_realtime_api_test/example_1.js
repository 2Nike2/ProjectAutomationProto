import WebSocket from 'ws';

const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
const ws = new WebSocket(url, {
  headers: {
    "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
    "OpenAI-Beta": "realtime=v1"
  }
});

ws.on("open", () => {
  console.log("Connected to server.");
  ws.send(JSON.stringify({
    type: "session.update",
    "session": {
      "modalities": ["text"]
    }
  }));
  // ws.send(JSON.stringify({
  //   type: "response.create",
  //   response: {
  //     modalities: ["text"],
  //     // instructions: "What is the most highest mountain in Japan?"
  //     instructions: "Please assist the user."
  //   }
  // }));

  ws.send(JSON.stringify({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: '日本で一番高い山は?'
        }
      ]
    }
  }));
  ws.send(JSON.stringify({type: 'response.create'}))


});

ws.on("message", (message) => {
  const event = JSON.parse(message.toString())
  // console.log(event);
  // console.log(event["type"]);

  if(event["type"] === 'response.done'){
    console.log(event['response']['output'][0]['content'][0]['text'])
  }

})