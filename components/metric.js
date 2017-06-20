import React from 'react';
import Link from 'next/link';
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
    if (reducer.sort) {
      const prettyOne = reducer.prettyOne(id, meta);
      $topList = (
        <div className="top-list">
          <ul>
            {reducer
              .sort(profiles, id, meta)
              .slice(0, 10)
              .map(([id, profile]) => {
                const external = `/api/report/view/${id}`; // rel="noreferrer nofollow"
                const href = `/?profile=${id}`;
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
                        <a>
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
                max-width: 250px;
              }
              time {
                color: #888;
              }
              .value {
                align-self: flex-end;
              }
              em {
                font-size: 1em;
                font-weight: 700;
                font-style: normal;
              }
              .highlight {
                background-color: yellow;
              }
            `}</style>
          </ul>
        </div>
      );
    }
    $reduced = reduced;
  }
  return (
    <div className="metric">
      <h3 key={`${id}-dt`}>
        {meta.name}
      </h3>
      {$reduced &&
        <div className="value" key="reduced">
          <em>{$reduced[0]}</em> {$reduced[1]}
        </div>}
      {$topList}
      <style jsx>{`
        .metric {
          display: inline-flex;
          min-width: 200px;
          margin: 1rem 1.5rem;
          flex-direction: column;
        }
        h3 {
          color: #888;
          font-weight: lighter;
          font-size: 1rem;
        }
        .value {
          margin-bottom: 0.2rem;
          display: block;
          color: #000;
        }
        em {
          font-size: 1.4rem;
          font-style: normal;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default Metric;
