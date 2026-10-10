import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { StoreProvider } from "@/lib/store";
import { AdminPage } from "./pages/Admin";
import { AccountPage, LoginPage, OrdersPage, WishlistPage } from "./pages/StoreAccount";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <StoreProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/profile" element={<AccountPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </StoreProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
