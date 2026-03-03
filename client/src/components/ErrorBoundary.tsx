import { Component, type ErrorInfo, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* No journal content or diagnostic telemetry leaves this app. */ }
  render() {
    if (this.state.failed) return <main className="mx-auto mt-24 max-w-lg rounded-2xl border border-stone-200 bg-white p-8"><p className="eyebrow">SOMETHING DID NOT LOAD</p><h1 className="mt-3 font-display text-3xl">Let's find the room again.</h1><p className="mt-4 text-sm leading-6 text-stone-500">Reload the client to retry. Saved listening entries remain in the companion database.</p><button className="button mt-6" onClick={() => location.reload()}>Reload application</button></main>;
    return this.props.children;
  }
}
