export interface FibonacciLevels {
  fib_236: number;
  fib_382: number;
  fib_500: number;
  fib_618: number;
  fib_786: number;
  fib_1618: number;
}

export function calculateFibonacciLevels(entryPrice: number, high?: number): FibonacciLevels {
  // If no high is provided, calculate based on entry price as the low
  // and project upward using typical Fibonacci extension ratios
  const base = high || entryPrice;
  const range = base - entryPrice;

  return {
    fib_236: entryPrice + range * 0.236,
    fib_382: entryPrice + range * 0.382,
    fib_500: entryPrice + range * 0.500,
    fib_618: entryPrice + range * 0.618,
    fib_786: entryPrice + range * 0.786,
    fib_1618: entryPrice + range * 1.618,
  };
}

export function calculateFibonacciExtensions(entryPrice: number): FibonacciLevels {
  // Calculate Fibonacci extensions for take profit levels
  return {
    fib_236: entryPrice * 1.236,
    fib_382: entryPrice * 1.382,
    fib_500: entryPrice * 1.500,
    fib_618: entryPrice * 1.618,
    fib_786: entryPrice * 1.786,
    fib_1618: entryPrice * 2.618,
  };
}

export function findNearestFibLevel(
  currentPrice: number,
  fibLevels: FibonacciLevels
): { level: string; price: number; distance: number } | null {
  const levels = Object.entries(fibLevels).map(([level, price]) => ({
    level,
    price,
    distance: Math.abs(currentPrice - price),
  }));

  const nearest = levels.reduce((min, current) =>
    current.distance < min.distance ? current : min
  );

  return nearest;
}
