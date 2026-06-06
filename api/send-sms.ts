import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { to, text } = req.body;

  if (!to || !text) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, text' });
  }

  const apiKey = process.env.VITE_SOLAPI_API_KEY || process.env.SOLAPI_API_KEY || 'NCSEQZGX8C5I7AM2';
  const apiSecret = process.env.VITE_SOLAPI_API_SECRET || process.env.SOLAPI_API_SECRET || '3MJOV9OZOYSNOCFPOVFXAECXIHXQYVMI';
  const from = process.env.VITE_SOLAPI_SENDER_NO || process.env.SOLAPI_SENDER_NO || '15660162';

  if (!apiKey || !apiSecret || !from) {
    return res.status(500).json({ success: false, error: '서버에 솔라피 연동 정보가 설정되지 않았습니다. (API Key, Secret, 발신번호)' });
  }

  try {
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString('hex');
    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(date + salt);
    const signature = hmac.digest('hex');

    const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          to: to.replace(/[^0-9]/g, ''),
          from: from.replace(/[^0-9]/g, ''),
          text,
          type: text.length > 90 ? 'LMS' : 'SMS'
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, data });
    } else {
      console.error('Solapi API Error:', data);
      return res.status(400).json({ success: false, error: data.errorMessage || 'SMS sending failed' });
    }
  } catch (error: any) {
    console.error('Server Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
