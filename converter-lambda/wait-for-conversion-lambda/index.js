"use strict";
const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});


exports.handler = (event, context, callback) => {
    
	const params = {
		Bucket: process.env.TARGET_BUCKET,
		Key: event.queryStringParameters.key.replace(/[^0-9a-zA-Z\-]/gi, '')
	};

    let x = setInterval(check, 5000);
    let y = setTimeout(abort, context.getRemainingTimeInMillis() - 500);
    check();

    function check() {
        console.log("check");
        s3.headObject(params, function(err, data) {
            if(!err) {
                clearInterval(x);
                clearTimeout(y);
                callback(null, {statusCode: 200, body: "200 Ready"}); 
            }
    	});
    }
    function abort() {
        console.log("timeout");
        clearInterval(x);
        callback(null, {statusCode: 504, body:"504 Timeout"});
    }

    
};
