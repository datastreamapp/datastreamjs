<h1 align="center">
  <img src="https://raw.githubusercontent.com/datastreamapp/api-docs/main/docs/images/datastream.svg?sanitize=true" alt="DataStream Logo" width="400">
  <br/>
  DataStreamJS
  <br/>
  <br/>
</h1>
<p align="center">
  DataStream.org API helper. See <a href="https://github.com/datastreamapp/api-docs/tree/main/docs">API documentation</a> for query string values and structure.
</p>

## Install

```bash
npm install https://github.com/datastreamapp/datastreamjs
```

## Use

This packages works in the browser and with NodeJS.

### Identify your application

Every request already identifies this package, for example
`datastreamjs/0.1.0 node/24.15.0`. Use `setUserAgent` to name your own
application alongside it, so DataStream can attribute traffic and diagnose slow
or failing requests. The version is optional, and it does not matter whether you
call it before or after `setAPIKey`.

```javascript
import { setUserAgent } from '@datastreamapp/datastreamjs'

setUserAgent('MyProject', '1.0')
// User-Agent: MyProject/1.0 datastreamjs/0.1.0 node/24.15.0
```

The name must be a single token of letters, digits, `.`, `_`, `+` or `-`;
anything else throws. Note that browsers drop `User-Agent` as a
[forbidden header name](https://developer.mozilla.org/docs/Glossary/Forbidden_header_name),
so this only reaches the API from NodeJS.

### Example

```javascript
import {
  setAPIKey,
  setUserAgent,
  metadata,
  locations,
  records,
  observations
} from '@datastreamapp/datastreamjs'

setAPIKey('xxxxxxxxxx') // secrets should be injected securely
setUserAgent('MyProject', '1.0')

const observationsStream = await observations({
  $select:
    'DOI,ActivityType,ActivityMediaName,ActivityStartDate,ActivityStartTime,SampleCollectionEquipmentName,CharacteristicName,MethodSpeciation,ResultSampleFraction,ResultValue,ResultUnit,ResultValueType',
  $filter: `DOI eq '10.25976/xxxx-xx00'`,
  $top: 10000
})

for await (const observation of observationsStream) {
  // use record
}
```

### Example: save to file

```javascript
import { pipeline } from '@datastream/core'
import { csvFormatStream } from '@datastream/csv/format'
import { createWriteStream } from 'node:fs'

import {
  setAPIKey,
  metadata,
  locations,
  records,
  observations
} from '@datastreamapp/datastreamjs'

setAPIKey('xxxxxxxxxx') // secrets should be injected securely

const recordsStream = await records({
  $select:
    'DOI,ActivityType,ActivityMediaName,ActivityStartDate,ActivityStartTime,SampleCollectionEquipmentName,CharacteristicName,MethodSpeciation,ResultSampleFraction,ResultValue,ResultUnit,ResultValueType',
  $filter: `DOI eq '10.25976/xxxx-xx00'`,
  $top: 10000
})

await pipeline([
  recordsStream,
  csvFormatStream(),
  createWriteStream('/path/to/output.csv')
])
```
