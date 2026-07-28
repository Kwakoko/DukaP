/**
 * DukaPos SaaS — Circuit Breaker Pattern for External Gateways (Payment, SMS, Email)
 * Prevents cascading failures when third-party microservices experience outages.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private nextAttempt = Date.now();
  public name: string;
  private options: CircuitBreakerOptions;

  constructor(
    name: string,
    options: CircuitBreakerOptions = { failureThreshold: 3, resetTimeoutMs: 15000 }
  ) {
    this.name = name;
    this.options = options;
  }

  async execute<T>(fn: () => Promise<T>, fallbackFn?: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (now > this.nextAttempt) {
        this.state = 'HALF_OPEN';
      } else {
        if (fallbackFn) return fallbackFn();
        throw new Error(`CircuitBreakerOpen: Service "${this.name}" is currently unavailable.`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallbackFn) return fallbackFn();
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.resetTimeoutMs;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

export const paymentGatewayCircuit = new CircuitBreaker('PaymentGateway', { failureThreshold: 3, resetTimeoutMs: 30000 });
export const smsGatewayCircuit = new CircuitBreaker('SMSGateway', { failureThreshold: 3, resetTimeoutMs: 20000 });
export const emailGatewayCircuit = new CircuitBreaker('EmailGateway', { failureThreshold: 3, resetTimeoutMs: 20000 });
