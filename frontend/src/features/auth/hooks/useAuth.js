import { useAuthStore } from "../authSlice";

export const useAuth = () => {
  const {
    user,
    token,
    loading,
    error,
    login,
    verifyLoginOtp,
    register,
    logout,
    refreshProfile,
    clearError,
  } = useAuthStore();

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    isAdmin: user?.role === "admin",
    login,
    verifyLoginOtp,
    register,
    logout,
    refreshProfile,
    clearError,
  };
};
