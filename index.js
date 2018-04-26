const sf = require('jsforce');
const AWS = require('aws-sdk');
const request = require('request');
const s3 = new AWS.S3();
const _ = require('lodash');

const sf_username = process.env.SF_USERNAME;
const sf_password = process.env.SF_PASSWORD;
const conn = new sf.Connection({
	loginUrl: 'https://trade.my.salesforce.com'
});

const bucket_name = 'adcvd-endpointme';
const freshen_url = 'https://api.trade.gov/v1/adcvd_orders/freshen.json?api_key=';
const url_template = process.env.URL_TEMPLATE;
const api_key = process.env.API_KEY;

getObjects = function() {
	conn.apex.post('/ADCVD_OrderSearch/', '', function(err, res){
		if (err) { return console.error(err); }
		processEntries(res);
	});
}

processEntries = function(res) {
	const entries = [];
	const fields_to_copy = ['productShortName', 'country', 'caseNumber', 'segments', 'productName', 'commodity'];

	for(let i in res.adcvdOrders){
		let new_entry = Object.assign({}, _.pick(res.adcvdOrders[i], fields_to_copy));
		new_entry.url = url_template + res.adcvdOrders[i].caseNumber;
		new_entry.htsNums = _.map(res.adcvdOrders[i].htsNums, function(num_entry) { return num_entry.htsNumberFormatted });
		new_entry.htsNumsRaw = _.map(res.adcvdOrders[i].htsNums, function(num_entry) { return num_entry.htsNumber } );
		entries.push(new_entry);
	}
	writeToBucket(entries);
}

writeToBucket = function(entries) {
	const params = {
		Body: JSON.stringify(entries, null, 2),
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
	conn.login(sf_username, sf_password, function(err, res){
		if (err) { return console.error(err); }

		getObjects();
	});
};


