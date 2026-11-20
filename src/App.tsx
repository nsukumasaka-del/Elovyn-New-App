import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { StoreProvider } from "@/lib/store";
import { AdminPage } from "./pages/Admin";
import { ProductDetailPage } from "./pages/ProductDetail";
import { AccountPage, LoginPage, OrdersPage, WishlistPage } from "./pages/StoreAccount";
import { TrackOrderPage } from "./pages/TrackOrder";
import { CategoryPage } from "./pages/Category";
import { PaymentResultPage } from "./pages/PaymentResult";
import { RouteScrollManager } from "./components/RouteScrollManager";
import { BrixyChat } from "./components/BrixyChat";
import { CookieConsent } from "@/components/CookieConsent";
import { StoreInformationPage } from "./pages/StoreInformation";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";

function IdleTimeoutMonitor() {
  const { warningOpen, staySignedIn, signOutNow } = useIdleTimeout();
  if (!warningOpen) return null;
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/35 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="idle-warning-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="idle-warning-title" className="text-lg font-semibold">Still there?</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">You've been inactive for a while. For your security, you will be signed out in 60 seconds.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => void signOutNow()} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium">Sign Out Now</button>
          <button type="button" onClick={() => void staySignedIn()} className="btn-primary">Stay Signed In</button>
        </div>
      </section>
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <StoreProvider>
          <IdleTimeoutMonitor />
          <RouteScrollManager />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/products/:productKey" element={<ProductDetailPage />} />
            <Route path="/categories/:slug" element={<CategoryPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/profile" element={<AccountPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/account/orders" element={<OrdersPage />} />
            <Route path="/orders/track" element={<TrackOrderPage />} />
            <Route path="/payment/success" element={<PaymentResultPage kind="success" />} />
            <Route path="/payment/cancelled" element={<PaymentResultPage kind="cancelled" />} />
            <Route path="/payment/failed" element={<PaymentResultPage kind="failed" />} />
            <Route path="/contact" element={<StoreInformationPage />} />
            <Route path="/faq" element={<StoreInformationPage />} />
            <Route path="/shipping-policy" element={<StoreInformationPage />} />
            <Route path="/returns-policy" element={<StoreInformationPage />} />
            <Route path="/privacy-policy" element={<StoreInformationPage />} />
            <Route path="/terms" element={<StoreInformationPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BrixyChat />
          <CookieConsent />
        </StoreProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
