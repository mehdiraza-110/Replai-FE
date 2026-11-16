import { useEffect } from "react";
import { Button, Modal } from "../ui";
import { APP_VERSION, hasSeenCurrent, markSeenCurrent, RELEASE_NOTES, setWhatsNewOpen, useWhatsNewOpen } from "./whatsNew";

/** Opens by itself once per new release; the sidebar's version label reopens it any time. */
export function WhatsNewDialog() {
  const open = useWhatsNewOpen();
  useEffect(() => { if (!hasSeenCurrent()) setWhatsNewOpen(true); }, []);
  const close = () => { markSeenCurrent(); setWhatsNewOpen(false); };

  return (
    <Modal open={open} title="What's new" onClose={close} footer={<Button variant="primary" onClick={close}>Got it</Button>}>
      <p className="sv-hint">You're on v{APP_VERSION}</p>
      <ReleaseList />
    </Modal>
  );
}

export function ReleaseList() {
  return (
    <div className="sv-fb-releases">
      {RELEASE_NOTES.map((r) => (
        <section key={r.version}>
          <h3><span>{r.title}</span><span className="sv-fb-tag">v{r.version}</span></h3>
          <ul>
            {r.items.map((item) => <li key={item.title}><strong>{item.title}</strong>{item.detail ? <span>{item.detail}</span> : null}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
