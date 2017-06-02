const express = require('express');
const shortid = require('shortid');
const aws = require('aws-sdk');
const debug = require('debug')('collect');

module.exports = express
  .Router()
  .post('/', (req, res) => {
    const user = shortid.generate();
    debug('Created user %s', user);
    res.json({ uid: user });
  })
  .post('/:user', (req, res) => {
    const user = req.params.user;
    if (!shortid.isValid(user)) {
      console.warn('Invalid user %s', user);
      return res.sendStatus(400);
    }
    const key = `${user}/${shortid.generate()}`;
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Expires: 60,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      ACL: 'authenticated-read',
      Metadata: {
        user: user,
      },
    };
    const s3 = new aws.S3();
    s3.getSignedUrl('putObject', params, (err, url) => {
      if (err) {
        console.error('Could not generate signed URL for putObject', err);
        return res.sendStatus(500);
      }
      debug('%s: signed url for %s', user, key);
      res.json({ url: url, key: key });
    });
  });
