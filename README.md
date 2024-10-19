## Reporter function in javascript:
```javascript
/**
 * Sends a report to pager duty
 *
 * @description Best practice is:
 *  - pass message-only if it's not an error
 *  - pass error or error+message if it's an error
 *  - pass userMessage or userMessage+message if it's a user-generated message
 * 
 * You can also pass the error directly or do `.catch(report)` for promises
 *
 * @param {Error|Object} [options]
 * @param {Error|string} [options.error]
 * @param {string} [options.message]
 * @param {string} [options.userMessage]
 */
export function report(options) {
  try {
    if (options.stack) {
      options = { error: options}
    }
    let {message, error, userMessage} = options

    let reportString = '';
    let reportType = 'info'

    if (message) {
      reportString += `${message}\n\n`;
    }

    if (error) {
      if (typeof error === 'string') {
        reportString += error;
      } else if (error.stack && error.stack.includes(error.message)) {
        reportString += error.stack;
      } else {
        reportString += `${error.toString()}\n${error.stack}`;
      }
      reportType = 'runtimeError';
    }

    if (userMessage) {
      reportString += userMessage;
      reportType = 'userMessage';
    }

    console.error(reportString);

    fetch(`https://report.liz-lovelace.com/submit?channel=0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportString, reportType })
    });
  } catch (err) {
    console.error('ERROR WHILE SUBMITTING ERROR:', err);
  }
}
```

## Add this to the top of node.js code (and don't forget to import `report`):
```javascript
process.on('uncaughtException', async (error) => {
  report({error, message: 'Uncaught Exception in node.js'})
  await new Promise(resolve => setTimeout(resolve, 1000))
  process.exit(1)
});

process.on('unhandledRejection', (error) => {
  report({error, message: 'Unhandled Promise Rejection in node.js'})
});
```

## Add this before `app.listen()` in express (will not catch async route errors):
```javascript
app.use((error, req, res, next) => {
  report({error, message: 'Express Error'})
  res.status(500).send('Something broke!')
});
```

## Add this to the top of browser `<script>`:
```javascript
window.addEventListener('unhandledrejection', (error) => {
    report({error: error.reason, message: 'Unhandled Promise Rejection in browser'});
});

window.onerror = function (message, source, lineno, colno, error) {
    report({error, message: 'Uncaught Exception in browser'});
    return true;
};
```

## Report from curl:
```bash
curl -X POST "https://report.liz-lovelace.com/submit?channel=0" -H "Content-Type: application/json" \
  -d '{
    "reportString": "",
    "reportType": "linux"
  }' &
```

## Systemd docker monitor:

Script to monitor docker container crashes:
```bash
#!/bin/bash

docker events --filter "event=die" | while read event
do
    error_log="$event"

    json_data=$(printf "{\"reportString\": \"%s\", \"reportType\": \"docker\"}" "$error_log")

    curl -X POST "https://report.liz-lovelace.com/submit?channel=0" \
    -H "Content-Type: application/json" \
    -d "$json_data"
done
```

Then you can run the script with systemd:
```bash
[Unit]
Description=Report when a Docker container dies
After=docker.service
Requires=docker.service

[Service]
ExecStart=/usr/local/bin/docker-reporter.sh

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

And launch the service:
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker-reporter.service
```

## Run the server with docker:
```bash
docker run -d --pull always --name reporter -p 9999:9999 --env-file .env-reporter lizlovelace/reporter
```
