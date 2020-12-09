const jsforce = require('jsforce')

const ADCVD_CASE_FIELDS = [
  'ADCVD_Case__r.Id',
  'ADCVD_Case__r.ADCVD_Case_Number__c',
  'ADCVD_Case__r.Commodity__c',
  'ADCVD_Case__r.Country_Text__c',
  'ADCVD_Case__r.Name',
  'ADCVD_Case__r.Product__c',
  'ADCVD_Case__r.Product_Short_Name__c'
].join()

const HTS_FIELDS = [
  'Id',
  'HTS_Number__c',
  'HTS_Number_Formatted__c'
]

var JsforceUtil = {
  login: () => {
    return new Promise((resolve) => {
      var conn = new jsforce.Connection({
        loginUrl: 'https://trade.my.salesforce.com'
      })

      console.log('before login')
      conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD, function (err) {
        if (err) throw err
        console.log('logged in')
        resolve(conn)
      })
    })
  },

  queryAdcvdOrders: () => {
    return JsforceUtil.login()
      .then((conn) => {
        console.log('executing query on ADCVD Orders')
        return new Promise((resolve) => {
          var records = []
          var query = conn.query(`SELECT Id, ${ADCVD_CASE_FIELDS}, (SELECT ${HTS_FIELDS} FROM Harmonized_Tariff_Schedules__r) FROM ADCVD_Order__c WHERE Status__c != 'Revoked-Complete' ORDER BY Id ASC`)
            .on('record', function (record) {
              records.push(record)
            })
            .on('end', async function () {
              console.log('total in database : ' + query.totalSize)
              console.log('total fetched : ' + query.totalFetched)
              resolve(records)
            })
            .on('error', function (err) {
              console.error(err)
            })
            .run({ autoFetch: true })
        })
      })
  },

  queryInvestigations: () => {
    return JsforceUtil.login()
      .then((conn) => {
        console.log('executing query on Investigations')
        return new Promise((resolve) => {
          conn.sobject('Investigation__c')
            .select('ADCVD_Case__r.*')
            .where({ Next_Announcement_Date__c: { $ne: null } })
            .sort({ Id: 1 })
            .execute((err, records) => {
              console.log(`fetched Investigations: ${records.length}`)
              if (err) throw err
              resolve(records)
            })
        })
      })
  },

  querySegments: () => {
    return JsforceUtil.login()
      .then((conn) => {
        console.log('executing query on Segments')
        return new Promise((resolve) => {
          conn.sobject('Segment__c')
            .select('ADCVD_Case__r.*')
            .where({ Next_Announcement_Date__c: { $ne: null } })
            .sort({ Id: 1 })
            .execute((err, records) => {
              console.log(`fetched Segments: ${records.length}`)
              if (err) throw err
              resolve(records)
            })
        })
      })
  }
}

module.exports = JsforceUtil
