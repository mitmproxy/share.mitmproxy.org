"use strict";
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

function uploadPlaceholder(Key, remaining){
    console.log("Upload placeholder...")
    let data = fs.readFileSync("wait.html", "utf8");
    data = data.replace(/\/\*tstop.+tstop\*\//, Date.now() + remaining)
    return s3.putObject({
        Body: data,
        Bucket: process.env.TARGET_BUCKET,
        Key: `${Key}/index.html`,
        ACL: "public-read",
        ContentType: "text/html",
    }).promise();
}

exports.handler = (event, context, callback) => {

    const Bucket = event.Records[0].s3.bucket.name ;
    const Key = decodeURIComponent(event.Records[0].s3.object.key.replace(/[^0-9a-zA-Z\-]/gi, ''));
    const flowFile = `/tmp/${Key}`;
    const staticDir = `/tmp/static-${Key}`;

    console.log(`Event for ${Bucket} / ${Key}`);

    // Check that we don't overwrite something - it should not exist yet.
    s3.headObject({Bucket: process.env.TARGET_BUCKET, Key: `${Key}/index.html`}, (err, data) => {
        if (!err || err.code !== "NotFound") {
            return callback("A static view with this name already exists.")
        }
        uploadPlaceholder(Key, context.getRemainingTimeInMillis()).then(()=> {
            console.log("Get flow file...", {Bucket, Key})
            var file = require('fs').createWriteStream(flowFile);
            s3.getObject({Bucket, Key}).createReadStream().pipe(file).on('finish', e => {
                file.close();

                console.log("Convert flow file...")
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
                    if (error) {
                        callback(error)
                    } else {
                        console.log("Upload static files...")
                        upload(staticDir, Key).then(
                            () => callback(null, {url: `${process.env.BUCKET_URL}/${Key}`}),
                            err => callback(err)
                        );
                    }
                });

                // Log process stdout and stderr
                child.stdout.on('data', console.log);
                child.stderr.on('data', console.error);
            });
        });
    });

};