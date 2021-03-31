const Framework = require('webex-node-bot-framework');
const webhook = require('webex-node-bot-framework/webhook');
const debug = require('debug')('astronaut:app');
const dotenv = require('dotenv');
const express = require('express');

let config;
// Load Config
try {
  // Try Load from ENV
  if (process.env.TOKEN) {
    debug('Load from ENV');
  } else {
    debug('Load from .env');
    dotenv.config();
  }
  config = {
    token: process.env.TOKEN,
    ownerId: process.env.OWNER_ID,
  };
  if (process.env.WEBHOOK_URL) {
    config.webhookUrl = process.env.WEBHOOK_URL;
    config.port = process.env.PORT || 3000;
    config.webhookSecret = process.env.SECRET || 'replacemwithasecretstring';
  }
} catch (error) {
  debug(`Error: ${error}`);
}

// init express
const app = express();
app.use(express.json());

// init framework
const framework = new Framework(config);
framework.start();

// An initialized event means your webhooks are all registered and the
// framework has created a bot object for all the spaces your bot is in
framework.on('initialized', () => {
  framework.debug('Framework initialized successfully! [Press CTRL-C to quit]');
});

// A spawn event is generated when the framework finds a space with your bot in it
// You can use the bot object to send messages to that space
// The id field is the id of the framework
// If addedBy is set, it means that a user has added your bot to a new space
// Otherwise, this bot was in the space before this server instance started
framework.on('spawn', (bot, id, addedBy) => {
  if (!addedBy) {
    // don't say anything here or your bot's spaces will get
    // spammed every time your server is restarted
    framework.debug(
      `Framework created an object for an existing bot in a space called: ${bot.room.title}`,
    );
    if (bot.room.type === 'group') {
      debug(`Execute processing for existing space: ${bot.room.title}`);
      bot.say(`RoomId: ${bot.room.id}\nBye!`).then(() => bot.exit());
    }
  } else {
    debug('new room');
    // addedBy is the ID of the user who just added our bot to a new space,
    if (bot.room.type === 'group') {
      debug(`Execute spawn processing for space: ${bot.room.title}`);
      bot.framework.webex.people.get(addedBy).then((personObject) => {
        bot.say(`RoomId: ${bot.room.id}\nBye!`).then(() => bot.exit());
        bot.dm(
          config.ownerId,
          `Space Identification used by ${personObject.emails[0]}`,
        );
      });
    }
  }
});

// Respond if not treated in Spawn
framework.hears(/.*/gim, (bot, trigger) => {
  debug(`Execute hears command: ${bot.room.title}`);
  if (bot.room.type === 'group') {
    bot.framework.webex.people.get(trigger.person.id).then((personObject) => {
      bot.say(`RoomId: ${bot.room.id}\nBye!`).then(() => bot.exit());
      bot.dm(
        config.ownerId,
        `Space Identification used by ${personObject.emails[0]}`,
      );
    });
  } else {
    bot.say('Hello %s!', trigger.person.displayName);
    bot.framework.webex.people.get(trigger.person.id).then((personObject) => {
      bot.dm(config.ownerId, `Bot Hello used by ${personObject.emails[0]}`);
    });
  }
});

// define express path for incoming webhooks
app.post('/framework', webhook(framework));

// start express server
const server = app.listen(config.port, () => {
  framework.debug('Framework listening on port %s', config.port);
});

// gracefully shutdown (ctrl-c)
process.on('SIGINT', () => {
  framework.debug('stoppping...');
  server.close();
  framework.stop().then(() => {
    process.exit();
  });
});
