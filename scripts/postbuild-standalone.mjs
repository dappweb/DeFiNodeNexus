import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const copies = [
  {
    from: path.join(root, '.next', 'static'),
    to: path.join(root, '.next', 'standalone', '.next', 'static'),
    required: true,
  },
  {
    from: path.join(root, 'public'),
    to: path.join(root, '.next', 'standalone', 'public'),
    required: false,
  },
]

for (const copyJob of copies) {
  const { from, to, required } = copyJob
  if (!fs.existsSync(from)) {
    if (required) {
      console.error(`[postbuild] Missing required path: ${from}`)
      process.exit(1)
    }
    continue
  }

  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.cpSync(from, to, { recursive: true, force: true })
  console.log(`[postbuild] Copied ${path.relative(root, from)} -> ${path.relative(root, to)}`)
}

console.log('[postbuild] Standalone assets copied successfully.')
