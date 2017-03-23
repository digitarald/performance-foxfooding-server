const express = require('express');
const bodyParser = require('body-parser');
const aws = require('aws-sdk');
const shortid = require('shortid');
require('dotenv').config();
const client = require('redis').createClient(process.env.REDIS_URL);

const S3_BUCKET = process.env.S3_BUCKET;

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

const aggregateBeacon = (user, file) => {
  const key = `${user}/${file}`;
  if (client.hexists('aggregates', key)) {
    return client.hget('aggregates', key);
  }
  const cached = client.get(key);
  client.set(key);
  // client.hget('aggregates', key, aggregate);
}

const router = express.Router();

router.post('/', (req, res) => {
    const user = shortid.generate();
    console.log('new userL %s', user);
    res.json({uid: user});
});

router.get('/:user', (req, res) => {
    const user = req.params.user;
    console.log('%s: index', user);
    if (!user) {
        return res.sendStatus(500);
    }
    const s3 = new aws.S3();
    const params = {
        Bucket: S3_BUCKET,
        Prefix: user
    };
    s3.listObjectsV2(params, (err, data) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        const files = data.Contents.map((file) => {
            return {key: file.Key, time: file.LastModified, size: file.Size};
        });
        res.json(files);
    });
});

router.get('/:user/:file', (req, res) => {
  const { user, file } = req.params;
  if (!user || !file) {
      return res.sendStatus(500);
  }
  const params = {
      Bucket: S3_BUCKET,
      Key: `${user}/${file}`
  };
  const s3 = new aws.S3();
  const url = s3.getSignedUrl('getObject', params);
  console.log('signed url for %s/%s: %s', user, file, url);
  res.json({ url: url });
});

router.post('/:user', (req, res) => {
    const user = req.params.user;
    if (!user) {
        return res.sendStatus(500);
    }
    const key = `${user}/${shortid.generate()}`;
    const params = {
        Bucket: S3_BUCKET,
        Key: key,
        Expires: 60,
        ContentType: 'application/json',
        ContentEncoding: 'gzip',
        ACL: 'authenticated-read',
        Metadata: {
            user: user
        }
    };
    const s3 = new aws.S3();
    s3.getSignedUrl('putObject', params, (err, url) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        }
        console.log('%s: signed url for %s', user, key);
        res.json({url: url, key: key});
    });
});

app.use('/beacons', router);

app.listen(process.env.PORT || 3000);
