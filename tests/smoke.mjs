/**
 * 冒烟测试：不启动 DSH，只验证 frontmatter 解析与注册数据是否完整。
 * 跑法：node tests/smoke.mjs
 */
import assert from 'node:assert/strict'
import { loadSkills, parseFrontmatter } from '../lib/index.js'

const EXPECTED = [
  'qt-canvas2d',
  'qt-cmake-project',
  'qt-cpp-docs',
  'qt-cpp-review',
  'qt-figma-component-generation',
  'qt-figma-token-extraction',
  'qt-qml',
  'qt-qml-docs',
  'qt-qml-profiler',
  'qt-qml-review',
  'qt-qml-test',
  'qt-qml-test-run',
  'qt-ui-design',
]

const skills = loadSkills()
assert.equal(skills.length, EXPECTED.length, `应注册 ${EXPECTED.length} 个技能，实际 ${skills.length}`)
assert.deepEqual(skills.map((s) => s.name).sort(), [...EXPECTED].sort(), '技能名单应与上游一致')

for (const skill of skills) {
  assert.ok(skill.description.length > 40, `${skill.name}: description 太短`)
  assert.ok(!skill.description.includes('\n'), `${skill.name}: 折叠块里还有未折叠的换行`)
  assert.ok(!skill.description.startsWith('>'), `${skill.name}: description 残留了折叠指示符`)
  assert.ok(skill.content.length > 200, `${skill.name}: 正文太短`)
  assert.ok(!skill.content.startsWith('---'), `${skill.name}: 正文里残留了 frontmatter`)
  assert.ok(skill.directory.endsWith(skill.name), `${skill.name}: resourceBase 目录不对`)
}

// 折叠样张：qt-qml-review 的 description 是 >- 块，必须已折叠成一行
const review = skills.find((s) => s.name === 'qt-qml-review')
assert.match(review.description, /^Invoke when the user asks to review/)
assert.match(review.description, /deterministic linting/)

// 字面量/嵌套块不应污染顶层键
const { data } = parseFrontmatter('---\nname: x-y\ndescription: >\n  a\n  b\nmetadata:\n  author: qt\n---\nbody')
assert.equal(data.name, 'x-y')
assert.equal(data.description, 'a b')
assert.equal(data.metadata, undefined, 'metadata 嵌套块应被整块跳过')

console.log(`ok — ${skills.length} skills, frontmatter 解析与注册数据均通过`)
