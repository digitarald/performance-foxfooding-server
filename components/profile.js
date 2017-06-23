import React from 'react';
import Link from 'next/link';
import reducers from '../lib/reducers';
import Router from 'next/router';

const Profile = ({ profile, id, meta }) => {
  const external = `/api/report/view/${id}`; // rel="noreferrer nofollow"
  const close = () => Router.push('/');
  const exists = profile.get('exists');
  return (
    <div className="modal">
      <div className="modal-overlay" onClick={close} />
      <div className="modal-dialog">
        <div className="profile">
          <h2>Firefox {profile.get('version')} on {profile.get('os')}</h2>
          <ul>
            {[...meta].map(([metric, metricMeta]) => {
              const reducer = reducers.get(metricMeta.reducer);
              if (!reducer.prettyOne || profile.get(metric) == null) {
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
          <div
            className="privacy-notice"
            title="Personally identifiable information (PII) is any data that could potentially identify a specific individual. Any information that can be used to distinguish one person from another and can be used for de-anonymizing anonymous data can be considered PII."
          >
            Analyze Responsibly! Be careful with sensitive information.
          </div>
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
        </div>
      </div>
      <style jsx>{`
        .modal {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .modal-overlay {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(100, 100, 100, 0.5);
          z-index: 1;
          cursor: pointer;
        }
        .modal-dialog {
          z-index: 2;
          background-color: #fff;
        }
        .profile {
          margin: 1rem 1.5rem;
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
          margin-bottom: 1rem;
          background-color: #000;
          color: #fff;
          font-weight: 300;
          text-align: center;
          padding: 0.5rem 0.5rem;
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
          margin-top: 1rem;
          background-color: #c33b32;
          color: #fff;
          padding: 0.5rem 0.5rem;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default Profile;
