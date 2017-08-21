### Lambda function to convert mitmproxy dumps to static HTML

```
S3 Upload -> Lambda -> Public HTML
```

#### Deployment

```
zip -r dist.zip index.js mitmweb ca shutdown.py
```

#### Components

 - **index.js**: The actual lambda function
 - **mitmweb**: Mitmweb executable to be called by the lambda function (snapshot from 6350d5a)
 - **ca/**: Dummy CA so that mitmweb doesn't generate one on startup
 - **shutdown.py**: Mitmweb does not have the keepserving addon, so we need to terminate after processing.

#### Lambda Environment Variables

 - `HOME`: so that mitmweb finds the ca folder.
 - `TARGET_BUCKET`: S3 bucket to upload static files to.