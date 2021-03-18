var Framework = require('webex-node-bot-framework'); 
var webhook = require('webex-node-bot-framework/webhook');
var config;

// Load JSON from Config Directory
try {
  if (process.env.NODE_ENV === 'production') {
   config = require("/config/config.json");
  } else {
   config = require("./config.json");
  }
} catch (error) {
  console.debug(`Error: ${error}`);
}
//const config = require("./config.json");

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());

// init framework
var framework = new Framework(config);
framework.start();

// An initialized event means your webhooks are all registered and the 
// framework has created a bot object for all the spaces your bot is in
framework.on("initialized", function () {
  framework.debug("Framework initialized successfully! [Press CTRL-C to quit]");
});

// A spawn event is generated when the framework finds a space with your bot in it
// You can use the bot object to send messages to that space
// The id field is the id of the framework
// If addedBy is set, it means that a user has added your bot to a new space
// Otherwise, this bot was in the space before this server instance started
framework.on('spawn', function (bot, id, addedBy) {
  if (!addedBy) {
    // don't say anything here or your bot's spaces will get 
    // spammed every time your server is restarted
    framework.debug(`Framework created an object for an existing bot in a space called: ${bot.room.title}`);
  } else {
    // addedBy is the ID of the user who just added our bot to a new space, 
    if (bot.room.type === 'group') {
      bot.framework.webex.people.get(addedBy).then((personObject) => {
        bot.say(`RoomId: ${bot.room.id}\nBye!`).then(() => bot.exit());
        bot.dm(config.ownerId,`Space Identification used by ${personObject.emails[0]}`)
      });
    }
  }
});

// define express path for incoming webhooks
app.post('/framework', webhook(framework));

// start express server
var server = app.listen(config.port, function () {
  framework.debug('Framework listening on port %s', config.port);
});

// gracefully shutdown (ctrl-c)
process.on('SIGINT', function() {
  framework.debug('stoppping...');
  server.close();
  framework.stop().then(function() {
    process.exit();
  });
});