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
        className={highlighted ? 'highlight' : ''}
        onMouseEnter={this.handleMouseEnter}
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
        <style jsx>{`
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
      </li>
    );
  }
}

ProfileItem.propTypes = {
  metricId: PropTypes.string,
  profileId: PropTypes.string,
  profile: PropTypes.instanceOf(Map).isRequired,
  highlighted: PropTypes.bool,
  onMouseEnter: PropTypes.func,
  meta: PropTypes.object,
  reducer: PropTypes.object,
};
