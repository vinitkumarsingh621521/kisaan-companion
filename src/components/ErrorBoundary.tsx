import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[KrishiMitra ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-lg w-full bg-card border border-border rounded-xl p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-7 w-7 text-destructive" />
              <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The page hit an unexpected error. Try reloading — your data is safe.
            </p>
            <pre className="text-xs bg-muted/50 text-foreground/80 rounded-md p-3 overflow-auto max-h-48 mb-4 border border-border">
              {this.state.error?.message || "Unknown error"}
            </pre>
            <Button onClick={this.reset} className="w-full">Reload page</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
