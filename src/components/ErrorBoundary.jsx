import { Component } from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { tieneError: false };
  }

  static getDerivedStateFromError() {
    return { tieneError: true };
  }

  componentDidCatch(error, info) {
    console.error('Error capturado por ErrorBoundary:', error, info);
  }

  handleReintentar = () => {
    this.setState({ tieneError: false });
    window.location.reload();
  };

  render() {
    if (this.state.tieneError) {
      return (
        <div className="error-boundary-wrapper">
          <div className="error-boundary-panel">
            <h1 className="error-boundary-titulo">Algo salió mal</h1>
            <p className="error-boundary-sub">
              Tuvimos un problema inesperado. Intenta recargar la página.
            </p>
            <button className="error-boundary-btn" onClick={this.handleReintentar}>
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
