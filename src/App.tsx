import './App.css'
import type { ReactNode } from "react";

interface AppProps {
  children: ReactNode;
}

const App: React.FC<AppProps> = ({ children }) => {
  return (
    <>
      <main className="h-full">
        {children}
      </main>
    </>
  );
};


export default App
