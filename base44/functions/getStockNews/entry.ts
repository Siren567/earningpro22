import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();
    if (!query) {
      return Response.json({ error: 'Query required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('NEWSDATA_API_KEY');
    const response = await fetch(`https://newsdata.io/api/1/news?apikey=${apiKey}&q=${encodeURIComponent(query)}&language=en&category=business`);
    const data = await response.json();

    if (!data.results) {
      return Response.json([]);
    }

    return Response.json(data.results.slice(0, 10).map(article => ({
      title: article.title,
      description: article.description,
      url: article.link,
      source: article.source_id,
      publishedAt: article.pubDate,
      image: article.image_url
    })));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});