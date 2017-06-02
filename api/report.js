const express = require('express');
const shortid = require('shortid');
const aws = require('aws-sdk');
const { ungzip } = require('pako');
const { metrics, applyMetrics } = require('../lib/metrics');
const { transform } = require('../lib/iterators/transform');

const s3Defaults = { Bucket: process.env.S3_BUCKET };
// 10min profile cache
const cacheExpire = 600;

const mapReduceProfiles = async (redis, prefix = null) => {
  const list = await listProfiles(prefix);
  const profiles = await Promise.all(list.map(({ key }) => fetchTransformedProfile(redis, key)));
  return applyMetrics(profiles);
};

const listProfiles = async (prefix = null) => {
  const s3 = new aws.S3();
  const params = Object.assign({}, s3Defaults);
  if (prefix) {
    params.Prefix = prefix;
  }
  let response = await s3.listObjectsV2(params).promise();
  return response.Contents.map(file => {
    return {
      key: file.Key,
      time: file.LastModified,
      size: file.Size,
    };
  });
};

const fetchTransformedProfile = async (redis, key) => {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  const s3 = new aws.S3();
  const params = Object.assign(
    {
      Key: key,
    },
    s3Defaults
  );
  const response = await s3.getObject(params).promise();
  const binary = response.Body.toString('binary');
  const data = JSON.parse(ungzip(binary, { to: 'string' }));
  const transformed = transform(data);
  await redis.set(key, JSON.stringify(transformed), 'EX', cacheExpire);
  return data;
};

const router = (module.exports = express.Router());

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.sendStatus(405);
  }
  next();
});

router
  .get('/', async (req, res) => {
    const { user } = req.query;
    if (user && !shortid.isValid(user)) {
      return res.sendStatus(500);
    }
    let profiles = null;
    try {
      profiles = await mapReduceProfiles(req.app.get('redis'), user);
    } catch (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    res.json(Array.from(profiles));
  })
  .get('/storage', async (req, res) => {
    let files = [];
    try {
      files = await listProfiles();
    } catch (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    res.json({ profiles: files });
  })
  .get('/metrics', (req, res) => {
    res.json(Array.from(metrics.keys()));
  })
  .get('/transformed/:user/:file', async (req, res) => {
    const { user, file } = req.params;
    if (!shortid.isValid(user) || !shortid.isValid(file)) {
      return res.sendStatus(500);
    }
    try {
      const json = await fetchTransformedProfile(req.app.get('redis'), `${user}/${file}`);
      return res.json(json);
    } catch (err) {
      console.error(err);
    }
    res.sendStatus(500);
  })
  .get('/view/:user/:file', (req, res) => {
    const { user, file } = req.params;
    if (!shortid.isValid(user) || !shortid.isValid(file)) {
      return res.sendStatus(500);
    }
    const params = Object.assign(
      {
        Key: `${user}/${file}`,
        Expires: 60,
      },
      s3Defaults
    );
    const s3 = new aws.S3();
    const url = s3.getSignedUrl('getObject', params);
    res.redirect(302, url);
  });
