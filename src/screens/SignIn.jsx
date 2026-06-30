export default function SignIn({ onSignIn }) {
  return (
    <div className="screen">
      <div className="screen-content centered">
        <div className="app-logo">📷</div>
        <h1>Site Visit Photos</h1>
        <p className="subtitle">Sign in with your work account to get started</p>
        <button className="btn btn-primary" onClick={onSignIn}>
          Sign in with Microsoft
        </button>
        <p className="note">Uses your company Microsoft 365 account</p>
      </div>
    </div>
  )
}
