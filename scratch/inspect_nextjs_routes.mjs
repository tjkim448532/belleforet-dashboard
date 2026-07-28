async function inspectNextJsRoutes() {
  const host = 'https://belleforet-data-git-main-tjkim448532s-projects.vercel.app';
  const headers = { 'Authorization': 'Bearer belleforet-m2m-secret' };

  console.log('Testing Next.js Admin page HTML on Vercel...');
  const resHtml = await fetch(`${host}/admin/mapping`, { headers });
  const html = await resHtml.text();

  console.log('Admin Mapping page status:', resHtml.status);
  console.log('Title/Head tags preview:', html.match(/<title>(.*?)<\/title>/i)?.[1] || 'No title tag');
  
  // Search for API routes mentioned in the Next.js bundle or page
  const matches = html.match(/\/api\/[a-zA-Z0-9_\-\/]+/g) || [];
  console.log('Found API routes referenced in HTML:', [...new Set(matches)]);
}

inspectNextJsRoutes().catch(console.error);
