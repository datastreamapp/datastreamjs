import { fetchSetDefaults, fetchReadableStream } from '@datastream/fetch'

const domain = 'https://api.datastream.org'
export const setAPIKey = (apikey) => {
  fetchSetDefaults({
    headers: {
      Accept: 'application/vnd.api+json',
      'x-api-key': apikey
    },
    qs: {
      $top: 10000
    },
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
  return request('/v1/odata/v4/Metadata', qs)
}

export const locations = async (qs) => {
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
    $filter: qs.$filter.replaceAll('LocationId', 'Id')
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
  return partitionRequest('/v1/odata/v4/Observations', qs)
}

export const records = async (qs) => {
  return partitionRequest('/v1/odata/v4/Records', qs)
}