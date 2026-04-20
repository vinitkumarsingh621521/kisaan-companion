import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sprout } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect once auth has actually resolved — prevents the brief
    // /auth flash that caused full route remounts.
    if (!loading && !session) navigate("/auth", { replace: true });
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Sprout className="h-10 w-10 text-primary mx-auto mb-3 animate-pulse" />
          <Loader2 className="h-6 w-6 text-primary mx-auto animate-spin" />
        </div>
      </div>
    );
  }

  return session ? <>{children}</> : null;
}
