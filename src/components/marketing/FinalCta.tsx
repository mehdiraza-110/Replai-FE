export function FinalCta() {
  return (
    <section className="mkt-final">
      <div className="mkt-shell py-20 sm:py-28">
        <h2 className="mkt-display max-w-[14ch]">Read the first drafts before anything sends.</h2>
        <p className="mkt-body mt-6 text-[18px]">You decide what the agent is allowed to do.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <a className="mkt-btn mkt-btn--on-amber mkt-focusable" href="/app/login">
            Create free account
          </a>
          <a className="mkt-btn mkt-btn--line mkt-focusable" href="/app/login" style={{ borderColor: "#1c1e21", color: "#1c1e21" }}>
            Sign in
          </a>
        </div>
      </div>
    </section>
  );
}
