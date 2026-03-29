import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol } = await req.json();
    const fmpKey = Deno.env.get('FMP_API_KEY');

    // Get company profile from FMP
    const profileRes = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${fmpKey}`
    );
    const profileData = await profileRes.json();

    if (!profileData || profileData.length === 0) {
      return Response.json({ error: 'Stock not found' }, { status: 404 });
    }

    const profile = profileData[0];

    return Response.json({
      symbol: profile.symbol,
      name: profile.companyName,
      price: profile.price,
      beta: profile.beta,
      volAvg: profile.volAvg,
      mktCap: profile.mktCap,
      lastDiv: profile.lastDiv,
      range: profile.range,
      changes: profile.changes,
      cik: profile.cik,
      isin: profile.isin,
      cusip: profile.cusip,
      exchange: profile.exchange,
      exchangeShortName: profile.exchangeShortName,
      industry: profile.industry,
      website: profile.website,
      description: profile.description,
      ceo: profile.ceo,
      sector: profile.sector,
      country: profile.country,
      fullTimeEmployees: profile.fullTimeEmployees,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zip: profile.zip,
      image: profile.image,
      ipoDate: profile.ipoDate,
      marketCap: profile.mktCap,
      volume: profile.volAvg
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});