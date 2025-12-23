import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { User, ADMIN_EMAILS, DUE_DILIGENCE_EMAIL } from "@/types/vendor";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
  isDueDiligence: boolean;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();

        if (!alive) return;

        if (data?.ok && data.user?.verified) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        if (!alive) return;
        setUser(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    setUser(null);
  };

  const adminSet = useMemo(
    () => new Set(ADMIN_EMAILS.map((e) => String(e).trim().toLowerCase())),
    []
  );

  const isAdmin =
    !!(user as any)?.isAdmin ||
    adminSet.has(
      String(user?.email || "")
        .trim()
        .toLowerCase()
    );

  const isDueDiligence =
    !!(user as any)?.isDueDiligence ||
    user?.email?.toLowerCase() === DUE_DILIGENCE_EMAIL.toLowerCase();

  return (
    <AuthContext.Provider
      value={{ user, setUser, isAdmin, isDueDiligence, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
