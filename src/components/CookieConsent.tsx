import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const consentKey = "elovyn-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(consentKey) !== "accepted");
    } catch (error) {
      console.warn("Could not read the saved cookie notice choice.", error);
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function accept() {
    try {
      localStorage.setItem(consentKey, "accepted");
    } catch (error) {
      console.warn("Could not save the cookie notice choice.", error);
    } finally {
      setVisible(false);
    }
  }

  return (
    <aside aria-label="Privacy notice" className="fixed bottom-4 left-4 z-[60] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
      <p className="text-sm leading-5 text-neutral-700">
        We use essential cookies to keep your bag and checkout working smoothly. Read our{" "}
        <Link to="/privacy-policy" className="font-medium underline">POPIA Privacy Policy</Link>.
      </p>
      <button type="button" onClick={accept} className="btn-primary mt-3 w-full">Accept</button>
    </aside>
  );
}
