import { useEffect, useState } from 'react';
export function useDebounced<T>(value: T, delay = 180) {
  const [result, setResult] = useState(value);
  useEffect(() => { const timeout = setTimeout(() => setResult(value), delay); return () => clearTimeout(timeout); }, [value, delay]);
  return result;
}
