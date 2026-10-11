// api/scribd.js

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  
  if (!url || !url.includes('scribd.com')) {
    return res.status(400).json({ error: 'Invalid Scribd URL' });
  }

  // Get API Token from Vercel Environment Variables
  const API_TOKEN = process.env.APIFY_API_TOKEN;
  const ACTOR_ID = "I2JSa3h8tt4vfELGV";

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'API Token missing' });
  }

  try {
    // 1. Start the Apify Actor
    const startRes = await fetch(`https://api.apify.com/v2/actor/${ACTOR_ID}/run`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${API_TOKEN}` 
      },
      body: JSON.stringify({ input: { url } })
    });

    if (!startRes.ok) throw new Error('Failed to start Apify actor');

    const { id: runId } = await startRes.json();

    // 2. Poll for results until the actor finishes
    let finalResult = null;
    
    while (!finalResult) {
      // Wait 2 seconds before checking again
      await new Promise(r => setTimeout(r, 2000));
      
      const statusRes = await fetch(`https://api.apify.com/v2/actor-run/${runId}/get?token=${API_TOKEN}&waitSecs=5`);
      const statusData = await statusRes.json();

      if (statusData.status === 'SUCCESS') {
        // Fetch the output dataset
        const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${statusData.defaultDatasetId}/items?format=json&token=${API_TOKEN}`);
        const items = await datasetRes.json();
        
        if (items.length > 0) {
          finalResult = items[0];
        } else {
          throw new Error('No data returned by actor');
        }
      } else if (statusData.status === 'ERROR') {
        throw new Error('Apify actor encountered an error');
      }
    }

    // Return the result to the frontend
    res.status(200).json(finalResult);

  } catch (error) {
    console.error("Scraper Error:", error);
    res.status(500).json({ error: error.message });
  }
}
