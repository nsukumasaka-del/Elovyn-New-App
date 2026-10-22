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
import { CategoryPage } from "./pages/Category";
import { PaymentResultPage } from "./pages/PaymentResult";
import { RouteScrollManager } from "./components/RouteScrollManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <StoreProvider>
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
            <Route path="/payment/success" element={<PaymentResultPage kind="success" />} />
            <Route path="/payment/cancelled" element={<PaymentResultPage kind="cancelled" />} />
            <Route path="/payment/failed" element={<PaymentResultPage kind="failed" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </StoreProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
