const _ = require('lodash')

const urlTemplate = process.env.URL_TEMPLATE

var Extractor = {
  extract: (recordMap, records) => {
    _.forEach(records, (r) => {
      const id = r.ADCVD_Case__r.Id
      if (!_.isNil(recordMap[id])) return

      let htsNums = null
      let htsNumsRaw = null
      let htsNumberPrefixes = []
      if (r.Harmonized_Tariff_Schedules__r) {
        htsNums = r.Harmonized_Tariff_Schedules__r.records.map(hts => hts.HTS_Number_Formatted__c)
        htsNumsRaw = r.Harmonized_Tariff_Schedules__r.records.map(hts => hts.HTS_Number__c)
        htsNumberPrefixes = Extractor.transformHtsNumPrefixes(htsNumsRaw)
      }

      const newEntry = {
        Id: r.ADCVD_Case__r.Id,
        caseNumber: r.ADCVD_Case__r.ADCVD_Case_Number__c,
        country: r.ADCVD_Case__r.Country_Text__c,
        commodity: r.ADCVD_Case__r.Commodity__c,
        productName: r.ADCVD_Case__r.Product__c,
        productNameSanitized: r.ADCVD_Case__r.Product__c.replace(/,/g, ' ').replace(/\s+/g, ' '),
        productShortName: r.ADCVD_Case__r.Product_Short_Name__c,
        url: urlTemplate + r.ADCVD_Case__r.ADCVD_Case_Number__c,
        htsNums: htsNums,
        htsNumsRaw: htsNumsRaw,
        htsNumberPrefixes: htsNumberPrefixes
      }
      console.log(`adding ${newEntry.caseNumber}`)
      recordMap[id] = newEntry
    })
    return recordMap
  },

  transformHtsNumPrefixes: (htsNumsRaw) => {
    const htsNumberPrefixes = []
    _.forEach(htsNumsRaw, function (htsNum) {
      for (var i = 2; i <= htsNum.length; i++) {
        htsNumberPrefixes.push(htsNum.substr(0, i))
      }
    })
    return _.uniq(htsNumberPrefixes)
  }
}

module.exports = Extractor
