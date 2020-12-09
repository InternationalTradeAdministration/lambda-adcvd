const _ = require('lodash')
const request = require('request')

var Endpointme = {
  freshen: () => {
    return new Promise((resolve, reject) => {
      const freshenUrl = `${process.env.FRESHEN_URL}${process.env.API_KEY}`
      request(freshenUrl, (_err, _res, bodyString) => {
        const body = JSON.parse(bodyString)
        if (!_.isNil(body.success)) {
          console.log(body.success)
          resolve(body)
        } else {
          reject(body)
        }
      })
    })
  }
}

module.exports = Endpointme
