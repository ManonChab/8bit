const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { listSkills, getSkill } = require('../server/skills');

function makeFixtureDir() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-fixture-'));

  fs.mkdirSync(path.join(root, 'good-skill'));
  fs.writeFileSync(
    path.join(root, 'good-skill', 'SKILL.md'),
    '---\nname: good-skill\ndescription: A perfectly normal skill.\n---\nBody text here.\n'
  );

  fs.mkdirSync(path.join(root, 'no-description'));
  fs.writeFileSync(
    path.join(root, 'no-description', 'SKILL.md'),
    '---\nname: no-description\n---\nBody with no description field.\n'
  );

  fs.mkdirSync(path.join(root, 'malformed-yaml'));
  fs.writeFileSync(
    path.join(root, 'malformed-yaml', 'SKILL.md'),
    '---\nname: [this is not valid yaml\n---\nBody text.\n'
  );

  fs.mkdirSync(path.join(root, 'not-a-skill'));
  // deliberately no SKILL.md in here

  return root;
}

test('lists skills with valid frontmatter', () => {
  const root = makeFixtureDir();
  const skills = listSkills([{ dir: root, scope: 'personal' }]);
  const good = skills.find((s) => s.name === 'good-skill');
  assert.ok(good);
  assert.strictEqual(good.description, 'A perfectly normal skill.');
  assert.strictEqual(good.scope, 'personal');
});

test('handles missing description without crashing', () => {
  const root = makeFixtureDir();
  const skills = listSkills([{ dir: root, scope: 'personal' }]);
  const noDesc = skills.find((s) => s.name === 'no-description');
  assert.ok(noDesc);
  assert.strictEqual(noDesc.description, null);
});

test('falls back to folder name and null description on malformed YAML, without crashing the whole listing', () => {
  const root = makeFixtureDir();
  const skills = listSkills([{ dir: root, scope: 'personal' }]);
  const malformed = skills.find((s) => s.name === 'malformed-yaml');
  assert.ok(malformed, 'malformed skill should still be listed by folder name');
  assert.strictEqual(malformed.description, null);
  // Other skills in the same directory must still come through.
  assert.ok(skills.find((s) => s.name === 'good-skill'));
});

test('skips folders with no SKILL.md', () => {
  const root = makeFixtureDir();
  const skills = listSkills([{ dir: root, scope: 'personal' }]);
  assert.ok(!skills.find((s) => s.name === 'not-a-skill'));
});

test('a directory that does not exist at all yields no skills, not an error', () => {
  const skills = listSkills([{ dir: path.join(os.tmpdir(), 'does-not-exist-xyz'), scope: 'personal' }]);
  assert.deepStrictEqual(skills, []);
});

test('getSkill returns full body for a known skill', () => {
  const root = makeFixtureDir();
  const skill = getSkill('good-skill', [{ dir: root, scope: 'project' }]);
  assert.ok(skill);
  assert.strictEqual(skill.body, 'Body text here.');
  assert.strictEqual(skill.scope, 'project');
});

test('getSkill returns null for an unknown skill', () => {
  const root = makeFixtureDir();
  const skill = getSkill('nonexistent', [{ dir: root, scope: 'project' }]);
  assert.strictEqual(skill, null);
});
