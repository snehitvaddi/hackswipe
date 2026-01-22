const fs = require('fs');

// Read the scraped data
const rawData = JSON.parse(fs.readFileSync('../devpost-scraper/devpost_winners_2026-01-07.json', 'utf8'));

// Convert to the format needed by the app
const projects = rawData.map(p => {
  // Build a comprehensive summary from all available sections
  // Goal: Give reader full context - what it does, how it was built, why it matters
  let summaryParts = [];

  // Start with AI summary if available (it's usually a good overview)
  if (p.aiSummary) {
    const cleanSummary = p.aiSummary
      .replace(/\*\*/g, '')
      .replace(/IDEA SUMMARY[:\s]*/gi, '')
      .replace(/TECHNICAL HIGHLIGHTS[:\s]*/gi, '')
      .replace(/^#+\s*/gm, '')
      .replace(/^\d+\.\s*/gm, '')
      .trim();
    if (cleanSummary) {
      summaryParts.push(cleanSummary);
    }
  }

  // Add "What it does" if not already covered
  if (p.whatItDoes && !summaryParts.some(s => s.includes(p.whatItDoes.substring(0, 50)))) {
    summaryParts.push(`What it does: ${p.whatItDoes.trim()}`);
  }

  // Add inspiration/problem being solved
  if (p.inspiration) {
    summaryParts.push(`Inspiration: ${p.inspiration.trim()}`);
  }

  // Add how it was built (tech approach)
  if (p.howWeBuiltIt) {
    summaryParts.push(`How it was built: ${p.howWeBuiltIt.trim()}`);
  }

  // Add challenges faced
  if (p.challenges) {
    summaryParts.push(`Challenges: ${p.challenges.trim()}`);
  }

  // Add accomplishments
  if (p.accomplishments) {
    summaryParts.push(`Accomplishments: ${p.accomplishments.trim()}`);
  }

  // Add what they learned
  if (p.whatWeLearned) {
    summaryParts.push(`What we learned: ${p.whatWeLearned.trim()}`);
  }

  // Add future plans
  if (p.whatsNext) {
    summaryParts.push(`What's next: ${p.whatsNext.trim()}`);
  }

  // Combine all parts with line breaks
  let summary = summaryParts.join('\n\n');

  // Fallback to tagline or description
  if (!summary && p.tagline) {
    summary = p.tagline;
  }
  if (!summary && p.fullDescription) {
    summary = p.fullDescription;
  }

  // Clean up any remaining markdown artifacts
  summary = summary
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

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

  // Get hackathon name if available
  const hackathon = p.hackathon || null;

  return {
    title: p.title || 'Untitled Project',
    summary: summary || 'No description available.',
    hackathon: hackathon,
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

// Save to src/data
fs.writeFileSync('./src/data/projects.json', JSON.stringify(projects, null, 2));

console.log(`Converted ${projects.length} projects for HackSwipe app`);
console.log('Saved to: src/data/projects.json');

// Show sample
console.log('\nSample project:');
console.log(JSON.stringify(projects[0], null, 2));
