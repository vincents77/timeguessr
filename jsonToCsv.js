// jsonToCsv.js (ES Module version)
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';

const jsonFilePath = path.join(process.cwd(), 'public', 'data', 'events.json');
const csvOutputPath = path.join(process.cwd(), 'events.csv');

try {
  const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
  const events = JSON.parse(jsonData);

  const fields = [
    'title', 'slug', 'year', 'coords', 'theme', 'era', 'region',
    'location', 'notable_figures', 'visuals', 'prompt', 'image', 'difficulty', 'source'
  ];

  const formattedData = events.map(event => ({
    ...event,
    coords: event.coords.join(','),
    notable_figures: event.notable_figures ? event.notable_figures.join('; ') : '',
    visuals: event.visuals ? event.visuals.join('; ') : ''
  }));

  const parser = new Parser({ fields });
  const csv = parser.parse(formattedData);

  fs.writeFileSync(csvOutputPath, csv);
  console.log('✅ CSV file created:', csvOutputPath);
} catch (error) {
  console.error('❌ Error:', error.message);
}