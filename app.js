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
    removeDeviceRegistrationsOnStart: true,
    messageFormat: 'markdown',
  };
  if (process.env.WEBHOOK_URL) {
    config.webhookUrl = process.env.WEBHOOK_URL;
    config.port = process.env.PORT || 3000;
    // eslint-disable-next-line operator-linebreak
    config.webhookSecret =
      process.env.SECRET || 'replace-me-with-a-secret-string';
  }
} catch (error) {
  debug(`Error: ${error}`);
}

let app;
// Init Express, if configured
if (config.webhookUrl) {
  app = express();
  app.use(express.json());
}

// Init Framework
const framework = new Framework(config);
framework.start();

// Framework Initialized
framework.on('initialized', () => {
  debug('Framework initialized successfully! [Press CTRL-C to quit]');
});

// Handle Spawn Event
framework.on('spawn', (bot, id, addedBy) => {
  if (!addedBy) {
    // don't say anything here or your bots spaces will get
    // spammed every time your server is restarted
    debug(`Execute spawn in existing space called: ${bot.room.title}`);
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
        debug(`Space Identification used by ${personObject.emails[0]}`);
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
      debug(`Space Identification used by ${personObject.emails[0]}`);
    });
  } else {
    bot.say(`Hello ${trigger.person.displayName}!`);
    debug(`Bot Hello used by ${trigger.person.emails[0]}`);
  }
});

let server;
// Init Server, if configured
if (config.webhookUrl) {
  // Define Express Path for Incoming Webhooks
  app.post('/framework', webhook(framework));

  // Start Express Server
  server = app.listen(config.port, () => {
    framework.debug('Framework listening on port %s', config.port);
  });
}

// Gracefully Shutdown (CTRL+C)
process.on('SIGINT', () => {
  debug('Stopping...');
  if (config.webhookUrl) {
    server.close();
  }
  framework.stop().then(() => {
    process.exit();
  });
});
