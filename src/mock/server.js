const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    // console.log('received: %s', data);
    var things = ['Rock', 'Paper', 'Scissor'];
    var thing = things[Math.floor(Math.random()*things.length)];
    let complete = "// dummy suggestion " + thing;
    console.log("prefixLen: " + getPrefixLen(data));
    console.log("compelete: " + complete);
    let response = JSON.stringify({
      'prefixLen': getPrefixLen(data),
      'complete': complete
    });
    ws.send(response);
  });
});

function getPrefixLen(data) {
  let len = JSON.parse(data).currLineBeforeCursor.toString().length;;
  return 0;
}