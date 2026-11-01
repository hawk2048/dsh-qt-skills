/**
 * dsh-qt-skills — 把 Qt 官方 agent-skills 作为 DSH 技能提供。
 *
 * 上游：https://github.com/TheQtCompanyRnD/agent-skills（LicenseRef-Qt-Commercial OR BSD-3-Clause）
 * 本包只做「搬运 + 注册」，不改写任何一个技能的正文。
 *
 * 注册路径：ctx.skills.register({ ... }) —— runtime 技能，source = 'bundled'，
 * 并用 resourceBase 指向包内的技能目录，让技能正文里引用的 references/、lint 脚本可按相对路径找到。
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKILLS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')

const FOLD = new Set(['>', '>-', '>+'])
const LITERAL = new Set(['|', '|-', '|+'])

/** YAML 标量去引号（frontmatter 里只出现单/双引号与裸标量）。 */
function scalar(raw) {
  const v = raw.trim()
  if (v.length >= 2) {
    const q = v[0]
    if ((q === '"' || q === "'") && v.endsWith(q)) return v.slice(1, -1)
  }
  return v
}

/** 折叠块（>）：连续非空行以空格相连，空行变成换行。 */
function fold(lines) {
  let out = ''
  for (const line of lines) {
    if (!line) {
      out += '\n'
      continue
    }
    if (out && !out.endsWith('\n')) out += ' '
    out += line
  }
  return out.trim()
}

function dedent(lines) {
  const widths = lines.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)[0].length)
  const indent = widths.length ? Math.min(...widths) : 0
  return lines.map((l) => (l.trim() ? l.slice(indent) : ''))
}

/**
 * 解析 SKILL.md 的 frontmatter。只实现本仓技能实际用到的子集：
 * 顶层标量、`>` / `|` 块标量、以及被整体忽略的嵌套块（metadata 等）。
 */
export function parseFrontmatter(text) {
  const source = text.replace(/^\uFEFF/, '')
  const lines = source.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return { data: {}, body: source }

  let end = -1
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      end = i
      break
    }
  }
  if (end === -1) return { data: {}, body: source }

  const data = {}
  let i = 1
  while (i < end) {
    const line = lines[i]
    if (!line.trim() || line.trimStart().startsWith('#')) {
      i += 1
      continue
    }
    const match = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(line)
    if (!match) {
      i += 1
      continue
    }
    const key = match[1]
    const inline = match[2].trim()
    i += 1

    if (FOLD.has(inline) || LITERAL.has(inline)) {
      const buffer = []
      while (i < end && (lines[i].trim() === '' || /^[ \t]/.test(lines[i]))) {
        buffer.push(lines[i])
        i += 1
      }
      const body = dedent(buffer)
      data[key] = FOLD.has(inline) ? fold(body) : body.join('\n').replace(/\s+$/, '')
      continue
    }

    if (inline === '') {
      // 嵌套块（metadata / labels …）：内容不参与注册，整块跳过。
      while (i < end && (lines[i].trim() === '' || /^[ \t]/.test(lines[i]))) i += 1
      continue
    }

    data[key] = scalar(inline)
  }

  return { data, body: lines.slice(end + 1).join('\n').replace(/^\r?\n/, '') }
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 读取包内全部技能；坏掉的那个跳过而不是让整个插件起不来。 */
export function loadSkills(root = SKILLS_DIR) {
  const out = []
  for (const entry of readdirSync(root).sort()) {
    const dir = join(root, entry)
    if (!statSync(dir).isDirectory()) continue
    const file = join(dir, 'SKILL.md')
    let text
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const { data, body } = parseFrontmatter(text)
    const name = String(data.name ?? entry).trim()
    const description = String(data.description ?? '').trim()
    if (!KEBAB.test(name) || !description) continue
    out.push({
      name,
      description,
      whenToUse: data.whenToUse ? String(data.whenToUse).trim() : undefined,
      directory: dir,
      path: file,
      content: body,
    })
  }
  return out
}

export const inject = ['skills']

export function apply(ctx) {
  ctx.effect(() => {
    const skills = loadSkills()
    const disposers = skills.map((skill) =>
      ctx.skills.register({
        name: skill.name,
        description: skill.description,
        ...(skill.whenToUse ? { whenToUse: skill.whenToUse } : {}),
        content: skill.content,
        source: 'bundled',
        path: skill.path,
        resourceBase: { kind: 'directory', path: skill.directory },
      }),
    )
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'dsh-qt-skills: register bundled Qt skills')
}
