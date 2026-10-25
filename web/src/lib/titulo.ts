import { useEffect } from "react";

export function useTitulo(titulo: string) {
  useEffect(() => {
    document.title = `${titulo} · Caja Tica`;
  }, [titulo]);
}
