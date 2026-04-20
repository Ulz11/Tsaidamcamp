# Gmail → Tsaidam intake forwarder

Tour operators email booking PDFs to the camp's Gmail. This Google Apps Script
forwards every matching email (plus its PDF attachment) to the Tsaidam server's
`/api/email-intake/webhook` endpoint, where the admin reviews and parses it.

## Setup (once)

1. **Label your operator emails in Gmail.**

   Create a Gmail filter that matches operator senders (e.g. `from:(*@activeadventure.mn OR *@nomadsmongolia.com) has:attachment`)
   and applies a label, e.g. `tsaidam-intake`. All matching emails will be
   picked up by the script.

2. **Open Google Apps Script** at <https://script.google.com> and create a new
   project. Name it `Tsaidam forwarder`.

3. **Paste the contents of `forwarder.gs`** (in this folder) into `Code.gs`.

4. **Set two Script properties** (Project settings → Script properties):

   | Key | Value |
   |-----|-------|
   | `TSAIDAM_WEBHOOK_URL` | `https://<your-domain>/api/email-intake/webhook` |
   | `TSAIDAM_SECRET`      | the same value as `EMAIL_INTAKE_SECRET` on the server |

5. **Add a trigger** (Triggers → Add trigger):
   - Function: `forwardNewOperatorEmails`
   - Event source: Time-driven
   - Type: Every 5 minutes (or whatever cadence you want)

6. **Run `forwardNewOperatorEmails` manually once** to trigger the OAuth
   consent flow. Google will ask to authorize Gmail read access + external
   URL requests; approve it.

## How it works

- The script scans for Gmail threads with the `tsaidam-intake` label that
  don't yet have the `tsaidam-sent` label.
- For each message, it extracts the first PDF attachment (if any), base64s
  it, and POSTs the payload to the webhook with `Authorization: Bearer <secret>`.
- On success the message gets the `tsaidam-sent` label so it's never
  resent. On failure the label stays off and the script retries on the
  next run.
- The webhook dedupes on Message-ID, so even if a message is posted twice
  it won't create duplicate rows.

## Local dev

For local testing you can `curl` the webhook directly:

```bash
curl -X POST http://localhost:3000/api/email-intake/webhook \
  -H "Authorization: Bearer $EMAIL_INTAKE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "from_address": "ops@activeadventure.mn",
    "from_name": "Active Adventure Tours",
    "subject": "Tsaidam 2026 bookings",
    "message_id": "<test-1@example>",
    "body_text": "Please see attached",
    "attachment": {
      "filename": "bookings.pdf",
      "mime": "application/pdf",
      "base64": "..."
    }
  }'
```
