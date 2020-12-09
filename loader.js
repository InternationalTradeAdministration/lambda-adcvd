const fs = require('fs')
const S3 = require('aws-sdk/clients/s3')

const Endpointme = require('./endpointme')

var Loader = {
  load: (endpointName, data) => {
    console.log(`records length: ${data.length}`)
    const filtersString = JSON.stringify(data, null, 2)
    return Loader.loadToFs(endpointName, filtersString)
      .then(() => Loader.loadToS3Bucket(endpointName, filtersString))
      .then(() => Endpointme.freshen())
  },

  loadToFs: (endpointName, filtersString) => {
    return new Promise((resolve) => {
      if (fs.existsSync('./output')) {
        const filename = `${endpointName}.json`
        console.log(`writing ${filename}`)
        fs.writeFile(`./output/${filename}`, filtersString, (err) => {
          if (err) throw err
          console.log(`Successfully saved ${filename}`)
          resolve()
        })
      } else {
        console.log('skipping loadToFs: output directory is not present')
        resolve()
      }
    })
  },

  loadToS3Bucket: (endpointName, filtersString) => {
    return new Promise((resolve) => {
      const filename = `${endpointName}.json`
      console.log(`loading ${filename} to S3`)
      const params = {
        Body: filtersString,
        Bucket: process.env.S3_BUCKET,
        Key: filename,
        ACL: 'public-read',
        ContentType: 'application/json'
      }
      const s3 = new S3()
      s3.putObject(params, (err) => {
        if (err) throw err
        console.log(`File successfully uploaded: ${filename}`)
        resolve()
      })
    })
  }
}

module.exports = Loader
