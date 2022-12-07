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

### Example

```javascript
import {
  setAPIKey,
  metadata,
  locations,
  records,
  observations
} from '@datastreamapp/datastreamjs'

setAPIKey('xxxxxxxxxx') // secrets should be injected securely

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
