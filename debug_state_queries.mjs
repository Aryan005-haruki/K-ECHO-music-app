import { searchSaavn } from './src/services/ApiService.js';

async function test() {
  const queries = [
    'Nadaaniyan Akhiyaan Gulaab Husn trending Mumbai hits 2024', // Current
    'Mumbai Top 15 Songs 2024',
    'Latest Mumbai Bollywood Hits',
    'Rajasthan Top Songs 2024',
    'Rajasthani Hits 2024'
  ];

  for (const q of queries) {
    console.log(`Testing query: "${q}"`);
    try {
      const res = await searchSaavn(q, 15);
      console.log(`Results: ${res.length}`);
      if (res.length > 0) {
        console.log(`First result: ${res[0].title}`);
      }
    } catch (e) {
      console.error(e);
    }
    console.log('---');
  }
}

test();
