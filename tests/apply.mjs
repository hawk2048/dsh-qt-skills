/**
 * 用桩 ctx 真跑一次 apply()，验证插件确实把 13 个技能注册进去、
 * 且注册字段（source / resourceBase / content）符合 skills Service 契约。
 * 跑法：node tests/apply.mjs
 */
import assert from 'node:assert/strict'
import { apply, inject } from '../lib/index.js'

assert.deepEqual(inject, ['skills'], 'inject 应只依赖 skills Service')

const registered = []
const effects = []
const ctx = {
  skills: {
    register(skill) {
      registered.push(skill)
      return () => registered.pop()
    },
  },
  effect(fn, label) {
    const dispose = fn()
    effects.push({ label, dispose })
    return dispose
  },
}

apply(ctx)

assert.equal(registered.length, 13, `应注册 13 个技能，实际 ${registered.length}`)
assert.equal(effects.length, 1, '应在单个 effect 里注册，便于整体 teardown')
assert.ok(effects[0].label.includes('dsh-qt-skills'), 'effect 应带可读标签')

for (const skill of registered) {
  assert.match(skill.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${skill.name} 不是 kebab-case`)
  assert.ok(skill.description && skill.description.length > 40, `${skill.name} 缺 description`)
  assert.equal(skill.source, 'bundled', `${skill.name} 的 source 应为 bundled`)
  assert.equal(skill.resourceBase.kind, 'directory', `${skill.name} 缺 directory resourceBase`)
  assert.ok(skill.path.endsWith('SKILL.md'), `${skill.name} 的 path 应指向 SKILL.md`)
  assert.ok(skill.content.includes('#'), `${skill.name} 正文应为 Markdown`)
}

// teardown 必须把所有注册都撤掉
for (const effect of effects) effect.dispose()
assert.equal(registered.length, 0, 'teardown 后不应残留注册')

const names = new Set()
apply({ ...ctx, skills: { register: (s) => (names.add(s.name), () => {}) } })
assert.equal(names.size, 13, '重复 apply 应得到同样的 13 个名字')
assert.ok(names.has('qt-cmake-project') && names.has('qt-qml-review'), '关键技能应存在')

console.log('ok — apply() 注册 13 个 bundled 技能，字段与 teardown 均符合契约')
