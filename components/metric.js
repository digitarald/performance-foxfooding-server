import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import reducers from '../lib/reducers';
import ProfileItem from './profile-item';

const Metric = ({ id, meta, profiles, onMouseEnter, highlight }) => {
  const reducer = reducers.get(meta.reducer || 'median');
  let $reduced = null;
  let $topList = null;
  if (profiles) {
    const reduced = reducer.pretty(profiles, id, meta);
    if (reducer.sort) {
      $topList = (
        <div className="top-list">
          <ul>
            {reducer
              .sort(profiles, id, meta)
              .sort((a, b) => b[1].get('exists') - a[1].get('exists'))
              .slice(0, 20)
              .map(([profileId, profile]) => {
                return (
                  <ProfileItem
                    key={profileId}
                    metricId={id}
                    profileId={profileId}
                    profile={profile}
                    highlighted={highlight === profileId}
                    meta={meta}
                    reducer={reducer}
                    onMouseEnter={onMouseEnter}
                  />
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
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                max-height: 14rem;
                overflow: auto;
              }
            `}</style>
          </ul>
        </div>
      );
    }
    $reduced = reduced;
  }
  if (!$topList) {
    $topList = (
      <div>
        <style jsx>{`
          div {
            height: 10rem;
          }
        `}</style>
      </div>
    );
  }
  const title = meta.name.match(/((?:[A-Z]\w+[\s,^])+)(.*)/) || [
    '',
    meta.name,
    '',
  ];
  return (
    <div
      className={cx('metric', {
        bad: id.includes('-bad'),
        moderate: id.includes('-moderate'),
      })}
    >
      <h3 key={`${id}-dt`} title={title[0]}>
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
          min-width: 175px;
          margin: 0.5rem 0.75rem;
          padding: 0.25rem 0.75rem 0.5rem;
          flex-direction: column;
          background-color: #fff;
          box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.05);
          border-top: 0.25rem solid #888;
        }
        h3 {
          font-weight: 300;
          font-size: 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        .moderate {
          border-top-color: #f18a21;
        }
        .bad {
          border-top-color: #c33b32;
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

Metric.propTypes = {
  id: PropTypes.string.isRequired,
  profiles: PropTypes.instanceOf(Map),
  highlight: PropTypes.string,
  onMouseEnter: PropTypes.func.isRequired,
  meta: PropTypes.object.isRequired,
};

export default Metric;
