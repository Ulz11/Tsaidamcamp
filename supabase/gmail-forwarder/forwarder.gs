/**
 * Tsaidam Camp — Gmail → /api/email-intake/webhook forwarder.
 *
 * Runs on a 5-minute time trigger. Scans the `tsaidam-intake` label for
 * unseen messages and POSTs each one (with its PDF attachment, if any)
 * to the Tsaidam server. On success the message gets the `tsaidam-sent`
 * label so it's never resent.
 *
 * Script properties required:
 *   TSAIDAM_WEBHOOK_URL — full URL of the webhook endpoint
 *   TSAIDAM_SECRET      — shared secret (matches EMAIL_INTAKE_SECRET on the server)
 */

const INTAKE_LABEL = 'tsaidam-intake';
const SENT_LABEL = 'tsaidam-sent';

function forwardNewOperatorEmails() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('TSAIDAM_WEBHOOK_URL');
  const secret = props.getProperty('TSAIDAM_SECRET');
  if (!url || !secret) {
    throw new Error('Missing TSAIDAM_WEBHOOK_URL or TSAIDAM_SECRET script property.');
  }

  const intake = GmailApp.getUserLabelByName(INTAKE_LABEL);
  if (!intake) {
    throw new Error('Create a Gmail label named "' + INTAKE_LABEL + '" first.');
  }
  const sentLabel = GmailApp.getUserLabelByName(SENT_LABEL) || GmailApp.createLabel(SENT_LABEL);

  // Search for threads with the intake label but NOT the sent label.
  const threads = GmailApp.search(
    'label:' + INTAKE_LABEL + ' -label:' + SENT_LABEL,
    0,
    50
  );

  threads.forEach(function (thread) {
    const messages = thread.getMessages();
    let allOk = true;

    messages.forEach(function (msg) {
      try {
        const attachments = msg.getAttachments({ includeInlineImages: false });
        const pdf = attachments.find(function (a) {
          return a.getContentType() === 'application/pdf';
        });

        const payload = {
          from_address: extractEmail_(msg.getFrom()),
          from_name: extractName_(msg.getFrom()),
          subject: msg.getSubject(),
          received_at: msg.getDate().toISOString(),
          message_id: msg.getId(),
          body_text: msg.getPlainBody().substring(0, 20000),
          attachment: pdf
            ? {
                filename: pdf.getName(),
                mime: pdf.getContentType(),
                base64: Utilities.base64Encode(pdf.getBytes()),
              }
            : null,
        };

        const response = UrlFetchApp.fetch(url, {
          method: 'post',
          contentType: 'application/json',
          headers: { Authorization: 'Bearer ' + secret },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
        });

        const code = response.getResponseCode();
        if (code < 200 || code >= 300) {
          Logger.log('Webhook failed for message %s: %s %s', msg.getId(), code, response.getContentText());
          allOk = false;
        }
      } catch (e) {
        Logger.log('Error on message %s: %s', msg.getId(), e);
        allOk = false;
      }
    });

    if (allOk) {
      thread.addLabel(sentLabel);
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers — RFC 5322 "Name <email@addr>" parsing
// ---------------------------------------------------------------------------

function extractEmail_(from) {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1].trim() : from.trim();
}

function extractName_(from) {
  const m = from.match(/^([^<]+)<[^>]+>$/);
  if (!m) return null;
  const name = m[1].trim().replace(/^"|"$/g, '').trim();
  return name || null;
}
