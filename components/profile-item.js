import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import cx from 'classnames';

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
  return days ? `${days}d` : 'today';
};

export default class ProfileItem extends PureComponent {
  handleMouseEnter = () => {
    this.props.onMouseEnter(this.props.profileId);
  };

  render() {
    const {
      metricId,
      profileId,
      profile,
      highlighted,
      onMouseEnter,
      meta,
      reducer,
    } = this.props;
    const href = `/?profile=${profileId}`;
    const exists = profile.get('exists');
    const prettyOne = reducer.prettyOne(metricId, meta);
    const pretty = prettyOne(profile);
    return (
      <li
        title={profileId}
        className={cx({
          'highlight-soft': highlighted === 1,
          highlight: highlighted === 2,
        })}
        onMouseEnter={this.handleMouseEnter}
      >
        <Link href={href} target="_blank">
          <a className={cx({ expired: !exists })}>
            <div className="value">
              <em>
                {pretty[0]}
              </em>
              {pretty[1]}
            </div>
            <div>
              {profile.get('version')}/{prettyOS(profile.get('os'))}
              {', '}
              <time>{prettyDate(profile.get('date'))}</time>
            </div>
          </a>
        </Link>
        <style jsx>{`
          li {
            min-width: 7rem;
            padding: 0 0.5rem;
            flex: 1;
            transition: background-color 0.15s ease-out;
          }
          a {
            display: flex;
            justify-content: space-between;
            color: inherit;
            text-decoration: none;
          }
          time {
            color: #888;
          }
          .expired {
            text-decoration: line-through;
          }
          em {
            margin-right: 0.25rem;
            font-size: 1.2em;
            font-weight: 700;
            font-style: normal;
          }
          .highlight-soft {
            background-color: #f2f2f2;
          }
          .highlight {
            background-color: #ffed00;
          }
        `}</style>
      </li>
    );
  }
}

ProfileItem.propTypes = {
  metricId: PropTypes.string,
  profileId: PropTypes.string,
  profile: PropTypes.instanceOf(Map).isRequired,
  highlighted: PropTypes.number,
  onMouseEnter: PropTypes.func,
  meta: PropTypes.object,
  reducer: PropTypes.object,
};
