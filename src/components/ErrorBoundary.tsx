import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center bg-white rounded-3xl p-10 shadow-xl border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
              😕
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Something went wrong
            </h1>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              An unexpected error occurred. Our team has been notified. Please try reloading the page.
            </p>
            {this.state.error && (
              <details className="text-left bg-gray-50 rounded-xl p-4 mb-6 text-xs text-gray-500 font-mono">
                <summary className="cursor-pointer font-semibold text-gray-700 mb-1">Error details</summary>
                {this.state.error.message}
              </details>
            )}
            <button
              onClick={this.handleReload}
              className="bg-[#1a1a2e] hover:bg-[#e94560] text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
