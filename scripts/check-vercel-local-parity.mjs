import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

const root = process.cwd()
const envPath = path.join(root, '.env')
const envLocalPath = path.join(root, '.env.local')
const vercelProjectPath = path.join(root, '.vercel', 'project.json')

const criticalPublicFallbackPairs = [
  ['NEXT_PUBLIC_NEXUS_ADDRESS', 'NEXUS_ADDRESS'],
  ['NEXT_PUBLIC_SWAP_ADDRESS', 'SWAP_ADDRESS'],
  ['NEXT_PUBLIC_TOT_ADDRESS', 'TOT_TOKEN_ADDRESS'],
  ['NEXT_PUBLIC_TOF_ADDRESS', 'TOF_TOKEN_ADDRESS'],
  ['NEXT_PUBLIC_USDT_ADDRESS', 'USDT_TOKEN_ADDRESS'],
]

const userVisibleParityKeys = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_PREDICTION_PLATFORM_URL',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
]

const serverFeatureKeys = [
  'NEXUS_ADDRESS',
  'SWAP_ADDRESS',
  'TOT_TOKEN_ADDRESS',
  'TOF_TOKEN_ADDRESS',
  'USDT_TOKEN_ADDRESS',
  'ANNOUNCEMENT_ADMIN_TOKEN',
  'ANNOUNCEMENT_DATA_SERVICE_URL',
  'ANNOUNCEMENT_DATA_SERVICE_TOKEN',
  'MYSQL_HOST',
  'MYSQL_PORT',
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'MYSQL_DATABASE',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'KEEPER_SECRET',
  'DEPLOYER_PRIVATE_KEY',
  'NODES_EVENT_SCAN_LOOKBACK_BLOCKS',
]

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  return dotenv.parse(fs.readFileSync(filePath, 'utf8'))
}

function getValue(sources, key) {
  for (const source of sources) {
    const value = source?.[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function mask(value) {
  if (!value) return '(missing)'
  if (value.length <= 10) return value
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

const env = loadEnvFile(envPath)
const envLocal = loadEnvFile(envLocalPath)
const hasEnvLocal = fs.existsSync(envLocalPath)
const hasLinkedVercelProject = fs.existsSync(vercelProjectPath)
const envLocalHeader = hasEnvLocal ? fs.readFileSync(envLocalPath, 'utf8').split(/\r?\n/, 1)[0] : ''
const createdByVercelCli = envLocalHeader.includes('Created by Vercel CLI')

const errors = []
const warnings = []

if (!hasEnvLocal) {
  errors.push('.env.local is missing')
} else if (hasLinkedVercelProject && !createdByVercelCli) {
  warnings.push('.env.local exists but was not pulled by Vercel CLI; local values may drift from Vercel')
}

for (const [publicKey, fallbackKey] of criticalPublicFallbackPairs) {
  const publicValue = getValue([envLocal, env, process.env], publicKey)
  const fallbackValue = getValue([envLocal, env, process.env], fallbackKey)
  if (!publicValue && !fallbackValue) {
    errors.push(`${publicKey} is missing (and fallback ${fallbackKey} is also missing)`)
  }
}

for (const key of userVisibleParityKeys) {
  if (!getValue([envLocal, env, process.env], key)) {
    warnings.push(`${key} is missing; some user-visible behavior may differ from Vercel`)
  }
}

const addressPairs = criticalPublicFallbackPairs

for (const [publicKey, serverKey] of addressPairs) {
  const publicValue = getValue([envLocal, env, process.env], publicKey)
  const serverValue = getValue([env, envLocal, process.env], serverKey)
  if (publicValue && serverValue && publicValue.toLowerCase() !== serverValue.toLowerCase()) {
    errors.push(`${publicKey} != ${serverKey} (${mask(publicValue)} != ${mask(serverValue)})`)
  }
}

const enabledServerFeatures = serverFeatureKeys.filter((key) => getValue([envLocal, env, process.env], key))

if (errors.length > 0) {
  console.error('\n[vercel-parity] Local environment does not match the Vercel-ready expectations.\n')
  for (const error of errors) {
    console.error(`- ${error}`)
  }

  if (warnings.length > 0) {
    console.error('\n[vercel-parity] Additional warnings:')
    for (const warning of warnings) {
      console.error(`- ${warning}`)
    }
  }

  console.error('\nFix: run `npm run vercel:env:pull`, then review .env / .env.local parity keys.\n')
  process.exit(1)
}

console.log('\n[vercel-parity] Local environment looks aligned with Vercel-sensitive settings.')
console.log(`[vercel-parity] .env.local source: ${createdByVercelCli ? 'Vercel CLI pull' : 'custom/local file'}`)
console.log(`[vercel-parity] Server feature keys present: ${enabledServerFeatures.length}`)

if (warnings.length > 0) {
  console.warn('\n[vercel-parity] Warnings:')
  for (const warning of warnings) {
    console.warn(`- ${warning}`)
  }
}
