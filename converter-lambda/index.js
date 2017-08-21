"use strict";

console.log('Loading function');

const { execFile } = require('child_process');
const fs = require('fs');
const AWS = require('aws-sdk');
//AWS.config.loadFromPath('./config.json');
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

process.env.PATH = process.env.PATH + ":" + process.env.LAMBDA_TASK_ROOT;



function uploadFile(filePath, s3Path){
    const fileStream = fs.createReadStream(filePath);
    const ct = {
        "html": "text/html",
        "json": "application/json",
/* static files are now hosted separately.
        "css": "text/css",
        "js": "application/javascript",
        "png": "image/png",
        "ico": "image/x-icon",
        "eot": "application/vnd.ms-fontobject",
        "svg": "image/svg+xml",
        "ttf": "application/x-font-ttf",
        "woff": "application/font-woff", */
    }[filePath.split(".").pop()]
    return s3.putObject({
        Body: fileStream,
        Bucket: process.env.TARGET_BUCKET,
        Key: s3Path,
        ACL: "public-read",
        ContentType: ct,
    }).promise();
}

const blacklist = ["static", "filter-help.json",]

function upload(fromDir, toDir) {

    let files = fs.readdirSync(fromDir);
    let promises = files.map((filename) => {
        if(blacklist.indexOf(filename) > -1) {
            return
        }
        const from = `${fromDir}/${filename}`
        const to = `${toDir}/${filename}`
        let fstat = fs.statSync(from);
        if(fstat.isDirectory()){
            return upload(from, to)
        } else {
            return uploadFile(from, to)
        }
    })

    return Promise.all(promises);
}

exports.handler = (event, context, callback) => {

    const Bucket = event.Records[0].s3.bucket.name ;
    const Key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\W/gi, ''));
    const flowFile = `/tmp/${Key}`;
    const staticDir = `/tmp/static-${Key}`;

    console.log(`Event for ${Bucket} / ${Key}`);

    // Check that we don't overwrite something - it should not exist yet.
    const indexHtml = {Bucket: process.env.TARGET_BUCKET, Key: `${Key}/index.html`}
    s3.headObject(indexHtml, (err, data) => {
        if (!err || err.code !== "NotFound") {
            console.log("exists");
            process.exit(1);
        } else {

            console.log("Target does not exist", indexHtml)
            console.log("Getting flows:", {Bucket, Key})

            // Get file
            var file = require('fs').createWriteStream(flowFile);
            s3.getObject({Bucket, Key}).createReadStream().pipe(file).on('finish', e => {
                file.close();

                // Process it
                const child = execFile(
                    "mitmweb",
                    [
                    "-n",
                    "-r",flowFile,
                    "--set",`web_static_viewer=${staticDir}/`,
                    "--set","cadir=./ca/",
                    "--no-web-open-browser",
                    "-s", "./shutdown.py",
                    ], (error) => {
                    // Resolve with result of process

                    upload(staticDir, Key).then(() => {
                        callback(null, {url: `${process.env.BUCKET_URL}/${Key}`})
                    }, callback);
                });

                // Log process stdout and stderr
                child.stdout.on('data', console.log);
                child.stderr.on('data', console.error);
            });
        }
    });

};