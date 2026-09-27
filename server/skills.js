const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

function defaultSkillDirs() {
  return [
    { dir: path.join(os.homedir(), '.claude', 'skills'), scope: 'personal' },
    { dir: path.join(process.cwd(), '.claude', 'skills'), scope: 'project' },
  ];
}

// Returns { frontmatter, body }. frontmatter is null if the YAML block is
// present but fails to parse (caller decides how to degrade gracefully).
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  try {
    return { frontmatter: yaml.load(match[1]) || {}, body: match[2] };
  } catch {
    return { frontmatter: null, body: match[2] };
  }
}

function readSkillFile(skillDir, skillName) {
  const skillPath = path.join(skillDir, skillName, 'SKILL.md');
  let content;
  try {
    content = fs.readFileSync(skillPath, 'utf8');
  } catch {
    return null;
  }

  const { frontmatter, body } = parseFrontmatter(content);
  if (frontmatter === null) {
    console.warn(`Skill "${skillName}": malformed YAML frontmatter in ${skillPath} — listing by folder name, no description.`);
  }
  return {
    name: (frontmatter && frontmatter.name) || skillName,
    description: (frontmatter && frontmatter.description) || null,
    body: body.trim(),
  };
}

function listSkills(dirs = defaultSkillDirs()) {
  const results = [];
  for (const { dir, scope } of dirs) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // scope directory doesn't exist -- no skills from it
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skill = readSkillFile(dir, entry.name);
      if (!skill) continue; // no SKILL.md in this folder
      results.push({ name: skill.name, description: skill.description, scope });
    }
  }
  return results;
}

function getSkill(name, dirs = defaultSkillDirs()) {
  for (const { dir, scope } of dirs) {
    const skill = readSkillFile(dir, name);
    if (skill) return { ...skill, scope };
  }
  return null;
}

module.exports = { listSkills, getSkill, defaultSkillDirs, parseFrontmatter };
