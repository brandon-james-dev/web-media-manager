import './App.css'
import type { ReactNode } from "react";
import { Provider as BusProvider } from 'react-bus';

interface AppProps {
  children: ReactNode;
}

const App: React.FC<AppProps> = ({ children }) => {
  return (
    <>
      <BusProvider>
        <main className="h-full">
          {children}
        </main>
      </BusProvider>
    </>
  );
};


export default App
