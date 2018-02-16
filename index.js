const sf = require('jsforce');
const AWS = require('aws-sdk');
const request = require('request');
const s3 = new AWS.S3();

const sf_username = process.env.SF_USERNAME;
const sf_password = process.env.SF_PASSWORD;
const sf_security_token = process.env.SF_SECURITY_TOKEN;
const conn = new sf.Connection({
	loginUrl: 'https://trade.my.salesforce.com'
});

const bucket_name = 'adcvd-endpointme';
const freshen_url = 'https://api.trade.gov/v1/adcvd_orders/freshen.json?api_key=';
const url_template = 'https://beta.trade.gov/adcvd/adcvdcase?=';
const api_key = process.env.API_KEY;

getObjects = function() {
	conn.apex.post('/ADCVD_OrderSearch/', '', function(err, res){
		if (err) { return console.error(err); }

		processEntries(res);
	});
}

processEntries = function(res) {
	const entries = res.adcvdOrders;
	for(let i in entries){
		entries[i].url = url_template + entries[i].caseNumber;
	}
	writeToBucket(entries);
}

writeToBucket = function(entries) {
	const params = {
		Body: JSON.stringify(entries),
		Bucket: bucket_name,
		Key: 'orders.json',
		ACL: 'public-read',
		ContentType: 'application/json'
	};
	s3.putObject(params, function(err, data){
		if (err) { return console.error(err); }
		console.log('File successfully uploaded!');
		freshenEndpoint();
	});
}

freshenEndpoint = function() {
	request(freshen_url+api_key, function(err, res, body) {
		if (err || (res && res.statusCode!= '200')) { return console.error('An error occurred while freshening the endpoint.'); }
		console.log(res.statusCode)
		console.log('Endpoint successfully updated!')
	});
}

// For development/testing purposes
exports.handler = function(event, context) {
	conn.login(sf_username, sf_password+sf_security_token, function(err, res){
		if (err) { return console.error(err); }

		getObjects();
	});
};


