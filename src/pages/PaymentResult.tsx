import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { apiRequest } from "@/lib/store-api";
import { useStore } from "@/lib/store";
import { SiteReviewPrompt } from "@/components/SiteReviews";

type PaymentResultKind = "success" | "cancelled" | "failed";

export function PaymentResultPage({ kind }: { kind: PaymentResultKind }) {
  const [params] = useSearchParams();
  const orderId = params.get("order") || "";
  const { clearCart } = useStore();
  const [paymentMode, setPaymentMode] = useState<"live" | "test" | null>(null);
  const [status, setStatus] = useState(kind === "success" ? "Confirming payment" : kind === "cancelled" ? "Payment cancelled" : "Payment unsuccessful");
  const [message, setMessage] = useState(kind === "success" ? "Yoco is confirming your payment. This usually takes only a few seconds." : kind === "cancelled" ? "Your order was not paid and your bag is still available." : "Yoco could not complete the payment. Your bag is still available so you can try again.");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (kind !== "success" || !orderId) return;
    let active = true;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const result = await apiRequest<{ order: { status: string; payment_mode: "live" | "test" } }>(`/orders/${encodeURIComponent(orderId)}`);
        if (!active) return;
        setPaymentMode(result.order.payment_mode);
        if (["Paid", "Completed", "Fulfilled"].includes(result.order.status)) {
          clearCart();
          setConfirmed(true);
          setStatus("Payment confirmed");
          setMessage("Your order has been paid successfully and is now in your order history.");
          return;
        }
        if (result.order.status === "Payment Review") {
          clearCart();
          setStatus("Payment received");
          setMessage("Your payment was received, but the order needs a quick inventory review. Elovyn will follow up with you.");
          return;
        }
        if (result.order.status === "Payment Failed") {
          setStatus("Payment unsuccessful");
          setMessage("Yoco did not complete this payment. Your bag is still available so you can try again.");
          return;
        }
        if (attempts < 15) window.setTimeout(() => void check(), 2000);
        else {
          setStatus("Confirmation pending");
          setMessage("Your payment is still being confirmed. Check your order history again shortly before retrying payment.");
        }
      } catch (error) {
        if (!active) return;
        setStatus("Confirmation pending");
        setMessage(error instanceof Error ? error.message : "Could not confirm the payment yet. Please check your order history shortly.");
      }
    };
    void check();
    return () => { active = false; };
  }, [clearCart, kind, orderId]);

  const pending = kind === "success" && !confirmed && !/unsuccessful/i.test(status);
  const Icon = confirmed ? CheckCircle2 : pending ? Clock3 : XCircle;
  return <div className="min-h-screen bg-[#f6f1ea]"><Header /><main className="section-shell grid min-h-[60vh] place-items-center py-16"><div className="w-full max-w-xl space-y-4"><section className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm sm:p-12"><Icon className={`mx-auto h-12 w-12 ${confirmed ? "text-emerald-600" : pending ? "text-amber-500" : "text-red-500"}`} /><p className="eyebrow mt-6">{paymentMode ? `Yoco ${paymentMode} checkout` : "Yoco checkout"}</p><h1 className="mt-3 text-3xl font-bold tracking-tight">{status}</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-neutral-600">{message}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/orders" className="btn-primary">View order history</Link><Link to="/" className="btn-secondary">Return to store</Link></div>{orderId && <p className="mt-6 break-all text-xs text-neutral-400">Order {orderId}</p>}</section>{confirmed && orderId && <SiteReviewPrompt orderId={orderId} />}</div></main><Footer /></div>;
}
