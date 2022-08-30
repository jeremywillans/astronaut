# astronaut

Webex Bot used to return the RoomId of a Space and then leave.

## Deployment
1. Register a Bot at [Webex Developers](https://developer.webex.com/my-apps) for your Organization
2. Build and Deploy Docker Container (or deploy to Cloud)

    **Note:** Additional Environmental Variables are outlined below

    ```
    > docker build --tag astronaut .
    > docker create --name astronaut \
      -e TOKEN=bot-token-from-developer-dot-webex-dot-com \
      astronaut

3. Verify Docker logs to ensure bot as started successfully.

### Environmental Variables

| Name | Type |  Description
| ---- | ---- | -------
| TOKEN | string | Bot Token
| HOST | string | Remote Host/IP of Destination App
| URI | string | Remote URI of Destination App to send event 
| PORT | int | Remote Port of Destination App
| DELETE | bool | (Optional) Deletes existing entries on startup
| DEBUG | string | `DEBUG=hookbuster*` Used to get Debug output from App

## Support
In case you've found a bug, please [open an issue on GitHub](../../issues).

## Credits
Leverages the [webex-node-bot-framework](https://github.com/WebexSamples/webex-node-bot-framework)

## Disclaimer
This script is NOT guaranteed to be bug free and production quality.