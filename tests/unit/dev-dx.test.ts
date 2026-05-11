import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('Dev Environment & DX', () => {
  describe('.editorconfig', () => {
    const editorconfigPath = resolve(root, '.editorconfig')

    it('exists', () => {
      expect(existsSync(editorconfigPath)).toBe(true)
    })

    it('has root = true', () => {
      const content = readFileSync(editorconfigPath, 'utf-8')
      expect(content).toContain('root = true')
    })

    it('uses spaces with indent_size = 2', () => {
      const content = readFileSync(editorconfigPath, 'utf-8')
      expect(content).toContain('indent_style = space')
      expect(content).toContain('indent_size = 2')
    })

    it('uses lf line endings', () => {
      const content = readFileSync(editorconfigPath, 'utf-8')
      expect(content).toContain('end_of_line = lf')
    })

    it('uses utf-8 charset', () => {
      const content = readFileSync(editorconfigPath, 'utf-8')
      expect(content).toContain('charset = utf-8')
    })

    it('trims trailing whitespace except in markdown', () => {
      const content = readFileSync(editorconfigPath, 'utf-8')
      expect(content).toContain('trim_trailing_whitespace = true')
      expect(content).toMatch(/\[.*\.md\][\s\S]*trim_trailing_whitespace = false/)
    })
  })

  describe('package.json scripts', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))

    it('has deploy script with cloudflare adapter', () => {
      expect(pkg.scripts.deploy).toBe('ADAPTER=cloudflare wrangler deploy')
    })

    it('has db:reset:local script', () => {
      expect(pkg.scripts['db:reset:local']).toContain('rm -rf')
      expect(pkg.scripts['db:reset:local']).toContain('db:migrate:local')
    })

    it('prepare script includes simple-git-hooks', () => {
      expect(pkg.scripts.prepare).toContain('simple-git-hooks')
      expect(pkg.scripts.prepare).toContain('svelte-kit sync')
    })

    it('has simple-git-hooks config with pre-commit', () => {
      expect(pkg['simple-git-hooks']).toBeDefined()
      expect(pkg['simple-git-hooks']['pre-commit']).toBeDefined()
      expect(pkg['simple-git-hooks']['pre-commit']).toContain('format:check')
      expect(pkg['simple-git-hooks']['pre-commit']).toContain('lint')
    })

    it('has simple-git-hooks as devDependency', () => {
      expect(pkg.devDependencies['simple-git-hooks']).toBeDefined()
    })
  })

  describe('.env.example', () => {
    const envExamplePath = resolve(root, '.env.example')

    it('exists', () => {
      expect(existsSync(envExamplePath)).toBe(true)
    })

    it('has ORIGIN with localhost default', () => {
      const content = readFileSync(envExamplePath, 'utf-8')
      expect(content).toContain('ORIGIN="http://localhost:5173"')
    })

    it('has BETTER_AUTH_SECRET with dev default', () => {
      const content = readFileSync(envExamplePath, 'utf-8')
      expect(content).toMatch(/BETTER_AUTH_SECRET="[^"]+"/)
      expect(content).toContain('dev-secret')
    })

    it('documents generation command for production secret', () => {
      const content = readFileSync(envExamplePath, 'utf-8')
      expect(content).toContain('randomBytes')
    })

    it('includes PUBLIC_FIREBASE_CONFIG', () => {
      const content = readFileSync(envExamplePath, 'utf-8')
      expect(content).toContain('PUBLIC_FIREBASE_CONFIG')
    })
  })

  describe('.gitignore', () => {
    const gitignorePath = resolve(root, '.gitignore')

    it('excludes package-lock.json', () => {
      const content = readFileSync(gitignorePath, 'utf-8')
      expect(content).toContain('package-lock.json')
    })

    it('preserves .env.test negation', () => {
      const content = readFileSync(gitignorePath, 'utf-8')
      expect(content).toContain('!.env.test')
    })
  })

  describe('VS Code config', () => {
    it('has recommended extensions including playwright and editorconfig', () => {
      const extensions = JSON.parse(readFileSync(resolve(root, '.vscode/extensions.json'), 'utf-8'))
      expect(extensions.recommendations).toContain('ms-playwright.playwright')
      expect(extensions.recommendations).toContain('editorconfig.editorconfig')
      expect(extensions.recommendations).toContain('svelte.svelte-vscode')
    })

    it('has workspace settings for editor config', () => {
      const settings = JSON.parse(readFileSync(resolve(root, '.vscode/settings.json'), 'utf-8'))
      expect(settings['editor.tabSize']).toBe(2)
      expect(settings['files.eol']).toBe('\n')
      expect(settings['files.insertFinalNewline']).toBe(true)
      expect(settings['files.trimTrailingWhitespace']).toBe(true)
    })
  })

  describe('lock files', () => {
    it('does not have package-lock.json', () => {
      expect(existsSync(resolve(root, 'package-lock.json'))).toBe(false)
    })

    it('has bun.lock', () => {
      expect(existsSync(resolve(root, 'bun.lock'))).toBe(true)
    })
  })

  describe('git hooks', () => {
    it('has pre-commit hook installed', () => {
      const hookPath = resolve(root, '.git/hooks/pre-commit')
      expect(existsSync(hookPath)).toBe(true)
      const content = readFileSync(hookPath, 'utf-8')
      expect(content).toContain('format:check')
      expect(content).toContain('lint')
    })
  })
})
