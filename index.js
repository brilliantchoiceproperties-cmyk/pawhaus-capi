const express = require('express');
const crypto = require('crypto');
const https = require('https');

const app = express();
app.use(express.json());

const PIXEL_ID = '1441200744152457';
const CAPI_TOKEN = process.env.CAPI_TOKEN;

function hashData(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value.toString().toLowerCase().trim()).digest('hex');
}

app.get('/', (req, res) => res.json({ status: 'PawHaus CAPI webhook running' }));

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('Received webhook:', JSON.stringify(body).substring(0, 200));

    // Extract data from GHL webhook payload
    const contact = body.contact || body;
    const email = contact.email || body.email;
    const phone = contact.phone || body.phone;
    const firstName = contact.first_name || contact.firstName || body.first_name;
    const lastName = contact.last_name || contact.lastName || body.last_name;
    const amount = body.amount || body.revenue || body.total || 49;
    const orderId = body.id || body.order_id || body.transaction_id || Date.now().toString();
    const sourceUrl = body.source_url || body.funnel_url || 'https://staypawhaus.com';
    const eventTime = Math.floor(Date.now() / 1000);

    // Build user data with hashed PII
    const userData = {
      client_ip_address: req.headers['x-forwarded-for'] || req.ip,
      client_user_agent: req.headers['user-agent'] || '',
    };
    if (email) userData.em = [hashData(email)];
    if (phone) userData.ph = [hashData(phone.replace(/\D/g, ''))];
    if (firstName) userData.fn = [hashData(firstName)];
    if (lastName) userData.ln = [hashData(lastName)];

    const eventData = {
      data: [{
        event_name: 'Purchase',
        event_time: eventTime,
        action_source: 'website',
        event_source_url: sourceUrl,
        event_id: orderId,
        user_data: userData,
        custom_data: {
          currency: 'USD',
          value: parseFloat(amount),
          content_name: 'PawHaus Founding VIP Pass',
          content_type: 'product'
        }
      }]
    };

    // Send to Meta CAPI
    const postData = JSON.stringify(eventData);
    const options = {
      hostname: 'graph.facebook.com',
      path: `/v21.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };

    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve({ status: r.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log(`Meta CAPI response: ${result.status} - ${result.body}`);
    res.json({ success: true, meta_response: JSON.parse(result.body) });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`PawHaus CAPI webhook running on port ${PORT}`));
