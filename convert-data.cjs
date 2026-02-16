const fs = require('fs');

// Read the scraped data - use the latest file
const rawData = JSON.parse(fs.readFileSync('../devpost-scraper/devpost_winners_2026-02-16.json', 'utf8'));

// Keywords to filter out games and VR projects
const GAME_VR_KEYWORDS = [
  'game', 'gaming', 'gamer',
  'vr', 'virtual reality', 'xr', 'mixed reality', 'mr',
  'unity', 'unreal', 'unreal-engine', 'ue5',
  'roblox', 'robloxstudio',
  'quest', 'oculus', 'meta quest',
  'godot', 'pygame',
  'metasdk', 'metaspatialsdk', 'metaxr',
  'spatialsdk',
  'blender',  // 3D modeling tool commonly used for games
  'passthrough', 'handtracking',
  'horizonworlds',
];

// Title keywords that strongly indicate a game
const GAME_TITLE_KEYWORDS = [
  'game', 'quest', 'escape room', 'royale', 'fighter',
  'attack', 'battle', 'maze', 'sandbox', 'platformer',
  'puzzle', 'arcade', 'rpg', 'mmorpg', 'shooter',
  'run', 'runner', 'shift', 'wizards',
];

function isGameOrVR(project) {
  const title = (project.title || '').toLowerCase();
  const techStack = (project.builtWith || []).map(t => t.toLowerCase());
  const description = (project.tagline || '').toLowerCase();
  const whatItDoes = (project.whatItDoes || '').toLowerCase();

  // Check tech stack for game/VR technologies
  for (const tech of techStack) {
    if (GAME_VR_KEYWORDS.includes(tech)) return true;
  }

  // Check title for game keywords
  for (const kw of GAME_TITLE_KEYWORDS) {
    if (title.includes(kw)) return true;
  }

  // Check if description explicitly mentions being a game or VR
  const textToCheck = title + ' ' + description + ' ' + whatItDoes;
  if (/\b(video game|board game|card game|vr experience|vr app|virtual reality)\b/i.test(textToCheck)) {
    return true;
  }

  return false;
}

// Filter out games and VR projects
const filteredData = rawData.filter(p => !isGameOrVR(p));
console.log(`Filtered: ${rawData.length} -> ${filteredData.length} (removed ${rawData.length - filteredData.length} game/VR projects)`);

// Helper to get first 1-2 sentences (crisp summary)
function getCrispSummary(text, maxLength = 200) {
  if (!text) return null;

  // Clean up the text
  let clean = text
    .replace(/\*\*/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Get first 1-2 sentences
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  let result = sentences[0] || clean;

  // Add second sentence if short enough
  if (sentences[1] && (result.length + sentences[1].length) < maxLength) {
    result += sentences[1];
  }

  // Truncate if still too long
  if (result.length > maxLength) {
    result = result.substring(0, maxLength).trim() + '...';
  }

  return result.trim();
}

// Convert to the format needed by the app
const projects = filteredData.map(p => {
  // Build sectioned summary with crisp content
  let sections = [];

  // Overview from AI summary
  if (p.aiSummary) {
    const overview = getCrispSummary(p.aiSummary, 250);
    if (overview) {
      sections.push(`📋 Overview\n${overview}`);
    }
  }

  // What it does
  if (p.whatItDoes) {
    const crisp = getCrispSummary(p.whatItDoes);
    if (crisp) sections.push(`🎯 What it does\n${crisp}`);
  }

  // Inspiration
  if (p.inspiration) {
    const crisp = getCrispSummary(p.inspiration);
    if (crisp) sections.push(`💡 Inspiration\n${crisp}`);
  }

  // How it was built
  if (p.howWeBuiltIt) {
    const crisp = getCrispSummary(p.howWeBuiltIt);
    if (crisp) sections.push(`🔧 How it was built\n${crisp}`);
  }

  // Challenges
  if (p.challenges) {
    const crisp = getCrispSummary(p.challenges);
    if (crisp) sections.push(`⚡ Challenges\n${crisp}`);
  }

  // Accomplishments
  if (p.accomplishments) {
    const crisp = getCrispSummary(p.accomplishments);
    if (crisp) sections.push(`🏆 Accomplishments\n${crisp}`);
  }

  // What we learned
  if (p.whatWeLearned) {
    const crisp = getCrispSummary(p.whatWeLearned);
    if (crisp) sections.push(`📚 What we learned\n${crisp}`);
  }

  // What's next
  if (p.whatsNext) {
    const crisp = getCrispSummary(p.whatsNext);
    if (crisp) sections.push(`🚀 What's next\n${crisp}`);
  }

  // Combine sections
  let summary = sections.join('\n\n');

  // Fallback
  if (!summary && p.tagline) {
    summary = p.tagline;
  }
  if (!summary && p.fullDescription) {
    summary = getCrispSummary(p.fullDescription, 300);
  }

  // Get clean YouTube URL
  let youtube = '';
  if (p.youtubeLinks && p.youtubeLinks.length > 0) {
    for (const link of p.youtubeLinks) {
      if (link.includes('youtube.com/watch') || link.includes('youtu.be/')) {
        youtube = link;
        break;
      }
    }
    if (!youtube) {
      const embed = p.youtubeLinks[0];
      const match = embed.match(/embed\/([^?]+)/);
      if (match) {
        youtube = `https://www.youtube.com/watch?v=${match[1]}`;
      }
    }
  }

  // Clean prize text
  let prize = '';
  if (p.prizes && p.prizes.length > 0) {
    prize = p.prizes
      .map(pr => pr.replace(/\s+/g, ' ').trim())
      .filter(pr => pr && pr !== 'Winner')
      .join('; ');
  }

  return {
    title: p.title || 'Untitled Project',
    summary: summary || 'No description available.',
    hackathon: p.hackathon || null,
    prize: prize || null,
    techStack: (p.builtWith || []).join(', ') || null,
    github: (p.githubLinks || [])[0] || null,
    youtube: youtube || null,
    demo: p.demoUrl || null,
    team: (p.team || []).map(t => t.name).join(', ') || null,
    date: p.submittedDate ? p.submittedDate.split('T')[0] : null,
    projectUrl: p.projectUrl || null
  };
}).filter(p => p.title && p.summary);

// Deduplicate by projectUrl
const seen = new Set();
const uniqueProjects = projects.filter(p => {
  if (!p.projectUrl || seen.has(p.projectUrl)) return false;
  seen.add(p.projectUrl);
  return true;
});

console.log(`After dedup: ${uniqueProjects.length} unique projects`);

// Save to src/data
fs.writeFileSync('./src/data/projects.json', JSON.stringify(uniqueProjects, null, 2));

console.log(`\nSaved ${uniqueProjects.length} projects to src/data/projects.json`);

// Show sample
console.log('\nSample project:');
console.log(JSON.stringify(uniqueProjects[0], null, 2));
