const express = require('express');
const shortid = require('shortid');
const aws = require('aws-sdk');
const { ungzip } = require('pako');
const pretty = require('prettysize');
const metrics = require('../lib/metrics');
const serializer = require('../lib/iterators/serializer');
const { transform } = require('../lib/iterators/transform');

const s3Defaults = { Bucket: process.env.S3_BUCKET };
const cacheExpire = 600;

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
      return mapProfileActive.size < 4;
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
  return (
    typeof profile.get('os') === 'string' &&
    typeof profile.get('date') === 'string'
  );
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
  );
  let pending = 0;
  for (const { key } of list) {
    if (profiles.has(key)) {
      if (validateProfile(profiles.get(key))) {
        continue;
      } else {
        profiles.delete(key);
      }
    }
    pending += 1;
    if (!mapProfilePending.has(key)) {
      mapProfile(redis, key);
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
  // const cached = await redis.get(key);
  // if (cached) {
  //   return JSON.parse(cached);
  // }
  const s3 = new aws.S3();
  const params = Object.assign(
    {
      Key: key,
    },
    s3Defaults
  );
  const response = await s3
    .getObject(params)
    .promise()
    .catch(err => console.error('[report]', err));
  if (!response) {
    return null;
  }
  const binary = response.Body.toString('binary');
  const data = JSON.parse(ungzip(binary, { to: 'string' }));
  const transformed = transform(data);
  // await redis.set(key, JSON.stringify(transformed), 'EX', cacheExpire);
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
    let results = null;
    try {
      results = await mapProfiles(req.app.get('redis'), prefix);
    } catch (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    res.json(results);
  })
  .get('/storage', async (req, res) => {
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
    res.redirect(
      302,
      `https://perf-html.io/from-url/${encodeURIComponent(url)}`
    );
  });
