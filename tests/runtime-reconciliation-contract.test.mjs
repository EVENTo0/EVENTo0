import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/runtime-reconciliation.json'), 'utf8'))
const preflight = fs.readFileSync(path.join(root, 'supabase/review/runtime_reconciliation_preflight.sql'), 'utf8')
const sprint = fs.readFileSync(path.join(root, 'docs/RUNTIME_RECONCILIATION_SPRINT.md'), 'utf8')

test('runtime reconciliation keeps one canonical EVENTO company repository', () => {
  assert.equal(config.canonicalRepository, 'EVENTo0/EVENTo0')
  assert.equal(config.supabaseProjectRef, 'jaxhaiaftpegcodkzaus')
  assert.equal(config.mode, 'reconcile-live-before-new-gates')
})

test('live runtime contract includes the complete current commercial path', () => {
  assert.deepEqual(config.liveRuntime, {
    request: 'project_requests',
    analysis: 'request_analyses',
    events: 'project_request_events',
    workflow: 'project_workflows',
    quote: 'project_quotes',
    payment: 'project_payments',
    buildQueue: 'project_build_queue',
  })
})

test('recovery model is explicit and never silently replaces live commercial truth', () => {
  assert.ok(config.recoveryModel.quote.includes('quote_versions'))
  assert.ok(config.recoveryModel.contract.includes('contract_acceptances'))
  assert.ok(config.recoveryModel.payment.includes('payment_events'))
  assert.ok(config.recoveryModel.preview.includes('project_preview_versions'))
  assert.ok(config.recoveryModel.delivery.includes('project_delivery_acceptances'))
  assert.match(config.commercialTruth.quote, /live project_quotes/i)
  assert.match(config.commercialTruth.payment, /verified provider events/i)
})

test('dangerous production automation remains closed during reconciliation', () => {
  assert.equal(config.writeGates.productionSchemaMutation, false)
  assert.equal(config.writeGates.liveBilling, false)
  assert.equal(config.writeGates.automaticAgentBuild, false)
  assert.equal(config.writeGates.automaticRelease, false)
  assert.equal(config.activationSequence.at(0), 'capture-live-contract')
  assert.equal(config.activationSequence.at(-1), 'consider-production-promotion')
})

test('preflight SQL is transaction-level read only and contains no mutation statements', () => {
  const withoutComments = preflight
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .toLowerCase()

  assert.match(withoutComments, /begin\s*;/)
  assert.match(withoutComments, /set\s+transaction\s+read\s+only\s*;/)
  assert.match(withoutComments, /rollback\s*;/)
  assert.doesNotMatch(withoutComments, /\b(create|alter|drop|insert|update|delete|truncate|grant|revoke)\b\s+/)
})

test('sprint preserves payment, fulfillment, preview and release separation', () => {
  assert.match(sprint, /Browser redirects never prove payment/i)
  assert.match(sprint, /human fulfillment authorization/i)
  assert.match(sprint, /Preview is not Production/i)
  assert.match(sprint, /Customer delivery acceptance never grants merge/i)
  assert.match(sprint, /Do not perform these yet/i)
})
