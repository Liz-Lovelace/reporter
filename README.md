
Reporter function in javascript:
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

Report from curl:
```bash
curl -X POST "http://report.liz-lovelace.com/submit?channel=0" -H "Content-Type: application/json" \
  -d '{
    "reportString": "",
    "reportType": "linux"
  }' &
```

Systemd docker monitor:
Put the code below in `/etc/systemd/system/docker-reporter.service`
```bash
[Unit]
Description=Monitor Docker container stops or crashes and report via curl
After=docker.service
Requires=docker.service

[Service]
ExecStart=/bin/bash -c 'docker events --filter "event=die" | while read event; do \
    container_name=$(echo $event | grep -oP "(?<=container:)[^ ]*"); \
    curl -X POST "https://report.liz-lovelace.com/submit?channel=0" -H "Content-Type: application/json" \
    -d "{\"reportString\": \"Container $container_name has crashed\", \"reportType\": \"docker\"}" & \
    done'

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable docker-reporter.service
sudo systemctl start docker-reporter.service
```

Run the server with docker:

```bash
docker run -d --pull always --name reporter -p 9999:9999 --env-file .env-reporter lizlovelace/reporter
```