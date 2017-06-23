import React from 'react';
import Link from 'next/link';
import cx from 'classnames';
import reducers from '../lib/reducers';

const prettyOS = long => {
  return long
    .replace('Windows', 'Win')
    .replace(/Macintosh.*/, 'OSX')
    .replace(/\.0$/, '')
    .replace('/', '');
};

const prettyDate = time => {
  const days = Math.round(
    (Date.now() - new Date(time).getTime()) / (1000 * 60 * 60 * 24)
  );
  return days ? `${days}d ago` : 'today';
};

const Metric = ({ id, meta, profiles, onMouseEnter, highlight }) => {
  const reducer = reducers.get(meta.reducer || 'median');
  let $reduced = null;
  let $topList = null;
  if (profiles) {
    const reduced = reducer.pretty(profiles, id, meta);
    console.log(reduced);
    if (reducer.sort) {
      const prettyOne = reducer.prettyOne(id, meta);
      $topList = (
        <div className="top-list">
          <ul>
            {reducer
              .sort(profiles, id, meta)
              .slice(0, 10)
              .map(([id, profile]) => {
                const href = `/?profile=${id}`;
                const exists = profile.get('exists');
                const pretty = prettyOne(profile);
                return (
                  <li
                    key={`profile-${id}`}
                    title={id}
                    className={highlight === id ? 'highlight' : ''}
                    onMouseEnter={onMouseEnter.bind(null, id)}
                  >
                    <div>
                      <Link href={href} target="_blank">
                        <a className={cx({ expired: !exists })}>
                          {profile.get('version')}/{prettyOS(profile.get('os'))}
                        </a>
                      </Link>{' '}
                      <time>{prettyDate(profile.get('date'))}</time>
                    </div>
                    <div className="value">
                      <em>{pretty[0]}</em> {pretty[1]}
                    </div>
                  </li>
                );
              })}
            <style jsx>{`
              .top-list {
                flex: 1;
              }
              ul {
                list-style: none;
                margin: 0;
                padding: 0;
                font-size: 0.8rem;
              }
              li {
                display: flex;
                justify-content: space-between;
              }
              time {
                color: #888;
              }
              .value {
                align-self: flex-end;
              }
              .expired {
                text-decoration: line-through;
              }
              em {
                font-size: 1em;
                font-weight: 700;
                font-style: normal;
              }
              .highlight {
                background-color: #FFED00;
              }
            `}</style>
          </ul>
        </div>
      );
    }
    $reduced = reduced;
  }
  const title = meta.name.match(/((?:[A-Z]\w+[\s,^])+)(.*)/) || [
    '',
    meta.name,
    '',
  ];
  return (
    <div className={cx('metric')}>
      <h3
        key={`${id}-dt`}
        className={cx({
          bad: id.includes('-bad'),
          moderate: id.includes('-moderate'),
        })}
      >
        <em className="title-main">{title[1]}</em> {title[2]}
      </h3>
      {$reduced &&
        <div className="value" key="reduced">
          <em className="value-main">{$reduced[0]}</em> {$reduced[1]}
        </div>}
      {$topList}
      <style jsx>{`
        .metric {
          display: inline-flex;
          flex: 1;
          min-width: 200px;
          margin: 0.5rem 0.75rem;
          padding: 0.5rem 0.75rem;
          flex-direction: column;
          background-color: #fff;
          box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .moderate {
          color: #f18a21;
        }
        .bad {
          color: #c33b32;
        }
        h3 {
          color: #888;
          font-weight: 300;
          font-size: 1rem;
        }
        .title-main {
          font-weight: 700;
          font-style: normal;
        }
        .value {
          margin-bottom: 0.2rem;
          display: block;
          color: #000;
        }
        .value-main {
          font-size: 1.4rem;
          font-style: normal;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default Metric;
