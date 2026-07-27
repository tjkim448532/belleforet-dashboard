async function checkSyncLogs() {
  const headers = { 'Authorization': 'Bearer belleforet-secret-token' };
  const headersAlt = { 'Authorization': 'Bearer belleforet-m2m-secret' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Fetching sync logs from backend /api/logs...');
  let res = await fetch(`${baseUrl}/api/logs`, { headers }).then(r => r.json());
  if (!res.success) {
    res = await fetch(`${baseUrl}/api/logs`, { headers: headersAlt }).then(r => r.json());
  }

  console.log('Logs Response:', res);
  if (Array.isArray(res.logs)) {
    console.log(`Total logs count: ${res.logs.length}`);
    console.log('\n--- Recent Logs ---');
    res.logs.slice(0, 10).forEach((l, idx) => {
      console.log(`[${idx+1}] Status: ${l.status} | Started: ${l.started_at || l.startedAt} | JobID: ${l.job_id || l.jobId}`);
      if (l.error_message || l.errorMessage || l.error) {
        console.log(`    ❌ Error: ${l.error_message || l.errorMessage || l.error}`);
      }
      if (l.s3_total_net != null) {
        console.log(`    S3 Net: ${l.s3_total_net?.toLocaleString()} | DB Net: ${l.db_total_net?.toLocaleString()}`);
      }
    });
  }
}

checkSyncLogs().catch(console.error);
