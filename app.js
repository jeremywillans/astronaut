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
    // removeDeviceRegistrationsOnStart: true,
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
  debug(`Error: ${error.message}`);
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

async function processRoom(bot, personId) {
  if (personId) {
    const person = await bot.framework.webex.people.get(personId);
    const buff = Buffer.from(bot.room.id, 'base64');
    const base64 = buff.toString('utf-8');
    const uuid = base64.slice(base64.lastIndexOf('/') + 1);
    await bot.dm(
      personId,
      'html',
      `<a href='webexteams://im?space=${uuid}'>${bot.room.title}</a><blockquote class=info>${bot.room.id}`,
    );
    bot.exit();
    debug(`Space Identification used by ${person.emails[0]}`);
  } else {
    await bot.say(`RoomId: ${bot.room.id}\nBye!`);
    bot.exit();
  }
}

// Handle Spawn Event
framework.on('spawn', (bot, id, addedBy) => {
  if (!addedBy) {
    // don't say anything here or your bots spaces will get
    // spammed every time your server is restarted
    debug(`Execute spawn in existing space called: ${bot.room.title}`);
    if (bot.room.type === 'group') {
      debug(`Execute processing for existing space: ${bot.room.title}`);
      processRoom(bot);
    }
  } else {
    debug('new room');
    // addedBy is the ID of the user who just added our bot to a new space,
    if (bot.room.type === 'group') {
      debug(`Execute spawn processing for space: ${bot.room.title}`);
      processRoom(bot, addedBy);
    }
  }
});

// Respond if not treated in Spawn
framework.hears(/.*/gim, (bot, trigger) => {
  debug(`Execute hears command: ${bot.room.title}`);
  if (bot.room.type === 'group') {
    processRoom(bot, trigger.person.id);
  } else {
    bot.say(
      `Hello ${trigger.person.displayName}!\nAdd me to a Webex Space to tell you the RoomID =)`,
    );
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
    debug(`Framework listening on port ${config.port}`);
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
