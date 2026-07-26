async function testPostFormat() {
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret', 'Content-Type': 'application/json' };
  const baseUrl = 'https://belleforet-data.vercel.app';

  console.log('Testing GET /api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT...');
  const res = await fetch(`${baseUrl}/api/v5/admin/mapping/facility-groups?mode=ROOM_SEGMENT`, { headers }).then(r => r.json());
  const data = res.data || res;

  console.log('Unmapped sample:', Array.isArray(data.unmapped) ? data.unmapped.slice(0, 3) : data.unmapped);
  console.log('Mapped sample:', Array.isArray(data.mapped) ? data.mapped.slice(0, 3) : data.mapped);
}

testPostFormat().catch(console.error);
