import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { apiRequest } from "@/lib/store-api";

const supportEmail = "elovyn.shop@gmail.com";
const supportPhone = "066 1151 202";
const supportWhatsApp = "https://wa.me/27661151202";

const faqGroups = [
  {
    title: "Ordering & Yoco payments",
    questions: [
      { question: "How do I place an order?", answer: "Add the items you want to your bag, sign in, confirm your South African delivery address, and review the order total before continuing to Yoco checkout." },
      { question: "Which payment methods are available?", answer: "Payments are processed through Yoco. The available payment methods are shown in the secure Yoco checkout." },
      { question: "When is my order confirmed?", answer: "Your order is confirmed after payment has been successfully verified. If you are unsure about a payment, contact us with your order number." },
    ],
  },
  {
    title: "Shipping & delivery timelines in South Africa",
    questions: [
      { question: "How long does delivery take?", answer: "Please allow 1-3 business days for processing, followed by an estimated 7-14 business days for nationwide courier delivery." },
      { question: "What are the delivery fees?", answer: "Standard delivery is R99. Nationwide delivery is free when your item subtotal reaches the current free-delivery threshold shown in your bag and at checkout." },
    ],
  },
  {
    title: "Order tracking",
    questions: [
      { question: "How can I track my order?", answer: "Use the Track My Order page with your order details. Tracking information is available once it has been added to your order." },
      { question: "My tracking link is not working. What should I do?", answer: "Courier tracking may take time to update after dispatch. If it remains unavailable, contact support and include your order number." },
    ],
  },
  {
    title: "Sizing & fit",
    id: "sizing",
    questions: [
      { question: "How do I choose a size?", answer: "Use the size options and any product-specific measurements on the product page. Fit can vary by style; contact support before ordering if you need help." },
      { question: "Can I exchange an item for a different size?", answer: "Contact us within 7 days of delivery. Exchanges depend on the item's eligibility and stock availability; statutory consumer rights are not limited by this guidance." },
    ],
  },
  {
    title: "Returns & exchanges",
    questions: [
      { question: "What is the return window?", answer: "Contact us within 7 days of delivery to request a return for an eligible item. Items must be unworn, unwashed, with tags attached and in their original packaging." },
      { question: "Are any items excluded for hygiene reasons?", answer: "Intimate items, earrings, and opened or worn wigs and hair extensions are not eligible for change-of-mind returns. This does not exclude rights that cannot be limited by law." },
    ],
  },
  {
    title: "Wigs & accessories care",
    questions: [
      { question: "How should I care for wigs and hair extensions?", answer: "Follow the care information on the specific product. Detangle gently and only use heat or styling products where the product details say they are suitable." },
      { question: "How should I care for accessories?", answer: "Keep accessories clean and dry, and follow any care instructions supplied with the item." },
    ],
  },
];

function PageFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f1ea] text-neutral-950">
      <Header />
      <main className="section-shell max-w-5xl py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs uppercase tracking-[0.18em] text-neutral-500">
          <Link to="/" className="hover:text-neutral-950">Home</Link><span className="mx-2">/</span>{title}
        </nav>
        <h1 className="text-4xl font-black tracking-[-0.06em] sm:text-5xl">{title}</h1>
        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSent(false);
    setSubmitting(true);
    try {
      await apiRequest("/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, order_number: orderNumber, subject, message }),
      });
      setName("");
      setEmail("");
      setOrderNumber("");
      setSubject("");
      setMessage("");
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your message could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageFrame title="Contact us">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm leading-6 text-neutral-600">Questions about an order or product? Send our support team a message. We aim to reply within 24-48 hours, Monday to Friday.</p>
          <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Name
              <input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4" />
            </label>
            <label className="block text-sm font-medium">Email
              <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4" />
            </label>
            <label className="block text-sm font-medium">Order number <span className="font-normal text-neutral-500">(optional)</span>
              <input maxLength={80} value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4" />
            </label>
            <label className="block text-sm font-medium">Subject
              <input required maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4" />
            </label>
            <label className="block text-sm font-medium">Message
              <textarea required maxLength={5000} rows={6} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 p-4" />
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {sent && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Thanks for reaching out. Your message has been received.</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">{submitting ? "Sending…" : "Send message"}</button>
            <p className="text-xs leading-5 text-neutral-500">By submitting, you agree that we may use these details to respond to your enquiry. See our <Link to="/privacy-policy" className="underline">Privacy Policy</Link>.</p>
          </form>
        </div>
        <aside className="h-fit rounded-2xl bg-neutral-50 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Elovyn support</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div><dt className="font-medium">Email</dt><dd className="mt-1"><a href={`mailto:${supportEmail}`} className="text-neutral-600 underline">{supportEmail}</a></dd></div>
            <div><dt className="font-medium">WhatsApp</dt><dd className="mt-1"><a href={supportWhatsApp} target="_blank" rel="noreferrer" className="text-neutral-600 underline">{supportPhone}</a></dd></div>
            <div><dt className="font-medium">Operating hours</dt><dd className="mt-1 leading-6 text-neutral-600">Monday-Friday, 9:00-17:00 SAST<br />Typical response time: 24-48 hours</dd></div>
          </dl>
          <Link to="/orders/track" className="btn-secondary mt-6 w-full">Track my order</Link>
        </aside>
      </div>
    </PageFrame>
  );
}

