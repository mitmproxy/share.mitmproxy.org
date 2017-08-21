"use strict";

console.log('Loading function');

const { execFile } = require('child_process');
const fs = require('fs');
const AWS = require('aws-sdk');

process.env.PATH = process.env.PATH + ":" + process.env.LAMBDA_TASK_ROOT;

const s3 = new AWS.S3({apiVersion: '2006-03-01'});

exports.handler = (event, context, callback) => {

	const Bucket = event.Records[0].s3.bucket.name ;
	const Key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\W/gi, ''));

	console.log(`Event for ${Bucket} / ${Key}`);

    // Check that we don't overwrite something - it should not exist yet.
    const indexHtml = {Bucket: process.env.TARGET_BUCKET, Key: `${Key}/index.html`}
    s3.headObject(indexHtml, (err, data) => {
    	if (!err || err.code !== "NotFound") {
    		console.log("exists");
    		process.exit(1);
    	} else {

    		console.log("Target does not exist", indexHtml)

			// Get file
			var file = require('fs').createWriteStream('/tmp/flows');
			s3.getObject({Bucket, Key}).createReadStream().pipe(file).on('finish', e => {
				file.close();

				// Process it
				const child = execFile(
					"mitmdump",
					["-n",
					"-r","/tmp/flows",
					"--set","web_static_viewer=./static/"
					], (error) => {
			        // Resolve with result of process
			        callback(error, 'Process complete!');

			        // Upload to S3
			    });

			    // Log process stdout and stderr
			    child.stdout.on('data', console.log);
			    child.stderr.on('data', console.error);


			});
}
});

};