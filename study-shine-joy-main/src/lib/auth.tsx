import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";
import type { Role } from "./lms-data";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  branch?: string;
  year?: string;
  sem?: string;
  section?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    role: Role,
  ) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean; email?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    let isMounted = true;

    const restoreUser = async () => {
      try {
        const storedUser = api.getCurrentUser();
        const storedToken = localStorage.getItem("authToken");

        if (!storedUser || !storedToken) {
          if (isMounted) {
            setUser(null);
          }
          return;
        }

        const response = await api.validateToken();
        if (isMounted) {
          if (response.success && response.data) {
            setUser({
              id: String(response.data.id),
              name: response.data.name,
              email: response.data.email,
              role: response.data.role.toLowerCase() as Role,
              branch: response.data.branch,
              year: (response.data as any).year,
              sem: (response.data as any).sem,
              section: (response.data as any).section,
            });
          } else {
            api.logout();
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Error restoring user from localStorage:", error);
        api.logout();
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void restoreUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);
      if (response.success && response.data) {
        const userData: User = {
          id: response.data.id?.toString() || "",
          name: response.data.name || "",
          email: response.data.email || "",
          role: (response.data.role?.toLowerCase() || "student") as Role,
          branch: response.data.branch,
          year: (response.data as any).year,
          sem: (response.data as any).sem,
          section: (response.data as any).section,
        };
        setUser(userData);
        return { success: true };
      }
      return { 
        success: false, 
        error: response.error || "Login failed",
        requiresVerification: (response as any).requiresVerification,
        email: (response as any).email
      };
    } catch (error) {
      return { success: false, error: "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: Role) => {
    setIsLoading(true);
    try {
      const response = await api.register(name, email, password, role);
      if (response.success) {
        return { success: true, email: response.data?.email };
      }
      return { success: false, error: response.error || "Registration failed" };
    } catch (error) {
      return { success: false, error: "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const response = await api.verifyOtp(email, otp);
      if (response.success) return { success: true };
      return { success: false, error: response.error || "Verification failed" };
    } catch (error) {
      return { success: false, error: "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (email: string) => {
    try {
      const response = await api.resendOtp(email);
      if (response.success) return { success: true };
      return { success: false, error: response.error || "Failed to resend OTP" };
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
