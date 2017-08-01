const express = require('express');
const shortid = require('shortid');
const aws = require('aws-sdk');
const { gzip, ungzip } = require('pako');
const pretty = require('prettysize');
const metrics = require('../lib/metrics');
const serializer = require('../lib/iterators/serializer');
const { transform, symbolicate } = require('../lib/iterators/transform');

const s3Defaults = { Bucket: process.env.S3_BUCKET };
const cacheExpire = 600;
const queueMax = 2;

const waitFor = (test, proceed) => {
  return new Promise(resolve => {
    const next = () => {
      const result = test();
      if (result) {
        proceed(result);
        return resolve(result);
      }
      setTimeout(next, 500);
    };
    process.nextTick(next);
  });
};

const mapProfilePending = new Set();
const mapProfileActive = new Set();

const mapProfile = async (redis, key) => {
  console.time(`${key} queued`);
  mapProfilePending.add(key);
  await waitFor(
    () => {
      return mapProfileActive.size < queueMax;
    },
    () => {
      mapProfileActive.add(key);
    }
  );
  console.timeEnd(`${key} queued`);
  console.time(`${key} processing`);
  const profile = await fetchTransformedProfile(redis, key);
  if (profile) {
    const mapped = metrics.mapAll(profile);
    await redis.hset('mapped', key, serializer.stringify(mapped));
  }
  mapProfilePending.delete(key);
  mapProfileActive.delete(key);
  console.timeEnd(`${key} processing`);
};

const validateProfile = profile => {
  for (const [key, meta] of metrics.meta) {
    if (!profile.has(key) && !meta.extra) {
      return false;
    }
  }
  return true;
};

const mapProfiles = async (redis, prefix = null) => {
  const list = await listProfiles(prefix);
  const cached = (await redis.hgetall('mapped')) || {};
  const profiles = new Map(
    Object.entries(cached)
      .filter(entry => !prefix || entry[0].startsWith(prefix))
      .map(entry => {
        entry[1] = serializer.parse(entry[1]);
        return entry;
      })
      .filter(entry => validateProfile(entry[1]))
  );
  let pending = 0;
  for (const { key } of list) {
    if (profiles.has(key)) {
      profiles.get(key).set('exists', true);
    } else {
      pending += 1;
      if (!mapProfilePending.has(key)) {
        mapProfile(redis, key);
      }
    }
  }
  return { profiles, pending };
};

const listProfiles = async (prefix = null) => {
  const s3 = new aws.S3();
  const params = Object.assign({}, s3Defaults);
  if (prefix) {
    params.Prefix = prefix;
  }
  const contents = [];
  do {
    const response = await s3.listObjectsV2(params).promise();
    response.Contents.forEach(file => {
      if (!file.Key.includes('.')) {
        contents.push({
          key: file.Key,
          size: file.Size,
        });
      }
    });
    params.ContinuationToken = response.NextContinuationToken;
  } while (params.ContinuationToken);
  return contents;
};

const symbolicateAndStoreProfile = async (key, profile, object) => {
  const s3 = new aws.S3();
  await symbolicate(profile);
  try {
    const copyKey = key + '.symbolicated';
    const metadata = {
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      ACL: 'authenticated-read',
      Expires: object.Expires,
      Metadata: {
        symbolicated: profile.meta.symbolicated,
        uploaded: object.Metadata.uploaded || object.LastModified.toJSON(),
      },
    };
    await s3
      .putObject(
        Object.assign(
          {
            Key: copyKey,
            Body: Buffer.from(gzip(JSON.stringify(profile), { to: 'string' })),
          },
          metadata,
          s3Defaults
        )
      )
      .promise();
    await s3
      .copyObject(
        Object.assign(
          {
            Key: key,
            CopySource: `/${s3Defaults.Bucket}/${copyKey}`,
          },
          metadata,
          s3Defaults
        )
      )
      .promise();
    await s3
      .deleteObject(
        Object.assign(
          {
            Key: copyKey,
          },
          s3Defaults
        )
      )
      .promise();
    console.log('[report]', key, 'Symbolicated');
  } catch (err) {
    console.error('[report]', key, 'Could not store symbolicated profile', err);
  }
};

const fetchTransformedProfile = async (redis, key) => {
  const s3 = new aws.S3();
  const params = Object.assign(
    {
      Key: key,
    },
    s3Defaults
  );
  const object = await s3
    .getObject(params)
    .promise()
    .catch(err => console.error('[report]', err));
  if (!object) {
    return null;
  }
  const binary = object.Body.toString('binary');
  let profile = null;
  try {
    profile = JSON.parse(ungzip(binary, { to: 'string' }));
  } catch (err) {
    console.error(
      '[report]',
      key,
      'Corrupt profile, marked for deletion.',
      err.message || err
    );
    await s3
      .deleteObject(params)
      .promise()
      .catch(err => console.error('[report]', err));
    return null;
  }
  if (!profile.meta.symbolicated) {
    await symbolicateAndStoreProfile(key, profile, object);
  }
  const transformed = transform(profile);
  return transformed;
};

const router = express.Router();
module.exports = router;

// router.use((req, res, next) => {
//   if (process.env.NODE_ENV === 'production') {
//     return res.sendStatus(405);
//   }
//   next();
// });

router
  .get('/', async (req, res) => {
    const { prefix } = req.query || {};
    if (prefix && !prefix.split('/').every(shortid.isValid)) {
      return res.sendStatus(500);
    }
    let profiles = null;
    try {
      profiles = await mapProfiles(req.app.get('redis'), prefix);
    } catch (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    res.json(profiles);
  })
  .get('/stats', async (req, res) => {
    let files = [];
    try {
      files = await listProfiles();
    } catch (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    const users = files.reduce((unique, entry) => {
      return unique.add(entry.key.split('/')[0]);
    }, new Set());
    res.json({
      profiles: files.length,
      users: users.size,
      size: pretty(
        files.reduce((sum, entry) => {
          return sum + entry.size;
        }, 0)
      ),
    });
  })
  .get('/metrics', (req, res) => {
    res.json(metrics.meta);
  })
  // .get('/transformed/:user/:file', async (req, res) => {
  //   const { user, file } = req.params;
  //   if (!shortid.isValid(user) || !shortid.isValid(file)) {
  //     return res.sendStatus(500);
  //   }
  //   try {
  //     const json = await fetchTransformedProfile(req.app.get('redis'), `${user}/${file}`);
  //     return res.json(json);
  //   } catch (err) {
  //     console.error(err);
  //   }
  //   res.sendStatus(500);
  // })
  .get('/view/:user/:file', async (req, res) => {
    const { user, file } = req.params;
    if (!shortid.isValid(user) || !shortid.isValid(file)) {
      return res.sendStatus(500);
    }
    const s3 = new aws.S3();
    const key = `${user}/${file}`;
    const params = Object.assign(
      {
        Key: key,
      },
      s3Defaults
    );
    const response = await s3.headObject(params).promise();
    if (response && !response.Metadata.symbolicated) {
      // TODO: Generic loader, duplicates code from transform
      const object = await s3.getObject(params).promise();
      const profile = JSON.parse(
        ungzip(object.Body.toString('binary'), { to: 'string' })
      );
      await symbolicateAndStoreProfile(key, profile, object);
    }
    const url = s3.getSignedUrl(
      'getObject',
      Object.assign(
        {
          Key: key,
          Expires: 60,
        },
        s3Defaults
      )
    );
    res.redirect(
      302,
      `https://perf-html.io/from-url/${encodeURIComponent(url)}`
    );
  });
