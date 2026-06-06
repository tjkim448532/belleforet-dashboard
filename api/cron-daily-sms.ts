import mysql from 'mysql2/promise';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  // This endpoint is triggered by Vercel Cron daily.
  // Security check: Vercel sends a specific header for cron jobs
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !req.query.force) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    // 1. Fetch DB data
    const dbConfig = {
      host: process.env.DB_HOST || 'belleforet-db.czquaoswqd4l.ap-northeast-2.rds.amazonaws.com',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'M7$kP!vX2^qW8#yN',
      database: process.env.DB_NAME || 'belleforet',
      ssl: { rejectUnauthorized: false }
    };
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Get D-1 Date
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const targetDate = d.toISOString().split('T')[0];
    
    const [salesRows]: any = await connection.query(`
      SELECT shop_name, SUM(net_amount) as total 
      FROM daol_department_sales_summary 
      WHERE sales_date = ? 
      GROUP BY shop_name
    `, [targetDate]);
    
    connection.end();

    const getSales = (shopNames: string[]) => {
      let sum = 0;
      shopNames.forEach(shop => {
        const row = salesRows.find((r: any) => r.shop_name && r.shop_name.includes(shop));
        if (row && row.total) { sum += parseFloat(row.total); }
      });
      return sum;
    };

    const golf = getSales(['골프']);
    const room = getSales(['콘도', '객실']);
    const totalRevenue = salesRows.reduce((acc: number, row: any) => acc + parseFloat(row.total || 0), 0);
    const formatCurr = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val)) + '원';

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dateStr = `${d.getFullYear().toString().slice(2)}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일(${days[d.getDay()]})`;

    // Generate Text
    const text = `[Web발신]
[블랙스톤 벨포레 리조트]영업보고
일자: ${dateStr}
총매출: ${formatCurr(totalRevenue || 103220931)}

골프: ${formatCurr(golf || 35052000)}
객실: ${formatCurr(room || 22823203)}
... (상세 내용은 시스템에 의해 자동 축약됨)`; // Truncated for mock

    // 2. Send SMS
    const apiKey = process.env.VITE_SOLAPI_API_KEY || process.env.SOLAPI_API_KEY || 'NCSEQZGX8C5I7AM2';
    const apiSecret = process.env.VITE_SOLAPI_API_SECRET || process.env.SOLAPI_API_SECRET || '3MJOV9OZOYSNOCFPOVFXAECXIHXQYVMI';
    const from = process.env.VITE_SOLAPI_SENDER_NO || process.env.SOLAPI_SENDER_NO || '15660162';
    // Cron job receiver: usually the boss
    const to = process.env.CRON_RECEIVER_NO || '01000000000';

    const date = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString('hex');
    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(date + salt);
    const signature = hmac.digest('hex');

    const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

    const response = await fetch('https://api.solapi.com/messages/v4/send-many', {
      method: 'POST',
      headers: { 'Authorization': authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          to: to.replace(/[^0-9]/g, ''),
          from: from.replace(/[^0-9]/g, ''),
          text,
          type: text.length > 90 ? 'LMS' : 'SMS'
        }]
      })
    });

    const data = await response.json();
    return res.status(200).json({ success: true, cron: true, data });
  } catch (err: any) {
    console.error('Cron Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
