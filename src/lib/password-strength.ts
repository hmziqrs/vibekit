const VARIETY_WEIGHT = 25
const UNIQUENESS_WEIGHT = 25

const COMMON_PATTERNS = [
  '123456',
  'password',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'login',
  'admin',
  '111111',
  'sunshine',
  'iloveyou',
  'trustno1',
]

export interface PasswordStrengthResult {
  feedback: string[]
  label: string
  score: number
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { feedback: [], label: '', score: 0 }
  }

  const feedback: string[] = []
  let lengthScore = 0
  let complexityScore = 0
  let varietyScore = 0
  let uniquenessScore = 0

  // Length scoring
  if (password.length >= 8) lengthScore += 8
  if (password.length >= 12) lengthScore += 8
  if (password.length >= 16) lengthScore += 9
  if (password.length < 8) feedback.push('Use at least 8 characters')

  // Complexity scoring (character classes)
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)

  if (hasLower) complexityScore += 6
  else feedback.push('Add a lowercase letter')

  if (hasUpper) complexityScore += 6
  else feedback.push('Add an uppercase letter')

  if (hasDigit) complexityScore += 7
  else feedback.push('Add a number')

  if (hasSpecial) complexityScore += 6
  else feedback.push('Add a special character')

  // Variety scoring (unique characters)
  const uniqueChars = new Set(password.toLowerCase()).size
  const uniqueRatio = uniqueChars / password.length
  varietyScore = Math.round(uniqueRatio * VARIETY_WEIGHT)

  // Uniqueness scoring (not a common pattern)
  const lowerPassword = password.toLowerCase()
  const isCommon = COMMON_PATTERNS.some((p) => lowerPassword.includes(p) || lowerPassword === p)
  if (!isCommon) {
    uniquenessScore = UNIQUENESS_WEIGHT
  } else {
    feedback.push('Avoid common passwords')
  }

  // Penalize repeated characters
  if (/(.)\1{2,}/.test(password)) {
    uniquenessScore -= 10
    feedback.push('Avoid repeated characters')
  }

  // Penalize sequences
  if (hasSequentialChars(password)) {
    uniquenessScore -= 8
    feedback.push('Avoid sequential characters')
  }

  uniquenessScore = Math.max(0, uniquenessScore)

  const totalScore = Math.min(100, lengthScore + complexityScore + varietyScore + uniquenessScore)
  let score = 0
  if (totalScore > 20) score = 1
  if (totalScore > 40) score = 2
  if (totalScore > 60) score = 3
  if (totalScore > 80) score = 4

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
  const label = labels[score]

  return { feedback, label, score }
}

export function getPasswordStrengthColor(score: number): string {
  const colors = [
    'text-red-500',
    'text-orange-500',
    'text-yellow-500',
    'text-green-400',
    'text-green-500',
  ]
  return colors[score] ?? 'text-text-muted'
}

export function getPasswordStrengthBarColor(score: number): string {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-500']
  return colors[score] ?? 'bg-text-muted'
}

function hasSequentialChars(password: string): boolean {
  const lower = password.toLowerCase()
  for (let i = 0; i < lower.length - 2; i++) {
    const code1 = lower.charCodeAt(i)
    const code2 = lower.charCodeAt(i + 1)
    const code3 = lower.charCodeAt(i + 2)
    if (code2 - code1 === 1 && code3 - code2 === 1) return true
    if (code1 - code2 === 1 && code2 - code3 === 1) return true
  }
  return false
}
