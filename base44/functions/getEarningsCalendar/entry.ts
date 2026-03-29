import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { from, to } = await req.json();
    const finnhubKey = Deno.env.get('FINNHUB_API_KEY');
    const fmpKey = Deno.env.get('FMP_API_KEY');
    
    // Fetch earnings calendar from Finnhub
    const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${finnhubKey}`;
    
    console.log('Finnhub earnings request:', url.replace(finnhubKey, 'API_KEY'));

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Finnhub API error:', response.status, response.statusText, errorText);
      return Response.json({ 
        error: `API error: ${response.status}`,
        debug: { status: response.status, statusText: response.statusText }
      }, { status: 500 });
    }

    const data = await response.json();
    
    console.log('Finnhub response sample:', JSON.stringify(data).substring(0, 500));
    console.log('Earnings count:', data.earningsCalendar?.length || 0);

    const earningsArray = data.earningsCalendar || [];

    if (earningsArray.length === 0) {
      console.log('No earnings data returned from Finnhub');
      return Response.json([]);
    }

    // Enhance earnings data with additional info and calculate real scores
    const enhancedEarnings = await Promise.all(
      earningsArray.slice(0, 100).map(async (item) => {
        let quote = null;
        let profile = null;
        let historicalPrices = null;
        let companyNews = null;
        
        // Fetch data for scoring
        try {
          // Current quote
          const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${item.symbol}&token=${finnhubKey}`);
          if (quoteRes.ok) quote = await quoteRes.json();
          
          // Company profile
          const profileRes = await fetch(`https://financialmodelingprep.com/api/v3/profile/${item.symbol}?apikey=${fmpKey}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            profile = profileData[0];
          }
          
          // Historical prices (last 30 days for momentum)
          const toDate = Math.floor(Date.now() / 1000);
          const fromDate = toDate - (30 * 24 * 60 * 60);
          const candleRes = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${item.symbol}&resolution=D&from=${fromDate}&to=${toDate}&token=${finnhubKey}`);
          if (candleRes.ok) historicalPrices = await candleRes.json();
          
          // Recent news for sentiment
          const newsToDate = new Date().toISOString().split('T')[0];
          const newsFromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const newsRes = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${item.symbol}&from=${newsFromDate}&to=${newsToDate}&token=${finnhubKey}`);
          if (newsRes.ok) companyNews = await newsRes.json();
        } catch (err) {
          console.log(`Data fetch failed for ${item.symbol}:`, err.message);
        }

        // ===== REAL SCORING ENGINE =====
        
        let totalWeightUsed = 0;
        let weightedScore = 0;
        let riskScore = 0;
        let riskWeightUsed = 0;
        
        // 1. MOMENTUM (25% weight)
        let momentumScore = 50;
        if (quote && historicalPrices?.c?.length > 0) {
          const currentPrice = quote.c;
          const prices = historicalPrices.c;
          const oldestPrice = prices[0];
          const weekAgoPrice = prices[Math.max(0, prices.length - 7)];
          
          // 30-day momentum
          const monthReturn = ((currentPrice - oldestPrice) / oldestPrice) * 100;
          // 7-day momentum
          const weekReturn = ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100;
          
          // Score momentum (positive momentum = higher opportunity)
          if (monthReturn > 10 && weekReturn > 3) momentumScore = 85;
          else if (monthReturn > 5 && weekReturn > 1) momentumScore = 75;
          else if (monthReturn > 0 && weekReturn > 0) momentumScore = 65;
          else if (monthReturn > -5) momentumScore = 50;
          else if (monthReturn > -10) momentumScore = 35;
          else momentumScore = 20;
          
          weightedScore += momentumScore * 0.25;
          totalWeightUsed += 0.25;
          
          // Momentum contribution to risk
          if (Math.abs(weekReturn) > 10) riskScore += 80 * 0.25;
          else if (Math.abs(weekReturn) > 5) riskScore += 60 * 0.25;
          else riskScore += 30 * 0.25;
          riskWeightUsed += 0.25;
          
          console.log(`${item.symbol} momentum: 30d=${monthReturn.toFixed(1)}%, 7d=${weekReturn.toFixed(1)}%, score=${momentumScore}`);
        }
        
        // 2. NEWS SENTIMENT (20% weight)
        let sentimentScore = 50;
        if (companyNews && companyNews.length > 0) {
          // Simple sentiment analysis from news headlines
          const recentNews = companyNews.slice(0, 10);
          let positiveCount = 0;
          let negativeCount = 0;
          
          recentNews.forEach(article => {
            const text = (article.headline + ' ' + article.summary).toLowerCase();
            // Positive keywords
            if (text.match(/strong|beat|exceed|growth|profit|surge|gains|bullish|upgrade/)) positiveCount++;
            // Negative keywords
            if (text.match(/weak|miss|decline|loss|drop|fall|bearish|downgrade|concern/)) negativeCount++;
          });
          
          const sentimentRatio = positiveCount / Math.max(1, positiveCount + negativeCount);
          if (sentimentRatio > 0.7) sentimentScore = 80;
          else if (sentimentRatio > 0.5) sentimentScore = 65;
          else if (sentimentRatio > 0.3) sentimentScore = 50;
          else sentimentScore = 35;
          
          weightedScore += sentimentScore * 0.20;
          totalWeightUsed += 0.20;
          
          // Negative sentiment increases risk
          if (negativeCount > positiveCount) riskScore += 70 * 0.20;
          else riskScore += 40 * 0.20;
          riskWeightUsed += 0.20;
          
          console.log(`${item.symbol} sentiment: +${positiveCount}/-${negativeCount}, score=${sentimentScore}`);
        }
        
        // 3. HISTORICAL EARNINGS BEHAVIOR (20% weight)
        let earningsHistoryScore = 50;
        if (item.epsEstimate) {
          // Companies with higher EPS estimates often have higher post-earnings moves
          const epsAbs = Math.abs(item.epsEstimate);
          if (epsAbs > 2) earningsHistoryScore = 70;
          else if (epsAbs > 1) earningsHistoryScore = 60;
          else if (epsAbs > 0.5) earningsHistoryScore = 55;
          else earningsHistoryScore = 45;
          
          weightedScore += earningsHistoryScore * 0.20;
          totalWeightUsed += 0.20;
          
          riskScore += 50 * 0.20;
          riskWeightUsed += 0.20;
          
          console.log(`${item.symbol} EPS estimate: ${item.epsEstimate}, score=${earningsHistoryScore}`);
        }
        
        // 4. VOLATILITY ANALYSIS (20% weight)
        let volatilityScore = 50;
        if (quote && historicalPrices?.h?.length > 0) {
          const highs = historicalPrices.h;
          const lows = historicalPrices.l;
          const closes = historicalPrices.c;
          
          // Calculate average true range (ATR) as % of price
          let totalRange = 0;
          for (let i = 1; i < Math.min(14, closes.length); i++) {
            const range = highs[i] - lows[i];
            totalRange += range;
          }
          const avgRange = totalRange / Math.min(14, closes.length - 1);
          const atrPercent = (avgRange / quote.c) * 100;
          
          // Moderate volatility is opportunity, extreme is risk
          if (atrPercent > 8) volatilityScore = 45; // too volatile
          else if (atrPercent > 5) volatilityScore = 70; // good movement potential
          else if (atrPercent > 3) volatilityScore = 60;
          else volatilityScore = 40; // too stable
          
          weightedScore += volatilityScore * 0.20;
          totalWeightUsed += 0.20;
          
          // High volatility = high risk
          if (atrPercent > 8) riskScore += 85 * 0.20;
          else if (atrPercent > 5) riskScore += 65 * 0.20;
          else if (atrPercent > 3) riskScore += 45 * 0.20;
          else riskScore += 25 * 0.20;
          riskWeightUsed += 0.20;
          
          console.log(`${item.symbol} volatility ATR: ${atrPercent.toFixed(2)}%, score=${volatilityScore}`);
        }
        
        // 5. SECTOR CONTEXT (10% weight)
        let sectorScore = 50;
        if (profile?.sector) {
          // Simple sector bias (can be enhanced with real sector performance data)
          const strongSectors = ['Technology', 'Healthcare', 'Consumer Cyclical'];
          const weakSectors = ['Real Estate', 'Utilities'];
          
          if (strongSectors.includes(profile.sector)) sectorScore = 60;
          else if (weakSectors.includes(profile.sector)) sectorScore = 45;
          else sectorScore = 50;
          
          weightedScore += sectorScore * 0.10;
          totalWeightUsed += 0.10;
          
          riskScore += 50 * 0.10;
          riskWeightUsed += 0.10;
        }
        
        // 6. MARKET CONTEXT (5% weight) - based on market cap liquidity
        let marketScore = 50;
        if (profile?.mktCap) {
          const mcap = profile.mktCap;
          if (mcap > 200e9) marketScore = 45; // mega caps move less
          else if (mcap > 50e9) marketScore = 55; // large caps
          else if (mcap > 10e9) marketScore = 65; // mid caps have more room
          else if (mcap > 2e9) marketScore = 70; // small caps
          else marketScore = 60; // micro caps volatile
          
          weightedScore += marketScore * 0.05;
          totalWeightUsed += 0.05;
          
          // Smaller cap = higher risk
          if (mcap < 2e9) riskScore += 75 * 0.05;
          else if (mcap < 10e9) riskScore += 60 * 0.05;
          else if (mcap < 50e9) riskScore += 40 * 0.05;
          else riskScore += 25 * 0.05;
          riskWeightUsed += 0.05;
        }
        
        // Normalize scores if not all weights used
        const finalOpportunityScore = totalWeightUsed > 0 
          ? Math.round(weightedScore / totalWeightUsed) 
          : 50;
        
        const finalRiskScore = riskWeightUsed > 0
          ? Math.round(riskScore / riskWeightUsed)
          : 50;
        
        // Determine labels
        let opportunityLabel = 'Medium Opportunity';
        if (finalOpportunityScore >= 70) opportunityLabel = 'High Opportunity';
        else if (finalOpportunityScore < 50) opportunityLabel = 'Low Opportunity';
        
        let riskLabel = 'Medium Risk';
        if (finalRiskScore >= 75) riskLabel = 'Very High Risk';
        else if (finalRiskScore >= 60) riskLabel = 'High Risk';
        else if (finalRiskScore < 40) riskLabel = 'Low Risk';
        
        console.log(`${item.symbol} FINAL: Opportunity=${finalOpportunityScore}, Risk=${finalRiskScore}`);
        
        return {
          symbol: item.symbol,
          name: profile?.companyName || item.symbol,
          date: item.date,
          exchange: profile?.exchangeShortName || '',
          time: item.hour || 'bmo',
          epsEstimated: item.epsEstimate || null,
          eps: item.epsActual || null,
          revenueEstimated: item.revenueEstimate || null,
          revenue: item.revenueActual || null,
          currentPrice: quote?.c || null,
          priceChange: quote?.d || null,
          percentChange: quote?.dp || null,
          marketCap: profile?.mktCap || null,
          sector: profile?.sector || null,
          industry: profile?.industry || null,
          opportunityScore: Math.min(100, Math.max(0, finalOpportunityScore)),
          riskScore: Math.min(100, Math.max(0, finalRiskScore)),
          riskLevel: riskLabel,
          opportunityLabel
        };
      })
    );

    console.log('Enhanced earnings sample:', JSON.stringify(enhancedEarnings[0]));
    console.log('Total earnings enhanced:', enhancedEarnings.length);

    return Response.json(enhancedEarnings);
  } catch (error) {
    console.error('getEarningsCalendar error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});