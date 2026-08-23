// split-channels.js
// Reads output/plutotv_us.m3u8 and splits it into one .m3u8 file per channel,
// organized into folders by category (the group-title tag on each EXTINF line).
//
// Run this as an extra step in the existing GitHub Action, right after the
// step that generates output/plutotv_us.m3u8, so the split files always
// reflect the current UUID/token automatically.

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, 'output', 'plutotv_us.m3u8');
const OUTPUT_ROOT = path.join(__dirname, 'output', 'channels');

function sanitize(name) {
  // Strip characters that are unsafe in file/folder names
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`Source playlist not found at ${SOURCE_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(SOURCE_FILE, 'utf8');
  const lines = raw.split(/\r?\n/);

  // Clear out any previous split so removed/renamed channels don't linger
  if (fs.existsSync(OUTPUT_ROOT)) {
    fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });

  let count = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('#EXTINF')) continue;

    const streamUrl = lines[i + 1] ? lines[i + 1].trim() : null;
    if (!streamUrl || streamUrl.startsWith('#')) continue;

    const groupMatch = line.match(/group-title="([^"]*)"/);
    const group = sanitize(groupMatch ? groupMatch[1] : 'Uncategorized') || 'Uncategorized';

    // Channel display name is whatever follows the last comma on the EXTINF line
    const nameMatch = line.match(/,(.*)$/);
    const channelName = sanitize(nameMatch ? nameMatch[1] : `Channel ${count + 1}`);

    const groupDir = path.join(OUTPUT_ROOT, group);
    fs.mkdirSync(groupDir, { recursive: true });

    const filePath = path.join(groupDir, `${channelName || 'Channel_' + (count + 1)}.m3u8`);
    const fileContent = `#EXTM3U\n${line}\n${streamUrl}\n`;
    fs.writeFileSync(filePath, fileContent, 'utf8');

    count++;
  }

  console.log(`Split ${count} channels into ${OUTPUT_ROOT}`);
}

main();
