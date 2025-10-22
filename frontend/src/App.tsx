import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import EdgeDevices from "./pages/dashboard/EdgeDevices";
import DeviceDetail from "./pages/dashboard/DeviceDetail";
import IoTDevices from "./pages/dashboard/IoTDevices";
import IoTDeviceDetail from "./pages/dashboard/IoTDeviceDetail";
import Deployments from "./pages/dashboard/Deployments";
import Workspaces from "./pages/dashboard/Workspaces";
import WorkspaceEditorPage from "./pages/dashboard/WorkspaceEditorPage";
import Settings from "./pages/dashboard/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard/edge-devices" replace />} />
                <Route path="edge-devices" element={<EdgeDevices />} />
                <Route path="device/:id" element={<DeviceDetail />} />
                <Route path="iot-devices" element={<IoTDevices />} />
                <Route path="iot-device/:id" element={<IoTDeviceDetail />} />
                <Route path="deployments" element={<Deployments />} />
                <Route path="workspaces" element={<Workspaces />} />
                <Route path="workspaces/:workspaceId" element={<WorkspaceEditorPage />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
