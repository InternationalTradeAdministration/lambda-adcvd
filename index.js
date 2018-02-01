const sf = require('jsforce');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const sf_username = process.env.SF_USERNAME;
const sf_password = process.env.SF_PASSWORD;
const sf_security_token = process.env.SF_SECURITY_TOKEN;
const conn = new sf.Connection({
	loginUrl: 'https://trade.my.salesforce.com'
});

const bucket_name = 'adcvd-endpointme';

getObjects = function() {
	conn.apex.post('/ADCVD_OrderSearch/', '', function(err, res){
		if (err) { return console.error(err); }

		processEntries(res);
	});
}

processEntries = function(res) {
	const entries = res.adcvdOrders;
	writeToBucket(entries);
}

writeToBucket = function(entries) {
	const params = {
		Body: JSON.stringify(entries),
		Bucket: bucket_name,
		Key: 'orders.json',
		ACL: 'public-read'
	};
	s3.putObject(params, function(err, data){
		if (err) { return console.error(err); }
		console.log('File sucessfully written to bucket!');
	});
}

// For development/testing purposes
exports.handler = function(event, context) {
	conn.login(sf_username, sf_password+sf_security_token, function(err, res){
		if (err) { return console.error(err); }

		getObjects();
	});
};