function FaqPage() {
  const [query, setQuery] = useState("");
  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    return faqGroups.map((group) => ({
      ...group,
      questions: group.questions.filter((item) => !term || `${group.title} ${item.question} ${item.answer}`.toLowerCase().includes(term)),
    })).filter((group) => group.questions.length > 0);
  }, [query]);

  return (
    <PageFrame title="Frequently asked questions">
      <label className="block text-sm font-medium">Search questions
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payments, delivery, sizing…" className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4" />
      </label>
      <div className="mt-7 space-y-8">
        {filteredGroups.map((group) => (
          <section key={group.title} id={group.id}>
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <div className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200">
              {group.questions.map((item) => (
                <details key={item.question} className="group py-4">
                  <summary className="cursor-pointer list-none pr-6 text-sm font-medium marker:hidden">
                    <span className="flex items-center justify-between gap-4">{item.question}<span aria-hidden="true" className="text-neutral-400 group-open:rotate-45">+</span></span>
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        {filteredGroups.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">No matching questions. Please <Link to="/contact" className="underline">contact us</Link>.</p>}
      </div>
    </PageFrame>
  );
}

function ShippingPage() {
  return (
    <PageFrame title="Shipping & delivery">
      <div className="space-y-6 text-sm leading-7 text-neutral-700">
        <p>We deliver to addresses across South Africa. Business days exclude weekends and public holidays.</p>
        <section><h2 className="font-semibold text-neutral-950">Processing and delivery times</h2><p className="mt-2">Please allow 1-3 business days for order processing. Standard courier delivery is estimated at 7-14 business days after processing, depending on your destination and courier conditions.</p></section>
        <section><h2 className="font-semibold text-neutral-950">Delivery fees</h2><p className="mt-2">Standard delivery is R99. Nationwide delivery is free when the item subtotal reaches the free-delivery threshold displayed in your bag and at checkout (R1,500 by default). Any applicable delivery fee is shown in your order summary before payment.</p></section>
        <section><h2 className="font-semibold text-neutral-950">Tracking</h2><p className="mt-2">When tracking details are available, use <Link to="/orders/track" className="underline">Track My Order</Link> or the tracking link on your order page. Courier updates may take time to appear after dispatch.</p></section>
        <p>If there is an unexpected delay or you need help with an address, <Link to="/contact" className="underline">contact our support team</Link>.</p>
      </div>
    </PageFrame>
  );
}

function ReturnsPage() {
  return (
    <PageFrame title="Returns & refunds">
      <div className="space-y-6 text-sm leading-7 text-neutral-700">
        <p>For eligible change-of-mind returns, contact us within 7 days of delivery to request a return. This policy does not limit rights that cannot be excluded under the Consumer Protection Act, the Electronic Communications and Transactions Act, or other applicable law.</p>
        <section><h2 className="font-semibold text-neutral-950">Eligibility</h2><p className="mt-2">Items must be unworn, unwashed, undamaged, with original tags attached and in their original packaging. Please wait for return instructions before sending an item back.</p></section>
        <section><h2 className="font-semibold text-neutral-950">Hygiene exclusions</h2><p className="mt-2">Change-of-mind returns are not accepted for intimate items, earrings, or opened or worn wigs and hair extensions for hygiene reasons. These exclusions do not affect any non-excludable statutory rights.</p></section>
        <section><h2 className="font-semibold text-neutral-950">How to request a return</h2><ol className="mt-2 list-decimal space-y-1 pl-5"><li>Contact <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a> within 7 days of delivery.</li><li>Include your order number, the item, and the reason for your request.</li><li>Wait for our response and return instructions before shipping the item.</li><li>Once received, the item will be checked against the eligibility conditions.</li></ol></section>
        <section><h2 className="font-semibold text-neutral-950">Refunds</h2><p className="mt-2">For an approved refund, we aim to initiate the refund to the original payment method within 7 business days after the returned item has been received and assessed. Your bank or payment provider may take additional time to reflect it. We will confirm the outcome by email.</p></section>
        <p>For help, use our <Link to="/contact" className="underline">Contact Us</Link> page. This page is general store information and is not legal advice.</p>
      </div>
    </PageFrame>
  );
}

function PrivacyPage() {
  return (
    <PageFrame title="Privacy policy">
      <div className="space-y-6 text-sm leading-7 text-neutral-700">
        <p>This policy explains how Elovyn handles personal information in accordance with South Africa's Protection of Personal Information Act (POPIA). We collect only information reasonably needed to operate the store and respond to customers.</p>
        <section><h2 className="font-semibold text-neutral-950">Information we collect and why</h2><p className="mt-2">Depending on how you use the store, we may collect your name, email address, South African mobile number, delivery address, order details, payment status, and messages you send us. We use these details to process orders, arrange delivery, support customers, prevent fraud, meet legal and accounting obligations, and maintain store security.</p></section>
        <section><h2 className="font-semibold text-neutral-950">Service providers and international processing</h2><p className="mt-2">We share only information needed to complete the relevant task with service providers, including Cloudflare for website and database hosting, Yoco for payment processing, and the courier responsible for delivery. These providers process information under their own terms and applicable safeguards. We do not store complete card details in the Elovyn store database.</p></section>
        <section><h2 className="font-semibold text-neutral-950">Security and retention</h2><p className="mt-2">The store runs on Cloudflare infrastructure and we use reasonable technical and organisational safeguards to protect personal information. No online transmission or storage method can be guaranteed completely secure. We retain records for as long as needed for the purposes above and for applicable legal or accounting requirements.</p></section>
        <section><h2 className="font-semibold text-neutral-950">Cookies and browser storage</h2><p className="mt-2">Essential browser storage is used to keep your bag and checkout working. The storefront also remembers your cookie notice choice in local storage. You can clear browser storage in your browser settings; doing so may remove saved bag or preference information.</p></section>
        <section><h2 className="font-semibold text-neutral-950">Your rights and Information Officer</h2><p className="mt-2">You may request access to or correction of your personal information, or ask us to delete it where we are not required to retain it. You may also raise a concern with the Information Regulator of South Africa. Contact Elovyn's Information Officer for privacy requests at <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a>. We may need to verify your identity before acting on a request.</p></section>
        <p>For privacy questions, please <Link to="/contact" className="underline">contact us</Link>.</p>
      </div>
    </PageFrame>
  );
}

function TermsPage() {
  return (
    <PageFrame title="Terms & conditions">
      <div className="space-y-6 text-sm leading-7 text-neutral-700">
        <p>These terms apply when you browse or place an order with Elovyn. By placing an order, you agree to these terms, subject to rights that cannot be excluded under South African law.</p>
        <section><h2 className="font-semibold text-neutral-950">Prices and payment</h2><p className="mt-2">Prices are displayed in South African rand (ZAR). Delivery fees and the final total are shown before payment. Payments are processed through Yoco; an order is not accepted for fulfilment until payment has been successfully verified.</p></section>
        <section><h2 className="font-semibold text-neutral-950">Orders, stock, and availability</h2><p className="mt-2">We may contact you if an item is unavailable or an order detail needs clarification. We will not substitute an item without your agreement. If we cannot fulfil a paid order, we will contact you about the appropriate resolution, including a refund where applicable.</p></section>
        <section><h2 className="font-semibold text-neutral-950">Intellectual property</h2><p className="mt-2">Store content, branding, photography, and original materials are owned by or licensed to Elovyn and may not be copied or used commercially without permission, except where permitted by law.</p></section>
        <section><h2 className="font-semibold text-neutral-950">Liability and consumer rights</h2><p className="mt-2">Nothing in these terms limits a consumer right or liability that cannot lawfully be limited. To the extent allowed by law, Elovyn is not liable for indirect losses outside our reasonable control. These terms are governed by the laws of South Africa.</p></section>
        <p>Questions about these terms can be sent through our <Link to="/contact" className="underline">Contact Us</Link> page.</p>
      </div>
    </PageFrame>
  );
}

export function StoreInformationPage() {
  const { pathname } = useLocation();
  if (pathname === "/contact") return <ContactPage />;
  if (pathname === "/faq") return <FaqPage />;
  if (pathname === "/shipping-policy") return <ShippingPage />;
  if (pathname === "/returns-policy") return <ReturnsPage />;
  if (pathname === "/privacy-policy") return <PrivacyPage />;
  return <TermsPage />;
}
