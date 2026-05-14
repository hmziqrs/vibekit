import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const LOCALES_DIR = resolve(import.meta.dirname, '..', 'messages')

function loadMessages(locale: string): Record<string, string> {
  const path = resolve(LOCALES_DIR, `${locale}.json`)
  const raw = readFileSync(path, 'utf8')
  const json = JSON.parse(raw)
  const { $schema: _, ...messages } = json
  return messages as Record<string, string>
}

function main(): void {
  const enMessages = loadMessages('en')
  const urMessages = loadMessages('ur')

  const enKeys = new Set(Object.keys(enMessages))
  const urKeys = new Set(Object.keys(urMessages))

  let errors = 0

  const missingInUr = [...enKeys].filter((k) => !urKeys.has(k))
  if (missingInUr.length > 0) {
    console.error('Missing keys in ur.json:')
    for (const key of missingInUr) {
      console.error(`  - ${key}`)
    }
    errors += missingInUr.length
  }

  const extraInUr = [...urKeys].filter((k) => !enKeys.has(k))
  if (extraInUr.length > 0) {
    console.error('Extra keys in ur.json (not in en.json):')
    for (const key of extraInUr) {
      console.error(`  - ${key}`)
    }
    errors += extraInUr.length
  }

  for (const [key, value] of Object.entries(urMessages)) {
    if (!value.trim()) {
      console.error(`Empty translation for key "${key}" in ur.json`)
      errors++
    }
  }

  let untranslated = 0
  for (const [key, value] of Object.entries(urMessages)) {
    if (enMessages[key] && value === enMessages[key] && key !== 'hello_world') {
      console.warn(`Warning: "${key}" in ur.json is identical to English`)
      untranslated++
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} error(s) found.`)
    process.exit(1)
  }

  console.log(
    `Translation check passed. ${enKeys.size} keys in en.json, ${urKeys.size} keys in ur.json.`
  )
  if (untranslated > 0) {
    console.log(`${untranslated} key(s) may need Urdu translation.`)
  }
}

main()
