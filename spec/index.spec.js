var chai = require('chai')
var index = require('../index')
var urlTemplate = 'https://beta.trade.gov/adcvd?adcvdcase='

let mockAdcvdRecords

beforeEach(() => {
  mockAdcvdRecords = {
    Product_Short_Name__c: 'bike',
    Country__c: 'greece',
    ADCVD_Case_Number__c: 'bk_gr_001',
    Product__c: 'bicycle',
    Commodity__c: 'nope',
    Segments__r: {
      records: [
        {
          Id: 'segment_id_aaa',
          Next_Announcement_Date__c: '2019-04-10',
          Initiation_Announcement_Date__c: '2019-04-10',
          Final_Announcement_Date__c: null,
          Initiation_Extension_Remaining__c: 123,
          RecordTypeId: 'record_type_id_aaa',
          RecordType:
          {
            attributes:
            {
              type: 'RecordType',
              url: '/services/data/v39.0/sobjects/RecordType/012t0000000TSjxAAA'
            },
            Name: 'SkateBoard'
          }
        },
        {
          Id: 'segment_id_bbb',
          Next_Announcement_Date__c: '1988-04-28',
          Initiation_Announcement_Date__c: null,
          Final_Announcement_Date__c: '1988-04-28',
          Final_Extension_Remaining__c: 789,
          RecordTypeId: 'record_type_id_bbb',
          RecordType:
          {
            attributes:
            {
              type: 'RecordType',
              url: '/services/data/v39.0/sobjects/RecordType/012t0000000TSjxBBB'
            },
            Name: 'JetSki'
          }
        }
      ]
    },
    Harmonized_Tariff_Schedules__r: {
      records: [
        {
          HTS_Number__c: '7229901000',
          HTS_Number_Formatted__c: '7229.90.10.00'
        }, {
          HTS_Number__c: '7229901011',
          HTS_Number_Formatted__c: '7229.90.10.11'
        }
      ]
    }
  }
})

describe('adcvd data translation', () => {
  it('translates Product_Short_Name__c to productShortName', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.productShortName).to.eq('bike')
  })

  it('translates Country__c to country', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.country).to.eq('greece')
  })

  it('translates ADCVD_Case_Number__c to caseNumber', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.caseNumber).to.eq('bk_gr_001')
  })

  it('translates Product__c to productName', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.productName).to.eq('bicycle')
  })

  it('translates Commodity__c to commodity', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.commodity).to.eq('nope')
  })

  it('appends the case search url', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.url).to.eq('https://beta.trade.gov/adcvd?adcvdcase=bk_gr_001')
  })

  it('translates HTS_Number_Formatted__c to htsNums', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.htsNums).to.eql(['7229.90.10.00', '7229.90.10.11'])
  })

  it('translates HTS_Number__c to htsNumsRaw', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.htsNumsRaw).to.eql(['7229901000', '7229901011'])
  })

  it('translates Segments__r Id to segment.id', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.segments[0].id).to.eq('segment_id_aaa')
    chai.expect(result.segments[1].id).to.eq('segment_id_bbb')
  })

  it('translates Segments__r Next_Announcement_Date__c to segment.announcementDate', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.segments[0].announcementDate).to.eq('04/10/2019')
    chai.expect(result.segments[1].announcementDate).to.eq('04/28/1988')
  })

  it('translates Segments__r to segment.announcementType', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.segments[0].announcementType).to.eq('Initiation')
    chai.expect(result.segments[1].announcementType).to.eq('Final')
  })

  it('translates Segments__r to segment.daysRemaining', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.segments[0].daysRemaining).to.eq(123)
    chai.expect(result.segments[1].daysRemaining).to.eq(789)
  })

  it('translates Segments__r to segment.decisionSigned', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.segments[0].decisionSigned).to.eq(false)
    chai.expect(result.segments[1].decisionSigned).to.eq(false)
  })

  it('translates Segments__r Name to segment.recordType', () => {
    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.segments[0].recordType).to.eq('SkateBoard')
    chai.expect(result.segments[1].recordType).to.eq('JetSki')
  })

  it('should handle records with no Segments or Harmonized Tariff Schedules', () => {
    mockAdcvdRecords.Segments__r = null
    mockAdcvdRecords.Harmonized_Tariff_Schedules__r = null

    const result = index.translate(mockAdcvdRecords, urlTemplate)
    chai.expect(result.htsNums).to.deep.eq(null)
    chai.expect(result.htsNumsRaw).to.deep.eq(null)
  })
})

describe('announcement type information translation', () => {
  it('should return a Initiation announcement type', () => {
    const segment = {
      Next_Announcement_Date__c: 'a date',
      Initiation_Announcement_Date__c: 'a date',
      Initiation_Extension_Remaining__c: 123
    }

    const announcement = index.getAnnouncementTypeInfo(segment)
    chai.expect(announcement.type).to.eq('Initiation')
    chai.expect(announcement.daysRemaining).to.eq(123)
  })

  it('should return a Preliminary announcement type', () => {
    const segment = {
      Next_Announcement_Date__c: 'a date',
      Preliminary_Announcement_Date__c: 'a date',
      Preliminary_Extension_Remaining__c: 456
    }

    const announcement = index.getAnnouncementTypeInfo(segment)
    chai.expect(announcement.type).to.eq('Preliminary')
    chai.expect(announcement.daysRemaining).to.eq(456)
  })

  it('should return a Final announcement type', () => {
    const segment = {
      Next_Announcement_Date__c: 'a date',
      Final_Announcement_Date__c: 'a date',
      Final_Extension_Remaining__c: 789
    }

    const announcement = index.getAnnouncementTypeInfo(segment)
    chai.expect(announcement.type).to.eq('Final')
    chai.expect(announcement.daysRemaining).to.eq(789)
  })

  it('should return a Desision Signed TRUE announcement type', () => {
    const segment = { Actual_Final_Signature__c: 'a signiture' }
    const announcement = index.getAnnouncementTypeInfo(segment)
    chai.expect(announcement.daysRemaining).to.eq('Decision Signed')
    chai.expect(announcement.decisionSigned).to.eq(true)
  })

  it('should return a Desision Signed FALSE announcement type', () => {
    const segment = { Actual_Final_Signature__c: undefined }
    const announcement = index.getAnnouncementTypeInfo(segment)
    chai.expect(announcement.decisionSigned).to.eq(false)
  })
})
