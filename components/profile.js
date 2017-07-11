import React from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import reducers from '../lib/reducers';
import Router from 'next/router';

const Profile = ({ profile, id, meta }) => {
  const external = `/api/report/view/${id}`; // rel="noreferrer nofollow"
  const close = () => Router.push('/');
  let $content = null;
  if (profile) {
    const exists = profile.get('exists');
    $content = (
      <div className="profile">
        <h2>Firefox {profile.get('version')} on {profile.get('os')}</h2>
        <main>
          <ul>
            {[...meta].map(([metric, metricMeta]) => {
              const reducer = reducers.get(metricMeta.reducer);
              if (!reducer.prettyOne || !profile.get(metric)) {
                return null;
              }
              const pretty = reducer.prettyOne(metric, metricMeta)(profile);
              return (
                <li key={`metric-${metric}`}>
                  {metricMeta.name}
                  <div className="value">
                    <em>{pretty[0]}</em> {pretty[1]}
                  </div>
                </li>
              );
            })}
          </ul>
          <ul className="menu">
            <li className="menu-item"><Link href="/"><a>Close</a></Link></li>
            <li className="menu-item">
              {exists
                ? <a href={external} target="_blank" rel="noopener noreferrer">
                    Open in perf.html
                  </a>
                : 'Expired'}
            </li>
          </ul>
        </main>
        <div
          className="privacy-notice"
          title="Personally identifiable information (PII) is any data that could potentially identify a specific individual. Any information that can be used to distinguish one person from another and can be used for de-anonymizing anonymous data can be considered PII."
        >
          Analyze responsibly! Be careful with sensitive information.
        </div>
        <style jsx>{`
          .profile {
            display: flex;
            flex-direction: column;
            align-items: stretch;
          }
          .menu {
            list-style: none;
            display: flex;
            justify-content: space-between;
            margin-top: 1rem;
          }
          a {
            font-size: 1rem;
          }
          h2 {
            font-size: 1.2rem;
            background-color: #ddd;
            color: #333;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            font-weight: 300;
            text-align: center;
            padding: 0.5rem 0.5rem;
          }
          main {
            margin: 1rem 1.5rem;
          }
          ul {
            list-style: none;
          }
          li {
            display: flex;
            justify-content: space-between;
          }
          .value {
            margin-left: 2rem;
          }
          em {
            font-style: normal;
            font-size: 1.2rem;
            font-weight: bold;
          }
          .privacy-notice {
            background-color: #c33b32;
            color: #fff;
            padding: 0.5rem 0.5rem;
            text-align: center;
          }
        `}</style>
      </div>
    );
  } else {
    $content = (
      <div className="profile">
        Loading Profile …
        <style jsx>{`
          .profile {
            font-size: 1.2rem;
            background-color: #ddd;
            font-weight: 300;
            text-align: center;
            padding: 0.5rem 1rem;
          }
        `}</style>
      </div>
    );
  }
  return (
    <div className="modal">
      <div className="modal-overlay" onClick={close} />
      <div className="modal-dialog">
        <div className="profile">
          {$content}
        </div>
      </div>
      <style jsx>{`
        .modal {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 2rem;
        }
        .modal-overlay {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(100, 100, 100, 0.5);
          z-index: 1;
          cursor: pointer;
        }
        .modal-dialog {
          z-index: 2;
          background-color: #fff;
          box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

Profile.propTypes = {
  profile: PropTypes.instanceOf(Map),
  id: PropTypes.string,
  meta: PropTypes.object,
};

export default Profile;
