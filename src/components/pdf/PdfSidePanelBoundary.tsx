import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type PdfSidePanelBoundaryProps = {
  children: ReactNode;
  panelName: string;
};

type PdfSidePanelBoundaryState = {
  hasError: boolean;
};

export class PdfSidePanelBoundary extends Component<PdfSidePanelBoundaryProps, PdfSidePanelBoundaryState> {
  state: PdfSidePanelBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PdfSidePanelBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`PDF side panel failed: ${this.props.panelName}`, error, info);
  }

  componentDidUpdate(prevProps: PdfSidePanelBoundaryProps) {
    if (prevProps.panelName !== this.props.panelName && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <aside className="w-72 shrink-0 border-r border-border bg-sidebar p-4">
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-primary">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <AlertTriangle size={16} className="text-amber-500" />
            Panel unavailable
          </div>
          <p className="text-xs leading-5 text-secondary">
            This side panel could not be opened. Switch to another panel and try again.
          </p>
        </div>
      </aside>
    );
  }
}
