// Read-only skills browser: list installed skills, view their full body,
// and copy a ready-to-paste "/skill-name" invocation. Never executes
// anything — that's the whole point (see epic #1's locked scope).

const skillsBtnEl = document.getElementById('skills-btn');
const skillsPanel = document.getElementById('skills-panel');
const skillsListEl = document.getElementById('skills-list');
const skillsDetailEl = document.getElementById('skills-detail');

let skillsLoaded = false;

// Skill descriptions are written for an LLM to decide when to trigger the
// skill, so they run long. The list only needs a short human-readable
// hint -- take the first sentence, hard-capped, never the whole thing.
function shortDescription(description, maxLen = 90) {
  if (!description) return 'No description';
  const firstSentence = description.split(/(?<=[.!?])\s/)[0];
  const base = firstSentence.length <= maxLen ? firstSentence : description;
  return base.length > maxLen ? `${base.slice(0, maxLen - 1).trimEnd()}…` : base;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

async function fetchSkillList() {
  const res = await fetch('/skills');
  return res.json();
}

async function fetchSkillDetail(name) {
  const res = await fetch(`/skills/${encodeURIComponent(name)}`);
  if (!res.ok) return null;
  return res.json();
}

function renderSkillList(skills) {
  skillsListEl.innerHTML = '';
  skills
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((skill) => {
      const item = document.createElement('div');
      item.className = 'skill-item';
      item.dataset.name = skill.name;
      item.innerHTML = `
        <div class="skill-name">${escapeHtml(skill.name)}<span class="skill-scope">${escapeHtml(skill.scope)}</span></div>
        <div class="skill-desc">${escapeHtml(shortDescription(skill.description))}</div>
      `;
      item.addEventListener('click', () => selectSkill(skill.name, item));
      skillsListEl.appendChild(item);
    });
}

async function selectSkill(name, itemEl) {
  skillsListEl.querySelectorAll('.skill-item').forEach((el) => el.classList.remove('active'));
  if (itemEl) itemEl.classList.add('active');

  skillsDetailEl.innerHTML = '<span class="empty">Loading…</span>';
  const skill = await fetchSkillDetail(name);
  if (!skill) {
    skillsDetailEl.innerHTML = '<span class="empty">Could not load this skill.</span>';
    return;
  }

  skillsDetailEl.innerHTML = '';

  const copyBtn = document.createElement('button');
  copyBtn.id = 'copy-invoke-btn';
  copyBtn.textContent = `Copy /${skill.name}`;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(`/${skill.name}`);
      copyBtn.textContent = 'Copied!';
    } catch {
      copyBtn.textContent = 'Copy failed';
    }
    setTimeout(() => { copyBtn.textContent = `Copy /${skill.name}`; }, 1500);
  });
  skillsDetailEl.appendChild(copyBtn);

  const pre = document.createElement('pre');
  pre.textContent = skill.body;
  skillsDetailEl.appendChild(pre);
}

async function toggleSkillsPanel() {
  const opening = skillsPanel.hidden;
  skillsPanel.hidden = !opening;
  if (opening && !skillsLoaded) {
    skillsLoaded = true;
    skillsListEl.innerHTML = '<span class="empty">Loading…</span>';
    const skills = await fetchSkillList();
    renderSkillList(skills);
  }
}

skillsBtnEl.addEventListener('click', toggleSkillsPanel);
