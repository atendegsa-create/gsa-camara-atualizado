import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let isFirebaseError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            isFirebaseError = true;
            if (parsed.error.includes('insufficient permissions')) {
              errorMessage = "Você não tem permissão para realizar esta operação. Verifique se seu perfil está configurado corretamente.";
            } else {
              errorMessage = `Erro no banco de dados (${parsed.operationType}): ${parsed.error}`;
            }
          }
        }
      } catch (e) {
        // Not a JSON error message, use default
      }

      return (
        <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-500 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">Ops! Algo deu errado</h2>
            <div className="bg-red-50 p-4 rounded-xl text-red-700 text-sm mb-8 text-left">
              {errorMessage}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full bg-[#1a1a1a] text-white rounded-xl py-4 font-medium flex items-center justify-center gap-3 hover:bg-[#333] transition-colors"
            >
              <RefreshCcw size={20} />
              Tentar Novamente
            </button>
            {isFirebaseError && (
              <p className="mt-4 text-xs text-gray-400">
                Se o problema persistir, entre em contato com o suporte técnico informando o erro acima.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
