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
    const str64 = buff.toString('utf-8');
    const uuid = str64.slice(str64.lastIndexOf('/') + 1);
    await bot.dm(
      personId,
      `webexteams://im?space=${uuid}  \n<blockquote class=info>${bot.room.id}</blockquote>`,
    );
    bot.exit();
    debug(`Space Identification used by ${person.emails[0]}`);
  } else {
    await bot.say(`RoomId: ${bot.room.id}\nBye!`);
    bot.exit();
  }
}

async function base64(bot, trigger) {
  debug('execute base64 function');
  let type = 'unknown';
  let source;
  source = trigger.args[0].trim();
  if (source.includes('webexteams://im?space=')) {
    source = source.replace('webexteams://im?space=', '');
  }
  if (source.match(/^.{8}-.{4}-.{4}-.{4}-.{12}$/g)) {
    type = 'encode';
  }
  if (source.length === 76) {
    type = 'decode';
  }

  let message;
  switch (type) {
    case 'encode': {
      const id = Buffer.from(`ciscospark://us/ROOM/${source}`).toString('base64');
      message = `webexteams://im?space=${source}  \n<blockquote class=info>${id}</blockquote>`;
      break;
    }
    case 'decode': {
      const str64 = Buffer.from(source, 'base64').toString('utf-8');
      const uid = str64.slice(str64.lastIndexOf('/') + 1);
      message = `webexteams://im?space=${uid}  \n<blockquote class=info>${uid}</blockquote>`;
      break;
    }
    default:
      message = 'Unrecognized String, please DM me the RoomID or Space Link for Base64 conversion.';
  }
  bot.say(`${message}`);
  debug(`Bot used by ${trigger.person.emails[0]}`);
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

// Process Messages
framework.hears(/.*/gim, (bot, trigger) => {
  debug(`Execute hears command: ${bot.room.title}`);
  if (bot.room.type === 'group') {
    processRoom(bot, trigger.person.id);
    return;
  }
  // Process Message from DM
  base64(bot, trigger);
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
