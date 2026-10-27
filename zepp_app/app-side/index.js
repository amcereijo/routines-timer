import { BaseSideService } from '@zeppos/zml/base-side'
import { RESOLVE_BASE_URL, CODE_LENGTH } from '../utils/constants'

/** Simple fetch with timeout, matching the page-side contract. */
function fetchWithTimeout(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('fetch timeout')), timeout)
    fetch(url)
      .then((r) => {
        clearTimeout(timer)
        resolve(r)
      })
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}

/**
 * App-side service (runs inside the Zepp phone app). Acts as the HTTPS proxy
 * for the watch: the device cannot rely on direct internet access, so import
 * code resolution is forwarded here and the raw result is returned.
 *
 * Response contract for method 'routine.resolve':
 *   res(null, { status, body }) — status is the HTTP status, or 0 when the
 *   server could not be reached at all (network/transfer failure). The device
 *   maps: 200 → validate, 404 → invalid/expired, 0/other → network error.
 *   A rejected promise on the device instead means the phone itself is
 *   unreachable (BLE/side-service down).
 */
AppSideService(
  BaseSideService({
    onInit() {},
    onRun() {},
    onRequest(req, res) {
      if (!req || req.method !== 'routine.resolve') {
        res('unknown_method')
        return
      }

      const code = req.params && req.params.code
      if (typeof code !== 'string' || code.length !== CODE_LENGTH) {
        res(null, { status: 400, body: '' })
        return
      }

      fetchWithTimeout(`${RESOLVE_BASE_URL}/api/routines/resolve?code=${code}`)
        .then((result) => {
          // In Zepp OS fetch, result.body may be already parsed or a string
          const body =
            typeof result.body === 'string'
              ? result.body
              : JSON.stringify(result.body)
          return { status: result.status, body }
        })
        .then(({ status, body }) => {
          res(null, { status, body })
        })
        .catch(() => {
          res(null, { status: 0, body: '' })
        })
    },
  }),
)
