import { fetchSetDefaults, fetchReadableStream } from '@datastream/fetch'

const domain = 'https://api.datastream.org'

// Keep in sync with package.json; index.js has to stay importable in the
// browser, where a JSON import of package.json is not portable.
const libraryVersion = '0.1.0'
const nodeVersion =
  typeof process !== 'undefined' && process.versions?.node
    ? ` node/${process.versions.node}`
    : ''
const libraryUserAgent = `datastreamjs/${libraryVersion}${nodeVersion}`

// RFC 9110 product token. Excludes whitespace and control characters so a
// caller-supplied name cannot inject additional request headers.
const productRegExp = /^[A-Za-z0-9][A-Za-z0-9._+-]*(?:\/[A-Za-z0-9._+-]+)?$/

fetchSetDefaults({
  headers: {
    Accept: 'application/vnd.api+json',
    'Accept-Encoding': 'br',
    'User-Agent': libraryUserAgent
  },
  qs: {},
  dataPath: 'value',
  rateLimit: 0.5
})

export const setAPIKey = (apikey) => {
  fetchSetDefaults({ headers: { 'x-api-key': apikey } })
}

// Browsers drop User-Agent as a forbidden header name, so this only reaches the
// API from NodeJS.
export const setUserAgent = (name, version) => {
  const product = version ? `${name}/${version}` : name
  if (!productRegExp.test(product)) {
    throw new Error(
      `invalid User-Agent product '${product}': expected a token such as 'MyProject/1.0' using letters, digits, '.', '_', '+' or '-'`
    )
  }
  fetchSetDefaults({
    headers: { 'User-Agent': `${product} ${libraryUserAgent}` }
  })
}

export const request = async (path, qs) => {
  const options = {
    url: `${domain}${path}`,
    qs
  }
  return fetchReadableStream(options)
}

export const metadata = async (qs) => {
  qs.$top ??= 100
  return request('/v1/odata/v4/Metadata', qs)
}

export const locations = async (qs) => {
  qs.$top ??= 10000
  return request('/v1/odata/v4/Locations', qs)
}

const matchPartitionedRegExp = /(^Id| Id|^LocationId| LocationId)/
const partitionRequest = async (path, qs) => {
  // If filtering by specific Id or LocationId, no need to partition
  if (matchPartitionedRegExp.test(qs.$filter ?? '')) {
    return request(path, qs)
  }
  const locationStream = await locations({
    $select: 'Id',
    $filter: qs.$filter
  })

  const optionsArray = []
  for await (const location of locationStream) {
    const options = {
      url: `${domain}${path}`,
      qs: {
        ...qs,
        $filter: `LocationId eq ${location.Id}${
          qs.$filter && ` and ${qs.$filter}`
        }`
      }
    }
    optionsArray.push(options)
  }
  return fetchReadableStream(optionsArray)
}

export const observations = async (qs) => {
  qs.$top ??= 10000
  return partitionRequest('/v1/odata/v4/Observations', qs)
}

export const records = async (qs) => {
  qs.$top ??= 10000
  return partitionRequest('/v1/odata/v4/Records', qs)
}
