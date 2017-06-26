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
              .slice(0, 10)
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

Metric.propTypes = {
  id: PropTypes.string,
  profiles: PropTypes.instanceOf(Map),
  highlight: PropTypes.string,
  onMouseEnter: PropTypes.func,
  meta: PropTypes.object,
};

export default Metric;
