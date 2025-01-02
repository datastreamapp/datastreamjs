import { fetchSetDefaults, fetchReadableStream } from '@datastream/fetch'

const domain = 'https://api.datastream.org'
export const setAPIKey = (apikey) => {
  fetchSetDefaults({
    headers: {
      Accept: 'application/vnd.api+json',
      'Accept-Encoding': 'br',
      'x-api-key': apikey
    },
    qs: {},
    dataPath: 'value',
    rateLimit: 0.5
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
