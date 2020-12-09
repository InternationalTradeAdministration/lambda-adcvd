const JsforceUtil = require('./jsforce_util')
const Extractor = require('./extractor')
const Loader = require('./loader')

module.exports = {
  handler: (_event, _context, callback) => {
    var recordMap = {}
    JsforceUtil.queryAdcvdOrders()
      .then(results => Extractor.extract(recordMap, results))
      .then(recordMap => JsforceUtil.queryInvestigations())
      .then(results => Extractor.extract(recordMap, results))
      .then(recordMap => JsforceUtil.querySegments())
      .then(results => Extractor.extract(recordMap, results))
      .then((recordMap) => Loader.load('adcvd_orders', Object.values(recordMap)))
      .then(() => {
        callback(null, 'done')
      })
      .catch(err => {
        console.log(`err: ${err}`)
        callback(err)
      })
  }
}
