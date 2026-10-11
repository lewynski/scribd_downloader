import { chromium } from 'playwright';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Navigate to Scribd
    await page.goto(url, { waitUntil: 'networkidle' });

    // Extract Title
    const title = await page.title() || "Unknown Document";

    // Extract Thumbnail (Scribd usually puts this in meta tags or specific divs)
    // This selector might need adjustment based on Scribd's current HTML structure
    const thumbnail = await page.evaluate(() => {
      const img = document.querySelector('meta[property="og:image"]');
      return img ? img.getAttribute('content') : '';
    });

    // Generate Download Link
    // Scribd documents are often embedded. We can try to construct the direct PDF link
    // or just redirect the user to the embed view which allows downloading.
    const downloadUrl = `https://www.scribd.com/document/embed?url=${encodeURIComponent(url)}`;

    res.json({ 
      title, 
      author: "Scribd User", 
      pages: "?", 
      thumbnail, 
      pdfUrl: downloadUrl 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document details' });
  } finally {
    if (browser) await browser.close();
  }
}
