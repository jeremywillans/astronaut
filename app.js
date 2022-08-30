const Framework = require('webex-node-bot-framework');
const webhook = require('webex-node-bot-framework/webhook');
const express = require('express');
const logger = require('./logger')('app');

let config;
// Load Config
try {
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
  logger.error(`Error: ${error.message}`);
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
  logger.info('Framework initialized successfully! [Press CTRL-C to quit]');
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
    logger.debug(`Space Identification used by ${person.emails[0]}`);
  } else {
    await bot.say(`RoomId: ${bot.room.id}\nBye!`);
    bot.exit();
  }
}

async function base64(bot, trigger) {
  logger.debug('execute base64 function');
  let type = 'unknown';
  let source;
  let includeLink = true;
  source = trigger.args[0].trim();
  if (source.includes('webexteams://im?space=')) {
    source = source.replace('webexteams://im?space=', '');
    includeLink = true;
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
      message = `<blockquote class=info>${id}</blockquote>`;
      if (includeLink) {
        message = `webexteams://im?space=${source}  \n${message}`;
      }
      logger.debug({ message: `action=decode email=${trigger.person.userName}`, labels: { type: 'event' } });
      break;
    }
    case 'decode': {
      const str64 = Buffer.from(source, 'base64').toString('utf-8');
      const uid = str64.slice(str64.lastIndexOf('/') + 1);
      message = `webexteams://im?space=${uid}  \n<blockquote class=info>${uid}</blockquote>`;
      logger.debug({ message: `action=decode email=${trigger.person.userName}`, labels: { type: 'event' } });
      break;
    }
    default:
      message = 'Unrecognized Format, please use `help` for more information.';
  }
  bot.reply(trigger.message.id, `${message}`);
}

// Handle Spawn Event
framework.on('spawn', (bot, id, addedBy) => {
  if (!addedBy) {
    // don't say anything here or your bots spaces will get
    // spammed every time your server is restarted
    if (bot.room.type === 'group') {
      logger.debug(`Execute processing for existing space: ${bot.room.title}`);
      processRoom(bot);
      return;
    }
    logger.debug(`Execute spawn in existing space called: ${bot.room.title}`);
  } else {
    logger.debug('new room');
    // addedBy is the ID of the user who just added our bot to a new space,
    if (bot.room.type === 'group') {
      logger.debug(`Execute spawn processing for space: ${bot.room.title}`);
      processRoom(bot, addedBy);
    }
  }
});

// Process Messages
framework.hears(/.*/gim, async (bot, trigger) => {
  logger.debug(`Execute hears command: ${bot.room.title}`);
  if (bot.room.type === 'group') {
    processRoom(bot, trigger.person.id);
    return;
  }
  // Match on hello/help inputs
  if (trigger.args[0].match(/(hello|help)/i)) {
    const person = await bot.framework.webex.people.get(trigger.person.id);
    const identifier = person.displayName;
    const message = `Hello ${identifier}!\n\nI am a simple bot used to encode/decode Webex Space Identifiers used primarily for Webex API Development\n\nI support the following use cases:\n\n- Add me to a group space and I will 1:1 you the associated RoomId! (and leave the space)\n- 1:1 me a Webex Space link -> Use the @mention feature, or manually beginning with \`webexteams://im?space=xxx\`\n- 1:1 me a Webex Space identifier -> Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\n- 1:1 me a Webex RoomId -> Format: Y2lzY29zcGFyazov.......\n\nIf interested, you can find the source code [here](https://github.com/jeremywillans/astronaut)!`;
    // Send Intro Message
    bot.say(message);
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
    logger.info(`Framework listening on port ${config.port}`);
  });
}

// Gracefully Shutdown (CTRL+C)
process.on('SIGINT', () => {
  logger.info('Stopping...');
  if (config.webhookUrl) {
    server.close();
  }
  framework.stop().then(() => {
    process.exit();
  });
});
