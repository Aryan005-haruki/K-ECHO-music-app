import { getArtistSpotlight } from './src/services/ApiService.js';

async function test() {
  const spotlight = await getArtistSpotlight();
  console.log('Spotlight Artist:', spotlight?.artist);
  console.log('Tracks Count:', spotlight?.tracks?.length);
  console.log('Tracks:', spotlight?.tracks?.map(t => t.title));
}

test();
