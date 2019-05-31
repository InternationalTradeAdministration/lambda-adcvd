const sf = require('jsforce')
const AWS = require('aws-sdk')
const request = require('request')
const s3 = new AWS.S3()
const moment = require('moment')
require('dotenv').config()

const sfLoginUrl = process.env.SF_LOGIN_URL
const sfUsername = process.env.SF_USERNAME
const sfPassword = process.env.SF_PASSWORD
const urlTemplate = process.env.URL_TEMPLATE
const apiKey = process.env.API_KEY
const s3Bucket = process.env.S3_BUCKET
const freshenUrl = process.env.FRESHEN_URL

const conn = new sf.Connection({ loginUrl: sfLoginUrl })

const adcvdQuery =
'SELECT Id, ' +
'ADCVD_Case_Number__c, ' +
'Product__c, ' +
'Product_Short_Name__c, ' +
'Country__c, ' +
'Commodity__c, ' +
'(SELECT id, ' +
'       RecordTypeId, ' +
'       Actual_Final_Signature__c, ' +
'       Initiation_Extension_Remaining__c, ' +
'       Preliminary_Extension_Remaining__c, ' +
'       Final_Extension_Remaining__c, ' +
'       Initiation_Announcement_Date__c, ' +
'       Preliminary_Announcement_Date__c, ' +
'       Final_Announcement_Date__c, ' +
'       Next_Announcement_Date__c, ' +
'       RecordType.Name ' +
'FROM   Segments__r ' +
'WHERE  Next_Announcement_Date__c != NULL ' +
'ORDER  BY Next_Announcement_Date__c ASC), ' +
'(SELECT Id, ' +
'       HTS_Number__c, ' +
'       HTS_Number_Formatted__c ' +
'FROM   Harmonized_Tariff_Schedules__r  ' +
'ORDER  BY HTS_Number_Formatted__c ASC) ' +
'FROM   ADCVD_Order__c '

// For development/testing purposes
exports.handler = function (event, context) {
  conn.login(sfUsername, sfPassword, function (err, res) {
    if (err) { return console.error(err) }
    console.log('Logged into Salesforce successfully!')
    getAdcvdObjects(writeToBucket)
  })
}

const getAdcvdObjects = (writeToS3BucketFn) => {
  var translatedRecords = []
  var query = conn.query(adcvdQuery)
    .on('record', function (record) {
      translatedRecords.push(translate(record, urlTemplate))
    })
    .on('end', async function () {
      console.log('total in database : ' + query.totalSize)
      console.log('total fetched : ' + query.totalFetched)
      writeToS3BucketFn(await Promise.all(translatedRecords))
    })
    .on('error', function (err) {
      console.error(err)
    })
    .run({ autoFetch: true })
}

const translate = (r, urlTemplate) => {
  let newSegments = []
  if (r['Segments__r']) {
    newSegments = r['Segments__r'].records.map((seg) => {
      const announcementInfo = getAnnouncementTypeInfo(seg)
      const recordType = seg.RecordType.Name
      return {
        id: seg.Id,
        announcementDate: moment(seg.Next_Announcement_Date__c, 'YYYY-MM-DD').format('MM/DD/YYYY'),
        announcementType: announcementInfo.type,
        daysRemaining: announcementInfo.daysRemaining,
        decisionSigned: announcementInfo.decisionSigned,
        recordType
      }
    })
  }

  let htsNums = null; let htsNumsRaw = null
  if (r['Harmonized_Tariff_Schedules__r']) {
    htsNums = r['Harmonized_Tariff_Schedules__r'].records.map(hts => hts.HTS_Number_Formatted__c)
    htsNumsRaw = r['Harmonized_Tariff_Schedules__r'].records.map(hts => hts.HTS_Number__c)
  }

  let newEntry = {}
  newEntry['productShortName'] = r['Product_Short_Name__c']
  newEntry['country'] = r['Country__c']
  newEntry['caseNumber'] = r['ADCVD_Case_Number__c']
  newEntry['segments'] = newSegments
  newEntry['productName'] = r['Product__c']
  newEntry['commodity'] = r['Commodity__c']
  newEntry['url'] = urlTemplate + r['ADCVD_Case_Number__c']
  newEntry['htsNums'] = htsNums
  newEntry['htsNumsRaw'] = htsNumsRaw

  return newEntry
}

const writeToBucket = (entries) => {
  const params = {
    Body: JSON.stringify(entries, null, 2),
    Bucket: s3Bucket,
    Key: 'orders.json',
    ACL: 'public-read',
    ContentType: 'application/json'
  }
  s3.putObject(params, function (err, data) {
    if (err) { return console.error(err) }
    console.log('File uploaded successfully!')
    freshenEndpoint()
  })
}

const freshenEndpoint = () => {
  request(freshenUrl + apiKey, function (err, res, body) {
    if (err || (res && res.statusCode !== 200)) return console.error(`An error occurred while freshening the endpoint. ${body}`)
    console.log('Endpoint updated successfully!')
  })
}

const getAnnouncementTypeInfo = (seg) => {
  let announcementTypeInfo = {}

  if (seg.Next_Announcement_Date__c === seg.Initiation_Announcement_Date__c) {
    announcementTypeInfo = { type: 'Initiation', daysRemaining: seg.Initiation_Extension_Remaining__c }
  } else if (seg.Next_Announcement_Date__c === seg.Preliminary_Announcement_Date__c) {
    announcementTypeInfo = { type: 'Preliminary', daysRemaining: seg.Preliminary_Extension_Remaining__c }
  } else if (seg.Next_Announcement_Date__c === seg.Final_Announcement_Date__c) {
    announcementTypeInfo = { type: 'Final', daysRemaining: seg.Final_Extension_Remaining__c }
  }
  if (seg.Actual_Final_Signature__c) {
    announcementTypeInfo.daysRemaining = 'Decision Signed'
    announcementTypeInfo.decisionSigned = true
  } else {
    announcementTypeInfo.decisionSigned = false
  }

  return announcementTypeInfo
}

exports.translate = translate
exports.getAnnouncementTypeInfo = getAnnouncementTypeInfo
